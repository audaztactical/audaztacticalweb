import { useRef, useState } from 'react'
import { useAccordionReveal } from '../../hooks/useAccordionReveal'
import { useCompactShell } from '../../hooks/useCompactShell'
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
  const compact = useCompactShell()
  const [protocolKey, setProtocolKey] = useState(/** @type {MarchStepKey | null} */ (null))
  const protocolSideRef = useRef(/** @type {HTMLDivElement | null} */ (null))

  useAccordionReveal(Boolean(protocolKey && !compact), protocolSideRef)

  const handleMarchLetter = (/** @type {MarchStepKey} */ key) => {
    onPatch({ activeMarchStep: key })
    setProtocolKey(key)
  }

  return (
    <div className="relative h-auto min-h-0">
      <div
        className={[
          protocolKey && !compact ? 'lg:grid lg:grid-cols-[1fr_minmax(280px,340px)] lg:items-start lg:gap-4' : '',
        ].join(' ')}
      >
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
        {protocolKey && !compact ? (
          <div ref={protocolSideRef} className="min-h-0">
            <MarchProtocolPanel stepKey={protocolKey} onClose={() => setProtocolKey(null)} variant="side" />
          </div>
        ) : null}
      </div>
      {protocolKey && compact ? (
        <MarchProtocolPanel stepKey={protocolKey} onClose={() => setProtocolKey(null)} variant="modal" />
      ) : null}
    </div>
  )
}
