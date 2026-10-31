/** Canvas + overlay stage shell for the maintenance 3D brain. */
export default function Brain3DStage({ label }) {
  return (
    <div className="stage" id="mnt-stage" aria-label={label || 'Operatör Beyni 3B görünüm'}>
      <canvas id="mnt-gl" />
      <canvas id="mnt-ov" />
    </div>
  )
}
