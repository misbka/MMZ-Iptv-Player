import { Keyboard, ListVideo, TvMinimal } from 'lucide-react'
import { useT } from '../../hooks/useT'

interface Props {
  icon?: 'tv' | 'movies' | 'series' | 'keyboard'
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  focused?: boolean
}

const ICONS = {
  tv: TvMinimal,
  movies: ListVideo,
  series: ListVideo,
  keyboard: Keyboard
}

/** Estado vazio amigável com chamada para ação (navegável por teclado). */
export function EmptyState({
  icon = 'tv',
  title,
  description,
  actionLabel,
  onAction,
  focused = false
}: Props): JSX.Element {
  const Icon = ICONS[icon]
  const t = useT()

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 px-8 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
        <Icon size={34} className="text-white/35" strokeWidth={1.6} />
      </div>
      <h2 className="text-2xl font-bold">{title}</h2>
      <p className="max-w-md text-sm leading-relaxed text-white/50">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className={`mt-2 rounded-full px-6 py-2.5 text-sm font-semibold text-white transition-all ${
            focused ? 'shadow-focus' : 'hover:brightness-110'
          }`}
          style={{ backgroundImage: 'linear-gradient(90deg, #e60000 0%, #ff6a00 100%)' }}
        >
          {actionLabel}
        </button>
      )}
      <p className="mt-2 text-[11px] text-white/30">{t('empty.hint')}</p>
    </div>
  )
}
