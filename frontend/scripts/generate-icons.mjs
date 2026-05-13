/**
 * Run: node scripts/generate-icons.mjs
 * Requires: npm install canvas (or use sharp)
 * Generates PNG icons into public/icons/
 */
import { createCanvas } from 'canvas'
import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(__dirname, '../public/icons')

mkdirSync(OUT_DIR, { recursive: true })

function drawIcon(size, maskable = false) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')
  const pad = maskable ? size * 0.15 : 0

  // Background
  ctx.fillStyle = '#0B0F14'
  ctx.fillRect(0, 0, size, size)

  if (maskable) {
    // Rounded rect background for maskable
    const r = size * 0.22
    ctx.beginPath()
    ctx.roundRect(pad, pad, size - pad * 2, size - pad * 2, r)
    ctx.fillStyle = '#111520'
    ctx.fill()
  }

  const cx = size / 2
  const cy = size / 2
  const innerSize = size - pad * 2

  // Gradient circle glow
  const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, innerSize * 0.4)
  grd.addColorStop(0, 'rgba(79,142,247,0.25)')
  grd.addColorStop(1, 'transparent')
  ctx.fillStyle = grd
  ctx.fillRect(0, 0, size, size)

  // Letter "M"
  ctx.fillStyle = '#4F8EF7'
  ctx.font = `bold ${Math.floor(innerSize * 0.5)}px "Arial"`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('M', cx, cy)

  // Bottom text
  ctx.fillStyle = 'rgba(79,142,247,0.5)'
  ctx.font = `${Math.floor(innerSize * 0.1)}px "Arial"`
  ctx.fillText('MOT', cx, cy + innerSize * 0.3)

  return canvas.toBuffer('image/png')
}

const sizes = [192, 512]
for (const size of sizes) {
  writeFileSync(join(OUT_DIR, `icon-${size}.png`), drawIcon(size, false))
  writeFileSync(join(OUT_DIR, `icon-maskable-${size}.png`), drawIcon(size, true))
  console.log(`Generated ${size}x${size} icons`)
}

console.log('Icons generated in public/icons/')
