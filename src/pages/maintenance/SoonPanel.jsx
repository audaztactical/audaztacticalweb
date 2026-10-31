/** “Yakında açılıyor” panel — markup for engine bindings (#mnt-soon, #mnt-notify). */
export default function SoonPanel({ t }) {
  return (
    <div className="soon" id="mnt-soon" role="note">
      <div className="srow">
        <div className="tag">
          <i />
          {t('soon.tag')}
        </div>
        <button type="button" className="stog" id="mnt-soonTog" aria-expanded="false">
          {t('soon.toggle')} <span>▾</span>
        </button>
      </div>
      <h4>{t('soon.title')}</h4>
      <p>{t('soon.body')}</p>
      <div className="hook">
        <b>{t('soon.hookLead')}</b> {t('soon.hookRest')}
      </div>
      <div className="cal">
        <span>{t('soon.cal')}</span>
        <b id="mnt-calP">%87</b>
      </div>
      <div className="bar">
        <i id="mnt-calB" />
      </div>
      <button type="button" id="mnt-notify">
        {t('soon.notify')}
      </button>
    </div>
  )
}
