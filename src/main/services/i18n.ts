import { translate } from '../../shared/i18n'
import type { TranslateVars } from '../../shared/i18n'
import * as storage from './storage'

/**
 * Tradução no processo principal: lê o idioma salvo em settings
 * (atualizado em Configurações → Preferências → Idioma).
 */
export function t(key: string, vars?: TranslateVars): string {
  return translate(storage.getSettings().language, key, vars)
}
