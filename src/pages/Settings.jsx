import { useState } from 'react'
import { Copy, KeyRound, Settings2 } from 'lucide-react'
import PageShell from '../components/layout/PageShell'
import SettingsPanel from '../components/SettingsPanel'
import FeedbackForm from '../components/FeedbackForm'
import { useAuth } from '../context/AuthContext'
import { createInstructorInviteToken } from '../lib/firestoreInstructorTokens'
import { emitFirebaseError } from '../lib/firebaseErrorBus'

export default function Settings() {
  const { isAdmin } = useAuth()
  const [generatedToken, setGeneratedToken] = useState('')
  const [tokenBusy, setTokenBusy] = useState(false)
  const [tokenMsg, setTokenMsg] = useState('')
  const [copied, setCopied] = useState(false)

  const handleGenerateInstructorToken = async () => {
    setTokenBusy(true)
    setTokenMsg('')
    setCopied(false)
    try {
      const { token } = await createInstructorInviteToken()
      setGeneratedToken(token)
      setTokenMsg('Tek kullanımlık kod Firestore instructor_tokens koleksiyonuna yazıldı.')
    } catch (err) {
      emitFirebaseError(err)
      setGeneratedToken('')
      setTokenMsg(err instanceof Error ? err.message : 'Kod üretilemedi.')
    } finally {
      setTokenBusy(false)
    }
  }

  const handleCopyToken = async () => {
    if (!generatedToken) return
    try {
      await navigator.clipboard.writeText(generatedToken)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setTokenMsg('Panoya kopyalanamadı — kodu manuel seçin.')
    }
  }

  return (
    <PageShell
      title="Ayarlar"
      subtitle=""
      headerAction={<Settings2 className="size-6 text-accent/50" strokeWidth={1.25} aria-hidden />}
    >
      <div className="mx-auto flex max-w-lg flex-col gap-10">
        <SettingsPanel />

        <FeedbackForm />

        {isAdmin ? (
          <section className="rounded-xl border border-amber-900/40 bg-slate-950/80 p-4 shadow-[0_0_32px_-12px_rgba(255,180,0,0.2)]">
            <p className="mb-3 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-amber-400">
              <KeyRound className="size-4 shrink-0" strokeWidth={1.5} aria-hidden />
              [ 🔐 EĞİTMEN DAVETİYE KODU SİSTEM YÖNETİMİ ]
            </p>
            <p className="mb-4 font-mono text-[9px] uppercase leading-relaxed text-app-text/55">
              Tek kullanımlık eğitmen kayıt kodu üretin. Kod yalnızca bir kez, kayıt sırasında
              yakılır (isUsed · usedBy).
            </p>
            <button
              type="button"
              disabled={tokenBusy}
              onClick={handleGenerateInstructorToken}
              className="w-full rounded-lg border border-amber-500/45 bg-amber-950/40 px-4 py-2.5 font-mono text-[10px] font-bold uppercase tracking-wider text-amber-300 transition hover:border-amber-400/70 hover:bg-amber-950/60 disabled:opacity-50"
            >
              {tokenBusy ? 'ÜRETİLİYOR…' : 'YENİ EĞİTMEN KODU ÜRET'}
            </button>

            {generatedToken ? (
              <div
                className="mt-4 bg-amber-950/40 border border-amber-500/50 p-2 font-mono"
                role="status"
              >
                <p className="text-[9px] font-bold uppercase tracking-wider text-amber-500/80">
                  AKTİF DAVETİYE KODU
                </p>
                <p className="mt-1 break-all text-sm font-bold tracking-[0.2em] text-amber-200">
                  {generatedToken}
                </p>
                <button
                  type="button"
                  onClick={handleCopyToken}
                  className="mt-2 inline-flex items-center gap-1.5 font-mono text-[9px] font-bold uppercase text-amber-400 hover:text-amber-300"
                >
                  <Copy className="size-3.5" strokeWidth={1.5} aria-hidden />
                  {copied ? 'KOPYALANDI' : 'KODU KOPYALA'}
                </button>
              </div>
            ) : null}

            {tokenMsg ? (
              <p className="mt-3 font-mono text-[9px] uppercase text-app-text/55">{tokenMsg}</p>
            ) : null}
          </section>
        ) : (
          <p className="font-mono text-[9px] uppercase text-app-text/45">
            Eğitmen davetiye yönetimi yalnızca sistem yöneticisi hesabı içindir.
          </p>
        )}
      </div>
    </PageShell>
  )
}
