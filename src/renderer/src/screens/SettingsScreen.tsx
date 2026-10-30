import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Download,
  FileUp,
  Globe,
  ListVideo,
  Link2,
  RefreshCw,
  Satellite,
  Trash2,
  Tv
} from 'lucide-react'
import { LANGUAGES } from '@shared/i18n'
import { useKeyHandler } from '../hooks/useKeyHandler'
import { useT } from '../hooks/useT'
import { useStore } from '../store/useStore'
import { formatDate, formatDateTime } from '../utils/time'

/**
 * Navegação vertical por teclado entre os controles da tela de configurações.
 * Enter ativa o elemento (inputs recebem foco para digitação).
 */
function useVerticalNav(
  containerRef: React.RefObject<HTMLElement>,
  active: boolean,
  onEscapeInInput?: () => void
): number {
  const [index, setIndex] = useState(0)

  const items = useCallback(
    () => Array.from(containerRef.current?.querySelectorAll<HTMLElement>('[data-nav]') ?? []),
    [containerRef]
  )

  useEffect(() => {
    const list = items()
    if (list.length === 0) return
    const safeIndex = Math.min(index, list.length - 1)
    list.forEach((el, i) => {
      if (i === safeIndex) el.setAttribute('data-nav-focused', 'true')
      else el.removeAttribute('data-nav-focused')
    })
    list[safeIndex]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [index, items])

  useKeyHandler(
    (event) => {
      const target = event.target as HTMLElement
      const typing = target.tagName === 'INPUT'

      if (typing) {
        if (event.key === 'Escape') {
          event.preventDefault()
          target.blur()
          onEscapeInInput?.()
        }
        return
      }

      const list = items()
      if (list.length === 0) return

      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setIndex((i) => Math.min(i + 1, list.length - 1))
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        setIndex((i) => Math.max(i - 1, 0))
      } else if (event.key === 'Enter' || event.key === ' ') {
        const el = list[Math.min(index, list.length - 1)]
        if (!el) return
        event.preventDefault()
        if (el.tagName === 'INPUT') {
          ;(el as HTMLInputElement).focus()
        } else {
          el.click()
        }
      }
    },
    active,
    true
  )

  return index
}

function Field(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }): JSX.Element {
  const { label, ...rest } = props
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-1.5">
      <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">{label}</span>
      <input
        {...rest}
        data-nav
        className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white placeholder:text-white/25 focus:border-mmz-orange/70 focus:bg-white/10"
      />
    </label>
  )
}

function Button(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' }
): JSX.Element {
  const { variant = 'ghost', className = '', ...rest } = props
  const styles =
    variant === 'primary'
      ? 'text-white'
      : variant === 'danger'
        ? 'border border-red-500/30 bg-red-500/10 text-red-200 hover:bg-red-500/20'
        : 'border border-white/10 bg-white/5 text-white/85 hover:bg-white/10'

  return (
    <button
      {...rest}
      data-nav
      className={`flex h-11 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition-all ${styles} ${className}`}
      style={variant === 'primary' ? { backgroundImage: 'linear-gradient(90deg,#e60000,#ff6a00)' } : undefined}
    />
  )
}

/**
 * Configurações: gerenciador de listas M3U, fonte de EPG (XMLTV) e preferências.
 * Totalmente navegável por teclado/controle remoto.
 */
export function SettingsScreen(): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const playlists = useStore((s) => s.playlists)
  const epgStats = useStore((s) => s.epgStats)
  const settings = useStore((s) => s.settings)
  const version = useStore((s) => s.version)
  const focusArea = useStore((s) => s.focusArea)
  const t = useT()

  const [listName, setListName] = useState('')
  const [listUrl, setListUrl] = useState('')
  const [epgName, setEpgName] = useState('')
  const [epgUrl, setEpgUrl] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  useVerticalNav(containerRef, focusArea === 'content')

  const addPlaylist = async (): Promise<void> => {
    if (!listUrl.trim()) {
      useStore.getState().showToast(t('settings.errListUrl'), 'error')
      return
    }
    setBusy('playlist')
    try {
      const error = await useStore.getState().addPlaylist(listName, listUrl)
      if (error) useStore.getState().showToast(error, 'error')
      else {
        setListName('')
        setListUrl('')
      }
    } catch (err) {
      useStore.getState().showToast((err as Error)?.message ?? t('toast.addFailed'), 'error')
    } finally {
      setBusy(null)
    }
  }

  const pickPlaylistFile = async (): Promise<void> => {
    const file = await window.mmz.dialog.openFile([
      { name: t('settings.filterPlaylist'), extensions: ['m3u', 'm3u8', 'txt'] },
      { name: t('settings.filterAll'), extensions: ['*'] }
    ])
    if (!file) return
    setListUrl(file)
  }

  const loadEpg = async (): Promise<void> => {
    if (!epgUrl.trim()) {
      useStore.getState().showToast(t('settings.errEpgUrl'), 'error')
      return
    }
    setBusy('epg')
    try {
      const error = await useStore.getState().loadEpg(epgName, epgUrl)
      if (error) useStore.getState().showToast(error, 'error')
      else setEpgUrl('')
    } catch (err) {
      useStore.getState().showToast((err as Error)?.message ?? t('toast.epgFailed'), 'error')
    } finally {
      setBusy(null)
    }
  }

  const pickEpgFile = async (): Promise<void> => {
    const file = await window.mmz.dialog.openFile([
      { name: t('settings.filterEpg'), extensions: ['xml', 'xmltv', 'gz'] },
      { name: t('settings.filterAll'), extensions: ['*'] }
    ])
    if (!file) return
    setEpgUrl(file)
  }

  return (
    <div ref={containerRef} className="h-full w-full overflow-y-auto px-8 py-6">
      <div className="mx-auto max-w-3xl space-y-8 pb-16">
        {/* ---------------------- Listas M3U ---------------------- */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <ListVideo size={20} className="text-mmz-orange" />
            <div>
              <h2 className="text-lg font-bold">{t('settings.listTitle')}</h2>
              <p className="text-xs text-white/45">{t('settings.listDesc')}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-mmz-surface p-5">
            <div className="flex flex-wrap items-end gap-3">
              <Field
                label={t('settings.fieldListName')}
                placeholder={t('settings.fieldListNamePh')}
                value={listName}
                onChange={(e) => setListName(e.target.value)}
              />
              <Field
                label={t('settings.fieldListUrl')}
                placeholder={t('settings.fieldListUrlPh')}
                value={listUrl}
                onChange={(e) => setListUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void addPlaylist()
                }}
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button variant="primary" onClick={() => void addPlaylist()} disabled={busy === 'playlist'}>
                <Download size={16} />
                {busy === 'playlist' ? t('settings.adding') : t('settings.addList')}
              </Button>
              <Button onClick={() => void pickPlaylistFile()}>
                <FileUp size={16} />
                {t('settings.pickFile')}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {playlists.length === 0 && (
              <p className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-xs text-white/40">
                {t('settings.noLists')}
              </p>
            )}
            {playlists.map((playlist) => (
              <div
                key={playlist.id}
                className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{playlist.name}</p>
                  <p className="truncate text-[11px] text-white/40">
                    {t('settings.channelsCount', { count: playlist.channelCount })} ·{' '}
                    {playlist.kind === 'local' ? t('settings.srcLocal') : t('settings.srcRemote')} ·{' '}
                    {t('settings.updatedAt', { date: formatDate(playlist.updatedAt) })}
                  </p>
                </div>
                <Button
                  onClick={() => void useStore.getState().refreshPlaylist(playlist.id)}
                  title={t('settings.refreshTitle')}
                >
                  <RefreshCw size={15} />
                  {t('settings.refresh')}
                </Button>
                <Button variant="danger" onClick={() => void useStore.getState().removePlaylist(playlist.id)}>
                  <Trash2 size={15} />
                  {t('settings.remove')}
                </Button>
              </div>
            ))}
          </div>
        </section>

        {/* ------------------------- EPG ------------------------- */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <Satellite size={20} className="text-mmz-orange" />
            <div>
              <h2 className="text-lg font-bold">{t('settings.epgTitle')}</h2>
              <p className="text-xs text-white/45">
                {t('settings.epgDescA')} <code className="text-white/70">tvg-id</code>.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-mmz-surface p-5">
            <div className="flex flex-wrap items-end gap-3">
              <Field
                label={t('settings.fieldEpgName')}
                placeholder={t('settings.fieldEpgNamePh')}
                value={epgName}
                onChange={(e) => setEpgName(e.target.value)}
              />
              <Field
                label={t('settings.fieldEpgUrl')}
                placeholder={t('settings.fieldEpgUrlPh')}
                value={epgUrl}
                onChange={(e) => setEpgUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void loadEpg()
                }}
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button variant="primary" onClick={() => void loadEpg()} disabled={busy === 'epg'}>
                <Link2 size={16} />
                {busy === 'epg' ? t('settings.loadingEpg') : t('settings.loadEpg')}
              </Button>
              <Button onClick={() => void pickEpgFile()}>
                <FileUp size={16} />
                {t('settings.pickFile')}
              </Button>
              <Button
                variant="danger"
                onClick={() => void useStore.getState().clearEpg()}
                disabled={!epgStats?.loaded}
              >
                <Trash2 size={16} />
                {t('settings.clearEpg')}
              </Button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1 border-t border-white/5 pt-4 text-[11px] text-white/50">
              <span>
                {t('settings.status')}{' '}
                <span className={epgStats?.loaded ? 'text-emerald-400' : 'text-white/60'}>
                  {epgStats?.loaded ? t('settings.statusLoaded') : t('settings.statusNotLoaded')}
                </span>
              </span>
              {epgStats?.loaded && (
                <>
                  <span>{t('settings.epgChannels', { count: epgStats.channels })}</span>
                  <span>{t('settings.epgPrograms', { count: epgStats.programs })}</span>
                  <span>
                    {t('settings.epgUpdated', {
                      date: formatDateTime(epgStats.updatedAt ?? Date.now())
                    })}
                  </span>
                </>
              )}
            </div>
          </div>
        </section>

        {/* --------------------- Preferências --------------------- */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold">{t('settings.prefs')}</h2>
          <div className="rounded-2xl border border-white/10 bg-mmz-surface p-5 space-y-5">
            <label className="flex cursor-pointer items-center gap-3" data-nav>
              <input
                type="checkbox"
                checked={settings.autoRefreshPlaylists}
                onChange={(e) => void useStore.getState().updateSettings({ autoRefreshPlaylists: e.target.checked })}
                className="h-4 w-4 accent-[#ff6a00]"
              />
              <span className="text-sm">{t('settings.autoRefresh')}</span>
            </label>

            <label className="flex cursor-pointer items-center gap-3" data-nav>
              <input
                type="checkbox"
                checked={settings.includeLinearVod}
                onChange={(e) => void useStore.getState().updateSettings({ includeLinearVod: e.target.checked })}
                className="h-4 w-4 accent-[#ff6a00]"
              />
              <span className="min-w-0 flex-1">
                <span className="block text-sm">{t('settings.vodLinearLabel')}</span>
                <span className="mt-0.5 block text-[11px] leading-relaxed text-white/40">
                  {t('settings.vodLinearHint')}
                </span>
              </span>
            </label>

            <div className="border-t border-white/5 pt-4">
              <div className="mb-2 flex items-center gap-2">
                <Globe size={15} className="text-mmz-orange" />
                <span className="text-sm font-semibold">{t('settings.language')}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map((lang) => {
                  const selected = settings.language === lang.id
                  return (
                    <button
                      key={lang.id}
                      data-nav
                      onClick={() => void useStore.getState().updateSettings({ language: lang.id })}
                      className={`rounded-full border px-4 py-2 text-xs font-semibold transition-all ${
                        selected
                          ? 'border-transparent text-white shadow-focus'
                          : 'border-white/10 bg-white/[0.04] text-white/60 hover:border-white/25 hover:bg-white/10 hover:text-white'
                      }`}
                      style={
                        selected
                          ? { backgroundImage: 'linear-gradient(90deg,#e60000,#ff6a00)' }
                          : undefined
                      }
                    >
                      {lang.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------- Sobre ------------------------- */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold">{t('settings.about')}</h2>
          <div className="rounded-2xl border border-white/10 bg-mmz-surface p-5 text-xs leading-relaxed text-white/55">
            <p className="flex items-center gap-2 text-sm font-semibold text-white/90">
              <Tv size={16} className="text-mmz-orange" /> MMZ IPTV PLAYER v{version}
            </p>
            <p className="mt-2">{t('settings.aboutDesc')}</p>
            <p className="mt-2">{t('settings.aboutKeys')}</p>
          </div>
        </section>
      </div>
    </div>
  )
}
