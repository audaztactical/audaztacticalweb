/** @typedef {'M' | 'A' | 'R' | 'C' | 'H'} MarchStepKey */

/** @typedef {'URGENT' | 'PRIORITY' | 'ROUTINE'} EvacPriority */

/**
 * @typedef {Object} MarchStepMeta
 * @property {MarchStepKey} key
 * @property {string} title
 * @property {string} subtitle
 * @property {string} accent
 * @property {string} panelBorder
 * @property {string} panelBg
 * @property {string} doctrine
 */

/** @type {MarchStepMeta[]} */
export const MARCH_DD1380_STEPS = [
  {
    key: 'M',
    title: 'MASSIVE BLEEDING',
    subtitle: 'Yoğun Kanama',
    accent: 'text-red-400',
    panelBorder: 'border-red-500/45',
    panelBg: 'bg-gradient-to-br from-red-950/40 to-black/70',
    doctrine:
      "// DOCTRINE: Çatışma altındaki önlenebilir ölüm nedenlerinin %90'ı uzuv kanamalarıdır. Ateş altında (CUF) ilk 60 saniyede yüksek ve sıkı (High & Tight) turnike uygulayın. TFC safhasında turnike zamanını karta işleyin.",
  },
  {
    key: 'A',
    title: 'AIRWAY',
    subtitle: 'Hava Yolu',
    accent: 'text-amber-400',
    panelBorder: 'border-amber-500/40',
    panelBg: 'bg-gradient-to-br from-amber-950/35 to-black/70',
    doctrine:
      '// DOCTRINE: Bilinci kapalı yaralıda dil geriye kaçarak hava yolunu tıkayabilir. Yaralı soluk alıyorsa sağ veya sol burun deliğinden NPA uygulayın. Hava yolu açılmazsa cerrahi müdahale (Cric) planlayın.',
  },
  {
    key: 'R',
    title: 'RESPIRATION',
    subtitle: 'Solunum',
    accent: 'text-sky-400',
    panelBorder: 'border-sky-500/40',
    panelBg: 'bg-gradient-to-br from-sky-950/40 to-black/70',
    doctrine:
      '// DOCTRINE: Göğüsteki açık yaralara hava sızdırmaz ventilli göğüs mührü yapıştırın. İlerleyen süreçte solunum güçlüğü, tek taraflı göğüs kalkışı ve tansiyon düşüklüğü varsa 2. veya 5. interkostal aralıktan İğne Dekompresyonu (NDC) uygulayın.',
  },
  {
    key: 'C',
    title: 'CIRCULATION',
    subtitle: 'Dolaşım',
    accent: 'text-emerald-400',
    panelBorder: 'border-emerald-500/40',
    panelBg: 'bg-gradient-to-br from-emerald-950/35 to-black/70',
    doctrine:
      '// DOCTRINE: İç kanama veya şok şüphesinde pıhtılaşmayı hızlandırmak için ilk 3 saat içinde Traneksamik Asit (TXA) uygulayın. Nabız takibini radial arter üzerinden yapın.',
  },
  {
    key: 'H',
    title: 'HYPOTHERMIA & HEAD',
    subtitle: 'Hipotermi ve Baş',
    accent: 'text-cyan-300',
    panelBorder: 'border-cyan-500/40',
    panelBg: 'bg-gradient-to-br from-cyan-950/30 to-black/70',
    doctrine:
      '// DOCTRINE: Kan kaybı vücut sıcaklığının düşmesine (Hipotermi) yol açar, bu da pıhtılaşma mekanizmasını bozar (Ölüm Üçgeni). Yaralıyı doğrudan zeminden kesin ve termal battaniye ile sarın.',
  },
]

/** Extended tactical protocol bullets for MARCH detail panel */
export const MARCH_PROTOCOL_DETAILS = {
  M: {
    definition:
      'Massive Bleeding (Yoğun Kanama) — önlenebilir ölümün birincil nedeni. CUF altında ilk 60 sn içinde kanamayı durdur.',
    protocols: [
      'High & Tight turnike: yaralı üzerinde en yüksek uygulanabilir nokta, sıkı (2–3 inç üstü).',
      'TQ zamanını DD-1380 üzerine işle; re-evaluate her 2 saatte bir.',
      'Junctional / gövde kanaması: hemostatik gauze + basınç bandajı; TQ mümkün değilse.',
      'Ateş hattından çıkış önceliği: tek müdahale = kanama kontrolü.',
    ],
  },
  A: {
    definition:
      'Airway (Hava Yolu) — bilinç bozukluğunda dil/obstrüksiyon riski. Soluyorsa NPA; solmuyorsa ileri hava yolu.',
    protocols: [
      'Bilinci açık + solunum var → pozisyon, aspirasyon kontrolü.',
      'Bilinci kapalı + solunum var → NPA (sağ/sol burun deliği).',
      'Tam obstrüksiyon / solunum yok → chin-lift, Cric planı (TFC).',
      'Recovery position: stabil lateral, aspirasyon önleme.',
    ],
  },
  R: {
    definition:
      'Respiration (Solunum) — penetrant göğüs yarası ve tansiyon pnömotoraks yönetimi.',
    protocols: [
      'Vented chest seal: açık göğüs yarasına hava sızdırmaz mühür.',
      'NDC: 2. veya 5. interkostal, mid-clavicular — 10G/14G.',
      'Solunum sayısı, SpO2 (varsa), tek taraflı solunum sesi kaydı.',
      'Bilateral dekomprese gerekirse her iki tarafı değerlendir.',
    ],
  },
  C: {
    definition:
      'Circulation (Dolaşım) — şok, iç kanama, TXA ve sıvı protokolleri.',
    protocols: [
      'TXA: ilk 3 saat içinde 1g IV/IO (CoTCCC).',
      'IV/IO erişim; whole blood tercih (mümkünse).',
      'Radial nabız: present/absent — perfüzyon göstergesi.',
      'Reassess kanama adımına dönüş (M tekrar).',
    ],
  },
  H: {
    definition:
      'Hypothermia & Head Injury (Hipotermi / Kafa travması) — ölüm üçgeni ve nöro koruma.',
    protocols: [
      'Hipotermi önleme: termal wrap, izolasyon zeminden.',
      'AVPU ve pupil kaydı — TBI şüphesi.',
      'Baş yaralanması: yüksek tahliye önceliği, C-spine dikkat.',
      'Aktif ısıtma mümkünse; ıslak giysi çıkar.',
    ],
  },
}

export const MARCH_DD1380_BUTTON_STYLES = {
  M: 'border-red-500/40 bg-gradient-to-br from-red-950/50 to-black/60 shadow-[0_0_40px_-8px_rgba(239,68,68,0.45)] ring-1 ring-red-500/25',
  A: 'border-amber-500/35 bg-gradient-to-br from-amber-950/40 to-black/60 shadow-[0_0_36px_-8px_rgba(245,158,11,0.35)] ring-1 ring-amber-500/20',
  R: 'border-sky-500/40 bg-gradient-to-br from-sky-950/45 to-black/60 shadow-[0_0_40px_-8px_rgba(56,189,248,0.4)] ring-1 ring-sky-500/25',
  C: 'border-emerald-500/35 bg-gradient-to-br from-emerald-950/40 to-black/60 shadow-[0_0_36px_-8px_rgba(52,211,153,0.35)] ring-1 ring-emerald-500/20',
  H: 'border-cyan-500/35 bg-gradient-to-br from-cyan-950/35 to-black/60 shadow-[0_0_36px_-8px_rgba(34,211,238,0.35)] ring-1 ring-cyan-500/20',
}

/** Yaralı kan grubu — operatör profilinden bağımsız, DD-1380 formu */
export const CASUALTY_BLOOD_TYPE_OPTIONS = [
  { id: 'A RH+', label: 'A Rh+' },
  { id: 'A RH-', label: 'A Rh-' },
  { id: 'B RH+', label: 'B Rh+' },
  { id: 'B RH-', label: 'B Rh-' },
  { id: 'AB RH+', label: 'AB Rh+' },
  { id: 'AB RH-', label: 'AB Rh-' },
  { id: '0 RH+', label: '0 Rh+' },
  { id: '0 RH-', label: '0 Rh-' },
  { id: 'unknown', label: 'Bilinmiyor' },
]

export const TQ_LOCATION_DD_OPTIONS = [
  { id: 'right_arm', label: 'Sağ Kol' },
  { id: 'left_arm', label: 'Sol Kol' },
  { id: 'right_leg', label: 'Sağ Bacak' },
  { id: 'left_leg', label: 'Sol Bacak' },
  { id: 'custom', label: 'Özel Bölge' },
]

export const FLUID_DD_OPTIONS = [
  { id: 'whole_blood', label: 'Tam Kan' },
  { id: 'plasma', label: 'Plazma' },
  { id: 'saline', label: 'Serum Fizyolojik' },
]

export const RADIAL_PULSE_OPTIONS = [
  { id: 'present', label: 'Alınabiliyor' },
  { id: 'absent', label: 'Alınamıyor' },
]

export const AVPU_OPTIONS = [
  { id: 'alert', label: 'Uyanık (A)' },
  { id: 'verbal', label: 'Sözlü Uyarı (V)' },
  { id: 'pain', label: 'Ağrı Uyarısı (P)' },
  { id: 'unresponsive', label: 'Yanıtsız (U)' },
]

export const PUPIL_OPTIONS = [
  { id: 'normal', label: 'Normal' },
  { id: 'blown', label: 'Midriyazis / Geniş' },
]

export const NDC_GAUGE_OPTIONS = [
  { id: '10', label: '10 Gauge' },
  { id: '14', label: '14 Gauge' },
]

/** @type {{ id: EvacPriority; label: string }[]} */
export const EVAC_PRIORITY_OPTIONS = [
  { id: 'URGENT', label: 'ACİL' },
  { id: 'PRIORITY', label: 'ÖNCELİKLİ' },
  { id: 'ROUTINE', label: 'RUTİN' },
]
