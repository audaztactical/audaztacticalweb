/**
 * Visual/interaction proof for Dashboard Wind Trend chart height + tooltip.
 * Mirrors CommandSideWidgets chart markup (height + Recharts Tooltip).
 * Run: node scripts/test-wind-trend-widget.mjs
 */
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { chromium } from 'playwright'
import { createServer } from 'node:http'
import { mkdtemp, mkdir, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const outDir = join(__dirname, 'output')
await mkdir(outDir, { recursive: true })

const dir = await mkdtemp(join(tmpdir(), 'wind-trend-'))
const entry = join(dir, 'entry.jsx')
const outfile = join(dir, 'bundle.js')

await writeFile(
  entry,
  `
import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Line, LineChart, ResponsiveContainer, Tooltip, YAxis } from 'recharts'

const windSeries = [
  { t: '14:00', v: 4 },
  { t: '15:00', v: 6 },
  { t: '16:00', v: 5 },
  { t: '17:00', v: 8 },
  { t: '18:00', v: 7 },
  { t: '19:00', v: 4 },
  { t: '20:00', v: 3 },
]

function WindTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  if (!row) return null
  return (
    <div className="cmd-wind-tooltip" role="tooltip" data-testid="wind-tooltip">
      {row.t} · {row.v} km/h
    </div>
  )
}

function App() {
  const [open, setOpen] = useState(true)
  return (
    <div className="cmd-widget cmd-widget--panel cmd-glass-panel cmd-widget--open" data-testid="wind-card">
      <button type="button" onClick={() => setOpen((v) => !v)}>Rüzgar Trendi</button>
      {open ? (
        <div className="cmd-widget__body">
          <div className="cmd-widget__chart-wrap" data-testid="chart-wrap">
            <div className="cmd-widget__chart h-28" data-testid="chart-box" style={{ height: 112, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={112}>
                <LineChart data={windSeries} margin={{ top: 10, right: 10, left: 4, bottom: 4 }}>
                  <YAxis hide domain={[0, 'auto']} />
                  <Tooltip content={WindTooltip} cursor={{ stroke: '#94a3b8', strokeWidth: 1 }} />
                  <Line
                    type="monotone"
                    dataKey="v"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0, fill: '#22c55e' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p data-testid="chart-caption">Hourly wind (km/h)</p>
          </div>
        </div>
      ) : null}
    </div>
  )
}

createRoot(document.getElementById('root')).render(<App />)
`,
)

await build({
  entryPoints: [entry],
  bundle: true,
  format: 'iife',
  platform: 'browser',
  outfile,
  jsx: 'automatic',
  absWorkingDir: root,
  nodePaths: [join(root, 'node_modules')],
  loader: { '.js': 'jsx' },
})

const js = await readFile(outfile, 'utf8')
const css = `
  .cmd-glass-panel { overflow: hidden; border: 1px solid #334155; background: #0f172a; color: #e2e8f0; }
  .cmd-widget--panel.cmd-widget--open.cmd-glass-panel { overflow: visible; }
  .cmd-widget__chart { background: rgba(0,0,0,.22); overflow: visible; }
  .cmd-wind-tooltip {
    padding: 6px 8px; border: 1px solid #475569; background: rgba(15,23,42,.94);
    font: 11px monospace; white-space: nowrap;
  }
  body { margin: 24px; background: #020617; font-family: sans-serif; }
`

const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><style>${css}</style></head>
<body><div id="root"></div><script>${js}</script></body></html>`

const htmlPath = join(dir, 'index.html')
await writeFile(htmlPath, html)

const server = createServer(async (req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
  res.end(html)
})
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
const { port } = server.address()
const url = `http://127.0.0.1:${port}/`

const browser = await chromium.launch({ headless: true })
const results = {}

async function runViewport(name, size) {
  const page = await browser.newPage({ viewport: size })
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-testid="chart-box"]')

  const metrics = await page.evaluate(() => {
    const box = document.querySelector('[data-testid="chart-box"]')
    const caption = document.querySelector('[data-testid="chart-caption"]')
    const svg = box?.querySelector('svg')
    const boxRect = box.getBoundingClientRect()
    const captionRect = caption.getBoundingClientRect()
    return {
      chartHeight: boxRect.height,
      chartWidth: boxRect.width,
      svgHeight: svg ? svg.getBoundingClientRect().height : 0,
      captionBelowChart: captionRect.top >= boxRect.bottom - 1,
      captionVisible: captionRect.height > 0 && getComputedStyle(caption).visibility !== 'hidden',
    }
  })

  assert.ok(metrics.chartHeight >= 100, `${name}: chart box too short (${metrics.chartHeight})`)
  assert.ok(metrics.svgHeight >= 90, `${name}: svg too short (${metrics.svgHeight})`)
  assert.ok(metrics.captionBelowChart, `${name}: caption clipped inside chart box`)
  assert.ok(metrics.captionVisible, `${name}: caption not visible`)

  const chart = page.locator('[data-testid="chart-box"] svg')
  const box = await chart.boundingBox()
  assert.ok(box, `${name}: no chart bbox`)

  // Hover mid-line to trigger Recharts tooltip
  await page.mouse.move(box.x + box.width * 0.55, box.y + box.height * 0.45)
  await page.waitForTimeout(250)

  const tip = page.locator('[data-testid="wind-tooltip"]')
  await tip.waitFor({ state: 'visible', timeout: 3000 })
  const tipText = (await tip.textContent())?.trim() ?? ''
  assert.match(tipText, /\d{2}:\d{2}\s·\s\d+\s*km\/h/, `${name}: bad tooltip "${tipText}"`)

  const shot = join(outDir, `wind-trend-${name}.png`)
  await page.screenshot({ path: shot, fullPage: true })

  results[name] = { ...metrics, tipText, shot }
  await page.close()
}

try {
  await runViewport('desktop', { width: 1280, height: 800 })
  await runViewport('mobile', { width: 390, height: 844 })
  console.log(JSON.stringify({ ok: true, results }, null, 2))
} finally {
  await browser.close()
  server.close()
}
