import { useEffect, useRef, useState } from 'react'
import { CalendarClock, X } from 'lucide-react'
import type { Channel, EpgProgram } from '@shared/types'
import { useKeyHandler } from '../../hooks/useKeyHandler'
import { useT } from '../../hooks/useT'
import { useStore } from '../../store/useStore'
import { formatClock, formatRange, isLiveNow, progressOf, remainingLabel } from '../../utils/time'

interface Props {
  channel: Channel
}

/**
 * Guia de programação (EPG) do canal em reprodução.
 * Aberto com "G" dentro do player. Navegação: ↑ ↓ entre programas, Esc/G fecha.
 */
export function GuideOverlay({ channel }: Props): JSX.Element {
  const [programs, setPrograms] = useState<EpgProgram[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)
  const t = useT()

  // Mantém o programa selecionado visível
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-program="${selected}"]`)
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [selected])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setSelected(0)

    const load = async (): Promise<void> => {
      if (!channel.tvgId) {
        if (!cancelled) {
          setPrograms([])
          setLoading(false)
        }
        return
      }
      const list = await window.mmz.epg.schedule(channel.tvgId)
      if (!cancelled) {
        setPrograms(list)
        setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [channel.tvgId])

  useKeyHandler((event) => {
    if (!programs || programs.length === 0) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setSelected((i) => Math.min(i + 1, programs.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setSelected((i) => Math.max(i - 1, 0))
    }
  })

  return (
    <div className="absolute inset-0 z-10 flex animate-fade-in bg-black/80 backdrop-blur-sm">
      <div className="ml-auto flex h-full w-[620px] max-w-full flex-col border-l border-white/10 bg-[#101014]/97">
        <header className="flex items-start gap-4 border-b border-white/10 px-6 py-5">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/5">
            {channel.logo ? (
              <img src={channel.logo} alt="" className="h-full w-full object-contain p-1.5" />
            ) : (
              <CalendarClock size={22} className="text-white/40" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-mmz-orange">
              {t('guide.title')}
            </p>
            <h3 className="truncate text-lg font-extrabold">{channel.name}</h3>
            <p className="truncate text-[11px] text-white/40">{channel.group}</p>
          </div>
          <button
            onClick={() => useStore.getState().toggleGuide(false)}
            className="rounded-full p-2 text-white/50 transition hover:bg-white/10 hover:text-white"
            title={t('player.btnClose')}
          >
            <X size={18} />
          </button>
        </header>

        <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          {loading && (
            <div className="flex h-full items-center justify-center">
              <div className="spinner" />
            </div>
          )}

          {!loading && programs?.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
              <CalendarClock size={34} className="text-white/25" />
              <p className="text-sm font-semibold">{t('guide.emptyTitle')}</p>
              <p className="text-xs leading-relaxed text-white/45">
                {t('guide.emptyDescA')} <code className="text-mmz-orange">tvg-id</code>{' '}
                {t('guide.emptyDescB')}
              </p>
            </div>
          )}

          {!loading &&
            programs?.map((program, index) => {
              const live = isLiveNow(program)
              const focused = index === selected
              return (
                <div
                  key={`${program.start}-${index}`}
                  data-program={index}
                  onClick={() => setSelected(index)}
                  onMouseMove={() => setSelected(index)}
                  className={`cursor-pointer rounded-xl border px-4 py-3 transition-all ${
                    focused
                      ? 'border-transparent bg-white/[0.07] shadow-focus'
                      : live
                        ? 'border-white/10 bg-white/[0.03]'
                        : 'border-transparent'
                  }`}
                >
                  <div className="flex items-baseline gap-3">
                    <span
                      className={`shrink-0 text-xs font-bold tabular-nums ${
                        live ? 'text-mmz-orange' : 'text-white/55'
                      }`}
                    >
                      {formatRange(program)}
                    </span>
                    <p className="truncate text-sm font-semibold text-white/95">{program.title}</p>
                    {live && (
                      <span
                        className="ml-auto shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white"
                        style={{ backgroundImage: 'linear-gradient(90deg,#e60000,#ff6a00)' }}
                      >
                        {t('kind.live')}
                      </span>
                    )}
                  </div>

                  {live && (
                    <>
                      <div className="epg-bar mt-2">
                        <div style={{ width: `${Math.round(progressOf(program) * 100)}%` }} />
                      </div>
                      <p className="mt-1 text-[10px] text-white/40">{remainingLabel(program)}</p>
                    </>
                  )}

                  {focused && program.description && (
                    <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-white/55">
                      {program.description}
                    </p>
                  )}
                </div>
              )
            })}
        </div>

        <footer className="border-t border-white/10 px-6 py-3 text-[10px] uppercase tracking-widest text-white/35">
          {t('guide.footer', { clock: formatClock() })}
        </footer>
      </div>
    </div>
  )
}
