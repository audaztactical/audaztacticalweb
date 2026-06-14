import logoUrl from '../assets/logo.png'

const FONT_REGULAR_URL = '/fonts/Roboto-Regular.ttf'
const FONT_BOLD_URL = '/fonts/Roboto-Bold.ttf'

/** Sabit logo yüksekliği (mm) — genişlik orijinal en-boy oranından türetilir */
const LOGO_HEIGHT_MM = 16

/** @type {{ regular: string, bold: string } | null} */
let fontCache = null

/** @type {{ dataUrl: string, widthPx: number, heightPx: number } | null} */
let logoCache = null

/**
 * @param {ArrayBuffer} buffer
 */
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

async function loadFontAssets() {
  if (fontCache) return fontCache

  const [regularRes, boldRes] = await Promise.all([
    fetch(FONT_REGULAR_URL),
    fetch(FONT_BOLD_URL),
  ])

  if (!regularRes.ok || !boldRes.ok) {
    throw new Error('PDF font dosyaları yüklenemedi')
  }

  const [regularBuf, boldBuf] = await Promise.all([regularRes.arrayBuffer(), boldRes.arrayBuffer()])

  fontCache = {
    regular: arrayBufferToBase64(regularBuf),
    bold: arrayBufferToBase64(boldBuf),
  }

  return fontCache
}

/**
 * @param {string} dataUrl
 * @returns {Promise<{ width: number, height: number }>}
 */
function readImageDimensions(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = () => reject(new Error('Logo boyutları okunamadı'))
    img.src = dataUrl
  })
}

async function loadLogoAsset() {
  if (logoCache) return logoCache

  const res = await fetch(logoUrl)
  if (!res.ok) throw new Error('Logo dosyası yüklenemedi')

  const blob = await res.blob()
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Logo okunamadı'))
    reader.readAsDataURL(blob)
  })

  const dims = await readImageDimensions(dataUrl)
  logoCache = { dataUrl, widthPx: dims.width, heightPx: dims.height }
  return logoCache
}

export const PDF_FONT_FAMILY = 'Roboto'

/**
 * Orijinal en-boy oranını koruyarak logo boyutlarını hesaplar.
 * @param {{ widthPx: number, heightPx: number }} logo
 * @param {number} [heightMm]
 */
export function computeLogoDimensions(logo, heightMm = LOGO_HEIGHT_MM) {
  const aspect = logo.widthPx / Math.max(1, logo.heightPx)
  return { widthMm: heightMm * aspect, heightMm }
}

/**
 * @param {import('jspdf').jsPDF} doc
 */
export async function preparePdfAssets(doc) {
  const [fonts, logo] = await Promise.all([loadFontAssets(), loadLogoAsset()])

  doc.addFileToVFS('Roboto-Regular.ttf', fonts.regular)
  doc.addFont('Roboto-Regular.ttf', PDF_FONT_FAMILY, 'normal')
  doc.addFileToVFS('Roboto-Bold.ttf', fonts.bold)
  doc.addFont('Roboto-Bold.ttf', PDF_FONT_FAMILY, 'bold')

  const logoDims = computeLogoDimensions(logo)
  return { logoDataUrl: logo.dataUrl, logoDims }
}

/**
 * @param {import('jspdf').jsPDF} doc
 * @param {'normal' | 'bold'} style
 */
export function setPdfFont(doc, style = 'normal') {
  doc.setFont(PDF_FONT_FAMILY, style)
}
