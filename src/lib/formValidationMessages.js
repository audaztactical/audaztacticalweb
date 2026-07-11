import i18n from '../i18n'
import { resolveTrainingNumberValidityMessage } from './trainingNumberInput'

/**
 * App-language HTML5 constraint validation messages (replaces native browser locale).
 *
 * Prefer `installAppFormValidationMessages()` once at app boot (covers all forms).
 * Per-field helpers (`requiredFieldHandlers` / `requiredFieldInputProps`) remain for
 * explicit wiring or when a field needs a custom onChange merge.
 */

/** @param {EventTarget | null} target */
function isConstraintField(target) {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLSelectElement ||
    target instanceof HTMLTextAreaElement
  )
}

/**
 * Prefer training number messages for `type="number"` (step nearest values, etc.).
 * @param {HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement} input
 */
export function resolveFieldValidityMessage(input) {
  if (input instanceof HTMLInputElement && input.type === 'number') {
    const numberMsg = resolveTrainingNumberValidityMessage(input)
    if (numberMsg) return numberMsg
  }
  return resolveRequiredFieldValidityMessage(input)
}

/**
 * @param {HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement} input
 * @returns {string}
 */
export function resolveRequiredFieldValidityMessage(input) {
  const validity = input.validity

  if (validity.valueMissing) {
    return i18n.t('formValidation.required', { ns: 'common' })
  }
  if (validity.tooShort) {
    return i18n.t('formValidation.tooShort', {
      ns: 'common',
      min: input.minLength > 0 ? input.minLength : 1,
    })
  }
  if (validity.tooLong) {
    return i18n.t('formValidation.tooLong', {
      ns: 'common',
      max: input.maxLength > 0 ? input.maxLength : 0,
    })
  }
  if (validity.typeMismatch) {
    return i18n.t('formValidation.typeMismatch', { ns: 'common' })
  }
  if (validity.patternMismatch) {
    return i18n.t('formValidation.patternMismatch', { ns: 'common' })
  }
  if (validity.badInput) {
    return i18n.t('formValidation.badInput', { ns: 'common' })
  }
  if (validity.rangeUnderflow) {
    return i18n.t('formValidation.rangeUnderflow', {
      ns: 'common',
      min: 'min' in input ? input.min : '',
    })
  }
  if (validity.rangeOverflow) {
    return i18n.t('formValidation.rangeOverflow', {
      ns: 'common',
      max: 'max' in input ? input.max : '',
    })
  }
  if (validity.stepMismatch) {
    return i18n.t('formValidation.stepGeneric', { ns: 'common' })
  }

  return i18n.t('formValidation.generic', { ns: 'common' })
}

/**
 * @param {import('react').InvalidEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>} event
 */
export function handleRequiredFieldInvalid(event) {
  const el = event.currentTarget
  el.setCustomValidity(resolveFieldValidityMessage(el))
}

/**
 * @param {import('react').FormEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>} event
 */
export function handleRequiredFieldInput(event) {
  event.currentTarget.setCustomValidity('')
}

/**
 * Spread onto inputs/selects/textareas that use HTML `required` (or other constraints).
 * Clears custom validity on input/change so the next submit re-evaluates.
 */
export function requiredFieldInputProps() {
  return {
    onInvalid: handleRequiredFieldInvalid,
    onInput: handleRequiredFieldInput,
    onChange: handleRequiredFieldInput,
  }
}

/**
 * Merge app onChange with validity-clear handlers (avoids clobbering controlled inputs).
 * @param {(event: import('react').ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void} [onChange]
 */
export function requiredFieldHandlers(onChange) {
  return {
    onInvalid: handleRequiredFieldInvalid,
    onInput: handleRequiredFieldInput,
    onChange: (/** @type {import('react').ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>} */ e) => {
      handleRequiredFieldInput(e)
      onChange?.(e)
    },
  }
}

let appFormValidationInstalled = false

/**
 * Document-level capture listeners so every `required` / constraint field uses
 * app-language messages without per-form wiring.
 * Safe to call once from `main.jsx`.
 */
export function installAppFormValidationMessages() {
  if (typeof document === 'undefined' || appFormValidationInstalled) return
  appFormValidationInstalled = true

  document.addEventListener(
    'invalid',
    (event) => {
      const el = event.target
      if (!isConstraintField(el)) return
      el.setCustomValidity(resolveFieldValidityMessage(el))
    },
    true,
  )

  const clear = (event) => {
    const el = event.target
    if (!isConstraintField(el)) return
    el.setCustomValidity('')
  }

  document.addEventListener('input', clear, true)
  document.addEventListener('change', clear, true)
}
