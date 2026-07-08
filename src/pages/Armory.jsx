/**
 * ILWS Armory visualizer assets (Cephanelik route).
 * Hub kartları WebP kullanır (~100–450KB); terminal derinlemesinde aynı kaynak.
 */
import canikImg from '../assets/canik.webp'
import optikImg from '../assets/optik.webp'
import muhimmatImg from '../assets/muhimmat.webp'

/** @type {readonly string[]} */
const ARMORY_HUB_IMAGES = [canikImg, optikImg, muhimmatImg]

/** Cephanelik hub mount öncesi illüstrasyonları önbelleğe alır. */
export function preloadArmoryHubImages() {
  if (typeof Image === 'undefined') return
  for (const src of ARMORY_HUB_IMAGES) {
    const img = new Image()
    img.src = src
  }
}

export { canikImg, optikImg, muhimmatImg }
