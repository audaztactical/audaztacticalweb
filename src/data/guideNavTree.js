/** @typedef {{ id: string, children?: { id: string }[] }} GuideNavNode */

/** @type {GuideNavNode[]} */
export const GUIDE_NAV_TREE = [
  {
    id: 'baslangic',
    children: [
      { id: 'platform-intro' },
      { id: 'first-login-checklist' },
      { id: 'roles-access-matrix' },
      { id: 'email-verification-locked' },
    ],
  },
  {
    id: 'karargah-profil',
    children: [
      { id: 'landing' },
      { id: 'dashboard' },
      { id: 'profile' },
      { id: 'operator-profile' },
    ],
  },
  {
    id: 'audaz-agi',
    children: [
      { id: 'akademi' },
      { id: 'forum' },
      { id: 'forum-reports' },
      { id: 'intel-feed' },
      { id: 'feedback-system' },
    ],
  },
  {
    id: 'operasyon-lojistik',
    children: [
      { id: 'training-hub' },
      { id: 'sector-atis' },
      { id: 'sector-cqb' },
      { id: 'sector-fof' },
      { id: 'sector-vbss' },
      { id: 'sector-tccc-training' },
      { id: 'sector-egitim' },
      { id: 'group-training' },
      { id: 'tccc-suite' },
      { id: 'cephanelik' },
      { id: 'balistik-terminal' },
    ],
  },
  {
    id: 'komuta-analitik',
    children: [
      { id: 'progress-tracker' },
      { id: 'group-join' },
      { id: 'instructor-dashboard' },
    ],
  },
  {
    id: 'sistem',
    children: [
      { id: 'language-switcher' },
      { id: 'settings' },
      { id: 'access-codes' },
      { id: 'troubleshooting' },
    ],
  },
  {
    id: 'ekler',
    children: [{ id: 'deep-links' }, { id: 'glossary' }],
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
