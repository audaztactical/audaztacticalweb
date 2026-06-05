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

function buildNineLineTemplateHtml() {
  return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8"/>
<title>9-LINE MEDEVAC ŞABLONU</title>
<style>
  body { font-family: "Courier New", monospace; margin: 24px; color: #111; }
  h1 { font-size: 14px; letter-spacing: 0.12em; border-bottom: 2px solid #b45309; padding-bottom: 8px; }
  .line { margin: 12px 0; font-size: 11px; }
  .blank { border-bottom: 1px solid #333; min-height: 18px; margin-top: 4px; }
  .footer { margin-top: 32px; font-size: 9px; color: #666; }
</style>
</head>
<body>
<h1>NATO 9-LINE MEDEVAC TAHLİYE TALEBİ · BOŞ ŞABLON</h1>
<p class="line"><strong>HAT 1 · KOORDİNAT (MGRS):</strong><div class="blank"></div></p>
<p class="line"><strong>HAT 2 · FREKANS / ÇAĞRI ADI:</strong><div class="blank"></div></p>
<p class="line"><strong>HAT 3 · ACİLİYET (A/B/C/D/E):</strong><div class="blank"></div></p>
<p class="line"><strong>HAT 4 · ÖZEL EKİPMAN:</strong><div class="blank"></div></p>
<p class="line"><strong>HAT 5 · TAŞIMA TİPİ (L/A):</strong><div class="blank"></div></p>
<p class="line"><strong>HAT 6 · LZ GÜVENLİK (N/P/E/X):</strong><div class="blank"></div></p>
<p class="line"><strong>HAT 7 · İŞARETLEME:</strong><div class="blank"></div></p>
<p class="line"><strong>HAT 8 · UYRUK / STATÜ:</strong><div class="blank"></div></p>
<p class="line"><strong>HAT 9 · KBRN / ARAZİ:</strong><div class="blank"></div></p>
<p class="footer">AUDAZ TACTICAL · TCCC PDF ŞABLON MERKEZİ · YAZDIR → PDF OLARAK KAYDET</p>
</body>
</html>`
}

function buildCasevacMistTemplateHtml() {
  return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8"/>
<title>CASEVAC MIST ŞABLONU</title>
<style>
  body { font-family: "Courier New", monospace; margin: 24px; color: #111; }
  h1 { font-size: 14px; letter-spacing: 0.12em; border-bottom: 2px solid #b91c1c; padding-bottom: 8px; }
  .line { margin: 14px 0; font-size: 11px; }
  .opts { font-size: 10px; color: #444; margin-top: 6px; line-height: 1.6; }
  .blank { border-bottom: 1px solid #333; min-height: 18px; margin-top: 4px; }
  .footer { margin-top: 32px; font-size: 9px; color: #666; }
</style>
</head>
<body>
<h1>CASEVAC · MIST PROTOKOLÜ · SICAK BÖLGE TAHLİYE ŞABLONU</h1>
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
<p class="footer">AUDAZ TACTICAL · CASEVAC MIST ŞABLONU · 30 SN İLETİM PENCERESİ · YAZDIR → PDF</p>
</body>
</html>`
}
