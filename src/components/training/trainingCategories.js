import atisImg from '../../assets/atis.png'
import cqbImg from '../../assets/cqb.png'
import fofImg from '../../assets/fof.png'
import vbssImg from '../../assets/vbss.png'
import tcccImg from '../../assets/tccc.png'
import egitimImg from '../../assets/egitim.png'

/** @typedef {'pistol' | 'reddot' | 'cartridge'} TrainingVizVariant */

/**
 * @typedef {Object} TrainingCategory
 * @property {string} id
 * @property {string} title
 * @property {string} imageSrc
 * @property {string} opsCode
 * @property {TrainingVizVariant} vizVariant
 * @property {boolean} [requiresGroup] Grup üyeliği veya eğitmen
 * @property {boolean} [requiresInstructor] Yalnızca eğitmen
 * @property {string} [externalRoute] Sektör terminali yerine harici rota
 */

/** Bireysel sektörler — tüm kullanıcılar (operatör + eğitmen) */
export const INDIVIDUAL_TRAINING_CATEGORY_IDS = [
  'atis',
  'cqb',
  'fof',
  'vbss',
  'tccc',
  'egitim',
]

/** @type {TrainingCategory[]} */
export const TRAINING_CATEGORIES = [
  { id: 'atis', title: 'ATIŞ', imageSrc: atisImg, opsCode: 'RNG-01', vizVariant: 'pistol' },
  { id: 'cqb', title: 'CQB', imageSrc: cqbImg, opsCode: 'CQB-02', vizVariant: 'reddot' },
  { id: 'fof', title: 'FOF', imageSrc: fofImg, opsCode: 'FOF-03', vizVariant: 'cartridge' },
  { id: 'vbss', title: 'VBSS', imageSrc: vbssImg, opsCode: 'VBS-04', vizVariant: 'pistol' },
  { id: 'tccc', title: 'TCCC', imageSrc: tcccImg, opsCode: 'MED-05', vizVariant: 'reddot' },
  { id: 'egitim', title: 'EĞİTİM', imageSrc: egitimImg, opsCode: 'EDU-06', vizVariant: 'cartridge' },
  {
    id: 'grup-egitimi',
    title: 'GRUP EĞİTİMİ',
    imageSrc: egitimImg,
    opsCode: 'GRP-07',
    vizVariant: 'reddot',
    requiresGroup: true,
  },
]

/** Eğitmen Kontrol Paneli kartı — antrenman hub'ında, `/egitmen-komuta` rotasına gider */
export const INSTRUCTOR_CONTROL_PANEL_CARD = /** @type {TrainingCategory} */ ({
  id: 'egitmen-komuta',
  title: 'EĞİTMEN KONTROL PANELİ',
  imageSrc: egitimImg,
  opsCode: 'CMD-09',
  vizVariant: 'cartridge',
  requiresInstructor: true,
  externalRoute: '/egitmen-komuta',
})

/**
 * users/{uid} profilinden grup kimliğini çözer (`group` veya `groupId`).
 * @param {Record<string, unknown> | null | undefined} profile
 */
export function resolveUserGroup(profile) {
  if (!profile || typeof profile !== 'object') return null
  const group = profile.group
  if (typeof group === 'string' && group.trim()) return group.trim()
  const groupId = profile.groupId
  if (typeof groupId === 'string' && groupId.trim()) return groupId.trim()
  return null
}

/**
 * Hibrit yetki — bireysel sektörler herkese; grup eğitimi üye/eğitmene.
 * @param {{
 *   role: string
 *   userGroup: string | null
 * }} access
 */
export function filterTrainingCategoriesByAccess(access) {
  const isInstructor = access.role === 'instructor'
  const hasGroup = Boolean(access.userGroup)

  return TRAINING_CATEGORIES.filter((category) => {
    if (INDIVIDUAL_TRAINING_CATEGORY_IDS.includes(category.id)) return true
    if (category.id === 'grup-egitimi') return hasGroup || isInstructor
    return false
  })
}

/**
 * @param {{
 *   role: string
 *   userGroup: string | null
 * }} access
 */
export function countVisibleTrainingChannels(access) {
  let count = filterTrainingCategoriesByAccess(access).length
  if (access.role === 'instructor') count += 1
  return count
}
