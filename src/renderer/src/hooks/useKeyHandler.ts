import { useEffect, useRef, useState } from 'react'
import { getRuntimeLanguage, localeOf } from '@shared/i18n'

/**
 * Registra um listener global de teclado.
 * Ignora eventos originados em campos de edição (inputs/textarea) — exceto quando
 * `allowInInputs` é true — para que a digitação funcione normalmente.
 */
export function useKeyHandler(
  handler: (event: KeyboardEvent) => void,
  active = true,
  allowInInputs = false
): void {
  const saved = useRef(handler)
  saved.current = handler

  useEffect(() => {
    if (!active) return
    const listener = (event: KeyboardEvent) => {
      if (!allowInInputs && isEditableTarget(event.target)) return
      saved.current(event)
    }
    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [active, allowInInputs])
}

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable
}

/** Relógio de tela (exibido no topo), atualizado a cada 30 segundos. */
export function useClock(intervalMs = 30_000): string {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])

  return now.toLocaleTimeString(localeOf(getRuntimeLanguage()), { hour: '2-digit', minute: '2-digit' })
}
