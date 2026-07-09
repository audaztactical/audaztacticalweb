import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import TacticalPanel from '../ui/TacticalPanel'
import { useAuth } from '../../context/AuthContext'
import { generateTcccObservationFormPdf } from '../../lib/tcccObservationFormPdf'

export default function TcccObservedPdfPanel() {
  const { t } = useTranslation('training')
  const { user, userData } = useAuth()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const handleDownload = async () => {
    setBusy(true)
    setMsg('')
    try {
      const formId = await generateTcccObservationFormPdf({
        callsign: userData?.callsign,
        username: userData?.username,
        displayName: user?.displayName ?? undefined,
      })
      setMsg(t('sectors.tccc.pdfPanel.downloaded', { formId }))
    } catch (err) {
      setMsg(err instanceof Error ? err.message : t('sectors.tccc.pdfPanel.pdfFailed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <TacticalPanel className="w-full min-w-0 border-accent/25 bg-app-bg/90 p-6">
      <p className="font-mono-technical text-[10px] font-bold uppercase tracking-[0.28em] text-accent/85">
        {t('sectors.tccc.pdfPanel.kicker')}
      </p>
      <p className="mt-2 max-w-xl font-mono-technical text-sm leading-relaxed text-app-text/70">
        {t('sectors.tccc.pdfPanel.description')}
      </p>
      <ul className="mt-4 space-y-1 font-mono-technical text-[9px] uppercase tracking-wider text-app-text/45">
        <li>{t('sectors.tccc.pdfPanel.bulletPhases')}</li>
        <li>{t('sectors.tccc.pdfPanel.bulletKia')}</li>
        <li>{t('sectors.tccc.pdfPanel.bulletSignature')}</li>
      </ul>
      <button
        type="button"
        onClick={handleDownload}
        disabled={busy}
        className="mt-6 inline-flex items-center gap-2 rounded border border-accent/50 bg-accent/12 px-5 py-2.5 font-mono-technical text-[10px] font-bold uppercase tracking-wider text-accent transition hover:bg-accent/20 disabled:opacity-50"
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
        {t('sectors.tccc.pdfPanel.download')}
      </button>
      {msg ? <p className="mt-3 font-mono-technical text-[9px] uppercase text-accent/80">{msg}</p> : null}
    </TacticalPanel>
  )
}
