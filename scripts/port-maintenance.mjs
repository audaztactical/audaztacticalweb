/**
 * Port docs/brain3d-prototype.html → maintenance modules.
 * CSS: scope under .mnt-root (keep original class names).
 * JS: wrap as mountMaintenanceRuntime(root, opts) with id-scoped $.
 */
import fs from 'fs'
import path from 'path'

const ROOT = process.cwd()
const OUT = path.join(ROOT, 'src/pages/maintenance')
const html = fs.readFileSync(path.join(ROOT, 'docs/brain3d-prototype.html'), 'utf8')
const cssRaw = html.match(/<style>([\s\S]*?)<\/style>/)[1]
const jsRaw = html.match(/<script>\s*\(\(\)=>\{([\s\S]*)\}\)\(\);\s*<\/script>/)[1]

fs.mkdirSync(path.join(OUT, 'brain3d'), { recursive: true })

/* ========== CSS: scope every rule under .mnt-root ========== */
function scopeCss(css) {
  let c = css
  c = c.replace(/:root\{/g, '.mnt-root{')
  c = c.replace(/@media\s*\(prefers-color-scheme:light\)\{:root:not\(\[data-theme="dark"\]\)\{/g, '@media (prefers-color-scheme:light){.mnt-root:not([data-theme="dark"]){')
  c = c.replace(/\bhtml,body\{[^}]*\}/g, '')
  c = c.replace(/\*\s*\{box-sizing:border-box;margin:0\}/g, '')
  c = c.replace(/\bbody\{/g, '.mnt-root{')
  c = c.replace(/\bbody::before/g, '.mnt-root::before')
  c = c.replace(/\.touch\b/g, '.mnt-root.touch')

  // Prefix top-level selectors (rough but effective for this file)
  const lines = c.split('\n')
  const out = []
  for (let line of lines) {
    if (/^\s*@/.test(line) || /^\s*\}/.test(line) || /^\s*\/\*/.test(line) || /^\s*$/.test(line) || /^\s*@keyframes/.test(line) || /^\s*@property/.test(line)) {
      out.push(line)
      continue
    }
    // rule start: .foo{ or .foo,.bar{
    if (/^\s*[\.\#\[]|^[a-zA-Z]/.test(line) && line.includes('{') && !line.includes('.mnt-root')) {
      line = line.replace(/^(\s*)/, '$1.mnt-root ')
      // fix double for nested already having .mnt-root from body replace
      line = line.replace(/\.mnt-root \.mnt-root/g, '.mnt-root')
    }
    out.push(line)
  }
  return out.join('\n')
}

const cssOut = `/* Ported from docs/brain3d-prototype.html — scoped to .mnt-root */
.mnt-root{position:fixed;inset:0;z-index:9990;overflow:hidden;width:100%;height:100%;height:100lvh;background:var(--bg,#050706);color:var(--fg,#eef2ef);font-family:var(--f-body,"IBM Plex Sans",system-ui,sans-serif);-webkit-font-smoothing:antialiased}
.mnt-root *,.mnt-root *::before,.mnt-root *::after{box-sizing:border-box;margin:0}
${scopeCss(cssRaw)}
.mnt-root .team-login{position:fixed;left:50%;bottom:max(10px,calc(env(safe-area-inset-bottom)+6px));transform:translateX(-50%);z-index:8;font:500 11px/1 var(--f-mono,monospace);letter-spacing:.08em;color:var(--dim,#5d6862);background:none;border:0;cursor:pointer;padding:8px 12px;pointer-events:auto}
.mnt-root .team-login:hover{color:var(--muted,#8a968f)}
`
fs.writeFileSync(path.join(OUT, 'maintenance.css'), cssOut)

/* ========== geometry / shaders / camera extracts ========== */
const lines = jsRaw.split('\n')
const find = (hint) => lines.findIndex((l) => l.includes(hint))
const g0 = find('Gürültü')
const w0 = find('WebGL')
const m0 = find('Matris')
const s0 = find('Sahne')

const geom = lines.slice(g0, w0).join('\n')
const webgl = lines.slice(w0, m0).join('\n')
const matrix = lines.slice(m0, s0).join('\n')

const shaders = {}
for (const name of ['SURF_VS', 'SURF_FS', 'PT_VS', 'PT_FS', 'LN_VS', 'LN_FS']) {
  const re = new RegExp(`const ${name}=\`([\\s\\S]*?)\`;`)
  const m = webgl.match(re)
  if (m) shaders[name] = m[1]
}
fs.writeFileSync(
  path.join(OUT, 'brain3d/shaders.js'),
  Object.entries(shaders)
    .map(([k, v]) => `export const ${k} = \`${v}\`;\n`)
    .join('\n'),
)

fs.writeFileSync(
  path.join(OUT, 'brain3d/camera.js'),
  `/** From brain3d-prototype */\n` +
    matrix
      .replace(/^\/\* =+.*/m, '')
      .replace(/function persp/, 'export function persp')
      .replace(/function lookAt/, 'export function lookAt')
      .replace(/function mul/, 'export function mul') +
    `\nexport const HOME_DEFAULT = { yaw: 0.38, pitch: 0.2, dist: 400 }\nexport const TARGET_DEFAULT = [0, 2, -6]\n`,
)

const lobesBlock = lines.slice(find('Bölgeler'), g0).join('\n')
fs.writeFileSync(
  path.join(OUT, 'brain3d/geometry.js'),
  `/** Anatomical brain geometry — from brain3d-prototype */\n` +
    lobesBlock
      .replace(/^\/\* =+.*/m, '')
      .replace(/const LOBES=/, 'export const LOBES=')
      .replace(/const RI=/, 'export const RI=')
      .replace(/const LT=/, 'export const LT=')
      .replace(/const lv=/, 'export const lv=')
      .replace(/const START=/, 'export const START=')
      .replace(/const DIM=new Float32Array\(\[1,1,1,1,\.5,1,1,1\]\); \/\/ temporal: bir süredir kayıtsız, sönüyor\nconst state=\{xp:\{\.\.\.START\},sel:-1,hov:-1\};\nconst levelOf=i=>lv\(state\.xp\[LOBES\[i\]\.id\]\);/, '') +
    '\n' +
    geom
      .replace(/^\/\* =+.*/gm, (m) => m)
      .replace(/const perm=/, 'export const perm=')
      .replace(/function noise/, 'export function noise')
      .replace(/function rng/, 'export function rng')
      .replace(/const V=/, 'export const V=')
      .replace(/function ell/, 'export function ell')
      .replace(/function smin/, 'export function smin')
      .replace(/function sdfHemi/, 'export function sdfHemi')
      .replace(/const ys=/, 'export const ys=')
      .replace(/const zc=/, 'export const zc=')
      .replace(/function wig/, 'export function wig')
      .replace(/function majorDist/, 'export function majorDist')
      .replace(/const ANI=/, 'export const ANI=')
      .replace(/function minorField/, 'export function minorField')
      .replace(/function regionOf/, 'export function regionOf')
      .replace(/function icosphere/, 'export function icosphere')
      .replace(/function finishMesh/, 'export function finishMesh')
      .replace(/function buildHemi/, 'export function buildHemi')
      .replace(/const CB_HUB=/, 'export const CB_HUB=')
      .replace(/function sdfCbl/, 'export function sdfCbl')
      .replace(/function buildCbl/, 'export function buildCbl')
      .replace(/function stemCenter/, 'export function stemCenter')
      .replace(/function buildStem/, 'export function buildStem')
      .replace(/function hippoCurve/, 'export function hippoCurve'),
)

/* ========== Full runtime engine (embedded prototype body) ========== */
let body = jsRaw

// Scoped $
body = body.replace(
  /const \$=id=>document\.getElementById\(id\);/,
  `const $=id=>root.querySelector("#mnt-"+id)||root.querySelector("#"+id);`,
)

// touch class on root
body = body.replace(
  /if\(coarse\)document\.documentElement\.classList\.add\("touch"\);/,
  `if(coarse)root.classList.add("touch");`,
)

// Track disposables
const prelude = `
  const __disposers = [];
  const __timers = [];
  const __intervals = [];
  let __raf = 0;
  let __disposed = false;
  const __on = (t, ty, fn, opt) => { t.addEventListener(ty, fn, opt); __disposers.push(() => t.removeEventListener(ty, fn, opt)); };
  const __later = (fn, ms) => { const id = setTimeout(fn, ms); __timers.push(id); return id; };
  const __every = (fn, ms) => { const id = setInterval(fn, ms); __intervals.push(id); return id; };
`

body = body.replace(/^"use strict";\n/, `"use strict";\n${prelude}`)

// window listeners → __on
body = body.replace(/\baddEventListener\("keydown"/g, '__on(window,"keydown"')
body = body.replace(/\baddEventListener\("resize"/g, '__on(window,"resize"')

// IntersectionObserver / ResizeObserver capture
body = body.replace(
  /let vis=true;new IntersectionObserver\(e=>\{vis=e\[0\]\.isIntersecting\}\)\\.observe\(stage\);/,
  `let vis=true;{const __io=new IntersectionObserver(e=>{vis=e[0].isIntersecting});__io.observe(stage);__disposers.push(()=>__io.disconnect());}`,
)
body = body.replace(
  /let srq=0;new ResizeObserver\(\(\)=>\{cancelAnimationFrame\(srq\);srq=requestAnimationFrame\(\(\)=>size\(\)\)\}\)\\.observe\(stage\);/,
  `let srq=0;{const __ro=new ResizeObserver(()=>{cancelAnimationFrame(srq);srq=requestAnimationFrame(()=>size())});__ro.observe(stage);__disposers.push(()=>__ro.disconnect());}`,
)

// rAF frame loop
body = body.replace(
  /function frame\(ms\)\{requestAnimationFrame\(frame\);/,
  `function frame(ms){__raf=requestAnimationFrame(frame);if(__disposed)return;`,
)

// setInterval for soon → __every
body = body.replace(
  /setInterval\(\(\)=>\{if\(document\.hidden\)return;if\(p>=99\)/,
  `__every(()=>{if(document.hidden)return;if(p>=99)`,
)

// notify hook
body = body.replace(
  /\$\("notify"\)\.addEventListener\("click",e=>\{e\.currentTarget\.textContent="Listeye yazıldın ✓";e\.currentTarget\.classList\.add\("done"\);NORO\.cat\("notify",4000\)\}\)/,
  `$("notify").addEventListener("click",e=>{e.currentTarget.textContent="Listeye yazıldın ✓";e.currentTarget.classList.add("done");NORO.cat("notify",4000);try{opts.onNotify&&opts.onNotify()}catch(_){}})`,
)

// webgl context lost/restored
body = body.replace(
  /const gl=cv\.getContext\("webgl2",\{antialias:true,alpha:true,premultipliedAlpha:false\}\);\nlet NOGL=!gl;/,
  `const gl=cv.getContext("webgl2",{antialias:true,alpha:true,premultipliedAlpha:false});
let NOGL=!gl;
if(cv){
  __on(cv,"webglcontextlost",(e)=>{e.preventDefault();NOGL=true});
  __on(cv,"webglcontextrestored",()=>{
    try{
      NOGL=false;
      SP=prog(SURF_VS,SURF_FS);PP=prog(PT_VS,PT_FS);LP=prog(LN_VS,LN_FS);
      build();size();refresh();
      if(!__raf)__raf=requestAnimationFrame(frame);
    }catch(err){console.warn(err);NOGL=true;$("nogl").style.display="grid"}
  });
}`,
)

// Chunked geometry: yield between heavy builds
body = body.replace(
  /function build\(\)\{\n  const sphere=icosphere\(6\);\n  HEMI=\[buildHemi\(sphere,1\),buildHemi\(sphere,-1\)\];\n  const CBL=buildCbl\(sphere\),STEM=buildStem\(\);\n  MESHES=\[HEMI\[0\],HEMI\[1\],CBL,STEM\];buildNeurons\(\);syncNet\(\);\n\}/,
  `function build(){
  const sphere=icosphere(6);
  HEMI=[buildHemi(sphere,1),buildHemi(sphere,-1)];
  const CBL=buildCbl(sphere),STEM=buildStem();
  MESHES=[HEMI[0],HEMI[1],CBL,STEM];buildNeurons();syncNet();
}
async function buildChunked(){
  $("loading").textContent="BEYİN İNŞA EDİLİYOR…";
  $("loading").classList.remove("done");
  await new Promise(r=>requestAnimationFrame(r));
  const sphere=icosphere(6);
  await new Promise(r=>setTimeout(r,0));
  HEMI=[buildHemi(sphere,1)];
  await new Promise(r=>setTimeout(r,0));
  HEMI.push(buildHemi(sphere,-1));
  await new Promise(r=>setTimeout(r,0));
  const CBL=buildCbl(sphere);
  await new Promise(r=>setTimeout(r,0));
  const STEM=buildStem();
  MESHES=[HEMI[0],HEMI[1],CBL,STEM];
  await new Promise(r=>setTimeout(r,0));
  buildNeurons();syncNet();
}`,
)

body = body.replace(
  /requestAnimationFrame\(\(\)=>setTimeout\(\(\)=>\{\n  if\(!NOGL\)\{try\{build\(\)\}catch\(err\)\{console\.error\(err\);NOGL=true\}\}\n  if\(NOGL\)\{\$\("nogl"\)\.style\.display="grid";stage\.style\.cursor="default"\}\n  refresh\(\);started=true;\$\("loading"\)\.classList\.add\("done"\);if\(!NOGL\)requestAnimationFrame\(frame\);\n  TOUR\.boot\(\);\n\},30\)\);/,
  `requestAnimationFrame(()=>__later(async()=>{
  if(!NOGL){try{await buildChunked()}catch(err){console.error(err);NOGL=true}}
  if(NOGL){$("nogl").style.display="grid";stage.style.cursor="default"}
  refresh();started=true;$("loading").classList.add("done");if(!NOGL)__raf=requestAnimationFrame(frame);
  TOUR.boot();
},30));`,
)

// Remove unused demo auto-run (function kept for tour-like toast only — demo never called in prototype boot, OK)
// Strip dead demo EV if we want — leave as-is for fidelity of dead code? Spec says no auto sim — demo is never scheduled. OK.

const engine = `/**
 * Maintenance 3D runtime — 1:1 port of docs/brain3d-prototype.html
 * @param {HTMLElement} root .mnt-root
 * @param {{ onNotify?: () => void, onEvent?: (ev:string,p?:any)=>void }} opts
 */
export function mountMaintenanceRuntime(root, opts = {}) {
${body}

  function dispose(){
    if(__disposed)return;
    __disposed=true;
    cancelAnimationFrame(__raf);__raf=0;
    __timers.forEach(clearTimeout);
    __intervals.forEach(clearInterval);
    __disposers.forEach(fn=>{try{fn()}catch(_){}});
    try{
      if(typeof chips!=="undefined")chips.forEach(c=>c.remove());
    }catch(_){}
  }

  return {
    dispose,
    setProfile(xp){ if(xp){ Object.assign(state.xp,xp); refresh(); } },
    select(i,fly=true){ select(i,fly); },
    resetView(){ stage.dispatchEvent(new Event("dblclick")); },
    resize(){ size(); },
    start(){ if(!NOGL&&!__raf)__raf=requestAnimationFrame(frame); },
    stop(){ cancelAnimationFrame(__raf);__raf=0; },
    on(ev,cb){ /* reserved */ },
  };
}

/**
 * React-facing WebGL API (stage must already contain #mnt-gl / #mnt-ov and live under .mnt-root)
 */
export function createBrain3D(canvas, overlay, opts = {}) {
  const root = canvas.closest('.mnt-root')
  if (!root) throw new Error('createBrain3D: canvas must be inside .mnt-root')
  return mountMaintenanceRuntime(root, opts)
}
`

fs.writeFileSync(path.join(OUT, 'brain3d/engine.js'), engine)
console.log('Wrote engine.js', engine.length, 'css', cssOut.length)
console.log('geometry', fs.statSync(path.join(OUT, 'brain3d/geometry.js')).size)
console.log('shaders', fs.statSync(path.join(OUT, 'brain3d/shaders.js')).size)
console.log('camera', fs.statSync(path.join(OUT, 'brain3d/camera.js')).size)
