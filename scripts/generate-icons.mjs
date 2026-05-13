/**
 * Generates PWA icons from the SVG source.
 * Run: node scripts/generate-icons.mjs
 * Requires: npm install -D sharp
 */
import { readFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const root = join(__dir, '..')
const outDir = join(root, 'frontend/public/icons')

mkdirSync(outDir, { recursive: true })

let sharp
try {
  sharp = (await import('sharp')).default
} catch {
  console.error('sharp not installed. Run: npm install -D sharp (in the scripts dir or root)')
  process.exit(1)
}

const svgPath = join(outDir, 'icon.svg')
const svg = readFileSync(svgPath)

const sizes = [
  { name: 'icon-192.png',           size: 192 },
  { name: 'icon-512.png',           size: 512 },
  { name: 'icon-maskable-192.png',  size: 192 },
  { name: 'icon-maskable-512.png',  size: 512 },
]

for (const { name, size } of sizes) {
  await sharp(svg)
    .resize(size, size)
    .png()
    .toFile(join(outDir, name))
  console.log(`✓ ${name}`)
}

console.log('Icons generated in frontend/public/icons/')
