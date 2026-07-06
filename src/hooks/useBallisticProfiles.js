import { useCallback, useMemo } from 'react'
import { useAudazData } from './useAudazData.js'
import { createDefaultBallisticProfileFields } from '../lib/ballisticProfileBridge.js'
import { invStr } from '../lib/inventoryIlws.js'

/** @typedef {import('../lib/schema.js').BallisticProfileDocument} BallisticProfileDocument */

/**
 * ballistic_profiles/{uid}/profiles — gerçek zamanlı profil listesi + CRUD.
 */
export function useBallisticProfiles() {
  const { items, loading, listenError, ready, addItem, updateItem, deleteItem } =
    useAudazData('ballistic_profiles')

  const profiles = useMemo(
    () =>
      items.filter(
        (row) => invStr(row.status).trim() !== 'deleted' && invStr(row.status).trim() !== 'archived',
      ),
    [items],
  )

  /**
   * @param {Partial<BallisticProfileDocument> & Pick<BallisticProfileDocument, 'profileName'>} data
   */
  const createProfile = useCallback(
    async (data) => {
      const defaults = createDefaultBallisticProfileFields()
      const payload = {
        ...defaults,
        ...data,
        weapon: { ...defaults.weapon, ...(data.weapon ?? {}) },
        optic: { ...defaults.optic, ...(data.optic ?? {}) },
        ammo: { ...defaults.ammo, ...(data.ammo ?? {}) },
        advanced: { ...defaults.advanced, ...(data.advanced ?? {}) },
        status: data.status ?? 'active',
      }
      return addItem(payload)
    },
    [addItem],
  )

  /**
   * @param {string} profileId
   * @param {Partial<BallisticProfileDocument>} patch
   */
  const updateProfile = useCallback(
    async (profileId, patch) => updateItem(profileId, patch),
    [updateItem],
  )

  /** @param {string} profileId */
  const deleteProfile = useCallback(
    async (profileId) => deleteItem(profileId),
    [deleteItem],
  )

  return useMemo(
    () => ({
      profiles,
      loading,
      listenError,
      ready,
      createProfile,
      updateProfile,
      deleteProfile,
    }),
    [profiles, loading, listenError, ready, createProfile, updateProfile, deleteProfile],
  )
}
