/**
 * Flow diagram metadata — titles/step labels from i18n `guide.flows.*`.
 *
 * @typedef {{ id: string, opsCode?: string, stepIds: string[] }} GuideFlowMeta
 */

/** @type {Record<string, GuideFlowMeta>} */
export const GUIDE_FLOWS = {
  'ilk-kurulum': {
    id: 'ilk-kurulum',
    opsCode: 'ONB-01',
    stepIds: ['1', '2', '3', '4', '5'],
  },
  'atis-kaydi': {
    id: 'atis-kaydi',
    opsCode: 'RNG-FLOW',
    stepIds: ['1', '2', '3', '4', '5'],
  },
  'grup-egitimi': {
    id: 'grup-egitimi',
    opsCode: 'GRP-FLOW',
    stepIds: ['1', '2', '3', '4'],
  },
}
