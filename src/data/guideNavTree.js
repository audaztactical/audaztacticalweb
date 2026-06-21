/** @typedef {{ id: string, label: string, children?: GuideNavNode[] }} GuideNavNode */

/** @type {GuideNavNode[]} */
export const GUIDE_NAV_TREE = [
  {
    id: 'baslangic',
    label: 'Başlangıç',
    children: [
      { id: 'platform-intro', label: 'Platform tanıtımı' },
      { id: 'first-login-checklist', label: 'İlk giriş checklist' },
      { id: 'roles-access-matrix', label: 'Roller ve erişim' },
      { id: 'email-verification-locked', label: 'Doğrulama ve kilitli hesap' },
    ],
  },
  {
    id: 'karargah-profil',
    label: 'Karargâh & Profil',
    children: [
      { id: 'landing', label: 'Karargâh (Landing)' },
      { id: 'dashboard', label: 'Ana Sayfa' },
      { id: 'profile', label: 'Profilim' },
      { id: 'operator-profile', label: 'Operatör sicili' },
    ],
  },
  {
    id: 'audaz-agi',
    label: 'Audaz Ağı',
    children: [
      { id: 'akademi', label: 'Audaz Akademi' },
      { id: 'forum', label: 'Brifing Odası' },
      { id: 'forum-reports', label: 'Forum şikayet' },
      { id: 'intel-feed', label: 'Küresel Haber Ağı' },
      { id: 'feedback-system', label: 'Şikayet & Öneri' },
    ],
  },
  {
    id: 'operasyon-lojistik',
    label: 'Operasyon & Lojistik',
    children: [
      { id: 'missions', label: 'Görevlerim / AAR' },
      { id: 'training-hub', label: 'Antrenman hub' },
      { id: 'sector-atis', label: 'ATIŞ sektörü' },
      { id: 'sector-cqb', label: 'CQB sektörü' },
      { id: 'sector-fof', label: 'FOF sektörü' },
      { id: 'sector-vbss', label: 'VBSS sektörü' },
      { id: 'sector-tccc-training', label: 'TCCC terminal (antrenman)' },
      { id: 'sector-egitim', label: 'EĞİTİM sektörü' },
      { id: 'group-training', label: 'Grup eğitimi' },
      { id: 'tccc-suite', label: 'TCCC & Sağlık' },
      { id: 'cephanelik', label: 'Cephanelik' },
    ],
  },
  {
    id: 'komuta-analitik',
    label: 'Komuta & Analitik',
    children: [
      { id: 'progress-tracker', label: 'Kişisel Başarı Takibi' },
      { id: 'group-join', label: 'Gruba katılım' },
      { id: 'instructor-dashboard', label: 'Eğitmen Kontrol Paneli' },
    ],
  },
  {
    id: 'sistem',
    label: 'Sistem',
    children: [
      { id: 'settings', label: 'Ayarlar' },
      { id: 'access-codes', label: 'Erişim kodları' },
      { id: 'troubleshooting', label: 'Sorun giderme' },
    ],
  },
  {
    id: 'ekler',
    label: 'Ekler',
    children: [
      { id: 'deep-links', label: 'Hızlı geçiş ipuçları' },
      { id: 'glossary', label: 'Terimler sözlüğü' },
    ],
  },
]

/** @returns {string[]} */
export function flattenGuideNavIds() {
  /** @type {string[]} */
  const ids = []
  for (const group of GUIDE_NAV_TREE) {
    if (group.children) {
      for (const child of group.children) ids.push(child.id)
    }
  }
  return ids
}
