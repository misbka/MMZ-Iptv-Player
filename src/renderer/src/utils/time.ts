import type { EpgProgram } from '@shared/types'
import { localeOf, translate } from '@shared/i18n'
import { getRuntimeLanguage } from '@shared/i18n'

function locale(): string {
  return localeOf(getRuntimeLanguage())
}

function tk(key: string, vars?: Record<string, string | number>): string {
  return translate(getRuntimeLanguage(), key, vars)
}

export function formatClock(ts: number | Date = new Date()): string {
  const date = typeof ts === 'number' ? new Date(ts) : ts
  return date.toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' })
}

export function formatDay(ts: number | Date = new Date()): string {
  const date = typeof ts === 'number' ? new Date(ts) : ts
  return date.toLocaleDateString(locale(), {
    weekday: 'long',
    day: '2-digit',
    month: 'long'
  })
}

/** Data curta no formato do idioma corrente (ex.: 30/10/2026). */
export function formatDate(ts: number | Date): string {
  const date = typeof ts === 'number' ? new Date(ts) : ts
  return date.toLocaleDateString(locale(), { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** Data e hora completas no formato do idioma corrente. */
export function formatDateTime(ts: number | Date): string {
  const date = typeof ts === 'number' ? new Date(ts) : ts
  return date.toLocaleString(locale(), {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/** "20:30 - 22:00" */
export function formatRange(program: EpgProgram): string {
  return `${formatClock(program.start)} - ${formatClock(program.stop)}`
}

/** "35 min restantes" / "Termina às 22:00" (localizado). */
export function remainingLabel(program: EpgProgram, now = Date.now()): string {
  const remainingMs = Math.max(0, program.stop - now)
  const minutes = Math.round(remainingMs / 60_000)
  if (minutes <= 0) return tk('time.ending')
  if (minutes < 60) return tk('time.minLeft', { minutes })
  const hours = Math.floor(minutes / 60)
  return tk('time.hoursLeft', { time: `${hours}h${String(minutes % 60).padStart(2, '0')}` })
}

/** Progresso (0..1) do programa atual. */
export function progressOf(program: EpgProgram, now = Date.now()): number {
  const total = program.stop - program.start
  if (total <= 0) return 0
  return Math.min(1, Math.max(0, (now - program.start) / total))
}

export function isLiveNow(program: EpgProgram | undefined, now = Date.now()): boolean {
  return !!program && program.start <= now && program.stop > now
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}
