/**
 * E2E visual: semeia um diretório de dados temporário com lista M3U + EPG,
 * abre o app (via Start-Process, para desacoplar do processo do teste),
 * navega por teclado (menu → canais → player → guia EPG) e salva screenshots.
 * Uso: node scripts/_test/e2e.mjs <porta>
 */
import { mkdirSync, writeFileSync, rmSync } from 'fs'
import { gzipSync } from 'zlib'
import { join } from 'path'
import { spawnSync } from 'child_process'
import { tmpdir } from 'os'

const port = process.argv[2] ?? '9380'
const dataDir = join(tmpdir(), `mmz-e2e-${Date.now()}`)
const outDir = join('scripts', '_test', 'out')
mkdirSync(outDir, { recursive: true })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Um CDP rejeitado derruba o processo (top-level await); tratamos para sair com código 1
process.on('unhandledRejection', (err) => {
  console.log(`  ✗ Erro não tratado no E2E: ${err?.message ?? err}`)
  process.exit(1)
})

// ---------------- seed ----------------
const categories = ['Abertas', 'Notícias', 'Esportes']
const channels = []
const now = Date.now()

for (let i = 0; i < 36; i++) {
  const group = categories[i % categories.length]
  channels.push({
    id: `seed-${i}`,
    name: `Canal ${group} ${String(i + 1).padStart(2, '0')}`,
    group,
    // Stream HLS público de teste (Mux) no 1º canal; os demais são inválidos de propósito
    url: i === 0 ? 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' : `http://127.0.0.1:9/${i}.m3u8`,
    tvgId: `canal${i}.br`,
    tvgName: `Canal ${i + 1}`,
    kind: 'live'
  })
}

for (let i = 0; i < 8; i++) {
  channels.push({
    id: `movie-${i}`,
    name: `Filme ${String(i + 1).padStart(2, '0')}: Aventura`,
    group: 'FILMES HD',
    url: `http://127.0.0.1:9/movie${i}.mp4`,
    tvgId: undefined,
    tvgName: undefined,
    kind: 'movie'
  })
}

// Canal linear cujo grupo sugere VOD (caso real: listas com "Filmes e Séries"
// contendo streams .m3u8). NÃO pode aparecer nas abas Filmes/Séries.
channels.push({
  id: 'live-filmes-series',
  name: 'AXN HD (canal linear)',
  group: 'Filmes e Series',
  url: 'http://127.0.0.1:9/lineare/index.m3u8',
  tvgId: undefined,
  tvgName: undefined,
  kind: 'live'
})

const playlistId = 'e2e-playlist'
mkdirSync(join(dataDir, 'mmz-data', 'playlists'), { recursive: true })
writeFileSync(
  join(dataDir, 'mmz-data', 'store.json'),
  JSON.stringify({
    settings: {
      volume: 0.8,
      muted: false,
      lastSection: 'home',
      autoRefreshPlaylists: false,
      epgRefreshMinutes: 15
    },
    playlists: [
      {
        id: playlistId,
        name: 'Lista de Teste E2E',
        url: 'seed',
        channelCount: channels.length,
        addedAt: now,
        updatedAt: now,
        kind: 'local'
      }
    ],
    epg: { sourceName: 'EPG E2E', updatedAt: now }
  }),
  'utf-8'
)
writeFileSync(join(dataDir, 'mmz-data', 'playlists', `${playlistId}.json`), JSON.stringify(channels), 'utf-8')

const programs = {}
for (let i = 0; i < 36; i++) {
  programs[`canal${i}.br`] = Array.from({ length: 6 }, (_, p) => {
    const start = now - 30 * 60_000 + p * 60 * 60_000
    return {
      start,
      stop: start + 60 * 60_000,
      title: p % 2 === 0 ? `Programa ao vivo ${p + 1}` : `Filme da noite ${p + 1}`,
      description: `Sinopse do programa ${p + 1} do canal ${i + 1}.`
    }
  })
}
writeFileSync(
  join(dataDir, 'mmz-data', 'epg.json.gz'),
  gzipSync(Buffer.from(JSON.stringify({ programs, channels: {} })))
)

// ---------------- launch (PowerShell Start-Process) ----------------
const launch = spawnSync(
  'powershell',
  [
    '-NoProfile',
    '-Command',
    `$env:MMZ_USER_DATA_DIR='${dataDir}'; Start-Process -FilePath '${process.cwd()}\\node_modules\\electron\\dist\\electron.exe' -ArgumentList '.','--remote-debugging-port=${port}','--disable-features=CalculateNativeWinOcclusion','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows'`
  ],
  { stdio: 'ignore' }
)
if (launch.status !== 0) {
  console.error('Falha ao iniciar o app:', launch.stderr?.toString())
  process.exit(1)
}

let targets = null
for (let attempt = 0; attempt < 30 && !targets; attempt++) {
  await sleep(1000)
  try {
    const res = await fetch(`http://127.0.0.1:${port}/json`)
    if (res.ok) targets = await res.json()
  } catch {
    /* ainda subindo */
  }
}
if (!targets) {
  console.error('App não expôs a porta de debug em 30s.')
  process.exit(1)
}

// ---------------- CDP ----------------
const page = targets.find((t) => t.type === 'page')
const ws = new WebSocket(page.webSocketDebuggerUrl)
let id = 0
const pending = new Map()
const send = (method, params = {}, timeoutMs = 20000) =>
  new Promise((resolve, reject) => {
    const msgId = ++id
    const timer = setTimeout(() => {
      pending.delete(msgId)
      reject(new Error(`CDP timeout em ${method}`))
    }, timeoutMs)
    pending.set(msgId, {
      resolve: (v) => {
        clearTimeout(timer)
        resolve(v)
      },
      reject: (e) => {
        clearTimeout(timer)
        reject(e)
      }
    })
    ws.send(JSON.stringify({ id: msgId, method, params }))
  })
await new Promise((resolve, reject) => {
  ws.onopen = resolve
  ws.onerror = reject
})
ws.onclose = () => console.log('[e2e] conexão CDP encerrada')
try {
  await send('Page.bringToFront', {}, 8000) // janela para frente (não crítico)
} catch {
  /* não crítico */
}
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data)
  if (msg.id && pending.has(msg.id)) {
    const p = pending.get(msg.id)
    pending.delete(msg.id)
    msg.error ? p.reject(new Error(msg.error.message)) : p.resolve(msg.result)
  }
}

const VKEYS = { Escape: 27, ArrowUp: 38, ArrowDown: 40, ArrowLeft: 37, ArrowRight: 39, Enter: 13, g: 71 }
async function press(key) {
  const vk = VKEYS[key]
  await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key, code: key.length === 1 ? `Key${key.toUpperCase()}` : key, windowsVirtualKeyCode: vk })
  await sleep(60)
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code: key.length === 1 ? `Key${key.toUpperCase()}` : key, windowsVirtualKeyCode: vk })
  await sleep(250)
}
async function shot(name) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const result = await send('Page.captureScreenshot', { format: 'png' }, 30000)
      writeFileSync(join(outDir, `${name}.png`), Buffer.from(result.data, 'base64'))
      console.log(`screenshot -> ${outDir}/${name}.png`)
      return
    } catch (err) {
      console.log(`  ! screenshot ${name} falhou (tentativa ${attempt}): ${err.message}`)
      await sleep(1500)
    }
  }
}
async function evalJs(expression) {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, 40000)
  if (r.exceptionDetails) return { error: r.exceptionDetails.text }
  return r.result.value
}
/** Avalia uma expressão até ela retornar true ou o tempo esgotar (máquina lenta). */
async function waitFor(expression, timeoutMs = 20000, intervalMs = 700) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if ((await evalJs(expression)) === true) return true
    await sleep(intervalMs)
  }
  return false
}
let failures = 0
function check(label, condition, detail = '') {
  if (condition) console.log(`  ✓ ${label}`)
  else {
    failures += 1
    console.log(`  ✗ FALHOU: ${label} ${detail}`)
  }
}
const startedAt = Date.now()
const elapsed = () => `${Math.round((Date.now() - startedAt) / 1000)}s`

/** Estado aproximado da UI: título da seção, foco no menu e player aberto. */
async function state() {
  const s = await evalJs(`JSON.stringify({
    title: document.querySelector('header h1')?.innerText ?? null,
    sidebarFocus: document.body.innerText.includes('↑↓ navegar'),
    video: !!document.querySelector('video')
  })`)
  try {
    return typeof s === 'string' ? JSON.parse(s) : {}
  } catch {
    return {}
  }
}
/** Garante que o foco está no menu lateral (Esc repetido até dar certo). */
async function ensureSidebar() {
  for (let i = 0; i < 4; i++) {
    if ((await state()).sidebarFocus) return true
    await press('Escape')
    await sleep(300)
  }
  return (await state()).sidebarFocus
}
const SECTION_ORDER = { 'Início': 0, 'Canais ao Vivo': 1, Filmes: 2, 'Séries': 3, 'Configurações': 4 }
/** Navega pelo menu lateral até a seção desejada (títulos do TopBar, PT). */
async function goTo(title) {
  for (let i = 0; i < 10; i++) {
    const s = await state()
    if (s.title === title) return true
    if (!s.sidebarFocus) {
      await press('Escape')
      continue
    }
    const current = SECTION_ORDER[s.title] ?? 0
    await press(SECTION_ORDER[title] > current ? 'ArrowDown' : 'ArrowUp')
    await sleep(250)
  }
  return false
}

await sleep(2000)
await shot('e2e-home')

// ---------------- mouse: hover sincroniza o foco, clique reproduz ----------------
const homeCard = await evalJs(`(() => {
  const card = Array.from(document.querySelectorAll('.card-hover')).find((c) => c.textContent.includes('Canal Abertas 01'))
  if (!card) return null
  const r = card.getBoundingClientRect()
  return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }
})()`)
check('Mouse: card da home localizado', !!homeCard && !homeCard.error, JSON.stringify(homeCard))

if (homeCard && !homeCard.error) {
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: homeCard.x, y: homeCard.y })
  const HOVER_RING = `(() => {
    const el = document.elementFromPoint(${homeCard.x}, ${homeCard.y})?.closest('.card-hover')
    return !!el && el.classList.contains('card-focused')
  })()`
  const hoverOk = await waitFor(HOVER_RING, 8000)
  const hoverState = await evalJs(`(() => {
    const el = document.elementFromPoint(${homeCard.x}, ${homeCard.y})?.closest('.card-hover')
    return { cursor: el ? getComputedStyle(el).cursor : null }
  })()`)
  check('Mouse: hover aplica o anel de foco no card apontado', hoverOk === true, JSON.stringify(hoverState))
  check('Mouse: cursor de ponteiro nos cards', hoverState?.cursor === 'pointer', `cursor=${hoverState?.cursor}`)
  await shot('e2e-mouse-hover')

  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: homeCard.x, y: homeCard.y, button: 'left', clickCount: 1 })
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: homeCard.x, y: homeCard.y, button: 'left', clickCount: 1 })
  const mousePlaying = await waitFor(`(() => {
    const v = document.querySelector('video')
    return !!v && !v.paused && v.readyState >= 2
  })()`, 30000)
  check('Mouse: clique no card abre o player e reproduz', mousePlaying === true)
  await shot('e2e-mouse-play')
  await press('Escape') // fecha o player
  await sleep(700)
}

await press('Escape') // foca o menu lateral
await press('ArrowDown') // Canais ao Vivo
await sleep(800)
await shot('e2e-canais')

// Seleciona a categoria "Abertas" pelo clique (determinístico); a reprodução
// em si continua sendo feita por teclado logo abaixo.
await press('ArrowRight') // sai do menu lateral para o conteúdo
await sleep(300)
const abertasChip = await evalJs(`(() => {
  const chip = document.querySelector('[data-category="Abertas"]')
  if (!chip) return null
  const r = chip.getBoundingClientRect()
  return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }
})()`)
check('Teclado: chip de categoria "Abertas" localizado', !!abertasChip && !abertasChip.error, JSON.stringify(abertasChip))
if (abertasChip && !abertasChip.error) {
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: abertasChip.x, y: abertasChip.y, button: 'left', clickCount: 1 })
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: abertasChip.x, y: abertasChip.y, button: 'left', clickCount: 1 })
  await waitFor(`!!document.querySelector('.card-hover')`, 8000)
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 950, y: 10 }) // retira o ponteiro da grade
  await sleep(500)
}
await shot('e2e-grid')

// ---------------- teclado: Enter na grade reproduz o canal focado ----------------
await press('Enter')
const kbPlaying = await waitFor(`(() => {
  const v = document.querySelector('video')
  return !!v && !v.paused && v.readyState >= 2
})()`, 30000)
check('Teclado: Enter na grade reproduz o canal', kbPlaying === true)
await shot('e2e-playing')
await press('Escape') // fecha o player
await sleep(700)

// grade virtualizada: hover também move o anel de foco
const gridPos = await evalJs(`(() => {
  const cards = Array.from(document.querySelectorAll('.card-hover'))
  const visible = cards.find((c) => {
    const r = c.getBoundingClientRect()
    return r.top > 90 && r.bottom < window.innerHeight - 40 && r.left > 130 && r.right < window.innerWidth - 40
  })
  if (!visible) return null
  const r = visible.getBoundingClientRect()
  return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }
})()`)
if (gridPos && !gridPos.error) {
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: gridPos.x, y: gridPos.y })
  const gridFocused = await waitFor(`(() => {
    const el = document.elementFromPoint(${gridPos.x}, ${gridPos.y})?.closest('.card-hover')
    return !!el && el.classList.contains('card-focused')
  })()`, 8000)
  check('Mouse: hover na grade virtualizada move o anel de foco', gridFocused === true, JSON.stringify(gridPos))
  await shot('e2e-mouse-hover')
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 950, y: 10 })
  await sleep(300)
} else {
  check('Mouse: card visível da grade localizado', false, JSON.stringify(gridPos))
}

// abre o card sob o foco do hover (pode ser stream morto — captura a tela de erro/retry)
await press('Enter')
await sleep(6000)
await shot('e2e-player')

// Tela de configurações
await press('Escape') // fecha o player
await sleep(600)
check('Navegação: abre Configurações pelo menu lateral', await goTo('Configurações'), JSON.stringify(await state()))
await sleep(800)
await shot('e2e-settings')

// --------------- separação estrita de VOD (Filmes/Séries) ---------------
check('Navegação: abre Séries', await goTo('Séries'), JSON.stringify(await state()))
await waitFor(`document.body.innerText.includes('Nenhuma série encontrada')`, 10000)
await shot('e2e-series')
const seriesText = await evalJs(`document.body.innerText`)
check(
  'Abas Séries: canal linear em grupo "Filmes e Series" não vaza para o VOD',
  typeof seriesText === 'string' && seriesText.includes('Nenhuma série encontrada') && !seriesText.includes('AXN HD'),
  JSON.stringify(String(seriesText).slice(0, 200))
)

check('Navegação: abre Filmes', await goTo('Filmes'), JSON.stringify(await state()))
await waitFor(`!!document.querySelector('[data-category="FILMES HD"]')`, 10000)
await shot('e2e-movies')
const movieChip = await evalJs(
  `document.querySelector('[data-category="FILMES HD"]')?.innerText.replace(/\\s+/g, ' ').trim() ?? null`
)
check('Abas Filmes: grupo FILMES HD lista apenas os 8 filmes (sem canais lineares)', movieChip === 'FILMES HD 8', `chip=${JSON.stringify(movieChip)}`)

// --------------- idioma (EN) ---------------
check('Navegação: volta a Configurações', await goTo('Configurações'), JSON.stringify(await state()))
await sleep(800)
const switched = await evalJs(`(() => {
  const b = Array.from(document.querySelectorAll('button')).find((x) => x.textContent.trim() === 'English')
  if (b) b.click()
  return !!b
})()`)
check('Idioma: botão English encontrado nas Preferências', switched === true)
const enOk = await waitFor(`document.body.innerText.includes('Add list') && document.body.innerText.includes('M3U lists')`, 12000)
check('Idioma: interface traduzida para inglês', enOk === true)
await shot('e2e-lang-en')

await evalJs(`(() => {
  const b = Array.from(document.querySelectorAll('button')).find((x) => x.textContent.trim() === 'Português (Brasil)')
  if (b) b.click()
  return !!b
})()`)
const ptOk = await waitFor(`document.body.innerText.includes('Adicionar lista')`, 12000)
check('Idioma: volta para português', ptOk === true)

// Volta para os canais e abre o guia EPG sobre o canal em reprodução
check('Navegação: abre Canais ao Vivo', await goTo('Canais ao Vivo'), JSON.stringify(await state()))
await sleep(600)
await press('ArrowRight') // sidebar -> conteúdo (filtros)
await sleep(300)
await press('ArrowDown') // para a grade
await press('Enter') // abre o player
await sleep(6000)

await press('g') // guia EPG
await sleep(1500)
await shot('e2e-guia')
await press('g') // fecha o guia
await sleep(400)

const dom = await send('Runtime.evaluate', {
  expression: `JSON.stringify({ canais: document.body.innerText.slice(0, 160) })`,
  returnByValue: true
})
console.log('DOM:', dom.result.value)

ws.close()
spawnSync('powershell', [
  '-NoProfile',
  '-Command',
  `Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }`
])
await sleep(1500)
rmSync(dataDir, { recursive: true, force: true })
console.log(
  failures === 0
    ? `E2E concluído em ${elapsed()}.`
    : `E2E concluído em ${elapsed()} com ${failures} falha(s).`
)
process.exit(failures === 0 ? 0 : 1)
