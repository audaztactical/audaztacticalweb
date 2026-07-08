/** Firestore / özet önizlemesinde saklanan kanonik placeholder token'ları (dil-bağımsız depolama). */
export const MUHABERE_PREVIEW_IMAGE = '[ GÖRSEL ]'
export const MUHABERE_PREVIEW_LOCATION = '[ STRATEJİK KOORDİNAT ]'

/** @type {Record<string, 'image' | 'location'>} */
export const MUHABERE_PREVIEW_TOKEN_MAP = {
  [MUHABERE_PREVIEW_IMAGE]: 'image',
  [MUHABERE_PREVIEW_LOCATION]: 'location',
}

/**
 * @param {unknown} text
 * @returns {'image' | 'location' | null}
 */
export function getMuhaberePreviewTokenKind(text) {
  return MUHABERE_PREVIEW_TOKEN_MAP[String(text ?? '').trim()] ?? null
}
