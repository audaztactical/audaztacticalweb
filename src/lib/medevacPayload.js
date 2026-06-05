import { invNum, invStr } from './inventoryIlws'
import { TCCC_OPERATION_CATEGORY } from './tcccHealthConstants'

const baseFields = (userId) => ({
  userId,
  ownerId: userId,
  operationCategory: TCCC_OPERATION_CATEGORY,
  timestamp: new Date().toISOString(),
})

/**
 * @param {typeof import('./tcccHealthConstants').MEDEVAC_NINE_LINE_INITIAL} form
 * @param {string} userId
 */
export function buildMedevac9LinePayload(form, userId) {
  const eq = form.line4_medicalEquipment ?? {}
  const medicalEquipment = []
  if (eq.hoist) medicalEquipment.push('hoist')
  if (eq.ventilator) medicalEquipment.push('ventilator')
  if (eq.oxygen) medicalEquipment.push('oxygen')

  const marking = form.line7_lzMarking ?? { method: 'panels', smokeColor: '' }
  const grid = invStr(form.line1_pickupGrid).trim()

  return {
    ...baseFields(userId),
    kind: 'MEDEVAC_9LINE',
    evacType: 'medevac',
    medevacNineLine: {
      line1_pickupGrid: grid,
      line2_radioFreqCallsign: invStr(form.line2_radioFreqCallsign).trim(),
      line3_patientsPrecedence: {
        urgent: invNum(form.line3_patientsPrecedence?.urgent),
        priority: invNum(form.line3_patientsPrecedence?.priority),
        routine: invNum(form.line3_patientsPrecedence?.routine),
      },
      line4_medicalEquipment: medicalEquipment,
      line5_patientsType: {
        litter: invNum(form.line5_patientsType?.litter),
        ambulatory: invNum(form.line5_patientsType?.ambulatory),
      },
      line6_pickupSecurity: invStr(form.line6_pickupSecurity).trim(),
      line7_lzMarking: {
        method: invStr(marking.method).trim() || 'panels',
        smokeColor:
          marking.method === 'smoke' ? invStr(marking.smokeColor).trim() || null : null,
      },
      line8_patientNationality: invStr(form.line8_patientNationality).trim(),
      line9_cbrnTerrain: invStr(form.line9_cbrnTerrain).trim(),
    },
    title: `9-LINE MEDEVAC · ${grid.slice(0, 24) || 'PICKUP'}`,
  }
}

/**
 * @param {typeof import('./tcccHealthConstants').TACEVAC_INITIAL_FORM} form
 * @param {string} userId
 */
export function buildTacevacLogPayload(form, userId) {
  const weapons = Array.isArray(form.enemyWeaponProfiles)
    ? form.enemyWeaponProfiles.map((w) => invStr(w).trim()).filter(Boolean)
    : []
  const customWeapon = invStr(form.enemyWeaponCustom).trim()
  if (customWeapon) weapons.push(customWeapon)

  const grid = invStr(form.pickupGrid).trim()

  return {
    ...baseFields(userId),
    kind: 'TACEVAC_REQUEST',
    evacType: 'tacevac',
    tacevacExtraction: {
      pickupGrid: grid,
      radioFreqCallsign: invStr(form.radioFreqCallsign).trim(),
      activeFireStatus: invStr(form.activeFireStatus).trim() || 'cold_lz',
      threatLevel: invStr(form.threatLevel).trim(),
      enemyWeaponProfiles: weapons,
      suppressiveFireRequest: Boolean(form.suppressiveFireRequest),
      casSupportType: form.suppressiveFireRequest
        ? invStr(form.casSupportType).trim() || 'cas'
        : 'none',
      extractionVehicle: invStr(form.extractionVehicle).trim() || 'heavy_armored_cruiser',
      operationalNotes: invStr(form.operationalNotes).trim(),
    },
    title: `TACEVAC · ${grid.slice(0, 24) || 'EXTRACTION'}`,
  }
}

/** @deprecated Use buildMedevac9LinePayload or buildTacevacLogPayload */
export function buildMedevacLogPayload(form, userId) {
  if (form.evacType === 'tacevac' && form.pickupGrid !== undefined) {
    return buildTacevacLogPayload(form, userId)
  }
  return buildMedevac9LinePayload(form, userId)
}
