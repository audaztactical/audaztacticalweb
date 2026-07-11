/**
 * Usage Guide — structural metadata only (copy lives in i18n `guide` namespace).
 *
 * @typedef {{ to: string }} GuidePageLinkMeta
 *
 * @typedef {{
 *   opsCode?: string
 *   pageLink?: GuidePageLinkMeta
 *   flowId?: string
 *   instructorOnly?: boolean
 *   adminOnly?: boolean
 * }} GuideSectionMeta
 */

/** @type {Record<string, GuideSectionMeta>} */
export const GUIDE_SECTIONS = {
  'platform-intro': { opsCode: 'SYS-00' },
  'first-login-checklist': { opsCode: 'ONB-01', flowId: 'ilk-kurulum' },
  'roles-access-matrix': { opsCode: 'ACL-01' },
  'email-verification-locked': {
    opsCode: 'AUTH-02',
    pageLink: { to: '/verify-email' },
  },
  landing: { opsCode: 'HQ-00', pageLink: { to: '/' } },
  dashboard: { opsCode: 'CMD-00', pageLink: { to: '/dashboard' } },
  profile: { opsCode: 'ID-01', pageLink: { to: '/profil' } },
  'operator-profile': { opsCode: 'ID-02' },
  akademi: { opsCode: 'EDU-07', pageLink: { to: '/akademi' } },
  forum: { opsCode: 'BRF-01', pageLink: { to: '/forum' } },
  'forum-reports': { opsCode: 'MOD-01' },
  'intel-feed': { opsCode: 'INT-01', pageLink: { to: '/istihbarat' } },
  'feedback-system': { opsCode: 'FB-01' },
  'training-hub': { opsCode: 'TRN-00', pageLink: { to: '/antrenman' } },
  'sector-atis': { opsCode: 'RNG-01', pageLink: { to: '/antrenman' }, flowId: 'atis-kaydi' },
  'sector-cqb': { opsCode: 'CQB-02', pageLink: { to: '/antrenman' } },
  'sector-fof': { opsCode: 'FOF-03', pageLink: { to: '/antrenman' } },
  'sector-vbss': { opsCode: 'VBS-04', pageLink: { to: '/antrenman' } },
  'sector-tccc-training': { opsCode: 'MED-05', pageLink: { to: '/antrenman' } },
  'sector-egitim': { opsCode: 'EDU-06', pageLink: { to: '/antrenman' } },
  'group-training': { opsCode: 'GRP-07', pageLink: { to: '/antrenman' }, flowId: 'grup-egitimi' },
  'tccc-suite': { opsCode: 'MED-SUITE', pageLink: { to: '/tccc' } },
  cephanelik: { opsCode: 'ILWS-01', pageLink: { to: '/cephanelik' } },
  'balistik-terminal': { opsCode: 'BLST-01', pageLink: { to: '/balistik' } },
  'progress-tracker': { opsCode: 'ORS-01', pageLink: { to: '/basarilar' } },
  'group-join': { opsCode: 'GRP-JOIN', pageLink: { to: '/ayarlar' } },
  'instructor-dashboard': {
    opsCode: 'CMD-09',
    pageLink: { to: '/egitmen-komuta' },
    instructorOnly: true,
  },
  'language-switcher': { opsCode: 'LNG-01' },
  settings: { opsCode: 'CFG-01', pageLink: { to: '/ayarlar' } },
  'access-codes': { opsCode: 'KEY-01', pageLink: { to: '/ayarlar' } },
  troubleshooting: { opsCode: 'DBG-01' },
  'deep-links': { opsCode: 'REF-01' },
  glossary: { opsCode: 'REF-02' },
}

/** @param {string} id */
export function getGuideSection(id) {
  return GUIDE_SECTIONS[id] ?? null
}
