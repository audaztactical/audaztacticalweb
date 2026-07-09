import i18n from '../i18n'

/**
 * @param {number} n
 */
function formatStepNumber(n) {
  const rounded = Math.round(n * 1000) / 1000
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
  const k = Math.round((val - base) / step)
  return {
    low: base + Math.max(0, k - 1) * step,
    high: base + (k + 1) * step,
  }
}

/**
 * @param {HTMLInputElement} input
 */
export function resolveTrainingNumberValidityMessage(input) {
  const validity = input.validity
  if (validity.valueMissing) {
    return i18n.t('common.numberValidation.required', { ns: 'training' })
  }
  if (validity.badInput) {
    return i18n.t('common.numberValidation.badInput', { ns: 'training' })
  }
  if (validity.rangeUnderflow) {
    return i18n.t('common.numberValidation.rangeUnderflow', {
      ns: 'training',
      min: input.min,
    })
  }
  if (validity.rangeOverflow) {
    return i18n.t('common.numberValidation.rangeOverflow', {
      ns: 'training',
      max: input.max,
    })
  }
  if (validity.stepMismatch) {
    const nearest = nearestStepValues(input)
    if (nearest) {
      return i18n.t('common.numberValidation.stepMismatch', {
        ns: 'training',
        low: formatStepNumber(nearest.low),
        high: formatStepNumber(nearest.high),
      })
    }
    return i18n.t('common.numberValidation.stepGeneric', { ns: 'training' })
  }
  return i18n.t('common.numberValidation.generic', { ns: 'training' })
}

/** @param {import('react').InvalidEvent<HTMLInputElement>} event */
export function handleTrainingNumberInvalid(event) {
  const input = event.currentTarget
  input.setCustomValidity(resolveTrainingNumberValidityMessage(input))
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
