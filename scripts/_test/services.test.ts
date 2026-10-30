/* Teste de fumaça dos serviços (playlist + EPG + cache) em Node puro. */
import { mkdtempSync, writeFileSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import * as playlist from '../../src/main/services/playlist'
import { epgService } from '../../src/main/services/epg'
import * as storage from '../../src/main/services/storage'

let failures = 0
function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`✗ FALHOU: ${message}`)
    failures++
  } else {
    console.log(`✓ ${message}`)
  }
}

const dir = mkdtempSync(join(tmpdir(), 'mmz-test-'))

const pad = (n: number): string => String(n).padStart(2, '0')
const xmltvTime = (d: Date): string =>
  `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00 +0000`

const now = new Date()
const start = new Date(now.getTime() - 30 * 60_000)
const mid = new Date(now.getTime() + 30 * 60_000)
const end = new Date(now.getTime() + 90 * 60_000)

const m3uPath = join(dir, 'lista.m3u')
writeFileSync(
  m3uPath,
  [
    '#EXTM3U',
    '#EXTINF:-1 tvg-id="globo.sp" tvg-logo="http://logo/globo.png" group-title="Abertas",TV Globo SP',
    'http://stream.example/globo.m3u8',
    '#EXTINF:-1 group-title="Abertas",TV Bandeirantes',
    'http://stream.example/band.m3u8',
    '#EXTINF:-1 group-title="FILMES",O Grande Filme',
    'http://vod.example/filme.mp4'
  ].join('\n'),
  'utf-8'
)

const xmlPath = join(dir, 'epg.xml')
writeFileSync(
  xmlPath,
  `<?xml version="1.0"?>
<tv>
  <channel id="globo.sp"><display-name>TV Globo SP</display-name></channel>
  <programme start="${xmltvTime(start)}" stop="${xmltvTime(mid)}" channel="globo.sp">
    <title>Jornal da Noite</title><desc>Notícias.</desc>
  </programme>
  <programme start="${xmltvTime(mid)}" stop="${xmltvTime(end)}" channel="globo.sp">
    <title>Novela</title>
  </programme>
</tv>`,
  'utf-8'
)

async function main(): Promise<void> {
  // ---------- playlist ----------
  const added = await playlist.addPlaylist('Minha TV', m3uPath)
  assert(!!added.playlist, 'Playlist: adicionada a partir de arquivo local')
  assert(added.playlist?.channelCount === 3, 'Playlist: 3 canais contados')
  assert(added.playlist?.kind === 'local', 'Playlist: marcada como local')
  assert(playlist.listPlaylists().length === 1, 'Playlist: listada no store')

  const channels = playlist.loadChannels(added.playlist!.id)
  assert(channels.length === 3, 'Cache: canais persistidos e recarregados')

  const bad = await playlist.addPlaylist('Inválida', join(dir, 'nao-existe.m3u'))
  assert(bad.playlist === null && !!bad.error, 'Playlist: erro amigável para arquivo inexistente')

  // Fonte que responde HTML (página errada) → diagnóstico claro, sem culpar a extensão
  const htmlPath = join(dir, 'pagina.html')
  writeFileSync(htmlPath, '<!DOCTYPE html><html><body>403 Forbidden</body></html>', 'utf-8')
  const notM3u = await playlist.addPlaylist('Página', htmlPath)
  assert(
    notM3u.playlist === null && /M3U\/M3U8/.test(notM3u.error ?? ''),
    'Playlist: conteúdo não-M3U gera erro explicando o formato'
  )

  // URL sem esquema (ex.: pastebin.com/raw/x) → sugere usar http://
  const noScheme = await playlist.addPlaylist('Sem esquema', 'pastebin.com/raw/VTgpRK2k')
  assert(
    noScheme.playlist === null && /http:\/\//.test(noScheme.error ?? ''),
    'Playlist: endereço sem http:// recebe orientação clara'
  )

  // ---------- EPG ----------
  const statsBefore = await epgService.stats()
  assert(statsBefore.loaded === false, 'EPG: sem dados antes do load')

  const loaded = await epgService.load('EPG Teste', xmlPath)
  assert(loaded.ok, `EPG: carregado (${loaded.channels} canais, ${loaded.programs} programas)`)
  assert(loaded.channels === 1 && loaded.programs === 2, 'EPG: contagens corretas')

  const stats = await epgService.stats()
  assert(stats.loaded && stats.channels === 1 && stats.programs === 2, 'EPG: stats após load')

  const nowNext = await epgService.nowNext(['globo.sp', 'inexistente'])
  assert(nowNext['globo.sp']?.now?.title === 'Jornal da Noite', 'EPG: programa atual encontrado')
  assert(nowNext['globo.sp']?.next?.title === 'Novela', 'EPG: próximo programa encontrado')
  assert(nowNext['inexistente'] === undefined, 'EPG: tvg-id sem dados é ignorado')

  const schedule = await epgService.schedule('globo.sp')
  assert(schedule.length === 2 && schedule[0].title === 'Jornal da Noite', 'EPG: agenda do canal')

  const invalid = await epgService.load('Ruim', join(dir, 'nao-existe.xml'))
  assert(!invalid.ok && !!invalid.error, 'EPG: erro amigável para fonte inexistente')

  // ---------- remoção ----------
  playlist.removePlaylist(added.playlist!.id)
  assert(playlist.listPlaylists().length === 0, 'Playlist: removida com sucesso')
  assert(playlist.loadChannels(added.playlist!.id).length === 0, 'Cache: canais removidos')

  epgService.clear()
  const statsCleared = await epgService.stats()
  assert(statsCleared.loaded === false, 'EPG: limpo com sucesso')

  rmSync(dir, { recursive: true, force: true })
  console.log(failures === 0 ? '\nTodos os testes de serviço passaram.' : `\n${failures} teste(s) falharam.`)
  process.exitCode = failures === 0 ? 0 : 1
}

void main()
