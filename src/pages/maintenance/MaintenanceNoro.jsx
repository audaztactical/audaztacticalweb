/** Maintenance NÖRO shell — separate from site NoroAssistant. Engine binds behaviour. */
export default function MaintenanceNoro({ t }) {
  return (
    <div className="asst" id="mnt-asst">
      <div className="apanel" id="mnt-apanel" hidden role="dialog" aria-label={t('noro.dialogLabel')}>
        <div className="ah">
          <span className="mini">
            <span className="orb" />
            <span className="core" />
          </span>
          <div className="t">
            <b>NÖRO</b>
            <span>{t('noro.status')}</span>
          </div>
          <button id="mnt-aClose" type="button" aria-label={t('noro.close')}>
            ×
          </button>
        </div>
        <div className="alist" id="mnt-alist" aria-live="polite" />
        <form className="ain" id="mnt-ain">
          <input
            id="mnt-aText"
            type="text"
            placeholder={t('noro.placeholder')}
            autoComplete="off"
            maxLength={400}
            aria-label={t('noro.inputLabel')}
          />
          <button type="submit" aria-label={t('noro.send')}>
            <svg viewBox="0 0 24 24">
              <path d="M4 12l16-8-6 16-2-7-8-1z" />
            </svg>
          </button>
        </form>
        <div className="anote">{t('noro.note')}</div>
      </div>
      <div className="apeek" id="mnt-apeek" hidden />
      <button className="abtn" id="mnt-abtn" type="button" aria-label={t('noro.open')}>
        <span className="orb" />
        <span className="core" />
      </button>
    </div>
  )
}
