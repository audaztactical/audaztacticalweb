import { useEffect, useState } from 'react'
import Dd1380MarchWorkspace from './Dd1380MarchWorkspace'
import MarchProtocolPanel from './MarchProtocolPanel'

/** @typedef {import('../../lib/marchDd1380Config').MarchStepKey} MarchStepKey */
/** @typedef {import('../../lib/casualtyCardPayload').typeof import('../../lib/casualtyCardPayload').CASUALTY_DD1380_INITIAL} Dd1380Form */

/**
 * @param {{
 *   form: Dd1380Form
 *   onPatch: (patch: Partial<Dd1380Form>) => void
 *   onSave: () => void
 *   saving: boolean
 *   saveOk: boolean
 *   saveError: string | null
 *   disabled?: boolean
 * }} props
 */
export default function TcccMarchTab({
  form,
  onPatch,
  onSave,
  saving,
  saveOk,
  saveError,
  disabled = false,
}) {
  const [protocolKey, setProtocolKey] = useState(/** @type {MarchStepKey | null} */ (null))
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)')
    const sync = () => setIsMobile(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const handleMarchLetter = (/** @type {MarchStepKey} */ key) => {
    onPatch({ activeMarchStep: key })
    setProtocolKey(key)
  }

  return (
    <div className="relative">
      <div className={protocolKey && !isMobile ? 'lg:grid lg:grid-cols-[1fr_minmax(280px,340px)] lg:gap-4' : ''}>
        <Dd1380MarchWorkspace
          form={form}
          onPatch={onPatch}
          onSave={onSave}
          saving={saving}
          saveOk={saveOk}
          saveError={saveError}
          disabled={disabled}
          onMarchLetterClick={handleMarchLetter}
        />
        {protocolKey && !isMobile ? (
          <MarchProtocolPanel stepKey={protocolKey} onClose={() => setProtocolKey(null)} variant="side" />
        ) : null}
      </div>
      {protocolKey && isMobile ? (
        <MarchProtocolPanel stepKey={protocolKey} onClose={() => setProtocolKey(null)} variant="modal" />
      ) : null}
    </div>
  )
}
