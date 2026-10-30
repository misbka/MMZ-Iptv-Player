import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import { isAbsolute, resolve } from 'path'
import { fileURLToPath } from 'url'
import { gunzipSync } from 'zlib'
import { t } from './i18n'

export const USER_AGENT = 'MMZ-IPTV-Player/1.0 (Windows NT 10.0; Linux; x64)'

/**
 * User-Agent de navegador: usado como 2ª tentativa quando o servidor bloqueia
 * clientes não comuns (Cloudflare/WAF costumam responder 403/999).
 */
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

/** Status que indicam bloqueio de "cliente não navegador" → repetir com UA de browser. */
const RETRY_STATUSES = new Set([403, 405, 406, 451, 999])

/** Retorna true quando a fonte é um arquivo local (caminho ou file://). */
export function isLocalSource(source: string): boolean {
  if (/^file:\/\//i.test(source)) return true
  if (/^https?:\/\//i.test(source)) return false
  return existsSync(resolveLocalPath(source))
}

function resolveLocalPath(p: string): string {
  return isAbsolute(p) ? p : resolve(process.cwd(), p)
}

async function fetchWithUa(
  url: string,
  userAgent: string,
  signal: AbortSignal
): Promise<Response> {
  return fetch(url, {
    signal,
    redirect: 'follow',
    headers: {
      'User-Agent': userAgent,
      Accept: '*/*;q=0.8, application/octet-stream;q=0.6, text/plain;q=0.4'
    }
  })
}

/**
 * Lê uma fonte (URL http(s), file:// ou caminho local) como buffer bruto.
 * Timeout generoso, pois listas IPTV costumam ser servidas por redes instáveis.
 * URLs sem esquema/sem arquivo existente recebem uma mensagem clara de erro.
 */
export async function readSourceBuffer(source: string, timeoutMs = 45000): Promise<Buffer> {
  const trimmed = source.trim()

  if (/^file:\/\//i.test(trimmed)) {
    return readFile(fileURLToPath(trimmed))
  }

  if (!/^https?:\/\//i.test(trimmed)) {
    // Outro esquema (ftp://, https:/…) → claramente não é uma fonte suportada
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) throw new Error(t('err.badSource'))
    const local = resolveLocalPath(trimmed)
    if (!existsSync(local)) {
      // Sem extensão de arquivo conhecida e com aparência de endereço
      // (ex.: "pastebin.com/raw/abc") → provável URL digitada sem http://
      const looksLikeUrl =
        /^[a-z0-9-]+(\.[a-z0-9-]+)+([/?#]|$)/i.test(trimmed) &&
        !/\.(m3u8?|xml|xmltv|gz|txt|json|mp4|mkv)$/i.test(trimmed)
      if (looksLikeUrl) throw new Error(t('err.badSource'))
      throw new Error(t('err.fileNotFound', { path: trimmed }))
    }
    return readFile(local)
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    let res: Response
    try {
      res = await fetchWithUa(trimmed, USER_AGENT, controller.signal)
      if (RETRY_STATUSES.has(res.status)) {
        // 2ª tentativa com UA de navegador antes de desistir
        res = await fetchWithUa(trimmed, BROWSER_UA, controller.signal)
      }
    } catch (err) {
      const e = err as Error
      if (e.name === 'AbortError' || e.name === 'TimeoutError') throw e
      // Falha de rede no 1º UA raramente muda com o 2º; tenta só por segurança
      res = await fetchWithUa(trimmed, BROWSER_UA, controller.signal)
    }
    if (!res.ok) {
      throw new Error(t('err.httpStatus', { status: res.status, statusText: res.statusText }))
    }
    const arrayBuffer = await res.arrayBuffer()
    return Buffer.from(arrayBuffer)
  } catch (err) {
    const e = err as Error
    if (e.name === 'AbortError' || e.name === 'TimeoutError') {
      throw new Error(t('err.timeout'))
    }
    if (e instanceof TypeError) {
      throw new Error(t('err.connect'))
    }
    throw new Error(e.message || t('err.download'))
  } finally {
    clearTimeout(timer)
  }
}

/** Descompacta gzip quando o conteúdo tiver o magic number 1f 8b (ex.: epg.xml.gz). */
export function maybeGunzip(buffer: Buffer): Buffer {
  if (buffer.length > 2 && buffer[0] === 0x1f && buffer[1] === 0x8b) {
    try {
      return gunzipSync(buffer)
    } catch {
      return buffer
    }
  }
  return buffer
}

/** Lê a fonte como texto (descompactando gzip quando necessário) e remove BOM. */
export async function readSource(source: string, timeoutMs = 45000): Promise<string> {
  const buffer = maybeGunzip(await readSourceBuffer(source, timeoutMs))
  return buffer.toString('utf-8').replace(/^\uFEFF/, '')
}
