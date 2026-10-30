import { CircleDot, Search, X } from 'lucide-react'
import { useClock } from '../../hooks/useKeyHandler'
import { useT } from '../../hooks/useT'
import { useStore } from '../../store/useStore'
import { formatDay } from '../../utils/time'

const TITLES: Record<string, string> = {
  home: 'top.title.home',
  live: 'top.title.live',
  movies: 'top.title.movies',
  series: 'top.title.series',
  settings: 'top.title.settings'
}

export function TopBar(): JSX.Element {
  const section = useStore((s) => s.section)
  const search = useStore((s) => s.search)
  const setSearch = useStore((s) => s.setSearch)
  const setFocusArea = useStore((s) => s.setFocusArea)
  const setContentFocus = useStore((s) => s.setContentFocus)
  const epgLoaded = useStore((s) => s.epgStats?.loaded ?? false)
  const channelCount = useStore((s) => s.channels.length)
  const clock = useClock()
  const t = useT()

  const searchable = section === 'live' || section === 'movies' || section === 'series'

  return (
    <header className="flex h-[76px] shrink-0 items-center gap-6 border-b border-white/5 bg-[#0f0f12]/80 px-8 backdrop-blur">
      <div className="min-w-0">
        <h1 className="truncate text-xl font-bold tracking-tight">{t(TITLES[section] ?? 'top.title.home')}</h1>
        <p className="mt-0.5 text-[11px] text-white/40">
          {formatDay()} · {t('top.channelsLoaded', { count: channelCount })}
        </p>
      </div>

      <div className="ml-auto flex items-center gap-4">
        {searchable && (
          <div
            title={t('top.searchHint')}
            onClick={() => {
              // Mouse: clicar na busca prepara a área de conteúdo para digitar
              setFocusArea('content')
              setContentFocus('filters')
            }}
            className={`flex h-10 items-center gap-2 rounded-full border px-3 transition-colors ${
              search ? 'border-mmz-orange/70 bg-white/10' : 'border-white/10 bg-white/5 hover:border-white/25'
            }`}
          >
            <Search size={15} className={search ? 'text-mmz-orange' : 'text-white/40'} />
            {search ? (
              <>
                <span className="max-w-[220px] truncate text-sm text-white/90">{search}</span>
                <button
                  onClick={() => setSearch('')}
                  title={t('top.searchClear')}
                  className="ml-1 rounded-full p-0.5 text-white/50 hover:bg-white/10 hover:text-white"
                >
                  <X size={13} />
                </button>
              </>
            ) : (
              <span className="text-xs text-white/35">{t('top.searchHint')}</span>
            )}
          </div>
        )}

        <div
          className="flex h-10 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3"
          title={epgLoaded ? t('top.epgOnTitle') : t('top.epgOffTitle')}
        >
          <CircleDot
            size={13}
            className={epgLoaded ? 'text-emerald-400' : 'text-white/25'}
            strokeWidth={2.5}
          />
          <span className="text-[11px] text-white/50">{epgLoaded ? t('top.epgOn') : t('top.epgOff')}</span>
        </div>

        <div className="flex h-10 items-center rounded-full bg-white/5 px-4">
          <span className="text-sm font-semibold tabular-nums text-white/80">{clock}</span>
        </div>
      </div>
    </header>
  )
}
