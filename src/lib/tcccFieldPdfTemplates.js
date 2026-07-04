import { buildPdfHtmlBaseStyles } from './pdfDesignTokens'

/**
 * @param {'nine_line' | 'casevac_mist'} templateId
 */
export function openTcccFieldPdfTemplate(templateId) {
  const html =
    templateId === 'casevac_mist' ? buildCasevacMistTemplateHtml() : buildNineLineTemplateHtml()
  const win = window.open('', '_blank', 'noopener,noreferrer')
  if (!win) return
  win.document.open()
  win.document.write(html)
  win.document.close()
  win.focus()
  win.onload = () => {
    win.print()
  }
}

function buildHtmlHeader(title) {
  const now = new Date().toLocaleString('tr-TR')
  return `<div class="header-bar">
  <div class="header-left">
    <div class="brand">AUDAZ TACTICAL</div>
    <div class="sub">Operasyonel Kayıt Sistemi</div>
  </div>
  <div class="header-right">
    <div class="title">${title}</div>
    <div class="date">${now}</div>
  </div>
</div>`
}

function buildNineLineTemplateHtml() {
  const styles = buildPdfHtmlBaseStyles()
  const header = buildHtmlHeader('NATO 9-LINE MEDEVAC TAHLİYE TALEBİ · BOŞ ŞABLON')
  return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8"/>
<title>9-LINE MEDEVAC ŞABLONU</title>
<style>${styles}</style>
</head>
<body>
${header}
<div class="page">
<p class="line"><strong>HAT 1 · KOORDİNAT (MGRS):</strong><div class="blank"></div></p>
<p class="line"><strong>HAT 2 · FREKANS / ÇAĞRI ADI:</strong><div class="blank"></div></p>
<p class="line"><strong>HAT 3 · ACİLİYET (A/B/C/D/E):</strong><div class="blank"></div></p>
<p class="line"><strong>HAT 4 · ÖZEL EKİPMAN:</strong><div class="blank"></div></p>
<p class="line"><strong>HAT 5 · TAŞIMA TİPİ (L/A):</strong><div class="blank"></div></p>
<p class="line"><strong>HAT 6 · LZ GÜVENLİK (N/P/E/X):</strong><div class="blank"></div></p>
<p class="line"><strong>HAT 7 · İŞARETLEME:</strong><div class="blank"></div></p>
<p class="line"><strong>HAT 8 · UYRUK / STATÜ:</strong><div class="blank"></div></p>
<p class="line"><strong>HAT 9 · KBRN / ARAZİ:</strong><div class="blank"></div></p>
<div class="footer"><span>AUDAZ TACTICAL · TCCC PDF ŞABLON MERKEZİ</span><span>YAZDIR → PDF OLARAK KAYDET</span></div>
</div>
</body>
</html>`
}

function buildCasevacMistTemplateHtml() {
  const styles = buildPdfHtmlBaseStyles()
  const header = buildHtmlHeader('CASEVAC · MIST PROTOKOLÜ · SICAK BÖLGE TAHLİYE ŞABLONU')
  return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8"/>
<title>CASEVAC MIST ŞABLONU</title>
<style>${styles}</style>
</head>
<body>
${header}
<div class="page">
<p class="line"><strong>TOPLAM YARALI SAYISI:</strong><div class="blank"></div></p>
<p class="line"><strong>M — METRIC / YARALANMA TİPİ:</strong><div class="blank"></div>
<span class="opts">□ Kurşun yarası &nbsp; □ Şarapnel &nbsp; □ Amputasyon &nbsp; □ Yanık</span></p>
<p class="line"><strong>I — INJURY / YARANIN YERİ:</strong><div class="blank"></div>
<span class="opts">□ Baş/Boyun &nbsp; □ Göğüs &nbsp; □ Batın &nbsp; □ Uzuvlar</span></p>
<p class="line"><strong>S — SIGNS / VİTAL:</strong><div class="blank"></div>
<span class="opts">□ Bilinç Açık &nbsp; □ Bilinç Kapalı &nbsp; □ Şok VAR &nbsp; □ Şok YOK</span></p>
<p class="line"><strong>T — TREATMENT / MÜDAHALE:</strong><div class="blank"></div>
<span class="opts">□ Turnike &nbsp; □ Göğüs Mührü &nbsp; □ Hava Yolu &nbsp; □ Morfin</span></p>
<p class="line"><strong>SICAK BÖLGE ÇAĞRI / FREKANS:</strong><div class="blank"></div></p>
<div class="footer"><span>AUDAZ TACTICAL · CASEVAC MIST ŞABLONU · 30 SN İLETİM PENCERESİ</span><span>YAZDIR → PDF</span></div>
</div>
</body>
</html>`
}