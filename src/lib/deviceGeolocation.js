/**
 * Tarayıcı konumu — watchPosition + yedek getCurrentPosition.
 * @returns {Promise<{ lat: number, lon: number, accuracyM: number | null } | null>}
 */
export function requestDevicePosition() {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return Promise.resolve(null)
  }

  return new Promise((resolve) => {
    /** @type {number | null} */
    let watchId = null
    let settled = false

    const finish = (/** @type {{ lat: number, lon: number, accuracyM: number | null } | null} */ result) => {
      if (settled) return
      settled = true
      if (watchId != null) {
        try {
          navigator.geolocation.clearWatch(watchId)
        } catch {
          /* ignore */
        }
      }
      resolve(result)
    }

    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        finish({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracyM: Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : null,
        })
      },
      () => {
        /* watch hatası — getCurrentPosition yedeği devreye girer */
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 25000 }
    )

    window.setTimeout(() => {
      if (settled) return
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          finish({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            accuracyM: Number.isFinite(pos.coords.accuracy) ? pos.coords.accuracy : null,
          })
        },
        () => finish(null),
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
      )
    }, 4000)

    window.setTimeout(() => finish(null), 28000)
  })
}
