/**
 * Hardcoded hex → tema CSS değişkenleri / Tailwind semantic token migrasyonu.
 * Kullanım: node scripts/migrate-theme-colors.mjs
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { join, extname } from 'node:path'

const ROOT = join(import.meta.dirname, '..', 'src')
const EXT = new Set(['.jsx', '.js', '.css'])

/** @type {[RegExp, string][]} */
const REPLACEMENTS = [
  [/border-\[#00FF41\]/gi, 'border-accent'],
  [/border-\[#00ff41\]/gi, 'border-accent'],
  [/border-\[#ffb400\]/gi, 'border-accent'],
  [/border-\[#FFD700\]/gi, 'border-accent'],
  [/border-\[#ffd700\]/gi, 'border-accent'],
  [/text-\[#00FF41\]/gi, 'text-accent'],
  [/text-\[#00ff41\]/gi, 'text-accent'],
  [/text-\[#ffb400\]/gi, 'text-accent'],
  [/text-\[#FFD700\]/gi, 'text-accent'],
  [/text-\[#ffd700\]/gi, 'text-accent'],
  [/text-\[#d4af37\]/gi, 'text-accent'],
  [/bg-\[#00FF41\]/gi, 'bg-accent'],
  [/bg-\[#00ff41\]/gi, 'bg-accent'],
  [/bg-\[#ffb400\]/gi, 'bg-accent'],
  [/bg-\[#FFD700\]/gi, 'bg-accent'],
  [/bg-\[#ffd700\]/gi, 'bg-accent'],
  [/bg-\[#050505\]/gi, 'bg-app-bg'],
  [/bg-\[#0A0A0A\]/gi, 'bg-app-bg'],
  [/bg-\[#0a0a0a\]/gi, 'bg-app-bg'],
  [/bg-\[#080808\]/gi, 'bg-app-bg'],
  [/bg-\[#050805\]/gi, 'bg-app-bg'],
  [/bg-\[#1a1a1a\]/gi, 'bg-app-bg'],
  [/ring-\[#00FF41\]/gi, 'ring-accent'],
  [/ring-\[#ffb400\]/gi, 'ring-accent'],
  [/from-\[#00FF41\]/gi, 'from-accent'],
  [/to-\[#00FF41\]/gi, 'to-accent'],
  [/from-\[#ffb400\]/gi, 'from-accent'],
  [/to-\[#ffb400\]/gi, 'to-accent'],
  [/fill-\[#00FF41\]/gi, 'fill-accent'],
  [/stroke-\[#00FF41\]/gi, 'stroke-accent'],
  [/decoration-\[#00FF41\]/gi, 'decoration-accent'],
  [/outline-\[#00FF41\]/gi, 'outline-accent'],
  [/shadow-\[0_0_[^\]]*#00FF41[^\]]*\]/gi, 'shadow-[0_0_24px_-8px_color-mix(in_srgb,var(--accent-color)_35%,transparent)]'],
  [/shadow-\[0_0_[^\]]*#ffb400[^\]]*\]/gi, 'shadow-[0_0_24px_-8px_color-mix(in_srgb,var(--accent-color)_35%,transparent)]'],
  [/shadow-\[0_0_[^\]]*rgba\(0,255,65[^\]]*\)/gi, 'shadow-[0_0_24px_-8px_color-mix(in_srgb,var(--accent-color)_35%,transparent)]'],
  [/shadow-\[0_0_6px_#00FF41\]/gi, 'shadow-[0_0_6px_var(--accent-color)]'],
  [/text-slate-200/g, 'text-app-text'],
  [/text-slate-300/g, 'text-app-text/90'],
  [/text-slate-400/g, 'text-app-text/70'],
  [/text-slate-500/g, 'text-app-text/55'],
  [/text-slate-600/g, 'text-app-text/45'],
  [/text-white/g, 'text-app-text'],
  [/accent-\[#00FF41\]/gi, 'accent-accent'],
  [/accent-\[#00ff41\]/gi, 'accent-accent'],
  [/accent-\[#ffb400\]/gi, 'accent-accent'],
  [/accent-\[#FFD700\]/gi, 'accent-accent'],
  [/border-t-\[#ffb400\]/gi, 'border-t-accent'],
  [/via-\[#ffb400\]/gi, 'via-accent'],
  [/stroke-\[#ffb400\]/gi, 'stroke-accent'],
]

/**
 * @param {string} dir
 * @returns {string[]}
 */
function walk(dir) {
  /** @type {string[]} */
  const out = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) {
      if (name === 'node_modules') continue
      out.push(...walk(p))
    } else if (EXT.has(extname(p))) {
      out.push(p)
    }
  }
  return out
}

let changed = 0
for (const file of walk(ROOT)) {
  if (file.endsWith('index.css')) continue
  let src = readFileSync(file, 'utf8')
  const before = src
  for (const [re, rep] of REPLACEMENTS) {
    src = src.replace(re, rep)
  }
  if (src !== before) {
    writeFileSync(file, src, 'utf8')
    changed += 1
  }
}

console.log(`migrate-theme-colors: ${changed} file(s) updated`)

/** index.css — ham hex/rgb → CSS custom properties */
const INDEX_CSS = join(ROOT, 'index.css')
let css = readFileSync(INDEX_CSS, 'utf8')
const cssBefore = css

/** @type {[RegExp, string][]} */
const CSS_REPLACEMENTS = [
  [/background-color:\s*#0a0a0a/gi, 'background-color: var(--bg-color)'],
  [/background:\s*#0a0a0a/gi, 'background: var(--bg-color)'],
  [/background-color:\s*#141414/gi, 'background-color: color-mix(in srgb, var(--bg-color) 85%, var(--text-color))'],
  [/color:\s*#ffb400/gi, 'color: var(--accent-color)'],
  [/color:\s*#00ff41/gi, 'color: var(--accent-color)'],
  [/color:\s*#5dff8f/gi, 'color: color-mix(in srgb, var(--accent-color) 75%, var(--text-color))'],
  [/var\(--stat-accent,\s*#ffb400\)/g, 'var(--stat-accent, var(--accent-color))'],
  [/rgb\(0 255 65 \/ ([\d.]+)\)/g, 'color-mix(in srgb, var(--accent-color) calc($1 * 100%), transparent)'],
  [/rgb\(255 180 0 \/ ([\d.]+)\)/g, 'color-mix(in srgb, var(--accent-color) calc($1 * 100%), transparent)'],
  [/scrollbar-color:\s*rgb\(0 255 65 \/ 0\.38\)\s*rgb\(8 12 8\)/g, 'scrollbar-color: color-mix(in srgb, var(--accent-color) 38%, transparent) var(--bg-color)'],
]

for (const [re, rep] of CSS_REPLACEMENTS) {
  css = css.replace(re, rep)
}

if (css !== cssBefore) {
  writeFileSync(INDEX_CSS, css, 'utf8')
  console.log('migrate-theme-colors: index.css updated')
}

/** SVG / inline style hex → CSS var string */
const INLINE_REPLACEMENTS = [
  [/stopColor="#00FF41"/gi, 'stopColor="var(--accent-color)"'],
  [/stopColor="#00ff41"/gi, 'stopColor="var(--accent-color)"'],
  [/stopColor="#ffb400"/gi, 'stopColor="var(--accent-color)"'],
  [/stopColor="#FFD700"/gi, 'stopColor="var(--accent-color)"'],
  [/stroke="#00FF41"/gi, 'stroke="var(--accent-color)"'],
  [/stroke="#ffb400"/gi, 'stroke="var(--accent-color)"'],
  [/fill="#00FF41"/gi, 'fill="var(--accent-color)"'],
  [/fill="#ffb400"/gi, 'fill="var(--accent-color)"'],
  [/fill: '#00FF41'/gi, "fill: 'var(--accent-color)'"],
  [/fill: '#ffb400'/gi, "fill: 'var(--accent-color)'"],
  [/stroke: '#00FF41'/gi, "stroke: 'var(--accent-color)'"],
  [/color: '#00FF41'/gi, "color: 'var(--accent-color)'"],
  [/color: '#ffb400'/gi, "color: 'var(--accent-color)'"],
]

let inlineChanged = 0
for (const file of walk(ROOT)) {
  let src = readFileSync(file, 'utf8')
  const before = src
  for (const [re, rep] of INLINE_REPLACEMENTS) {
    src = src.replace(re, rep)
  }
  if (src !== before) {
    writeFileSync(file, src, 'utf8')
    inlineChanged += 1
  }
}

if (inlineChanged > 0) {
  console.log(`migrate-theme-colors: ${inlineChanged} inline SVG/style file(s) updated`)
}
