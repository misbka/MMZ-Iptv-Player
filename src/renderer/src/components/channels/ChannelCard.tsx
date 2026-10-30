import { useState } from 'react'
import type { Channel, NowNext } from '@shared/types'
import { useT } from '../../hooks/useT'
import { useStore } from '../../store/useStore'
import { initialsOf } from '../../store/selectors'
import { progressOf, remainingLabel } from '../../utils/time'

interface Props {
  channel: Channel
  epg?: NowNext
  focused?: boolean
  showGroup?: boolean
  progress?: boolean
  onClick?: () => void
}

/**
 * Card de canal/VOD 16:9 com logo, EPG (programa atual + barra de progresso)
 * e estado de foco de navegação por teclado.
 */
export function ChannelCard({
  channel,
  epg,
  focused = false,
  showGroup = true,
  progress = true,
  onClick
}: Props): JSX.Element {
  const play = useStore((s) => s.play)
  const [logoFailed, setLogoFailed] = useState(false)
  const t = useT()

  const now = epg?.now
  const pct = now ? Math.round(progressOf(now) * 100) : 0

  const handleClick = (): void => {
    if (onClick) onClick()
    else play(channel.id)
  }

  return (
    <button
      onClick={handleClick}
      className={`card-hover group relative flex h-full w-full flex-col overflow-hidden rounded-xl border bg-mmz-surface text-left ${
        focused
          ? 'card-focused z-10 border-transparent shadow-focus'
          : 'border-white/5 hover:border-white/25'
      }`}
    >
      <div className="relative w-full shrink-0 overflow-hidden bg-[#0d0d10]" style={{ aspectRatio: '16 / 9' }}>
        {channel.logo && !logoFailed ? (
          <img
            src={channel.logo}
            alt=""
            loading="lazy"
            onError={() => setLogoFailed(true)}
            className="h-full w-full object-contain p-4"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span
              className={`text-3xl font-extrabold tracking-tight ${
                focused ? 'text-white' : 'text-white/25'
              }`}
            >
              {initialsOf(channel.name)}
            </span>
          </div>
        )}

        {showGroup && (
          <span className="absolute left-2 top-2 max-w-[70%] truncate rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white/70">
            {channel.group}
          </span>
        )}

        {focused && (
          <div className="pointer-events-none absolute inset-0 border-2 border-white/80" />
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-1 px-3 py-2">
        <p className="truncate text-[13px] font-semibold leading-tight text-white/95">
          {channel.name}
        </p>
        {now ? (
          <>
            <p className="truncate text-[11px] leading-tight text-white/55">{now.title}</p>
            {progress && (
              <div className="mt-auto">
                <div className="epg-bar">
                  <div style={{ width: `${pct}%` }} />
                </div>
                <p className="mt-1 text-[9px] uppercase tracking-wide text-white/35">
                  {remainingLabel(now)}
                </p>
              </div>
            )}
          </>
        ) : (
          <p className="mt-auto text-[10px] uppercase tracking-wide text-white/25">
            {t(`kind.${channel.kind}`)}
          </p>
        )}
      </div>
    </button>
  )
}
