import { useEffect, useRef } from 'react'
import type { Category } from '@shared/types'
import { useKeyHandler } from '../../hooks/useKeyHandler'
import { useT } from '../../hooks/useT'
import { useStore } from '../../store/useStore'

interface Props {
  categories: Category[]
}

/**
 * Barra horizontal de filtros rápidos (categorias/grupos da lista M3U).
 * Navegação: ← → para trocar categoria, ↓ ou Enter para ir para a grade, ← no início volta ao menu.
 */
export function CategoryBar({ categories }: Props): JSX.Element {
  const activeCategory = useStore((s) => s.activeCategory)
  const setActiveCategory = useStore((s) => s.setActiveCategory)
  const contentFocus = useStore((s) => s.contentFocus)
  const setContentFocus = useStore((s) => s.setContentFocus)
  const setFocusArea = useStore((s) => s.setFocusArea)
  const playerOpen = useStore((s) => s.player.isOpen)

  const active = contentFocus === 'filters' && !playerOpen
  const chipsRef = useRef<HTMLDivElement>(null)
  const t = useT()

  const items: Category[] = [{ name: 'Todos', count: 0 }, ...categories]
  const currentIndex = Math.max(
    0,
    items.findIndex((c) => c.name === activeCategory)
  )

  // Mantém o chip ativo visível
  useEffect(() => {
    const el = chipsRef.current?.querySelector<HTMLElement>(`[data-category="${CSS.escape(items[currentIndex]?.name ?? 'Todos')}"]`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [currentIndex, items])

  useKeyHandler(
    (event) => {
      switch (event.key) {
        case 'ArrowRight': {
          event.preventDefault()
          const next = Math.min(currentIndex + 1, items.length - 1)
          setActiveCategory(items[next].name)
          break
        }
        case 'ArrowLeft': {
          event.preventDefault()
          if (currentIndex <= 0) {
            setFocusArea('sidebar')
          } else {
            setActiveCategory(items[currentIndex - 1].name)
          }
          break
        }
        case 'ArrowDown':
        case 'Enter':
        case ' ': {
          event.preventDefault()
          setContentFocus('grid')
          break
        }
        case 'ArrowUp': {
          event.preventDefault()
          break
        }
        default:
          break
      }
    },
    active
  )

  return (
    <div
      ref={chipsRef}
      className="flex shrink-0 items-center gap-2 overflow-x-auto px-8 py-3"
    >
      {items.map((category) => {
        const selected = category.name === activeCategory
        const focused = selected && active
        const label = category.name === 'Todos' ? t('category.all') : category.name
        return (
          <button
            key={category.name}
            data-category={category.name}
            onClick={() => {
              setActiveCategory(category.name)
              setContentFocus('grid')
            }}
            onMouseMove={() => {
              if (!playerOpen) setContentFocus('filters')
            }}
            className={`flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all duration-150 ${
              selected
                ? focused
                  ? 'border-transparent text-white shadow-focus'
                  : 'border-transparent text-white/80 hover:brightness-125'
                : 'border-white/10 bg-white/[0.04] text-white/55 hover:border-white/25 hover:bg-white/10 hover:text-white/80'
            }`}
            style={
              selected
                ? { backgroundImage: 'linear-gradient(90deg, #e60000 0%, #ff6a00 100%)' }
                : undefined
            }
          >
            <span className="max-w-[190px] truncate">{label}</span>
            {category.count > 0 && (
              <span
                className={`rounded-full px-1.5 text-[10px] ${
                  selected ? 'bg-black/25 text-white' : 'bg-white/10 text-white/50'
                }`}
              >
                {category.count}
              </span>
            )}
            {focused && <span className="sr-only">{t('category.selected')}</span>}
          </button>
        )
      })}
    </div>
  )
}
