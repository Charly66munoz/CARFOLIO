import { spawn } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const temporary = path.join(root, '.tmp')
await mkdir(temporary, { recursive: true })
const env = { ...process.env, TEMP: temporary, TMP: temporary, PLAYWRIGHT_BROWSERS_PATH: path.join(temporary, 'playwright-browsers') }
const require = createRequire(import.meta.url)
function run(file, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [file, ...args], { cwd: root, env, stdio: 'inherit', windowsHide: true })
    child.on('error', reject)
    child.on('exit', code => resolve(code ?? 1))
  })
}
const args = process.argv.slice(2)
if (args[0] === 'test' && !args.includes('--list')) {
  const code = await run(path.join(root, 'node_modules/vite/bin/vite.js'), ['build', '--outDir', '.tmp/e2e-build'])
  if (code) process.exit(code)
}
process.exitCode = await run(require.resolve('@playwright/test/cli'), args)
