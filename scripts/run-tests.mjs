/**
 * Runner dos testes de fumaça (sem framework).
 * Compila os testes com esbuild (stub do 'electron') e executa em Node.
 * Uso: npm test
 */
import { build } from 'esbuild'
import { spawnSync } from 'child_process'
import { join } from 'path'

const tests = ['parsers.test.ts', 'services.test.ts']
let failed = 0

for (const test of tests) {
  const entry = join('scripts', '_test', test)
  const out = join('scripts', '_test', 'out', test.replace(/\.ts$/, '.cjs'))

  await build({
    entryPoints: [entry],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    outfile: out,
    alias: { electron: './scripts/_test/electron-stub.cjs' },
    logLevel: 'error'
  })

  console.log(`\n=== ${test} ===`)
  const result = spawnSync(process.execPath, [out], { stdio: 'inherit' })
  if (result.status !== 0) failed += 1
}

console.log(failed === 0 ? '\n✔ Todos os testes passaram.' : `\n✖ ${failed} arquivo(s) de teste falharam.`)
process.exit(failed === 0 ? 0 : 1)
