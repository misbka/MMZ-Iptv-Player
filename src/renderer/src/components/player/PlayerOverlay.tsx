import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Hls from 'hls.js'
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Info,
  ListVideo,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  X
} from 'lucide-react'
import type { Channel } from '@shared/types'
import { useKeyHandler } from '../../hooks/useKeyHandler'
import { useT } from '../../hooks/useT'
import { useStore } from '../../store/useStore'
import { sectionToKind } from '../../store/selectors'
import { formatClock, formatDuration, progressOf, remainingLabel } from '../../utils/time'
import { GuideOverlay } from './GuideOverlay'

type Status = 'loading' | 'playing' | 'error'

const RETRY_DELAY_MS = 8000
const MAX_RETRIES = 4
const WATCHDOG_MS = 25000

function isHlsUrl(url: string): boolean {
  return /\.m3u8(\?|$)/i.test(url) || /format=m3u8/i.test(url)
}

/**
 * Player embutido na janela principal (sem janela externa).
 * Suporta HLS (m3u8) via hls.js, MP4 nativo, zaping com ↑ ↓, tela cheia, volume,
 * guia EPG (G) e tratamento gracioso de erros de stream com reconexão automática.
 */
export function PlayerOverlay(): JSX.Element | null {
  const channel = useStore((s) => s.channels.find((c) => c.id === s.player.channelId))
  const showInfo = useStore((s) => s.player.showInfo)
  const showGuide = useStore((s) => s.player.showGuide)
  const epgEntry = useStore((s) => (channel?.tvgId ? s.epg[channel.tvgId] : undefined))
  const settings = useStore((s) => s.settings)
  const section = useStore((s) => s.section)
  const t = useT()

  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const retryTimer = useRef<number | null>(null)
  const watchdog = useRef<number | null>(null)
  const hideTimer = useRef<number | null>(null)
  const attemptsRef = useRef(0)

  const [status, setStatus] = useState<Status>('loading')
  const [attempts, setAttempts] = useState(0)
  const [controlsVisible, setControlsVisible] = useState(true)
  const [zapBanner, setZapBanner] = useState(false)
  const [volume, setVolumeState] = useState(settings.volume)
  const [muted, setMutedState] = useState(settings.muted)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [seekInfo, setSeekInfo] = useState<string | null>(null)
  const [mediaTime, setMediaTime] = useState({ current: 0, duration: 0 })

  const kind = channel?.kind ?? sectionToKind(section) ?? 'live'
  const isLive = kind === 'live'

  /* ---------------------- volume ---------------------- */
  const applyVolume = useCallback((value: number, mute: boolean) => {
    const video = videoRef.current
    const clamped = Math.min(1, Math.max(0, value))
    if (video) {
      video.volume = clamped
      video.muted = mute || clamped === 0
    }
    setVolumeState(clamped)
    setMutedState(mute || clamped === 0)
    void useStore.getState().updateSettings({ volume: clamped, muted: mute || clamped === 0 })
  }, [])

  /* ------------------ carregamento do stream ------------------ */
  const cleanupStream = useCallback(() => {
    if (retryTimer.current) {
      window.clearTimeout(retryTimer.current)
      retryTimer.current = null
    }
    if (watchdog.current) {
      window.clearTimeout(watchdog.current)
      watchdog.current = null
    }
    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }
    const video = videoRef.current
    if (video) {
      video.pause()
      video.removeAttribute('src')
      video.load()
    }
  }, [])

  const attachStream = useCallback(
    (source: Channel) => {
      const video = videoRef.current
      if (!video) return

      cleanupStream()
      setStatus('loading')
      attemptsRef.current = 0
      setAttempts(0)

      const startPlayback = (): void => {
        video.play().catch(() => {
          // Autoplay pode ser bloqueado; o usuário inicia com Enter/espaço
          setIsPaused(true)
        })
      }

      const fail = (message: string): void => {
        console.warn('[player]', message)
        setStatus('error')
        const nextAttempt = attemptsRef.current + 1
        attemptsRef.current = nextAttempt
        setAttempts(nextAttempt)

        if (nextAttempt <= MAX_RETRIES) {
          retryTimer.current = window.setTimeout(() => {
            attachStream(source)
          }, RETRY_DELAY_MS)
        }
      }

      // Watchdog: se em 25s nada tocar, considera o stream offline
      watchdog.current = window.setTimeout(() => {
        if (video.readyState < 3) {
          fail('Timeout ao carregar o stream.')
        }
      }, WATCHDOG_MS)

      if (Hls.isSupported() && isHlsUrl(source.url)) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 30,
          manifestLoadingTimeOut: 15000,
          manifestLoadingMaxRetry: 2,
          levelLoadingTimeOut: 15000,
          fragLoadingTimeOut: 20000,
          fragLoadingMaxRetry: 4
        })
        hlsRef.current = hls
        hls.loadSource(source.url)
        hls.attachMedia(video)

        hls.on(Hls.Events.MANIFEST_PARSED, startPlayback)
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (!data.fatal) return
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            hls.startLoad()
            fail(`Falha de rede no stream (${data.details}).`)
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError()
            fail(`Erro de mídia (${data.details}).`)
          } else {
            fail(`Erro irrecuperável no player (${data.details}).`)
          }
        })
      } else {
        video.src = source.url
        video.addEventListener('loadedmetadata', startPlayback, { once: true })
        video.addEventListener('error', () => fail('O formato do stream não é suportado.'), {
          once: true
        })
      }
    },
    [cleanupStream]
  )

  useEffect(() => {
    if (!channel) return
    attachStream(channel)
    return cleanupStream
  }, [channel?.id, channel?.url, attachStream, cleanupStream])

  // Volume inicial vindo das configurações
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.volume = settings.volume
    video.muted = settings.muted
    setVolumeState(settings.volume)
    setMutedState(settings.muted)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel?.id])

  // Esconde os controles automaticamente
  const bumpControls = useCallback(() => {
    setControlsVisible(true)
    if (hideTimer.current) window.clearTimeout(hideTimer.current)
    hideTimer.current = window.setTimeout(() => setControlsVisible(false), 3500)
  }, [])

  useEffect(() => {
    bumpControls()
    return () => {
      if (hideTimer.current) window.clearTimeout(hideTimer.current)
    }
  }, [bumpControls, channel?.id])

  // Banner de zaping e banner de info ao trocar de canal
  useEffect(() => {
    setZapBanner(true)
    const t1 = window.setTimeout(() => setZapBanner(false), 2500)
    useStore.getState().toggleInfo(true)
    const t2 = window.setTimeout(() => useStore.getState().toggleInfo(false), 6000)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [channel?.id])

  useEffect(() => {
    const onFullscreenChange = (): void => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  // Acompanha o tempo do vídeo (necessário para a barra de progresso do VOD)
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const onTimeUpdate = (): void =>
      setMediaTime({ current: video.currentTime ?? 0, duration: video.duration ?? 0 })
    video.addEventListener('timeupdate', onTimeUpdate)
    video.addEventListener('durationchange', onTimeUpdate)
    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate)
      video.removeEventListener('durationchange', onTimeUpdate)
    }
  }, [channel?.id])

  // Sincroniza o estado de reprodução com o elemento <video>
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const onPlaying = (): void => {
      setStatus('playing')
      setIsPaused(false)
      if (watchdog.current) {
        window.clearTimeout(watchdog.current)
        watchdog.current = null
      }
    }
    const onWaiting = (): void => setStatus('loading')
    const onPauseOrPlay = (): void => setIsPaused(video.paused)

    video.addEventListener('playing', onPlaying)
    video.addEventListener('waiting', onWaiting)
    video.addEventListener('pause', onPauseOrPlay)
    video.addEventListener('play', onPauseOrPlay)

    return () => {
      video.removeEventListener('playing', onPlaying)
      video.removeEventListener('waiting', onWaiting)
      video.removeEventListener('pause', onPauseOrPlay)
      video.removeEventListener('play', onPauseOrPlay)
    }
  }, [])

  /* --------------------------- zaping --------------------------- */
  const zapList = useMemo<Channel[]>(() => {
    const state = useStore.getState()
    const kindFilter = channel?.kind ?? 'live'
    const base = state.channels.filter((c) => c.kind === kindFilter)
    if (state.activeCategory !== 'Todos' && kindFilter === 'live') {
      const filtered = base.filter((c) => c.group === state.activeCategory)
      if (filtered.length > 0) return filtered
    }
    return base
  }, [channel?.kind, channel?.id])

  const zap = useCallback(
    (direction: 1 | -1) => {
      if (zapList.length === 0 || !channel) return
      const index = zapList.findIndex((c) => c.id === channel.id)
      const nextIndex = (index + direction + zapList.length) % zapList.length
      const next = zapList[nextIndex]
      if (next) useStore.getState().play(next.id)
    },
    [zapList, channel]
  )

  const togglePlay = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      video.play().catch(() => undefined)
      setIsPaused(false)
    } else {
      video.pause()
      setIsPaused(true)
    }
    bumpControls()
  }, [bumpControls])

  const toggleMute = useCallback(() => {
    const video = videoRef.current
    const nextMuted = !muted
    if (video) video.muted = nextMuted
    setMutedState(nextMuted)
    void useStore.getState().updateSettings({ muted: nextMuted })
    bumpControls()
  }, [muted, bumpControls])

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void containerRef.current?.requestFullscreen().catch(() => undefined)
    bumpControls()
  }, [bumpControls])

  const seek = useCallback(
    (deltaSeconds: number) => {
      const video = videoRef.current
      if (!video || isLive) return
      const target = Math.max(0, (video.currentTime ?? 0) + deltaSeconds)
      video.currentTime = target
      setSeekInfo(formatDuration(target))
      window.setTimeout(() => setSeekInfo(null), 1500)
      bumpControls()
    },
    [isLive, bumpControls]
  )

  /* --------------------------- teclado --------------------------- */
  useKeyHandler(
    (event) => {
      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault()
          zap(1)
          break
        case 'ArrowDown':
          event.preventDefault()
          zap(-1)
          break
        case 'ArrowLeft':
          event.preventDefault()
          if (!isLive) seek(-10)
          break
        case 'ArrowRight':
          event.preventDefault()
          if (!isLive) seek(10)
          break
        case ' ':
        case 'Enter':
          event.preventDefault()
          togglePlay()
          break
        case 'i':
        case 'I':
          event.preventDefault()
          useStore.getState().toggleInfo()
          bumpControls()
          break
        case 'g':
        case 'G':
          event.preventDefault()
          useStore.getState().toggleGuide()
          break
        case 'm':
        case 'M':
          event.preventDefault()
          toggleMute()
          break
        case 'f':
        case 'F':
          event.preventDefault()
          toggleFullscreen()
          break
        default:
          bumpControls()
          break
      }
    },
    true
  )

  if (!channel) return null

  const now = epgEntry?.now
  const next = epgEntry?.next
  const channelNumber = zapList.findIndex((c) => c.id === channel.id) + 1

  return (
    <div
      ref={containerRef}
      onMouseMove={bumpControls}
      className="fixed inset-0 z-50 flex flex-col bg-black"
    >
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full bg-black"
        playsInline
        onClick={togglePlay}
      />

      {/* ------------------ estados de carregamento/erro ------------------ */}
      {status === 'loading' && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-4">
          <div className="spinner" />
          <p className="text-sm text-white/60">{t('player.loading', { name: channel.name })}</p>
        </div>
      )}

      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/85 px-8 text-center">
          <AlertTriangle size={44} className="text-mmz-orange" />
          <h3 className="text-xl font-bold">{t('player.errorTitle')}</h3>
          <p className="max-w-md text-sm leading-relaxed text-white/55">
            {t('player.errorDesc', { name: channel.name })}
          </p>
          {attempts <= MAX_RETRIES ? (
            <p className="text-xs text-white/40">
              {t('player.retrying', { attempts, max: MAX_RETRIES })}
            </p>
          ) : (
            <div className="mt-2 flex gap-3">
              <button
                onClick={() => attachStream(channel)}
                className="flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white"
                style={{ backgroundImage: 'linear-gradient(90deg,#e60000,#ff6a00)' }}
              >
                <RotateCcw size={15} /> {t('player.retry')}
              </button>
              <button
                onClick={() => useStore.getState().closePlayer()}
                className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-white/80 hover:bg-white/10"
              >
                {t('player.back')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ------------------------ banner de zaping ------------------------ */}
      {zapBanner && (
        <div className="pointer-events-none absolute left-8 top-8 flex animate-fade-in items-center gap-4 rounded-2xl border border-white/10 bg-black/70 px-5 py-4 backdrop-blur">
          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-white/5">
            {channel.logo ? (
              <img src={channel.logo} alt="" className="h-full w-full object-contain p-1.5" />
            ) : (
              <span className="text-lg font-bold text-white/60">{channelNumber}</span>
            )}
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-mmz-orange">
              {t('player.channelNumber', { number: channelNumber, group: channel.group })}
            </p>
            <p className="max-w-[320px] truncate text-lg font-bold">{channel.name}</p>
          </div>
        </div>
      )}

      {/* --------------------------- info EPG --------------------------- */}
      {showInfo && (
        <div className="pointer-events-none absolute bottom-28 left-8 right-8 animate-slide-up rounded-2xl border border-white/10 bg-black/70 p-5 backdrop-blur">
          <div className="flex items-start gap-5">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-white/45">
                {t(`kind.${kind}`)} · {channel.group}
              </p>
              <h3 className="mt-1 truncate text-2xl font-extrabold">{channel.name}</h3>

              {now ? (
                <div className="mt-3 max-w-2xl">
                  <div className="flex items-baseline gap-3">
                    <p className="truncate text-sm font-bold text-white/90">{now.title}</p>
                    <span className="shrink-0 text-[11px] text-white/45">
                      {formatClock(now.start)} - {formatClock(now.stop)} · {remainingLabel(now)}
                    </span>
                  </div>
                  <div className="epg-bar mt-2 max-w-xl">
                    <div style={{ width: `${Math.round(progressOf(now) * 100)}%` }} />
                  </div>
                  {next && (
                    <p className="mt-2 truncate text-xs text-white/50">
                      {t('player.upNext')}: <span className="text-white/75">{next.title}</span> (
                      {formatClock(next.start)})
                    </p>
                  )}
                </div>
              ) : (
                <p className="mt-2 text-xs text-white/40">{t('player.noGuide')}</p>
              )}
            </div>

            <div className="hidden shrink-0 flex-col items-end gap-1 text-right text-[11px] text-white/40 lg:flex">
              <span>{t('player.hintZap')}</span>
              {!isLive && <span>{t('player.hintSeek')}</span>}
              <span>{t('player.hintKeys')}</span>
            </div>
          </div>
        </div>
      )}

      {seekInfo && (
        <div className="pointer-events-none absolute left-1/2 top-10 -translate-x-1/2 rounded-full bg-black/70 px-4 py-2 text-sm font-semibold tabular-nums">
          {seekInfo}
        </div>
      )}

      {/* --------------------------- controles --------------------------- */}
      <div
        className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent px-8 pb-6 pt-16 transition-opacity duration-300 ${
          controlsVisible || status === 'error' ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {!isLive && mediaTime.duration > 0 && (
          <div className="mb-3 flex items-center gap-3">
            <span className="w-12 text-right text-[11px] tabular-nums text-white/60">
              {formatDuration(mediaTime.current)}
            </span>
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(mediaTime.current / mediaTime.duration) * 100 || 0}%`,
                  backgroundImage: 'linear-gradient(90deg,#e60000,#ff6a00)'
                }}
              />
            </div>
            <span className="w-12 text-[11px] tabular-nums text-white/60">
              {formatDuration(mediaTime.duration)}
            </span>
          </div>
        )}

        <div className="flex items-center gap-3">
          <span className="max-w-[320px] truncate text-sm font-bold">{channel.name}</span>
          {now && (
            <span className="truncate text-xs text-white/50">
              · {now.title} ({remainingLabel(now)})
            </span>
          )}

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => zap(1)}
              title={t('player.hintZap')}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            >
              <ArrowUp size={18} />
            </button>
            <button
              onClick={() => zap(-1)}
              title={t('player.hintZap')}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            >
              <ArrowDown size={18} />
            </button>

            <button
              onClick={togglePlay}
              title={t('player.btnPlayPause')}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            >
              {isPaused ? <Play size={19} fill="white" /> : <Pause size={19} fill="white" />}
            </button>

            <button
              onClick={() => attachStream(channel)}
              title={t('player.btnRestart')}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            >
              <RotateCcw size={18} />
            </button>

            <div className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-2">
              <button onClick={toggleMute} title={t('player.btnMute')} className="text-white hover:text-mmz-orange">
                {muted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round((muted ? 0 : volume) * 100)}
                onChange={(e) => applyVolume(Number(e.target.value) / 100, false)}
                className="mmz-range w-24"
                aria-label={t('player.volume')}
              />
            </div>

            <button
              onClick={() => useStore.getState().toggleInfo()}
              title={t('player.btnInfo')}
              className={`flex h-11 w-11 items-center justify-center rounded-full transition ${
                showInfo ? 'bg-white/25 text-white' : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <Info size={18} />
            </button>

            <button
              onClick={() => useStore.getState().toggleGuide()}
              title={t('player.btnGuide')}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            >
              <ListVideo size={18} />
            </button>

            <button
              onClick={toggleFullscreen}
              title={t('player.btnFullscreen')}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            >
              {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>

            <button
              onClick={() => useStore.getState().closePlayer()}
              title={t('player.btnClose')}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-mmpz-red text-white transition hover:brightness-110"
              style={{ backgroundImage: 'linear-gradient(90deg,#e60000,#ff6a00)' }}
            >
              <X size={19} />
            </button>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-4 text-[10px] uppercase tracking-widest text-white/35">
          <span className="flex items-center gap-1">
            <ArrowUp size={11} /> <ArrowDown size={11} /> {t('player.hintChannel')}
          </span>
          <span className="hidden lg:inline">{t('player.hintSpace')}</span>
          <span className="hidden lg:inline">{t('player.hintGuide')}</span>
          <span className="hidden lg:inline">{t('player.hintExit')}</span>
        </div>
      </div>

      {showGuide && <GuideOverlay channel={channel} />}
    </div>
  )
}
