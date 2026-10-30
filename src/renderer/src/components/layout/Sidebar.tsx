import {
  Clapperboard,
  Home,
  Radio,
  Settings,
  Tv
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Section } from '@shared/types'
import { useKeyHandler } from '../../hooks/useKeyHandler'
import { useT } from '../../hooks/useT'
import { useStore } from '../../store/useStore'

interface NavItem {
  id: Section
  labelKey: string
  icon: LucideIcon
}

const ITEMS: NavItem[] = [
  { id: 'home', labelKey: 'sidebar.home', icon: Home },
  { id: 'live', labelKey: 'sidebar.live', icon: Radio },
  { id: 'movies', labelKey: 'sidebar.movies', icon: Clapperboard },
  { id: 'series', labelKey: 'sidebar.series', icon: Tv },
  { id: 'settings', labelKey: 'sidebar.settings', icon: Settings }
]

/**
 * Menu lateral fixo (estilo Claro TV+ / Android TV).
 * Navegação: ↑ ↓ para mover, Enter para abrir, → para ir ao conteúdo.
 * Clicável com o mouse (hover sincroniza o foco).
 */
export function Sidebar(): JSX.Element {
  const section = useStore((s) => s.section)
  const focusArea = useStore((s) => s.focusArea)
  const setSection = useStore((s) => s.setSection)
  const selectSection = useStore((s) => s.selectSection)
  const setFocusArea = useStore((s) => s.setFocusArea)
  const playerOpen = useStore((s) => s.player.isOpen)
  const t = useT()

  const active = focusArea === 'sidebar' && !playerOpen

  useKeyHandler(
    (event) => {
      const currentIndex = ITEMS.findIndex((item) => item.id === section)

      switch (event.key) {
        case 'ArrowDown': {
          event.preventDefault()
          const next = Math.min(currentIndex + 1, ITEMS.length - 1)
          selectSection(ITEMS[next].id)
          break
        }
        case 'ArrowUp': {
          event.preventDefault()
          const next = Math.max(currentIndex - 1, 0)
          selectSection(ITEMS[next].id)
          break
        }
        case 'ArrowRight':
        case 'Enter':
        case ' ': {
          event.preventDefault()
          setFocusArea('content')
          break
        }
        default:
          break
      }
    },
    active
  )

  return (
    <nav
      className={`relative z-20 flex h-full w-[112px] shrink-0 flex-col border-r border-white/5 bg-[#0f0f12] transition-all duration-300 ${
        focusArea === 'sidebar' ? 'w-[132px] bg-[#131317]' : ''
      }`}
    >
      <div className="flex h-[76px] items-center justify-center">
        <div className="flex flex-col items-center leading-none">
          <span className="text-2xl font-extrabold tracking-tight gradient-text">MMZ</span>
          <span className="mt-1 text-[9px] font-semibold tracking-[0.28em] text-white/45">
            IPTV PLAYER
          </span>
        </div>
      </div>

      <div className="mt-3 flex flex-1 flex-col gap-1.5 px-2">
        {ITEMS.map((item) => {
          const Icon = item.icon
          const selected = section === item.id
          const focused = selected && focusArea === 'sidebar'

          return (
            <button
              key={item.id}
              onClick={() => {
                setSection(item.id)
                setFocusArea('content')
              }}
              onMouseMove={() => {
                if (playerOpen) return
                setFocusArea('sidebar')
              }}
              data-focusable
              className={`group relative flex h-[68px] w-full flex-col items-center justify-center gap-1.5 rounded-xl transition-all duration-200 ${
                selected
                  ? focused
                    ? 'bg-white/10 text-white shadow-focus'
                    : 'bg-white/[0.06] text-white'
                  : 'text-white/45 hover:bg-white/5 hover:text-white/80'
              }`}
            >
              {selected && (
                <span
                  className={`absolute left-0 top-1/2 h-8 w-[3px] -translate-y-1/2 rounded-r-full transition-all ${
                    focused ? 'bg-mmz-orange opacity-100' : 'bg-mmz-red opacity-70'
                  }`}
                />
              )}
              <Icon size={22} strokeWidth={selected ? 2.2 : 1.8} />
              <span className={`text-[11px] ${selected ? 'font-semibold' : 'font-medium'}`}>
                {t(item.labelKey)}
              </span>
            </button>
          )
        })}
      </div>

      <div className="px-4 pb-5 text-center text-[10px] leading-relaxed text-white/25">
        {focusArea === 'sidebar' ? t('sidebar.hintNav') : t('sidebar.hintBack')}
      </div>
    </nav>
  )
}
