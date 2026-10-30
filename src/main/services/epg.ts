import { XMLParser } from 'fast-xml-parser'
import type { EpgProgram, EpgStats, NowNext } from '../../shared/types'
import * as storage from './storage'
import type { EpgData } from './storage'
import { isLocalSource, readSource } from './source'
import { t } from './i18n'

/** Mantém apenas programas das últimas 24h até +14 dias (evita consumo de RAM). */
const PAST_WINDOW_MS = 24 * 60 * 60 * 1000
const FUTURE_WINDOW_MS = 14 * 24 * 60 * 60 * 1000

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
  isArray: (name) => name === 'programme' || name === 'channel'
})

/**
 * Converte o formato de data do XMLTV ("20240101120000 +0000") em epoch ms.
 */
export function parseXmltvTime(value: unknown): number | null {
  if (typeof value !== 'string') return null
  const m = /^\s*(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})?\s*(?:([+-])(\d{2})(\d{2}))?\s*$/.exec(value)
  if (!m) return null
  const [, y, mo, d, h, mi, s, sign, offH, offM] = m
  const utc = Date.UTC(
    Number(y),
    Number(mo) - 1,
    Number(d),
    Number(h),
    Number(mi),
    s ? Number(s) : 0
  )
  let offsetMin = 0
  if (sign && offH) {
    offsetMin = (Number(offH) * 60 + Number(offM ?? '0')) * (sign === '-' ? 1 : -1)
  }
  return utc + offsetMin * 60_000
}

function text(node: unknown): string | undefined {
  if (node == null) return undefined
  if (typeof node === 'string') return node
  if (typeof node === 'object') {
    const value = (node as Record<string, unknown>)['#text']
    if (typeof value === 'string') return value
    if (typeof value === 'number') return String(value)
  }
  return undefined
}

/** Faz o parse de um XMLTV e normaliza em EpgData. */
export function parseXmltv(content: string): EpgData {
  const doc = parser.parse(content) as {
    tv?: {
      programme?: Array<Record<string, unknown>>
      channel?: Array<Record<string, unknown>>
    }
  }

  const tv = doc?.tv
  if (!tv) throw new Error(t('err.invalidXml'))

  const now = Date.now()
  const minStart = now - PAST_WINDOW_MS
  const maxStop = now + FUTURE_WINDOW_MS

  const programs: Record<string, EpgProgram[]> = {}
  const channels: EpgData['channels'] = {}

  for (const raw of tv.channel ?? []) {
    const id = typeof raw['@_id'] === 'string' ? raw['@_id'] : undefined
    if (!id) continue
    const display = Array.isArray(raw['display-name']) ? raw['display-name'][0] : raw['display-name']
    const iconNode = Array.isArray(raw['icon']) ? raw['icon'][0] : raw['icon']
    channels[id] = {
      name: text(display),
      icon: typeof iconNode === 'object' && iconNode ? (iconNode as Record<string, string>)['@_src'] : undefined
    }
  }

  for (const raw of tv.programme ?? []) {
    const chId = typeof raw['@_channel'] === 'string' ? raw['@_channel'] : undefined
    const start = parseXmltvTime(raw['@_start'])
    const stop = parseXmltvTime(raw['@_stop'])
    if (!chId || start == null || stop == null || stop <= start) continue
    if (stop < minStart || start > maxStop) continue

    const catNode = Array.isArray(raw['category']) ? raw['category'][0] : raw['category']
    const program: EpgProgram = {
      start,
      stop,
      title: text(raw['title']) ?? t('err.untitled'),
      description: text(raw['desc']),
      category: text(catNode)
    }
    ;(programs[chId] ??= []).push(program)
  }

  for (const key of Object.keys(programs)) {
    programs[key].sort((a, b) => a.start - b.start)
  }

  return { programs, channels }
}

/** Binary search: primeiro índice com stop > t. */
function findActiveIndex(list: EpgProgram[], t: number): number {
  let lo = 0
  let hi = list.length - 1
  let ans = -1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (list[mid].stop > t) {
      ans = mid
      hi = mid - 1
    } else {
      lo = mid + 1
    }
  }
  return ans
}

class EpgService {
  private data: EpgData | null = null
  private loading: Promise<EpgData> | null = null

  /** Carrega o EPG do cache em disco sob demanda (lazy). */
  private async ensureLoaded(): Promise<EpgData | null> {
    if (this.data) return this.data
    if (!this.loading) {
      this.loading = Promise.resolve(storage.loadEpg()).then((data) => {
        this.data = data
        this.loading = null
        return data as EpgData
      })
    }
    const data = await this.loading
    return data ?? null
  }

  async load(name: string, source: string): Promise<{ ok: boolean; error?: string; channels?: number; programs?: number }> {
    let content: string
    try {
      content = await readSource(source, 120_000)
    } catch (err) {
      return { ok: false, error: (err as Error).message }
    }

    let parsed: EpgData
    try {
      parsed = parseXmltv(content)
    } catch (err) {
      return { ok: false, error: (err as Error).message }
    }

    const programs = Object.values(parsed.programs).reduce((acc, list) => acc + list.length, 0)
    if (programs === 0) {
      return {
        ok: false,
        error: t('err.noPrograms')
      }
    }

    this.data = parsed
    storage.saveEpg(parsed)
    storage.saveEpgMeta({
      sourceName: name || (isLocalSource(source) ? 'Arquivo local' : 'URL remota'),
      sourceUrl: source,
      updatedAt: Date.now()
    })

    return { ok: true, channels: Object.keys(parsed.programs).length, programs }
  }

  clear(): void {
    this.data = null
    storage.clearEpgFile()
  }

  persist(): void {
    // O EPG já é persistido no load; mantido por convenção para futuros updates.
  }

  async stats(): Promise<EpgStats> {
    const meta = storage.getEpgMeta()
    const data = await this.ensureLoaded()
    if (!data || !meta) {
      return { loaded: false, channels: 0, programs: 0 }
    }
    return {
      loaded: true,
      channels: Object.keys(data.programs).length,
      programs: Object.values(data.programs).reduce((acc, list) => acc + list.length, 0),
      sourceName: meta.sourceName,
      sourceUrl: meta.sourceUrl,
      updatedAt: meta.updatedAt
    }
  }

  /** Programa atual e próximo para um lote de tvg-ids (usado nos cards). */
  async nowNext(tvgIds: string[]): Promise<Record<string, NowNext>> {
    const data = await this.ensureLoaded()
    const out: Record<string, NowNext> = {}
    if (!data || tvgIds.length === 0) return out

    const now = Date.now()
    for (const id of tvgIds.slice(0, 500)) {
      if (!id) continue
      const list = data.programs[id]
      if (!list || list.length === 0) continue
      const idx = findActiveIndex(list, now)
      if (idx < 0) continue
      out[id] = { now: list[idx], next: list[idx + 1] }
    }
    return out
  }

  /** Grade completa de programs de um canal (usada no guia EPG). */
  async schedule(tvgId: string, from = Date.now(), limit = 40): Promise<EpgProgram[]> {
    const data = await this.ensureLoaded()
    if (!data || !tvgId) return []
    const list = data.programs[tvgId] ?? []
    const idx = findActiveIndex(list, from)
    if (idx < 0) return []
    return list.slice(idx, idx + limit)
  }
}

export const epgService = new EpgService()
