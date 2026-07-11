import i18n from '../i18n'

/**
 * @param {number} n
 */
function countDecimalPlaces(n) {
  if (!Number.isFinite(n)) return 0
  const text = String(n)
  if (text.includes('e') || text.includes('E')) {
    const fixed = n.toFixed(12).replace(/0+$/, '').replace(/\.$/, '')
    const dot = fixed.indexOf('.')
    return dot === -1 ? 0 : fixed.length - dot - 1
  }
  const dot = text.indexOf('.')
  return dot === -1 ? 0 : text.length - dot - 1
}

/**
 * Integer-scaled step grid check — avoids classic float remainder bugs.
 * @param {number} value
 * @param {number} min
 * @param {number} step
 */
export function isValidTrainingNumberStep(value, min, step) {
  if (!Number.isFinite(value) || !Number.isFinite(step) || step <= 0) return true
  const safeMin = Number.isFinite(min) ? min : 0
  const scale = 10 ** Math.max(countDecimalPlaces(safeMin), countDecimalPlaces(step), countDecimalPlaces(value), 0)
  const valueScaled = Math.round(value * scale)
  const minScaled = Math.round(safeMin * scale)
  const stepScaled = Math.round(step * scale)
  if (stepScaled <= 0) return true
  return (valueScaled - minScaled) % stepScaled === 0
}

/**
 * @param {number} n
 * @param {number} [scale]
 */
function formatStepNumber(n, scale = 1000) {
  const rounded = Math.round(n * scale) / scale
  return Number.isInteger(rounded) ? String(rounded) : String(rounded)
}

/**
 * @param {HTMLInputElement} input
 */
function nearestStepValues(input) {
  const step = Number(input.step)
  const val = Number(input.value)
  const base = input.min !== '' && Number.isFinite(Number(input.min)) ? Number(input.min) : 0
  if (!Number.isFinite(step) || step <= 0 || !Number.isFinite(val)) return null

  const scale = 10 ** Math.max(countDecimalPlaces(base), countDecimalPlaces(step), countDecimalPlaces(val), 0)
  const valScaled = Math.round(val * scale)
  const baseScaled = Math.round(base * scale)
  const stepScaled = Math.round(step * scale)
  if (stepScaled <= 0) return null

  const k = Math.round((valScaled - baseScaled) / stepScaled)
  const lowScaled = baseScaled + Math.max(0, k - 1) * stepScaled
  const highScaled = baseScaled + (k + 1) * stepScaled

  return {
    low: lowScaled / scale,
    high: highScaled / scale,
  }
}

/**
 * @param {HTMLInputElement} input
 */
export function resolveTrainingNumberValidityMessage(input) {
  const validity = input.validity
  const value = Number(input.value)
  const min = input.min !== '' ? Number(input.min) : 0
  const step = input.step !== '' && input.step !== 'any' ? Number(input.step) : NaN

  if (validity.valueMissing) {
    return i18n.t('formValidation.required', { ns: 'common' })
  }
  if (validity.badInput) {
    return i18n.t('formValidation.badInput', { ns: 'common' })
  }
  if (validity.rangeUnderflow) {
    return i18n.t('formValidation.rangeUnderflow', {
      ns: 'common',
      min: input.min,
    })
  }
  if (validity.rangeOverflow) {
    return i18n.t('formValidation.rangeOverflow', {
      ns: 'common',
      max: input.max,
    })
  }
  if (validity.stepMismatch) {
    if (Number.isFinite(value) && Number.isFinite(step) && isValidTrainingNumberStep(value, min, step)) {
      return ''
    }
    const nearest = nearestStepValues(input)
    if (nearest) {
      return i18n.t('formValidation.stepMismatch', {
        ns: 'common',
        low: formatStepNumber(nearest.low),
        high: formatStepNumber(nearest.high),
      })
    }
    return i18n.t('formValidation.stepGeneric', { ns: 'common' })
  }
  return i18n.t('formValidation.generic', { ns: 'common' })
}

/** @param {import('react').InvalidEvent<HTMLInputElement>} event */
export function handleTrainingNumberInvalid(event) {
  const input = event.currentTarget
  const message = resolveTrainingNumberValidityMessage(input)
  input.setCustomValidity(message)
}

/** @param {import('react').FormEvent<HTMLInputElement>} event */
export function handleTrainingNumberInput(event) {
  event.currentTarget.setCustomValidity('')
}

export function trainingNumberInputProps() {
  return {
    onInvalid: handleTrainingNumberInvalid,
    onInput: handleTrainingNumberInput,
  }
}
