import i18n from '../i18n'
import { GUIDE_FLOWS } from '../data/guideFlows'

const NS = 'guide'

/**
 * @param {string} key
 * @param {Record<string, unknown>} [params]
 */
export function guideT(key, params) {
  return i18n.t(key, { ns: NS, ...(params ?? {}) })
}

/**
 * @param {unknown} value
 * @returns {string[]}
 */
function asStringArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? '')).filter(Boolean)
  }
  return []
}

/**
 * Resolve localized copy for a guide section id.
 * @param {string} id
 * @param {import('./guideContent').GuideSectionMeta | null | undefined} meta
 */
export function resolveGuideSectionDisplay(id, meta) {
  const base = `sections.${id}`
  const steps = asStringArray(i18n.t(`${base}.steps`, { ns: NS, returnObjects: true }))
  const prerequisites = asStringArray(
    i18n.t(`${base}.prerequisites`, { ns: NS, returnObjects: true, defaultValue: [] }),
  )
  const notes = asStringArray(i18n.t(`${base}.notes`, { ns: NS, returnObjects: true, defaultValue: [] }))

  const infoRaw = i18n.t(`${base}.infoNote`, { ns: NS, defaultValue: '' })
  const infoNote = infoRaw && infoRaw !== `${base}.infoNote` ? String(infoRaw) : ''

  const pageLinkLabel = meta?.pageLink
    ? String(i18n.t(`${base}.pageLink`, { ns: NS, defaultValue: '' }))
    : ''

  return {
    title: guideT(`${base}.title`),
    access: guideT(`${base}.access`),
    purpose: guideT(`${base}.purpose`),
    steps,
    prerequisites,
    notes,
    infoNote,
    pageLink:
      meta?.pageLink && pageLinkLabel && pageLinkLabel !== `${base}.pageLink`
        ? { to: meta.pageLink.to, label: pageLinkLabel }
        : null,
    opsCode: meta?.opsCode,
    flowId: meta?.flowId,
    instructorOnly: meta?.instructorOnly === true,
    adminOnly: meta?.adminOnly === true,
  }
}

/**
 * @param {string} flowId
 * @returns {{ title: string, opsCode?: string, steps: { id: string, label: string }[] } | null}
 */
export function resolveGuideFlowDisplay(flowId) {
  const meta = GUIDE_FLOWS[flowId]
  if (!meta) return null

  const steps = (meta.stepIds ?? []).map((stepId) => ({
    id: stepId,
    label: guideT(`flows.${flowId}.steps.${stepId}`),
  }))

  return {
    title: guideT(`flows.${flowId}.title`),
    opsCode: meta.opsCode,
    steps,
  }
}
