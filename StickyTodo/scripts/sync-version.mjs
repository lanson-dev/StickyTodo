/**
 * Sync version across all config files.
 * Usage: node scripts/sync-version.mjs 1.4.0
 */
import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const version = process.argv[2]
if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
  console.error('Usage: node scripts/sync-version.mjs <MAJOR.MINOR.PATCH>')
  process.exit(1)
}

const files = [
  { path: 'package.json', replace: (s) => s.replace(/"version":\s*"[^"]*"/, `"version": "${version}"`) },
  { path: 'src-tauri/tauri.conf.json', replace: (s) => s.replace(/"version":\s*"[^"]*"/, `"version": "${version}"`) },
  { path: 'src-tauri/Cargo.toml', replace: (s) => s.replace(/^version\s*=\s*"[^"]*"/m, `version = "${version}"`) },
]

for (const { path, replace } of files) {
  const full = resolve(root, path)
  const content = readFileSync(full, 'utf-8')
  const updated = replace(content)
  if (content !== updated) {
    writeFileSync(full, updated)
    console.log(`✅ ${path} → ${version}`)
  } else {
    console.log(`⏭  ${path} (already ${version})`)
  }
}

console.log(`\nDone! Version synced to ${version}`)
