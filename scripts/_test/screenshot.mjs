/**
 * Smoke test visual: conecta na porta de debug do Electron (CDP),
 * navega para a Home e captura um screenshot.
 * Uso: node scripts/_test/screenshot.mjs <porta> <arquivo.png>
 */
const port = process.argv[2] ?? '9333'
const outFile = process.argv[3] ?? 'scripts/_test/out/screenshot.png'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function main() {
  await sleep(2500)
  const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json()
  const page = targets.find((t) => t.type === 'page')
  if (!page) {
    console.error('Nenhuma página encontrada:', targets.map((t) => t.type).join(', '))
    process.exit(1)
  }

  const ws = new WebSocket(page.webSocketDebuggerUrl)
  let id = 0
  const pending = new Map()

  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const msgId = ++id
      pending.set(msgId, { resolve, reject })
      ws.send(JSON.stringify({ id: msgId, method, params }))
    })

  await new Promise((resolve, reject) => {
    ws.onopen = resolve
    ws.onerror = reject
  })

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data)
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id)
      pending.delete(msg.id)
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result)
    }
  }

  // Estado do DOM (verifica se o React montou)
  const evalResult = await send('Runtime.evaluate', {
    expression: `JSON.stringify({
      title: document.title,
      rootLen: document.getElementById('root').innerHTML.length,
      buttons: document.querySelectorAll('button').length,
      bodyText: document.body.innerText.slice(0, 300)
    })`,
    returnByValue: true
  })
  console.log('DOM:', evalResult.result.value)

  const shot = await send('Page.captureScreenshot', { format: 'png' })
  const { writeFileSync } = await import('fs')
  writeFileSync(outFile, Buffer.from(shot.data, 'base64'))
  console.log(`Screenshot salvo: ${outFile}`)

  ws.close()
  process.exit(0)
}

main().catch((err) => {
  console.error('Falha no smoke test:', err.message)
  process.exit(1)
})
