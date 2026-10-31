/** Intro tour shell — engine runs assemble / steps / localStorage. */
export default function MaintenanceTour({ t }) {
  return (
    <div className="intro" id="mnt-intro" hidden>
      <canvas id="mnt-ic" />
      <div className="iorb" id="mnt-iorb">
        <span className="orb" />
        <span className="core" />
      </div>
      <div className="icard" id="mnt-icard" role="dialog" aria-live="polite" aria-labelledby="mnt-ittl">
        <div className="ihd">
          <span>NÖRO</span>
          <em id="mnt-istep">1 / 5</em>
        </div>
        <h3 id="mnt-ittl" />
        <div className="itxt" id="mnt-itxt" />
        <div className="ibtns">
          <button type="button" className="iskip" id="mnt-iskip">
            {t('tour.skip')}
          </button>
          <button type="button" className="inext" id="mnt-inext">
            {t('tour.next')}
          </button>
        </div>
        <div className="idots" id="mnt-idots" />
      </div>
    </div>
  )
}
