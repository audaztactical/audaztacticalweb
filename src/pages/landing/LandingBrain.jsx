import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { mountLandingBrain } from './landingBrainSim'

export default function LandingBrain() {
  const { t } = useTranslation('landing')
  const ref = useRef(null)

  useEffect(() => {
    const root = ref.current
    if (!root) return undefined
    const stop = mountLandingBrain(root)
    return stop
  }, [])

  return (
    <div className="lp-stage" ref={ref} id="stage" aria-label={t('brain.stageAria')}>
      <canvas id="brain" />
      <div className="lp-toast" id="toast" />
      <div className="lp-hud lp-a">
        <span className="lp-hud-lbl">{t('brain.hudTotalLabel')}</span>
        <b id="tl">{t('brain.hudTotalValue')}</b>
        <div className="bar">
          <i id="tlb" style={{ width: '10%' }} />
        </div>
        <small>{t('brain.hudSample')}</small>
      </div>
    </div>
  )
}
