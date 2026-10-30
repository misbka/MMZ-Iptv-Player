import { useCallback } from 'react'
import { translate } from '@shared/i18n'
import type { TranslateVars } from '@shared/i18n'
import { useStore } from '../store/useStore'

export type TFunction = (key: string, vars?: TranslateVars) => string

/**
 * Hook de tradução: re-renderiza quando o idioma muda em Preferências.
 * Uso: `const t = useT()` → `t('settings.addList')`.
 */
export function useT(): TFunction {
  const language = useStore((s) => s.settings.language)
  return useCallback(
    (key: string, vars?: TranslateVars) => translate(language, key, vars),
    [language]
  )
}

/** Tradução fora de componentes React (usa o idioma corrente do store). */
export function translateNow(key: string, vars?: TranslateVars): string {
  return translate(useStore.getState().settings.language, key, vars)
}
