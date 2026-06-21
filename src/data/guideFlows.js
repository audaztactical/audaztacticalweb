/** @typedef {{ id: string, label: string }} GuideFlowStep */

/** @typedef {{ id: string, title: string, opsCode?: string, steps: GuideFlowStep[] }} GuideFlow */

/** @type {Record<string, GuideFlow>} */
export const GUIDE_FLOWS = {
  'ilk-kurulum': {
    id: 'ilk-kurulum',
    title: 'İlk Kurulum',
    opsCode: 'ONB-01',
    steps: [
      { id: '1', label: 'Kayıt / Giriş' },
      { id: '2', label: 'Profil (callsign)' },
      { id: '3', label: 'Cephanelik' },
      { id: '4', label: 'ATIŞ kaydı' },
      { id: '5', label: 'Dashboard ORS' },
    ],
  },
  'atis-kaydi': {
    id: 'atis-kaydi',
    title: 'ATIŞ Kaydı',
    opsCode: 'RNG-FLOW',
    steps: [
      { id: '1', label: 'Silah seç' },
      { id: '2', label: 'Mühimmat eşle' },
      { id: '3', label: 'Drill / atım' },
      { id: '4', label: 'Onayla' },
      { id: '5', label: 'Stok düşümü' },
    ],
  },
  'grup-egitimi': {
    id: 'grup-egitimi',
    title: 'Grup Eğitimi',
    opsCode: 'GRP-FLOW',
    steps: [
      { id: '1', label: 'Eğitmen oturum aç' },
      { id: '2', label: 'Operatör şifreyle katıl' },
      { id: '3', label: 'Hub AKTİF' },
      { id: '4', label: 'Sektöre gir' },
    ],
  },
}
