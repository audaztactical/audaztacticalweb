import i18n from '../i18n'

/** @typedef {import('../components/training/trainingCategories').TrainingCategory} TrainingCategory */

/** @param {string} categoryId */
function sectorKey(categoryId) {
  return `sectors.${String(categoryId ?? '').trim()}`
}

/** @param {string} categoryId */
export function formatTrainingCategoryTitle(categoryId) {
  const id = String(categoryId ?? '').trim()
  if (!id) return ''
  const key = `${sectorKey(id)}.title`
  const translated = i18n.t(key, { ns: 'training', defaultValue: '' })
  if (translated) return translated
  return id
}

/** @param {string} categoryId */
export function formatTrainingSectorLabel(categoryId) {
  const id = String(categoryId ?? '').trim()
  if (!id) return ''
  const key = `${sectorKey(id)}.sectorLabel`
  const translated = i18n.t(key, { ns: 'training', defaultValue: '' })
  if (translated) return translated
  return id
}

/**
 * @param {TrainingCategory | null | undefined} category
 */
export function formatTrainingHeaderTitle(category) {
  if (!category?.id) return i18n.t('page.hubTitle', { ns: 'training' })
  return i18n.t(`headers.${category.id}.title`, { ns: 'training' })
}

/**
 * @param {TrainingCategory | null | undefined} category
 */
export function formatTrainingHeaderSubtitle(category) {
  if (!category?.id) return i18n.t('page.hubSubtitle', { ns: 'training' })
  return i18n.t(`headers.${category.id}.subtitle`, { ns: 'training' })
}
