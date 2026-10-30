/**
 * Gera build/icon.png (512x512) sem dependências externas.
 * Uso: npm run icon
 *
 * O PNG é escrito manualmente (IHDR/IDAT/IEND) usando zlib nativo do Node.
 */
const { deflateSync } = require('zlib')
const { mkdirSync, writeFileSync } = require('fs')
const { join } = require('path')

const SIZE = 512

// ---------- CRC32 ----------
const CRC_TABLE = new Int32Array(256).map((_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c
})

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  }
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

// ---------- desenho ----------
function roundedRect(px, py, w, h, r) {
  // Distância do ponto ao retângulo "encolhido" (test de cantos arredondados)
  const ix = px < r ? r : px > w - r ? w - r : px
  const iy = py < r ? r : py > h - r ? h - r : py
  return Math.hypot(px - ix, py - iy) <= r
}

const pixels = Buffer.alloc(SIZE * SIZE * 4)

for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const i = (y * SIZE + x) * 4

    // Fundo: retângulo arredondado com gradiente diagonal vermelho -> laranja
    const inside = roundedRect(x, y, SIZE, SIZE, 96)
    if (!inside) {
      pixels[i] = 11
      pixels[i + 1] = 11
      pixels[i + 2] = 13
      pixels[i + 3] = 255
      continue
    }

    const t = (x + y) / (2 * SIZE)
    const r = Math.round(230 + (255 - 230) * t)
    const g = Math.round(0 + (150 - 0) * t)
    const b = Math.round(0 + (0 - 0) * t)

    // "Play" triangle central (branco)
    const cx = SIZE * 0.44
    const cy = SIZE * 0.5
    const half = SIZE * 0.19
    const inTriangle =
      x >= cx - half * 0.85 &&
      x <= cx + half * 1.25 &&
      Math.abs(y - cy) <= half * ((cx + half * 1.25 - x) / (half * 2.1))

    if (inTriangle) {
      pixels[i] = 255
      pixels[i + 1] = 255
      pixels[i + 2] = 255
      pixels[i + 3] = 255
    } else {
      pixels[i] = r
      pixels[i + 1] = g
      pixels[i + 2] = b
      pixels[i + 3] = 255
    }
  }
}

// ---------- scanlines com filtro 0 ----------
const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1))
for (let y = 0; y < SIZE; y++) {
  raw[y * (SIZE * 4 + 1)] = 0
  pixels.copy(raw, y * (SIZE * 4 + 1) + 1, y * SIZE * 4, (y + 1) * SIZE * 4)
}

const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(SIZE, 0)
ihdr.writeUInt32BE(SIZE, 4)
ihdr[8] = 8 // bit depth
ihdr[9] = 6 // RGBA
ihdr[10] = 0
ihdr[11] = 0
ihdr[12] = 0

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0))
])

const outDir = join(__dirname, '..', 'build')
mkdirSync(outDir, { recursive: true })
const outFile = join(outDir, 'icon.png')
writeFileSync(outFile, png)
console.log(`Ícone gerado: ${outFile} (${SIZE}x${SIZE})`)
