/**
 * Optik / Atalet — sensör telemetrisi → UI aim eksenleri.
 *
 * Firmware (1:1, swap yok):
 *   yaw   ← gz (Z)  → hedef tahtası X (sağ/sol)
 *   pitch ← gy (Y)  → hedef tahtası Y (yukarı/aşağı)
 *   roll  ← gx (X)  → yalnızca Cant (yatıklık); POA'ya girmez
 *
 * Pozitif pitch = namlu/kart yukarı → nokta ekranda yukarı (pitchToAimPlaneY).
 */

/**
 * @param {{ yaw?: number, pitch?: number, roll?: number } | null | undefined} snap
 * @returns {{ yaw: number, pitch: number, roll: number }}
 */
export function mapSensorToAimAxes(snap) {
  const yaw = Number(snap?.yaw)
  const pitch = Number(snap?.pitch)
  const roll = Number(snap?.roll)
  return {
    yaw: Number.isFinite(yaw) ? yaw : 0,
    pitch: Number.isFinite(pitch) ? pitch : 0,
    roll: Number.isFinite(roll) ? roll : 0,
  }
}
