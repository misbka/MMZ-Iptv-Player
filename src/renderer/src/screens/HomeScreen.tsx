import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronRight, Play, Radio } from 'lucide-react'
import type { Channel } from '@shared/types'
import { useKeyHandler } from '../hooks/useKeyHandler'
import { useT } from '../hooks/useT'
import { useStore } from '../store/useStore'
import { categoriesOf } from '../store/selectors'
import { ChannelCard } from '../components/channels/ChannelCard'
import { EmptyState } from '../components/ui/EmptyState'

const ROWS_COUNT = 4
const ITEMS_PER_ROW = 8

/**
 * Home inspirada na TV+: Hero em destaque + linhas horizontais por categoria.
 * Navegação: ↑ ↓ entre hero/linhas, ← → dentro da linha, Enter para assistir.
 */
export function HomeScreen(): JSX.Element {
  const channels = useStore((s) => s.channels)
  const epg = useStore((s) => s.epg)
  const focusArea = useStore((s) => s.focusArea)
  const playerOpen = useStore((s) => s.player.isOpen)
  const play = useStore((s) => s.play)
  const setSection = useStore((s) => s.setSection)
  const setFocusArea = useStore((s) => s.setFocusArea)
  const t = useT()

  const liveChannels = useMemo(() => channels.filter((ch) => ch.kind === 'live'), [channels])

  const featured: Channel | undefined = useMemo(() => {
    if (liveChannels.length === 0) return undefined
    const withLogo = liveChannels.find((ch) => ch.logo && ch.tvgId && epg[ch.tvgId]?.now)
    return withLogo ?? liveChannels.find((ch) => ch.logo) ?? liveChannels[0]
  }, [liveChannels, epg])

  const rows = useMemo(() => {
    const categories = categoriesOf(liveChannels).slice(0, ROWS_COUNT)
    return categories.map((category) => ({
      title: category.name,
      items: liveChannels.filter((ch) => ch.group === category.name).slice(0, ITEMS_PER_ROW)
    }))
  }, [liveChannels])

  // posição: row -1 = hero, 0..rows.length-1 = linhas
  const [position, setPosition] = useState({ row: -1, col: 0 })
  const active = focusArea === 'content' && !playerOpen
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setPosition({ row: -1, col: 0 })
  }, [rows.length])

  // Rola até o item focado (linhas da home não usam virtualização)
  useEffect(() => {
    const el = scrollRef.current?.querySelector<HTMLElement>(
      `[data-home-item="${position.row}-${position.col}"]`
    )
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [position])

  useKeyHandler(
    (event) => {
      switch (event.key) {
        case 'ArrowDown': {
          event.preventDefault()
          setPosition((p) => {
            const nextRow = Math.min(p.row + 1, rows.length - 1)
            const maxCol = nextRow === -1 ? 0 : Math.max(0, rows[nextRow].items.length - 1)
            return { row: nextRow, col: Math.min(p.col, maxCol) }
          })
          break
        }
        case 'ArrowUp': {
          event.preventDefault()
          setPosition((p) => {
            if (p.row <= -1) {
              setFocusArea('sidebar')
              return p
            }
            const nextRow = p.row - 1
            const maxCol = nextRow === -1 ? 0 : Math.max(0, rows[nextRow].items.length - 1)
            return { row: nextRow, col: Math.min(p.col, maxCol) }
          })
          break
        }
        case 'ArrowRight': {
          event.preventDefault()
          setPosition((p) => {
            if (p.row === -1) return p
            return { ...p, col: Math.min(p.col + 1, Math.max(0, rows[p.row].items.length - 1)) }
          })
          break
        }
        case 'ArrowLeft': {
          event.preventDefault()
          setPosition((p) => {
            if (p.row === -1) return p
            if (p.col === 0) {
              setFocusArea('sidebar')
              return p
            }
            return { ...p, col: p.col - 1 }
          })
          break
        }
        case 'Enter':
        case ' ': {
          event.preventDefault()
          if (position.row === -1) {
            if (featured) play(featured.id)
          } else {
            const channel = rows[position.row].items[position.col]
            if (channel) play(channel.id)
          }
          break
        }
        default:
          break
      }
    },
    active
  )

  if (channels.length === 0) {
    return (
      <div className="h-full w-full">
        <EmptyState
          title={t('home.welcome')}
          description={t('home.welcomeDesc')}
          actionLabel={t('home.addPlaylist')}
          onAction={() => setSection('settings')}
          focused
        />
      </div>
    )
  }

  const featuredEpg = featured?.tvgId ? epg[featured.tvgId] : undefined
  const heroActive = active && position.row === -1

  return (
    <div ref={scrollRef} className="h-full w-full overflow-y-auto no-scrollbar">
      {/* ---------- HERO ---------- */}
      <section className="relative h-[42%] min-h-[280px] w-full shrink-0 overflow-hidden" data-home-item="-1-0">
        {featured?.logo ? (
          <img
            src={featured.logo}
            alt=""
            className="absolute inset-0 h-full w-full scale-110 object-cover opacity-25 blur-2xl"
            onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-r from-mmz-bg via-mmz-bg/85 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-mmz-bg to-transparent" />

        <div className="relative flex h-full items-center gap-8 px-8">
          <div
            className={`flex h-[72%] max-h-[240px] w-[300px] shrink-0 items-center justify-center overflow-hidden rounded-2xl border bg-black/40 transition-all duration-200 ${
              heroActive ? 'border-transparent shadow-focus' : 'border-white/10'
            }`}
          >
            {featured?.logo ? (
              <img
                src={featured.logo}
                alt=""
                className="h-full w-full object-contain p-6"
                onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
              />
            ) : (
              <Radio size={54} className="text-white/20" />
            )}
          </div>

          <div className="min-w-0 max-w-xl">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.22em] text-mmz-orange">
              {t('home.featured')}
            </p>
            <h2 className="truncate text-4xl font-extrabold leading-tight tracking-tight">
              {featured?.name ?? t('home.featuredName')}
            </h2>
            <p className="mt-1 text-sm text-white/45">{featured?.group ?? ''}</p>

            {featuredEpg?.now ? (
              <div className="mt-4 max-w-md">
                <p className="text-sm font-semibold text-white/90">{featuredEpg.now.title}</p>
                <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-white/50">
                  {featuredEpg.now.description ?? t('home.noSynopsis')}
                </p>
              </div>
            ) : null}

            <button
              onClick={() => featured && play(featured.id)}
              className={`mt-6 flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-white transition-all ${
                heroActive ? 'shadow-focus brightness-110' : 'hover:brightness-110'
              }`}
              style={{ backgroundImage: 'linear-gradient(90deg, #e60000 0%, #ff6a00 100%)' }}
            >
              <Play size={16} fill="white" />
              {t('home.watchNow')}
            </button>
          </div>
        </div>
      </section>

      {/* ---------- LINHAS POR CATEGORIA ---------- */}
      <section className="space-y-5 pb-10 pt-2">
        {rows.map((row, rowIndex) => (
          <div key={row.title}>
            <div className="mb-2 flex items-center gap-2 px-8">
              <h3 className="text-base font-bold text-white/90">{row.title}</h3>
              <button
                onClick={() => {
                  useStore.getState().setActiveCategory(row.title)
                  setSection('live')
                }}
                className="flex items-center gap-1 text-[11px] font-semibold text-white/40 transition-colors hover:text-mmz-orange"
              >
                {t('home.seeAll')} <ChevronRight size={12} />
              </button>
            </div>

            <div className="flex gap-4 overflow-x-auto px-8 pb-3">
              {row.items.map((channel, colIndex) => (
                <div
                  key={channel.id}
                  data-home-item={`${rowIndex}-${colIndex}`}
                  onMouseMove={() => {
                    if (!active) return
                    setPosition({ row: rowIndex, col: colIndex })
                  }}
                  className="h-[200px] w-[224px] shrink-0"
                >
                  <ChannelCard
                    channel={channel}
                    epg={channel.tvgId ? epg[channel.tvgId] : undefined}
                    focused={active && position.row === rowIndex && position.col === colIndex}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}

        {rows.length === 0 && (
          <p className="px-8 text-sm text-white/40">{t('home.emptyLive')}</p>
        )}
      </section>
    </div>
  )
}
