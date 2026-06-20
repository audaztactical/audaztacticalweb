import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, Mic, Radio, Send } from 'lucide-react'
import {
  MEDEVAC_CONFLICT_LABELS,
  MEDEVAC_LINE3_PRECEDENCE,
  MEDEVAC_LINE4_OPTIONS,
  MEDEVAC_LINE6_OPTIONS,
  MEDEVAC_LINE7_OPTIONS,
  MEDEVAC_LINE8_OPTIONS,
  MEDEVAC_LINE9_CBRN_OPTIONS,
  MEDEVAC_LINE9_TERRAIN_OPTIONS,
  MEDEVAC_SIM_INITIAL,
} from '../../lib/medevacSimulatorConstants'
import { submitMedevacSimulatorSession } from '../../lib/medevacSimulatorSubmit'
import {
  CASEVAC_MIST_INJURY_OPTIONS,
  CASEVAC_MIST_METRIC_OPTIONS,
  CASEVAC_MIST_TREATMENT_OPTIONS,
  CASEVAC_MIST_VITALS_OPTIONS,
  CASEVAC_SIM_INITIAL,
  CASEVAC_TRANSMISSION_DEADLINE_SEC,
} from '../../lib/casevacSimulatorConstants'
import {
  buildCasevacRejectionReasons,
  detectCasevacConflicts,
  isCasevacFormComplete,
} from '../../lib/casevacSimulatorValidation'
import { submitCasevacSimulatorSession } from '../../lib/casevacSimulatorSubmit'
import {
  MEDEVAC_TRANSMISSION_DEADLINE_SEC,
  detectNineLineConflicts,
  getPatientTypeTotal,
  getPrecedenceTotal,
  isNineLineFormComplete,
  HAT1_COORDINATE_GUIDE_LINE,
  HAT1_UNSEPARATED_BLOC_LINE,
  hasUnseparatedDigitBloc,
  isValidMgrsPickup,
  normalizeMgrsPickup,
  parseOperationalLatLon,
} from '../../lib/medevacSimulatorValidation'
import { invStr } from '../../lib/inventoryIlws'
import { PENALTY_TCCC_BELOW_40 } from '../../lib/orsEngine'
import { formatOvertimeDebriefLine } from '../../lib/simulationHistoryHelpers'
/** @typedef {'medevac' | 'casevac'} EvacSimMode */

const fieldClass =
  'w-full rounded border border-amber-500/30 bg-black/75 px-3 py-2 font-mono text-xs uppercase text-amber-300 placeholder:text-amber-900/70 focus:border-amber-400/70 focus:outline-none focus:ring-1 focus:ring-amber-400/30 disabled:cursor-not-allowed disabled:opacity-45'

const sectionClass =
  'rounded-lg border border-amber-600/25 bg-black/45 p-3 sm:p-4 medevac-radio-grid'

const labelClass = 'font-mono text-[9px] font-bold uppercase tracking-[0.24em] text-amber-500/90'

const lineTitleClass = 'font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-amber-400'

const briefingSectionTitleClass =
  'font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300'

const briefingBodyClass = 'text-left font-mono text-sm leading-relaxed text-amber-400/90'

/**
 * @param {number} lat
 * @param {number} lon
 */
function latLonToSimulatedMgrs(lat, lon) {
  const zone = Math.min(60, Math.max(1, Math.floor((lon + 180) / 6) + 1))
  const latBands = 'CDEFGHJKLMNPQRSTUVWX'
  const latIdx = Math.min(latBands.length - 1, Math.max(0, Math.floor((lat + 80) / 8)))
  const band = latBands[latIdx] ?? 'T'
  const grid = 'ABCDEFGHJKLMNPQRSTUV'
  const col = grid[Math.floor((((lon + 180) % 6) / 6) * grid.length) % grid.length]
  const row = grid[Math.floor(((lat + 90) / 180) * grid.length) % grid.length]
  const easting = String(Math.floor(Math.abs(lon * 137.508) % 10000)).padStart(4, '0')
  const northing = String(Math.floor(Math.abs(lat * 251.732) % 10000)).padStart(4, '0')
  return `${zone}${band} ${col}${row} ${easting} ${northing}`
}

/**
 * @param {string} raw
 * @returns {{ value: string; gpsConverted: boolean }}
 */
/**
 * HAT 1 — MGRS, DD (ondalık) veya DMS (6 sayı, sembolsüz) girdiyi operasyonel MGRS'e çevirir.
 * @param {string} raw
 * @returns {{ value: string; gpsConverted: boolean }}
 */
function parseLine1CoordinateInput(raw) {
  const mgrs = normalizeMgrsPickup(raw)
  if (mgrs) {
    return { value: mgrs, gpsConverted: false }
  }

  const operational = parseOperationalLatLon(raw)
  if (operational) {
    return {
      value: latLonToSimulatedMgrs(operational.lat, operational.lon),
      gpsConverted: true,
    }
  }

  return { value: invStr(raw), gpsConverted: false }
}

/**
 * @param {typeof MEDEVAC_SIM_INITIAL} form
 * @param {{ timedOut?: boolean }} opts
 * @returns {string[]}
 */
function buildMedevacRejectionReasons(form, { timedOut = false } = {}) {
  /** @type {string[]} */
  const reasons = []

  if (timedOut) {
    reasons.push(
      '• [HATA_KODU: SİNYAL_DEŞİFRE] Konuşma süresi 45 saniyeyi geçti! Düşman sinyal takip unsurları (Direction Finding) yerinizi tespit etti, koordinatınıza topçu mühimmatı yönlendirildi.'
    )
  }

  const line1 = invStr(form.line1_mgrs).trim()
  if (!line1 || line1.trim() === '') {
    reasons.push(
      "• [🚨 KRİTİK HATA - ROTASIZ UÇUŞ]: HAT 1 (TAHLİYE BÖLGESİ KOORDİNATI) BOŞ BIRAKILDI! PİLOTLAR NET BİR COĞRAFİ HEDEF (MGRS/GPS) OLMADAN ROTASIZ PERVANE DÖNDÜREMEZ, HELİKOPTER HANGARDA KALDI."
    )
  } else if (hasUnseparatedDigitBloc(form.line1_mgrs)) {
    reasons.push(HAT1_UNSEPARATED_BLOC_LINE)
  } else if (!isValidMgrsPickup(form.line1_mgrs)) {
    reasons.push(
      '• [HAT 1 HATASI]: TAHLİYE BÖLGESİ KOORDİNATI GEÇERSİZ FORMAT! MGRS (ÖRN. 36S TH 1234 5678) VEYA GPS (ENLEM, BOYLAM) GİRİLMELİ — HELİKOPTER ROTASIZ KALKIŞ YAPAMAZ.'
    )
    reasons.push(HAT1_COORDINATE_GUIDE_LINE)
  }

  const urgent = form.line3_urgent
  const urgentSurge = form.line3_urgent_surge
  const priority = form.line3_priority
  const routine = form.line3_routine
  const litter = form.line5_litter
  const ambulatory = form.line5_ambulatory

  const hat3Total =
    Number(urgent || 0) +
    Number(urgentSurge || 0) +
    Number(priority || 0) +
    Number(routine || 0) +
    Number(form.line3_convenience || 0)
  const hat5Total = Number(litter || 0) + Number(ambulatory || 0)

  if (hat3Total === 0) {
    reasons.push(
      '• [HAT 3 HATASI]: Yaralı aciliyet derecesi (A/B/C/D) sayıları girilmedi veya toplam sıfır — triyaj verisi eksik.'
    )
  }

  if (hat5Total === 0) {
    reasons.push(
      '• [HAT 5 HATASI]: Sedye (Litter) veya ayakta (Ambulatory) taşıma tipi sayıları girilmedi — lojistik kapasite bildirilemedi.'
    )
  }

  if (hat3Total > 0 && hat5Total > 0 && hat3Total !== hat5Total) {
    if (hat3Total > hat5Total) {
      const missing = hat3Total - hat5Total
      reasons.push(
        `• [🚨 REAKSİYON HATASI - EKSİK LİSTELERİ]: HAT 3 TOPLAM ${hat3Total} ≠ HAT 5 TOPLAM ${hat5Total} · ${missing} YARALI İÇİN TAŞIMA TİPİ (SEDYE/AYAKTA) EKSİK — PİLOT KALKIŞI REDDETTİ!`
      )
    } else {
      const excess = hat5Total - hat3Total
      reasons.push(
        `• [🚨 REAKSİYON HATASI - HAYALET YOLCU]: HAT 3 TOPLAM ${hat3Total} ≠ HAT 5 TOPLAM ${hat5Total} · ${excess} FAZLA YOLCU — SEDYE/AYAKTA UYUŞMAZLIĞI, KALKIŞ REDDİ!`
      )
    }
  }

  if (!invStr(form.line2_freq_callsign).trim()) {
    reasons.push(
      '• [HAT 2 HATASI]: Telsiz frekansı / çağrı adı boş — MEDEVAC unsuru sizi telsizde arayamaz.'
    )
  }

  const line4 = Array.isArray(form.line4_equipment) ? form.line4_equipment : []
  if (line4.length === 0) {
    reasons.push(
      '• [HAT 4 HATASI]: Özel ekipman seçilmedi — en az bir ekipman (VİNÇ, SEDYE, KURTARMA vb.) işaretlenmeli.'
    )
  }

  if (!form.line6_security) {
    reasons.push(
      '• [HAT 6 HATASI]: Tahliye bölgesi güvenlik durumu (N/P/E/X) seçilmedi — pilot risk profili oluşturamaz.'
    )
  }

  if (!form.line7_marking) {
    reasons.push(
      '• [HAT 7 HATASI]: LZ işaretleme yöntemi seçilmedi — kurtarma ekibi bölgeyi görsel olarak teyit edemez.'
    )
  }

  if (!form.line8_nationality) {
    reasons.push(
      '• [HAT 8 HATASI]: Yaralı uyruğu ve statüsü seçilmedi — hukuki tahliye protokolü başlatılamaz.'
    )
  }

  if (!form.line9_cbrn && !form.line9_terrain) {
    reasons.push(
      '• [HAT 9 HATASI]: KBRN tehdidi veya arazi şartları bildirilmedi — helikopter iniş profili belirlenemez.'
    )
  }

  const conflicts = detectNineLineConflicts(form)
  for (const code of conflicts) {
    if (code === 'PATIENT_COUNT_MISMATCH' || code === 'LINE3_ZERO_PATIENTS' || code === 'LINE5_ZERO_PATIENTS') {
      continue
    }
    const label =
      MEDEVAC_CONFLICT_LABELS[/** @type {keyof typeof MEDEVAC_CONFLICT_LABELS} */ (code)] ?? code
    if (code === 'UNMARKED_SECURE_LZ') {
      reasons.push(
        `• [HAT 6 & HAT 7 ÇAKIŞMASI]: ${label} — güvenli LZ'de işaretleme zorunlu.`
      )
    } else if (code === 'CBRN_UNMARKED_LZ') {
      reasons.push(`• [HAT 7 & HAT 9 ÇAKIŞMASI]: ${label} — KBRN tehdidinde işaretleme şart.`)
    } else if (code === 'HOT_LZ_NO_EXTRACTION') {
      reasons.push(`• [HAT 4 & HAT 6 ÇAKIŞMASI]: ${label} — sıcak LZ için kurtarma/vinç ekipmanı gerekli.`)
    } else if (code === 'URGENT_NO_EQUIP_TERRAIN') {
      reasons.push(`• [HAT 3, HAT 4 & HAT 9 ÇAKIŞMASI]: ${label} — acil vaka + arazi engeli için ekipman şart.`)
    } else {
      reasons.push(`• [TAKTİK ÇAKIŞMA · ${code}]: ${label}`)
    }
  }

  return reasons
}

/**
 * @param {{
 *   options: { id: string; label: string }[]
 *   selected: string[]
 *   onChange: (ids: string[]) => void
 *   name: string
 *   disabled?: boolean
 * }} props
 */
function Line4EquipmentChecklist({ options, selected, onChange, name, disabled = false }) {
  const toggle = (/** @type {string} */ id) => {
    if (disabled) return
    if (selected.includes(id)) {
      onChange(selected.filter((x) => x !== id))
      return
    }
    onChange([...selected, id])
  }

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={name}>
      {options.map((opt) => {
        const on = selected.includes(opt.id)
        return (
          <button
            key={opt.id}
            type="button"
            disabled={disabled}
            onClick={() => toggle(opt.id)}
            className={[
              'rounded border px-2.5 py-1.5 font-mono text-[8px] font-bold uppercase tracking-wider transition',
              on
                ? 'border-amber-400/70 bg-amber-500/20 text-amber-200 shadow-[0_0_14px_rgb(255,180,0,0.3)]'
                : 'border-amber-900/40 bg-black/60 text-amber-800 hover:border-amber-600/40 hover:text-amber-500',
            ].join(' ')}
            aria-pressed={on}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

/**
 * @param {{ onBegin: () => void; disabled?: boolean }} props
 */
function MedevacMissionBriefing({ onBegin, disabled = false }) {
  return (
    <div
      className="medevac-simulator-root relative z-30 flex h-auto min-h-0 w-full max-h-[min(72vh,720px)] flex-col sm:min-h-[300px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="medevac-briefing-title"
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-amber-500/30 bg-slate-900/40">
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-6 pr-4">
        <h2
          id="medevac-briefing-title"
          className="medevac-radio-display border-b border-amber-500/30 pb-3 font-mono text-xs font-bold uppercase leading-normal sm:text-sm"
        >
          [ 📑 GÖREV ÖNCESİ DOKTRİN BRİFİNGİ: MEDEVAC PROSEDÜRÜ ]
        </h2>

        <div className="space-y-4">
          <p className={briefingBodyClass}>
            • NEDEN 45 SANİYE? Taktik sahada telsiz başında harcanan her fazladan saniye, kan kaybından
            ölen yaralının eceline yaklaşması ve timin yerinin deşifre olması demektir.
          </p>
          <p className={briefingBodyClass}>
            • 1. ALTIN SAAT (GOLDEN HOUR) KURALI: Ağır yaralanmalarda ilk 90 saniyede MEDEVAC çağrısının
            hatasız geçilmesi gerekir. Bu sürenin son 45 saniyesi, telsizden NATO standardında 9-LINE
            raporunun tamamlanması için ayrılmıştır.
          </p>
          <p className={briefingBodyClass}>
            • 2. ELEKTRONİK HARP VE SİNYAL TAKİBİ: Modern muharebe sahalarında kesintisiz konuşma süresi
            45 saniyeyi geçtiği an, düşman sinyal takip unsurları (Direction Finding) yerinizi üçgenleme
            yöntemiyle tespit eder ve koordinatınıza topçu mühimmatı indirir.
          </p>
          <p className={briefingBodyClass}>
            • 3. STRES ALTINDA KİLİTLENME ANALİZİ: Patlamalar ve mermiler altında soğukkanlılığı koruyup
            MGRS koordinatlarını ve yaralı sayılarını hatasız girmek gerçek bir operatör refleksidir. Süre
            bittiğinde telsiz hatası (COLD HIT) alınır ve ORS puanınız -14 ceza yer.
          </p>
        </div>

          <section className="space-y-2 rounded border border-amber-600/20 bg-black/30 p-4">
            <p className={briefingSectionTitleClass}>HAT 1 (KOORDİNAT)</p>
            <p className={briefingBodyClass}>
              • HAT 1 (KOORDİNAT ESNEKLİĞİ): Format hatası yaşamamanız için sistem akıllı tarama moduna
              geçirildi. İster düz MGRS (36S TH 1234 5678), ister enlem/boylam (39.7761, 30.5211) yazın.
              Sistem noktayı, virgülü ve boşlukları arka planda otomatik olarak tolere eder.
            </p>
          </section>

          <section className="space-y-2 rounded border border-amber-600/20 bg-black/30 p-4">
            <p className={briefingSectionTitleClass}>HAT 3 (ACİLİYET DERECESİ)</p>
            <p className={briefingBodyClass}>Yaralının durumuna göre triyaj yapın:</p>
            <ul className="list-none space-y-2 pl-0">
              <li className={briefingBodyClass}>
                • A - URGENT (ACİL): İlk 2 saatte tahliye edilmezse ölecek vakalar (Masif kanama, hava yolu
                tıkanması).
              </li>
              <li className={briefingBodyClass}>
                • B - URGENT-SURGE (ÖNCELİKLİ ACİL): Hayati riski olan ama turnikeyle geçici stabilize edilmiş
                vakalar.
              </li>
              <li className={briefingBodyClass}>
                • C - PRIORITY (ÖNCELİKLİ): Uzuv/hayat kaybı riski ilk aşamada düşük olan açık kırıklar veya
                yaralanmalar.
              </li>
              <li className={briefingBodyClass}>
                • D - ROUTINE (RUTIN): 24 saate kadar bekleyebilecek hafif yaralılar.
              </li>
            </ul>
          </section>

          <section className="space-y-2 rounded border border-amber-600/20 bg-black/30 p-4">
            <p className={briefingSectionTitleClass}>HAT 4 &amp; 5 (EKİPMAN VE TİP)</p>
            <p className={briefingBodyClass}>
              Ekipmanlar çoklu seçilebilir! Aynı anda hem VİNÇ (Hoist) hem SEDYE (Litter) gerekebilir. Hat
              5&apos;teki Toplam Sedye (Litter) ve Ayakta (Ambulatory) hasta sayısı, Hat 3&apos;teki toplam yaralı
              sayısıyla tam uyuşmalıdır!
            </p>
          </section>
        </div>

        <div className="shrink-0 border-t border-amber-500/25 bg-slate-900/60 p-4">
          <button
            type="button"
            disabled={disabled}
            onClick={onBegin}
            className="w-full rounded border border-amber-500 bg-amber-500/20 py-3 font-mono font-bold uppercase tracking-wider text-amber-400 transition-all duration-200 hover:bg-amber-500/40 disabled:opacity-40"
          >
            [ BRİFİNGİ ALDIM, ODAKLAN VE BAŞLA ]
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * @param {{ onBegin: () => void; disabled?: boolean }} props
 */
function CasevacMissionBriefing({ onBegin, disabled = false }) {
  return (
    <div
      className="medevac-simulator-root relative z-30 flex h-auto min-h-0 w-full max-h-[min(72vh,720px)] flex-col sm:min-h-[300px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="casevac-briefing-title"
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-red-500/30 bg-slate-900/40">
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-6 pr-4">
          <h2
            id="casevac-briefing-title"
            className="medevac-radio-display border-b border-red-500/30 pb-3 font-mono text-xs font-bold uppercase leading-normal sm:text-sm"
          >
            [ 📑 GÖREV ÖNCESİ DOKTRİN BRİFİNGİ: CASEVAC · MIST PROTOKOLÜ ]
          </h2>
          <div className="space-y-4">
            <p className={briefingBodyClass}>
              • NEDEN 30 SANİYE? CASEVAC sıcak bölgede (hot zone) yapılır; telsiz süresi 9-Line MEDEVAC&apos;a
              göre daha kısadır. Her fazladan saniye araç ve tim için pusuya düşme riskidir.
            </p>
            <p className={briefingBodyClass}>
              • MIST RAPORU: M (Metric/yaralanma tipi), I (Injury/anatomi), S (Signs/vital), T (Treatment/müdahale)
              — dört harf tek nefeste iletilir.
            </p>
            <p className={briefingBodyClass}>
              • TURNİKE + ŞOK UYUMU: Turnike uygulandıysa «Şok Belirtisi Yok» seçimi klinik çelişkidir; rapor
              reddedilir.
            </p>
          </div>
        </div>
        <div className="shrink-0 border-t border-red-500/25 bg-slate-900/60 p-4">
          <button
            type="button"
            disabled={disabled}
            onClick={onBegin}
            className="w-full rounded border border-red-500 bg-red-500/20 py-3 font-mono font-bold uppercase tracking-wider text-red-300 transition-all duration-200 hover:bg-red-500/40 disabled:opacity-40"
          >
            [ BRİFİNGİ ALDIM, SICAK BÖLGEYE GİR ]
          </button>
        </div>
      </div>
    </div>
  )
}

const modeToggleBtnClass = (on) =>
  [
    'rounded border px-3 py-2 font-mono text-[9px] font-bold uppercase tracking-wider transition',
    on
      ? 'border-amber-400/70 bg-amber-500/20 text-amber-200 shadow-[0_0_14px_rgb(255,180,0,0.25)]'
      : 'border-amber-900/40 bg-black/60 text-amber-800 hover:border-amber-600/40 hover:text-amber-500',
  ].join(' ')

/**
 * @param {{
 *   mode: EvacSimMode
 *   onChange: (mode: EvacSimMode) => void
 *   disabled?: boolean
 * }} props
 */
function EvacSimModeToggle({ mode, onChange, disabled = false }) {
  return (
    <div className="relative z-40 flex flex-wrap gap-2" role="group" aria-label="Simülasyon modu">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange('medevac')}
        className={modeToggleBtnClass(mode === 'medevac')}
        aria-pressed={mode === 'medevac'}
      >
        [ SIMÜLASYON MODU: MEDEVAC (9-LINE) ]
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange('casevac')}
        className={modeToggleBtnClass(mode === 'casevac')}
        aria-pressed={mode === 'casevac'}
      >
        [ SIMÜLASYON MODU: CASEVAC (MIST) ]
      </button>
    </div>
  )
}

/** @param {boolean} enabled */
function useMedevacRadioStaticAudio(enabled) {
  const nodesRef = useRef(/** @type {{ ctx: AudioContext; source: AudioBufferSourceNode } | null} */ (null))

  const stop = useCallback(() => {
    const nodes = nodesRef.current
    if (!nodes) return
    try {
      nodes.source.stop()
      void nodes.ctx.close()
    } catch {
      /* already stopped */
    }
    nodesRef.current = null
  }, [])

  const start = useCallback(() => {
    stop()
    try {
      const ctx = new AudioContext()
      const bufferSize = Math.floor(ctx.sampleRate * 1.25)
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1

      const source = ctx.createBufferSource()
      source.buffer = buffer
      source.loop = true

      const filter = ctx.createBiquadFilter()
      filter.type = 'bandpass'
      filter.frequency.value = 1400
      filter.Q.value = 0.55

      const gain = ctx.createGain()
      gain.gain.value = 0.038

      source.connect(filter)
      filter.connect(gain)
      gain.connect(ctx.destination)
      void ctx.resume()
      source.start()
      nodesRef.current = { ctx, source }
    } catch {
      /* autoplay blocked or unsupported */
    }
  }, [stop])

  useEffect(() => {
    if (!enabled) {
      stop()
      return undefined
    }
    start()
    return () => stop()
  }, [enabled, start, stop])
}

/**
 * @param {{
 *   options: { id: string; label: string }[]
 *   value: string
 *   onSelect: (id: string) => void
 *   name: string
 *   disabled?: boolean
 * }} props
 */
function TokenRow({ options, value, onSelect, name, disabled = false }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label={name}>
      {options.map((opt) => {
        const on = value === opt.id
        return (
          <button
            key={opt.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(opt.id)}
            className={[
              'rounded border px-2.5 py-1.5 font-mono text-[8px] font-bold uppercase tracking-wider transition',
              on
                ? 'border-amber-400/70 bg-amber-500/20 text-amber-200 shadow-[0_0_14px_rgb(255,180,0,0.3)]'
                : 'border-amber-900/40 bg-black/60 text-amber-800 hover:border-amber-600/40 hover:text-amber-500',
            ].join(' ')}
            aria-pressed={on}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

/**
 * @param {{
 *   label: string
 *   value: string
 *   onChange: (v: string) => void
 *   disabled?: boolean
 *   min?: number
 * }} props
 */
function CounterField({ label, value, onChange, disabled = false, min = 0 }) {
  return (
    <label className="block space-y-1">
      <span className={labelClass}>{label}</span>
      <input
        type="number"
        min={min}
        className={fieldClass}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
    </label>
  )
}

/**
 * @param {{
 *   disabled?: boolean
 *   userId: string
 *   addRangeLog: (payload: Record<string, unknown>) => Promise<{ id: string }>
 *   addMedevacLog?: (payload: Record<string, unknown>) => Promise<unknown>
 * }} props
 */
export default function MedevacSimulator({
  disabled = false,
  userId,
  addRangeLog,
  addMedevacLog,
}) {
  const [simMode, setSimMode] = useState(/** @type {EvacSimMode} */ ('medevac'))
  const [medevacForm, setMedevacForm] = useState({ ...MEDEVAC_SIM_INITIAL })
  const [casevacForm, setCasevacForm] = useState({ ...CASEVAC_SIM_INITIAL })
  const [showBriefing, setShowBriefing] = useState(true)
  const [line1GpsConverted, setLine1GpsConverted] = useState(false)
  const [rejectionReasons, setRejectionReasons] = useState(/** @type {string[]} */ ([]))
  /** @type {'idle' | 'active' | 'success' | 'failure'} */
  const [phase, setPhase] = useState('idle')
  const [elapsed, setElapsed] = useState(0)
  const [saving, setSaving] = useState(false)
  const intervalRef = useRef(/** @type {ReturnType<typeof setInterval> | null} */ (null))
  const startedAtRef = useRef(0)
  const simModeRef = useRef(simMode)
  const finalizeRef = useRef(/** @type {(sec: number) => Promise<void>} */ (async () => {}))

  simModeRef.current = simMode

  const transmissionDeadline =
    simMode === 'casevac' ? CASEVAC_TRANSMISSION_DEADLINE_SEC : MEDEVAC_TRANSMISSION_DEADLINE_SEC

  const remaining = transmissionDeadline - elapsed
  const isOvertime = phase === 'active' && remaining < 0
  const timerCritical =
    phase === 'active' &&
    !isOvertime &&
    (simMode === 'casevac' ? remaining <= 8 : remaining <= 12)
  const formLocked = phase !== 'active' || disabled
  const modeSwitchLocked = phase === 'active' || saving

  const timerDigits = useMemo(() => {
    if (showBriefing || phase === 'idle') {
      return String(transmissionDeadline).padStart(2, '0')
    }
    return String(Math.ceil(remaining))
  }, [phase, remaining, showBriefing, transmissionDeadline])

  const staticVisualActive = !showBriefing && phase === 'active'
  useMedevacRadioStaticAudio(staticVisualActive)

  const medevacConflicts = useMemo(() => detectNineLineConflicts(medevacForm), [medevacForm])
  const casevacConflicts = useMemo(() => detectCasevacConflicts(casevacForm), [casevacForm])
  const line1UnseparatedBloc = hasUnseparatedDigitBloc(medevacForm.line1_mgrs)
  const mgrsValid = !line1UnseparatedBloc && isValidMgrsPickup(medevacForm.line1_mgrs)
  const medevacFormComplete = isNineLineFormComplete(medevacForm)
  const casevacFormComplete = isCasevacFormComplete(casevacForm)
  const formComplete = simMode === 'casevac' ? casevacFormComplete : medevacFormComplete
  const conflicts = simMode === 'casevac' ? casevacConflicts : medevacConflicts
  const precedenceTotal = getPrecedenceTotal(medevacForm)
  const typeTotal = getPatientTypeTotal(medevacForm)
  const liveValidationHints = useMemo(() => {
    if (phase !== 'active') return []
    return simMode === 'casevac'
      ? buildCasevacRejectionReasons(casevacForm, { timedOut: false })
      : buildMedevacRejectionReasons(medevacForm, { timedOut: false })
  }, [casevacForm, medevacForm, phase, simMode])

  const patchMedevac = useCallback((/** @type {Partial<typeof MEDEVAC_SIM_INITIAL>} */ p) => {
    setMedevacForm((f) => ({ ...f, ...p }))
  }, [])

  const patchCasevac = useCallback((/** @type {Partial<typeof CASEVAC_SIM_INITIAL>} */ p) => {
    setCasevacForm((f) => ({ ...f, ...p }))
  }, [])

  const handleLine1Change = useCallback(
    (/** @type {string} */ raw) => {
      setLine1GpsConverted(false)
      patchMedevac({ line1_mgrs: raw })
    },
    [patchMedevac]
  )

  const commitLine1Coordinate = useCallback(
    (/** @type {string} */ raw) => {
      const { value, gpsConverted } = parseLine1CoordinateInput(raw)
      setLine1GpsConverted(gpsConverted)
      patchMedevac({ line1_mgrs: value })
      return value
    },
    [patchMedevac]
  )

  const handleLine1Blur = useCallback(() => {
    commitLine1Coordinate(medevacForm.line1_mgrs)
  }, [commitLine1Coordinate, medevacForm.line1_mgrs])

  const stopTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const handleSimModeChange = useCallback(
    (/** @type {EvacSimMode} */ mode) => {
      if (modeSwitchLocked) return
      setSimMode(mode)
      stopTimer()
      setPhase('idle')
      setShowBriefing(true)
      setRejectionReasons([])
      setElapsed(0)
      setLine1GpsConverted(false)
    },
    [modeSwitchLocked, stopTimer]
  )

  const finalizeSession = useCallback(
    async (/** @type {number} */ elapsedSec) => {
      stopTimer()
      setSaving(true)

      const mode = simModeRef.current
      const medevacFormForSubmit =
        mode === 'medevac'
          ? {
              ...medevacForm,
              line1_mgrs: commitLine1Coordinate(medevacForm.line1_mgrs),
            }
          : medevacForm

      const deadline =
        mode === 'casevac' ? CASEVAC_TRANSMISSION_DEADLINE_SEC : MEDEVAC_TRANSMISSION_DEADLINE_SEC
      const finalRemaining = Math.ceil(deadline - elapsedSec)
      const isOvertimeSubmit = finalRemaining < 0
      const overtimeSec = isOvertimeSubmit ? Math.abs(finalRemaining) : 0

      let debriefReasons =
        mode === 'casevac'
          ? buildCasevacRejectionReasons(casevacForm, { timedOut: isOvertimeSubmit })
          : buildMedevacRejectionReasons(medevacFormForSubmit, { timedOut: isOvertimeSubmit })

      if (overtimeSec > 0) {
        const overtimeLine = formatOvertimeDebriefLine(overtimeSec)
        if (!debriefReasons.some((r) => r.includes('KRİTİK GECİKME'))) {
          debriefReasons = [...debriefReasons, overtimeLine]
        }
      }

      /** @type {string | null} */
      let failureReason = null
      if (isOvertimeSubmit) {
        failureReason =
          mode === 'casevac'
            ? `YAYIN SÜRESİ AŞILDI · 30 SN · +${overtimeSec} SN GECİKME`
            : `YAYIN SÜRESİ AŞILDI · 45 SN · +${overtimeSec} SN GECİKME`
      } else if (debriefReasons.length > 0) {
        failureReason = debriefReasons.map((r) => r.replace(/^•\s*/, '')).join(' | ')
      }

      try {
        const { success } =
          mode === 'casevac'
            ? await submitCasevacSimulatorSession({
                addRangeLog,
                userId,
                form: casevacForm,
                elapsedSec,
                timedOut: isOvertimeSubmit,
                finalRemaining,
                failureReason,
                rejectionReasons: debriefReasons,
              })
            : await submitMedevacSimulatorSession({
                addRangeLog,
                addMedevacLog,
                userId,
                form: medevacFormForSubmit,
                elapsedSec,
                timedOut: isOvertimeSubmit,
                finalRemaining,
                failureReason,
                rejectionReasons: debriefReasons,
              })
        if (success) {
          setRejectionReasons([])
          setPhase('success')
        } else {
          setRejectionReasons(debriefReasons)
          setPhase('failure')
        }
      } catch {
        setRejectionReasons(debriefReasons)
        setPhase('failure')
      } finally {
        setSaving(false)
      }
    },
    [addMedevacLog, addRangeLog, casevacForm, commitLine1Coordinate, medevacForm, stopTimer, userId]
  )

  useEffect(() => {
    if (showBriefing || phase !== 'active') return undefined

    const onKeyDown = (/** @type {KeyboardEvent} */ e) => {
      if (e.key !== ' ') return
      const target = e.target
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA'
      ) {
        return
      }
    }

    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [phase, showBriefing])

  finalizeRef.current = finalizeSession

  const beginTransmission = useCallback(() => {
    const mode = simModeRef.current
    if (mode === 'casevac') {
      setCasevacForm({ ...CASEVAC_SIM_INITIAL })
    } else {
      setMedevacForm({ ...MEDEVAC_SIM_INITIAL })
    }
    setLine1GpsConverted(false)
    setRejectionReasons([])
    setElapsed(0)
    setPhase('active')
    startedAtRef.current = Date.now()
    stopTimer()
    intervalRef.current = setInterval(() => {
      const sec = (Date.now() - startedAtRef.current) / 1000
      setElapsed(sec)
    }, 100)
  }, [stopTimer])

  const dismissBriefingAndStart = useCallback(() => {
    if (!userId || disabled) return
    setShowBriefing(false)
    beginTransmission()
  }, [beginTransmission, disabled, userId])

  const handleTransmit = () => {
    if (phase !== 'active' || saving) return
    const sec = (Date.now() - startedAtRef.current) / 1000
    void finalizeSession(sec)
  }

  const handleReset = () => {
    stopTimer()
    setMedevacForm({ ...MEDEVAC_SIM_INITIAL })
    setCasevacForm({ ...CASEVAC_SIM_INITIAL })
    setLine1GpsConverted(false)
    setRejectionReasons([])
    setElapsed(0)
    setPhase('idle')
    setShowBriefing(true)
  }

  useEffect(() => () => stopTimer(), [stopTimer])

  return (
    <section
      aria-label={simMode === 'casevac' ? 'CASEVAC MIST telsiz simülatörü' : '9-Hat MEDEVAC telsiz simülatörü'}
      className="space-y-2"
    >
      <EvacSimModeToggle mode={simMode} onChange={handleSimModeChange} disabled={modeSwitchLocked} />
      <div className="medevac-radio-shell relative overflow-hidden rounded-xl border border-amber-600/40 p-4 sm:p-6">
        <div
          className={[
            'medevac-radio-static absolute inset-0 z-0 transition-opacity duration-300',
            staticVisualActive ? 'opacity-35' : 'opacity-0',
          ].join(' ')}
          aria-hidden
        />
        <div className="medevac-radio-grid absolute inset-0 z-0 opacity-60" aria-hidden />

        {showBriefing ? (
          simMode === 'casevac' ? (
            <CasevacMissionBriefing onBegin={dismissBriefingAndStart} disabled={disabled || !userId} />
          ) : (
            <MedevacMissionBriefing onBegin={dismissBriefingAndStart} disabled={disabled || !userId} />
          )
        ) : null}

        <div className={showBriefing ? 'hidden' : 'relative z-10 space-y-4'} aria-hidden={showBriefing}>
          {/* Radio header + timer */}
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-amber-500/25 pb-4">
            <div className="flex items-start gap-3">
              <Radio className="mt-0.5 size-6 text-amber-400" strokeWidth={1.5} aria-hidden />
              <div>
                <p className="medevac-radio-display font-mono text-sm font-bold uppercase tracking-[0.22em]">
                  AN/PRC-117F İNTERAKTİF TELSİZ SİMÜLATÖRÜ
                </p>
                <p className="mt-1 font-mono text-[9px] uppercase tracking-wider text-amber-700/90">
                  {simMode === 'casevac'
                    ? `CASEVAC MIST · SICAK BÖLGE · STRES PENCERESİ ${CASEVAC_TRANSMISSION_DEADLINE_SEC} SN`
                    : `NATO STANDARDI · ŞİFRELİ HAZIR · STRES PENCERESİ ${MEDEVAC_TRANSMISSION_DEADLINE_SEC} SN`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className={labelClass}>KALAN SÜRE:</p>
                <p
                  className={[
                    'font-mono text-4xl font-black tabular-nums leading-none',
                    isOvertime
                      ? 'animate-pulse text-red-500'
                      : timerCritical
                        ? 'medevac-timer-critical'
                        : 'medevac-radio-display',
                    phase === 'failure' && !isOvertime ? 'text-red-400' : '',
                  ].join(' ')}
                  aria-live="polite"
                >
                  {timerDigits}
                  <span className="ml-1 text-lg opacity-70">SN</span>
                </p>
                {isOvertime ? (
                  <p className="mt-1 font-mono text-[9px] font-bold uppercase tracking-wider text-red-500 animate-pulse">
                    ⚠️ [SİNYAL DEŞİFRE OLUYOR / PUSU TEHDİDİ]
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          {phase === 'failure' ? (
            <div className="space-y-3" role="alert">
              <div className="medevac-failure-flash flex items-center gap-3 rounded-lg border px-4 py-3 font-mono text-xs font-bold uppercase tracking-wider text-red-200">
                <AlertTriangle className="size-5 shrink-0" aria-hidden />
                <span>
                  {simMode === 'casevac'
                    ? '⚠️ TELSİZ RAPOR HATASI / CASEVAC TAHLİYESİ REDDEDİLDİ'
                    : '⚠️ TELSİZ RAPOR HATASI / HELİKOPTER KALKIŞI REDDEDİLDİ'}
                </span>
              </div>
              <div className="space-y-2 rounded border border-red-500/50 bg-red-950/40 p-4 font-mono text-xs text-red-400">
                <p className="font-bold uppercase tracking-wider text-red-300">
                  [ TAHLİYE REDDEDİLME GEREKÇELERİ / DEBRIEFING LOG ]
                </p>
                {rejectionReasons.length === 0 ? (
                  <p className="normal-case leading-relaxed tracking-normal text-red-300/80">
                    • [GENEL HATA]:{' '}
                    {simMode === 'casevac'
                      ? 'MIST raporu taktik eşik altında — ayrıntılı satır denetimi tamamlanamadı.'
                      : '9-HAT raporu taktik eşik altında — ayrıntılı satır denetimi tamamlanamadı.'}
                  </p>
                ) : null}
                {rejectionReasons.map((reason, idx) => (
                  <p
                    key={`${idx}-${reason.slice(0, 32)}`}
                    className="text-left leading-relaxed"
                  >
                    {reason}
                  </p>
                ))}
                <p className="border-t border-red-500/30 pt-2 normal-case leading-relaxed tracking-normal text-red-300/90">
                  • [ORS ETKİSİ / TCCC EŞİK ALTINDA] Başarı yüzdesi %40 altında kaydedildi —{' '}
                  <span className="font-bold text-red-200">
                    Operasyonel Hazırlık Skoru (ORS) −{PENALTY_TCCC_BELOW_40} puan
                  </span>{' '}
                  (orsEngine · HATA_KODU: TCCC EŞİK ALTINDA · &lt;40% OTURUM)
                </p>
              </div>
            </div>
          ) : null}

          {phase === 'success' ? (
            <p className="rounded-lg border border-emerald-500/55 bg-emerald-950/35 px-4 py-3 font-mono text-xs font-bold uppercase tracking-wider text-emerald-300 shadow-[0_0_24px_rgb(52,211,153,0.25)]">
              {simMode === 'casevac'
                ? '⚡ MIST RAPORU BAŞARILI / CASEVAC TAHLİYE ARACI YOLDA'
                : '⚡ RAPOR BAŞARILI / MEDEVAC TAHLİYE KUŞU YOLDA'}
            </p>
          ) : null}

          {phase === 'active' && liveValidationHints.length > 0 ? (
            <div
              className="space-y-1.5 rounded border border-amber-600/35 bg-amber-950/20 px-3 py-2"
              aria-live="polite"
            >
              <p className="font-mono text-[9px] font-bold uppercase tracking-wider text-amber-500">
                [ CANLI HAT DENETİMİ / GÖNDERİM ÖNCESİ ]
              </p>
              {liveValidationHints.slice(0, 4).map((hint, idx) => (
                <p
                  key={`live-${idx}-${hint.slice(0, 24)}`}
                  className="font-mono text-[9px] normal-case leading-snug text-amber-400/90"
                >
                  {hint}
                </p>
              ))}
              {liveValidationHints.length > 4 ? (
                <p className="font-mono text-[8px] uppercase text-amber-600">
                  +{liveValidationHints.length - 4} EK HATA SATIRI
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="max-h-[min(62vh,640px)] space-y-3 overflow-y-auto pr-1">
            {simMode === 'casevac' ? (
              <>
                <section className={sectionClass}>
                  <p className={lineTitleClass}>TOPLAM YARALI SAYISI</p>
                  <CounterField
                    label="YARALI ADEDİ"
                    value={casevacForm.casualty_count}
                    onChange={(v) => patchCasevac({ casualty_count: v })}
                    disabled={formLocked}
                    min={1}
                  />
                </section>
                <section className={sectionClass}>
                  <p className={lineTitleClass}>M — METRIC / YARALANMA TİPİ</p>
                  <div className="mt-2">
                    <Line4EquipmentChecklist
                      name="mist_metric"
                      options={CASEVAC_MIST_METRIC_OPTIONS}
                      selected={
                        Array.isArray(casevacForm.mist_metric) ? casevacForm.mist_metric : []
                      }
                      onChange={(ids) => patchCasevac({ mist_metric: ids })}
                      disabled={formLocked}
                    />
                  </div>
                </section>
                <section className={sectionClass}>
                  <p className={lineTitleClass}>I — INJURY / YARANIN YERİ VE ANATOMİSİ</p>
                  <div className="mt-2">
                    <TokenRow
                      name="mist_injury"
                      options={CASEVAC_MIST_INJURY_OPTIONS}
                      value={casevacForm.mist_injury_site}
                      onSelect={(id) => patchCasevac({ mist_injury_site: id })}
                      disabled={formLocked}
                    />
                  </div>
                </section>
                <section className={sectionClass}>
                  <p className={lineTitleClass}>S — SIGNS / VİTAL BULGULAR</p>
                  <div className="mt-2">
                    <TokenRow
                      name="mist_vitals"
                      options={CASEVAC_MIST_VITALS_OPTIONS}
                      value={casevacForm.mist_vitals}
                      onSelect={(id) => patchCasevac({ mist_vitals: id })}
                      disabled={formLocked}
                    />
                  </div>
                  {Array.isArray(casevacForm.mist_treatment) &&
                  casevacForm.mist_treatment.includes('tourniquet') &&
                  casevacForm.mist_vitals === 'shock_no' ? (
                    <p className="mt-2 font-mono text-[9px] uppercase text-red-400">
                      [ MIST UYARI ] TURNİKE + ŞOK YOK ÇELİŞKİSİ — RAPOR RED RİSKİ
                    </p>
                  ) : null}
                </section>
                <section className={sectionClass}>
                  <p className={lineTitleClass}>T — TREATMENT / YAPILAN MÜDAHALE</p>
                  <div className="mt-2">
                    <Line4EquipmentChecklist
                      name="mist_treatment"
                      options={CASEVAC_MIST_TREATMENT_OPTIONS}
                      selected={
                        Array.isArray(casevacForm.mist_treatment) ? casevacForm.mist_treatment : []
                      }
                      onChange={(ids) => patchCasevac({ mist_treatment: ids })}
                      disabled={formLocked}
                    />
                  </div>
                </section>
                <section className={sectionClass}>
                  <p className={lineTitleClass}>SICAK BÖLGE ÇAĞRI / FREKANS</p>
                  <input
                    className={`${fieldClass} mt-2`}
                    placeholder="168.000 · ÇAĞRI-1 · EK ALPHA"
                    value={casevacForm.pickup_callsign}
                    onChange={(e) =>
                      patchCasevac({ pickup_callsign: e.target.value.toUpperCase() })
                    }
                    disabled={formLocked}
                  />
                </section>
              </>
            ) : (
              <>
            <section className={sectionClass}>
              <p className={lineTitleClass}>HAT 1: TAHLİYE BÖLGESİ KOORDİNATI (MGRS / GPS)</p>
              <input
                className={`${fieldClass} mt-2`}
                placeholder="Örn: 38 40 25.92 26 45 29.44"
                value={medevacForm.line1_mgrs}
                onChange={(e) => handleLine1Change(e.target.value)}
                onBlur={handleLine1Blur}
                onKeyDown={(e) => {
                  if (e.key === ' ') {
                    e.stopPropagation()
                  }
                }}
                disabled={formLocked}
              />
              <p className="mt-2 font-mono text-[10px] font-bold uppercase leading-relaxed text-amber-400">
                ⚠ SIFIR ÖZEL KARAKTER KURALI: Derece (°), dakika (&apos;) veya saniye (&quot;) SEMBOLLERİ
                KULLANMAYIN. SADECE SAYILARI BOŞLUKLA AYIRARAK YAZIN — ÖRN: 38 40 25.92 26 45 29.44 — SİSTEM
                OTOMATİK DÖNÜŞTÜRÜR.
              </p>
              {line1GpsConverted ? (
                <p className="mt-2 rounded border border-emerald-500/40 bg-emerald-950/30 px-3 py-2 font-mono text-[9px] font-bold uppercase tracking-wide text-emerald-300">
                  [ GPS FORMATI ALGILANDI -&gt; MGRS SİMÜLE EDİLDİ ]
                </p>
              ) : null}
              {invStr(medevacForm.line1_mgrs).trim() && !mgrsValid ? (
                <p className="mt-1 font-mono text-[9px] uppercase leading-relaxed text-red-400">
                  {line1UnseparatedBloc
                    ? 'BİTİŞİK SAYI BLOĞU — BOŞLUKLA AYIRIN: 38 40 25.92 26 45 29.44'
                    : "GEÇERSİZ KOORDİNAT — ÖRN: '38 40 25.92 26 45 29.44' (6 SAYI, BOŞLUKLA) VEYA MGRS"}
                </p>
              ) : null}
            </section>

            <section className={sectionClass}>
              <p className={lineTitleClass}>HAT 2: TELSİZ FREKANSI / ÇAĞRI ADI</p>
              <input
                className={`${fieldClass} mt-2`}
                placeholder="168.000 · ÇAĞRI-1 · EK ALPHA"
                value={medevacForm.line2_freq_callsign}
                onChange={(e) => patchMedevac({ line2_freq_callsign: e.target.value.toUpperCase() })}
                disabled={formLocked}
              />
            </section>

            <section className={sectionClass}>
              <p className={lineTitleClass}>HAT 3: YARALI ACİLİYET DERECESİ</p>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {MEDEVAC_LINE3_PRECEDENCE.map((row) => (
                  <CounterField
                    key={row.id}
                    label={row.label}
                    value={medevacForm[/** @type {keyof typeof medevacForm} */ (row.id)]}
                    onChange={(v) => patchMedevac({ [row.id]: v })}
                    disabled={formLocked}
                  />
                ))}
              </div>
              <p className="mt-2 font-mono text-[9px] uppercase text-amber-700">
                TOPLAM ACİLİYET: {precedenceTotal} · HAT 5 TOPLAM: {typeTotal}
                {precedenceTotal > 0 && typeTotal > 0 && precedenceTotal !== typeTotal
                  ? ' · UYUŞMAZLIK'
                  : ''}
              </p>
            </section>

            <section className={sectionClass}>
              <p className={lineTitleClass}>HAT 4: ÖZEL EKİPMAN İHTİYACI (ÇOKLU SEÇİM)</p>
              <p className="mt-1 font-mono text-[9px] uppercase text-amber-700">
                BİRDEN FAZLA EKİPMAN İŞARETLEYİN · ÖRN. VİNÇ + KURTARMA
              </p>
              <div className="mt-2">
                <Line4EquipmentChecklist
                  name="line4"
                  options={MEDEVAC_LINE4_OPTIONS}
                  selected={
                    Array.isArray(medevacForm.line4_equipment) ? medevacForm.line4_equipment : []
                  }
                  onChange={(ids) => patchMedevac({ line4_equipment: ids })}
                  disabled={formLocked}
                />
              </div>
            </section>

            <section className={sectionClass}>
              <p className={lineTitleClass}>HAT 5: YARALI TAŞIMA TİPİ</p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <CounterField
                  label="L · SEDYE"
                  value={medevacForm.line5_litter}
                  onChange={(v) => patchMedevac({ line5_litter: v })}
                  disabled={formLocked}
                />
                <CounterField
                  label="A · AYAKTA"
                  value={medevacForm.line5_ambulatory}
                  onChange={(v) => patchMedevac({ line5_ambulatory: v })}
                  disabled={formLocked}
                />
              </div>
            </section>

            <section className={sectionClass}>
              <p className={lineTitleClass}>HAT 6: TAHLİYE BÖLGESİ GÜVENLİK DURUMU</p>
              <div className="mt-2">
                <TokenRow
                  name="line6"
                  options={MEDEVAC_LINE6_OPTIONS}
                  value={medevacForm.line6_security}
                  onSelect={(id) => patchMedevac({ line6_security: id })}
                  disabled={formLocked}
                />
              </div>
            </section>

            <section className={sectionClass}>
              <p className={lineTitleClass}>HAT 7: BÖLGE İŞARETLEME YÖNTEMİ</p>
              <div className="mt-2">
                <TokenRow
                  name="line7"
                  options={MEDEVAC_LINE7_OPTIONS}
                  value={medevacForm.line7_marking}
                  onSelect={(id) => patchMedevac({ line7_marking: id })}
                  disabled={formLocked}
                />
              </div>
            </section>

            <section className={sectionClass}>
              <p className={lineTitleClass}>HAT 8: YARALI UYRUGU VE STATÜSÜ</p>
              <div className="mt-2">
                <TokenRow
                  name="line8"
                  options={MEDEVAC_LINE8_OPTIONS}
                  value={medevacForm.line8_nationality}
                  onSelect={(id) => patchMedevac({ line8_nationality: id })}
                  disabled={formLocked}
                />
              </div>
            </section>

            <section className={sectionClass}>
              <p className={lineTitleClass}>HAT 9: KBRN TEHDİDİ / ARAZİ ŞARTLARI</p>
              <div className="mt-3 space-y-3">
                <div>
                  <span className={labelClass}>KBRN TEHDİDİ</span>
                  <div className="mt-1.5">
                    <TokenRow
                      name="line9cbrn"
                      options={MEDEVAC_LINE9_CBRN_OPTIONS}
                      value={medevacForm.line9_cbrn}
                      onSelect={(id) => patchMedevac({ line9_cbrn: id })}
                      disabled={formLocked}
                    />
                  </div>
                </div>
                <div>
                  <span className={labelClass}>ARAZİ ŞARTLARI</span>
                  <div className="mt-1.5">
                    <TokenRow
                      name="line9terrain"
                      options={MEDEVAC_LINE9_TERRAIN_OPTIONS}
                      value={medevacForm.line9_terrain}
                      onSelect={(id) => patchMedevac({ line9_terrain: id })}
                      disabled={formLocked}
                    />
                  </div>
                </div>
              </div>
            </section>
              </>
            )}
          </div>

          {/* Radio keys */}
          <div className="flex flex-wrap items-center gap-3 border-t border-amber-500/20 pt-4">
            {(phase === 'success' || phase === 'failure') && !showBriefing ? (
              <button
                type="button"
                disabled={disabled || !userId || saving}
                onClick={handleReset}
                className="medevac-ptt-key inline-flex items-center gap-2 rounded-lg border border-amber-500/70 bg-amber-600/25 px-5 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-amber-100 transition hover:bg-amber-500/30 disabled:opacity-40"
              >
                <Mic className="size-4" aria-hidden />
                YENİ OTURUM / SIFIRLA
              </button>
            ) : null}

            {phase === 'active' ? (
              <>
                <button
                  type="button"
                  disabled={saving || !formComplete || conflicts.length > 0}
                  onClick={handleTransmit}
                  className="medevac-ptt-key inline-flex items-center gap-2 rounded-lg border border-emerald-500/60 bg-emerald-600/20 px-5 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-200 shadow-[0_0_20px_rgb(52,211,153,0.25)] transition hover:bg-emerald-500/25 disabled:opacity-40"
                >
                  <Send className="size-4" aria-hidden />
                  {simMode === 'casevac' ? 'MIST GÖNDER / TRANSMİT' : '9-HAT GÖNDER / TRANSMİT'}
                </button>
                <p className="font-mono text-[9px] uppercase text-amber-700">
                  {formComplete
                    ? 'FORM HAZIR · 0 SN ÖNCESİ GÖNDER'
                    : simMode === 'casevac'
                      ? 'TÜM MIST ALANLARINI DOLDUR'
                      : 'TÜM HATLARI DOLDUR'}
                </p>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  )
}
