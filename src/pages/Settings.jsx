import { useState } from 'react'
import { Copy, KeyRound, Moon, Settings2, Sun, User } from 'lucide-react'
import PageShell from '../components/layout/PageShell'
import { useAuth } from '../context/AuthContext'
import { isAdminUser } from '../config/admin'
import { createInstructorInviteToken } from '../lib/firestoreInstructorTokens'
import { emitFirebaseError } from '../lib/firebaseErrorBus'

export default function Settings() {
  const { user } = useAuth()
  const [theme, setTheme] = useState('dark')
  const [usernameDraft, setUsernameDraft] = useState('')
  const [generatedToken, setGeneratedToken] = useState('')
  const [tokenBusy, setTokenBusy] = useState(false)
  const [tokenMsg, setTokenMsg] = useState('')
  const [copied, setCopied] = useState(false)

  const isAdmin = isAdminUser(user)

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
      headerAction={<Settings2 className="size-6 text-[#ffb400]/50" strokeWidth={1.25} aria-hidden />}
    >
      <div className="mx-auto flex max-w-lg flex-col gap-10">
        <form className="flex flex-col gap-10" onSubmit={(e) => e.preventDefault()}>
          <div className="flex items-center gap-4">
            <User className="size-5 shrink-0 text-[#ffb400]" strokeWidth={1.5} aria-hidden />
            <input
              type="text"
              value={usernameDraft}
              onChange={(e) => setUsernameDraft(e.target.value)}
              autoComplete="username"
              aria-label="Operatör adı"
              className="h-11 w-full rounded-lg border border-white/15 bg-black/40 px-3 text-sm text-white outline-none ring-0 transition placeholder:text-slate-600 focus:border-[#ffb400]/50 focus:ring-2 focus:ring-[#ffb400]/20"
              placeholder=""
            />
          </div>

          <div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setTheme('light')}
                aria-pressed={theme === 'light'}
                className={[
                  'flex size-14 items-center justify-center rounded-xl border transition',
                  theme === 'light'
                    ? 'border-[#ffb400]/60 bg-[#ffb400]/15 text-[#ffb400]'
                    : 'border-white/10 bg-black/30 text-slate-500 hover:border-white/20',
                ].join(' ')}
                aria-label="Açık tema"
              >
                <Sun className="size-7" strokeWidth={1.5} />
              </button>
              <button
                type="button"
                onClick={() => setTheme('dark')}
                aria-pressed={theme === 'dark'}
                className={[
                  'flex size-14 items-center justify-center rounded-xl border transition',
                  theme === 'dark'
                    ? 'border-[#ffb400]/60 bg-[#ffb400]/15 text-[#ffb400]'
                    : 'border-white/10 bg-black/30 text-slate-500 hover:border-white/20',
                ].join(' ')}
                aria-label="Koyu tema"
              >
                <Moon className="size-7" strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </form>

        {isAdmin ? (
          <section className="rounded-xl border border-amber-900/40 bg-slate-950/80 p-4 shadow-[0_0_32px_-12px_rgba(255,180,0,0.2)]">
            <p className="mb-3 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-amber-400">
              <KeyRound className="size-4 shrink-0" strokeWidth={1.5} aria-hidden />
              [ 🔐 EĞİTMEN DAVETİYE KODU SİSTEM YÖNETİMİ ]
            </p>
            <p className="mb-4 font-mono text-[9px] uppercase leading-relaxed text-slate-500">
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
              <p className="mt-3 font-mono text-[9px] uppercase text-slate-500">{tokenMsg}</p>
            ) : null}
          </section>
        ) : (
          <p className="font-mono text-[9px] uppercase text-slate-600">
            Eğitmen davetiye yönetimi yalnızca sistem yöneticisi hesabı içindir.
          </p>
        )}
      </div>
    </PageShell>
  )
}
