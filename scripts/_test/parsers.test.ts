/* Teste de fumaça dos parsers (M3U + XMLTV) executado em Node puro. */
import { parsePlaylistContent } from '../../src/main/services/playlist'
import { parseXmltv, parseXmltvTime } from '../../src/main/services/epg'
import { detectKind, groupKind } from '../../src/shared/channel'
import { missingKeys, translate } from '../../src/shared/i18n'

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`✗ FALHOU: ${message}`)
    process.exitCode = 1
  } else {
    console.log(`✓ ${message}`)
  }
}

// ---------------- M3U ----------------
const m3u = `#EXTM3U
#EXTINF:-1 tvg-id="globo.sp" tvg-name="TV Globo" tvg-logo="http://logo/globo.png" group-title="Abertas",TV Globo SP
http://stream.example/globo/index.m3u8
#EXTINF:-1 tvg-id=" ESPN" group-title="Esportes",ESPN Brasil
http://stream.example/espn.m3u8
#EXTINF:-1 group-title="Abertas",TV Globo SP (duplicado)
http://stream.example/globo/index.m3u8
#EXTINF:-1 group-title="FILMES HD",Aventura Explosiva
http://vod.example/movies/aventura.mp4
#EXTINF:-1 group-title="Séries BR",Série Nacional - T1E1
http://vod.example/series/nacional.mp4
#EXTINF:-1 tvg-id="sem-logo" group-title="",Canal Sem Grupo
http://stream.example/outro.m3u8`

const channels = parsePlaylistContent(m3u)
assert(channels.length === 5, `M3U: dedupe removeu duplicado (5 canais, obtido ${channels.length})`)
assert(channels[0].tvgId === 'globo.sp' && channels[0].logo === 'http://logo/globo.png', 'M3U: tvg-id e logo extraídos')
assert(channels[0].kind === 'live', 'M3U: canal aberto detectado como live')
assert(channels[2].kind === 'movie', 'M3U: grupo FILMES detectado como movie')
assert(channels[3].kind === 'series', 'M3U: grupo Séries detectado como series')
assert(channels[3].name.includes('Série Nacional'), 'M3U: nome do canal preservado com acentos')
assert(channels[4].group === 'Geral', 'M3U: grupo vazio vira "Geral"')
assert(channels[1].name === 'ESPN Brasil', 'M3U: espaços extras no tvg-id não quebram o parse')

// ---------------- classificação estrita (live vs VOD) ----------------
assert(detectKind('Filmes e Series', 'http://server:8080/AXNHD/index.m3u8') === 'live',
  'Kind: canal linear .m3u8 em grupo "Filmes e Series" é live')
assert(detectKind('FILMES', 'http://server:8080/live/user/pass/123.ts') === 'live',
  'Kind: segmento .ts de stream ao vivo nunca vira filme')
assert(detectKind('FILMES HD', 'http://server/movie.php?id=42') === 'movie',
  'Kind: endpoint .php em grupo de filmes vira movie')
assert(detectKind('Séries', 'http://server/vod/1234') === 'series',
  'Kind: caminho /vod/ sem extensão decide pelo grupo')
assert(detectKind('Aberto', 'http://server:8000/iptvgood/101011/6924') === 'live',
  'Kind: URL sem extensão e sem caminho VOD é live')
assert(detectKind('Filmes e Series', 'http://dns.fontedecanais.com.br:80/BuxaWjhYeGtvF1') === 'live',
  'Kind: endpoint sem extensão em lista mista permanece live')
assert(groupKind('Filmes e Séries') === 'series' && groupKind('FILMES HD') === 'movie' && groupKind('Aberto') === null,
  'Kind: groupKind identifica VOD pelo group-title')

// ---------------- i18n ----------------
assert(missingKeys().length === 0, `i18n: dicionários pt/en/es com as mesmas chaves (${missingKeys().join(', ')})`)
assert(translate('en', 'settings.addList') === 'Add list', 'i18n: tradução EN')
assert(translate('es', 'settings.addList') === 'Añadir lista', 'i18n: tradução ES')
assert(translate('pt', 'settings.addList') === 'Adicionar lista', 'i18n: idioma padrão PT')
assert(translate('en', 'top.channelsLoaded', { count: 12 }) === '12 channels loaded', 'i18n: variáveis interpoladas')
assert(translate('en', 'chave.inexistente') === 'chave.inexistente', 'i18n: chave ausente volta a si mesma')
assert(translate('fr', 'settings.addList') === 'Adicionar lista', 'i18n: idioma desconhecido cai para PT')

// ---------------- XMLTV ----------------
const pad = (n: number): string => String(n).padStart(2, '0')
const xmltvTime = (d: Date): string =>
  `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00 +0000`

const now = new Date()
const start = new Date(now.getTime() - 30 * 60_000)
const mid = new Date(now.getTime() + 30 * 60_000)
const end = new Date(now.getTime() + 90 * 60_000)

const xmltv = `<?xml version="1.0" encoding="UTF-8"?>
<tv generator-info-name="test">
  <channel id="globo.sp">
    <display-name>TV Globo SP</display-name>
    <icon src="http://logo/globo.png"/>
  </channel>
  <programme start="${xmltvTime(start)}" stop="${xmltvTime(mid)}" channel="globo.sp">
    <title>Jornal da Noite</title>
    <desc>Notícias do dia.</desc>
    <category>Jornalismo</category>
  </programme>
  <programme start="${xmltvTime(mid)}" stop="${xmltvTime(end)}" channel="globo.sp">
    <title>Novela</title>
    <desc>Capítulo 10.</desc>
  </programme>
</tv>`

assert(parseXmltvTime('20240101120000 +0100') === Date.UTC(2024, 0, 1, 11, 0, 0), 'XMLTV: offset de fuso convertido')
assert(parseXmltvTime('20240101120000') === Date.UTC(2024, 0, 1, 12, 0, 0), 'XMLTV: data sem fuso interpretada como UTC')

const epg = parseXmltv(xmltv)
assert(Object.keys(epg.programs).length === 1, 'XMLTV: 1 canal indexado')
assert(epg.programs['globo.sp'].length === 2, 'XMLTV: 2 programas indexados')
assert(epg.programs['globo.sp'][0].title === 'Jornal da Noite', 'XMLTV: título do programa')
assert(epg.programs['globo.sp'][0].category === 'Jornalismo', 'XMLTV: categoria do programa')

console.log('\nTestes concluídos.')
