/** @typedef {'boarding' | 'clearing' | 'control'} VbssPhaseId */

/** @typedef {'m' | 'a' | 'r' | 'c' | 'h'} TcccMarchPhaseId */

/** @type {{ id: VbssPhaseId; title: string; subtitle: string }[]} */
export const VBSS_EVALUATION_PHASES = [
  {
    id: 'boarding',
    title: 'Safha 1: Sızma ve Biniş',
    subtitle: 'Boarding — yöntem, hız, kancalama emniyeti',
  },
  {
    id: 'clearing',
    title: 'Safha 2: Gemi İçi İlerleme',
    subtitle: 'Clearing — iletişim, köşe kontrolü, merdiven disiplini',
  },
  {
    id: 'control',
    title: 'Safha 3: Kontrol ve Güvenlik',
    subtitle: 'Control — mürettebat yönetimi, köprü kontrolü, 360° emniyet',
  },
]

/** @type {{ id: TcccMarchPhaseId; letter: string; title: string; subtitle: string }[]} */
export const TCCC_MARCH_EVALUATION_PHASES = [
  {
    id: 'm',
    letter: 'M',
    title: 'M — Massive Hemorrhage',
    subtitle: 'Büyük kanama kontrolü, turnike uygulaması',
  },
  {
    id: 'a',
    letter: 'A',
    title: 'A — Airway',
    subtitle: 'Havayolu açıklığı, NPA yerleşimi',
  },
  {
    id: 'r',
    letter: 'R',
    title: 'R — Respiration',
    subtitle: 'Solunum yönetimi, Chest Seal, Needle Decompression',
  },
  {
    id: 'c',
    letter: 'C',
    title: 'C — Circulation',
    subtitle: 'Dolaşım kontrolü, nabız takibi, IV/IO erişim',
  },
  {
    id: 'h',
    letter: 'H',
    title: 'H — Hypothermia / Head',
    subtitle: 'Hipotermi önleme, kafa travması kontrolü',
  },
]
