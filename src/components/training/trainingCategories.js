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
 * @property {boolean} [requiresGroup] Grup üyeliği gerekir
 */

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
