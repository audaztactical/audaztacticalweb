import { useState } from 'react'
import { Link } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import {
  Bell,
  Copy,
  CreditCard,
  KeyRound,
  Loader2,
  LogOut,
  MessageSquarePlus,
  Palette,
  Settings2,
  UserRound,
  Users,
} from 'lucide-react'
import PageShell from '../components/layout/PageShell'
import AccessCodeRedeemPanel from '../components/AccessCodeRedeemPanel'
import SettingsPanel from '../components/SettingsPanel'
import FeedbackForm from '../components/FeedbackForm'
import SettingsAccordionSection from '../components/settings/SettingsAccordionSection'
import SettingsGroupSection from '../components/settings/SettingsGroupSection'
import { useAuth } from '../context/AuthContext'
import { auth } from '../lib/firebase'
import { createInstructorInviteToken } from '../lib/firestoreInstructorTokens'
import { emitFirebaseError } from '../lib/firebaseErrorBus'

function formatRoleLabel(role) {
  if (role === 'instructor') return 'Eğitmen'
  if (role === 'premium_member' || role === 'pro_instructor') return 'Premium'
  return 'Operatör'
}

export default function Settings() {
  const { isAdmin, showAdminPanel, user, userData, role, isPremiumMember } = useAuth()
  const showPricingLink = showAdminPanel || isAdmin
  const [generatedToken, setGeneratedToken] = useState('')
  const [tokenBusy, setTokenBusy] = useState(false)
  const [tokenMsg, setTokenMsg] = useState('')
  const [copied, setCopied] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

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

  const handleSignOut = async () => {
    if (!auth || signingOut) return
    setSigningOut(true)
    try {
      await signOut(auth)
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <PageShell
      fullWidth
      title="Ayarlar"
      subtitle=""
      headerAction={<Settings2 className="size-6 text-accent/50" strokeWidth={1.25} aria-hidden />}
    >
      <div className="w-full">
        {showPricingLink ? (
          <div className="border-b border-white/10 px-4 py-4">
            <Link
              to="/fiyatlandirma"
              className="group flex w-full items-center gap-3 rounded-xl border border-accent/25 bg-black/40 px-4 py-3 transition hover:border-accent/45 hover:bg-accent/[0.06]"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded border border-accent/35 bg-accent/10 text-accent">
                <CreditCard className="size-5" strokeWidth={1.5} aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block font-mono-technical text-[10px] font-bold uppercase tracking-[0.2em] text-accent/90">
                  Üyelik planları
                </span>
                <span className="mt-0.5 block font-mono-technical text-[11px] text-app-text/65 group-hover:text-app-text/85">
                  Fiyatlandırma ve plan karşılaştırması →
                </span>
              </span>
            </Link>
          </div>
        ) : null}

        <SettingsAccordionSection
          id="personal"
          title="KİŞİSEL"
          color="#F59E0B"
          icon={Palette}
          defaultOpen
        >
          <SettingsPanel bare sections={['theme']} />
        </SettingsAccordionSection>

        <SettingsAccordionSection
          id="notifications"
          title="BİLDİRİMLER"
          color="#06B6D4"
          icon={Bell}
        >
          <SettingsPanel bare sections={['notifications']} />
        </SettingsAccordionSection>

        <SettingsAccordionSection id="team" title="TAKTİK TİM" color="#22C55E" icon={Users}>
          <SettingsGroupSection />
        </SettingsAccordionSection>

        <SettingsAccordionSection id="access-code" title="ERİŞİM KODU" color="#A855F7" icon={KeyRound}>
          <AccessCodeRedeemPanel bare />
        </SettingsAccordionSection>

        <SettingsAccordionSection
          id="feedback"
          title="GERİ BİLDİRİM"
          color="#F97316"
          icon={MessageSquarePlus}
        >
          <FeedbackForm bare />
        </SettingsAccordionSection>

        <SettingsAccordionSection id="account" title="HESAP" color="#EF4444" icon={UserRound}>
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded border border-red-900/30 bg-red-950/15 px-4 py-3">
                <p className="font-mono-technical text-[9px] font-bold uppercase tracking-[0.22em] text-red-400/70">
                  Callsign
                </p>
                <p className="mt-1 truncate font-mono-technical text-sm font-bold uppercase tracking-wider text-app-text">
                  {userData?.callsign || '—'}
                </p>
              </div>
              <div className="rounded border border-red-900/30 bg-red-950/15 px-4 py-3">
                <p className="font-mono-technical text-[9px] font-bold uppercase tracking-[0.22em] text-red-400/70">
                  E-posta
                </p>
                <p className="mt-1 truncate font-mono-technical text-sm text-app-text/85">
                  {user?.email || userData?.email || '—'}
                </p>
              </div>
              <div className="rounded border border-red-900/30 bg-red-950/15 px-4 py-3">
                <p className="font-mono-technical text-[9px] font-bold uppercase tracking-[0.22em] text-red-400/70">
                  Rol
                </p>
                <p className="mt-1 font-mono-technical text-sm font-bold uppercase tracking-wider text-app-text">
                  {formatRoleLabel(role)}
                  {isPremiumMember ? ' · PREMIUM' : ''}
                </p>
              </div>
              <div className="rounded border border-red-900/30 bg-red-950/15 px-4 py-3">
                <p className="font-mono-technical text-[9px] font-bold uppercase tracking-[0.22em] text-red-400/70">
                  Operatör ID
                </p>
                <p className="mt-1 truncate font-mono-technical text-sm tabular-nums text-app-text/70">
                  {user?.uid ? `${user.uid.slice(0, 8)}…` : '—'}
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={!auth || signingOut}
              onClick={() => void handleSignOut()}
              className="inline-flex w-full items-center justify-center gap-2 rounded border border-red-500/45 bg-red-950/35 px-4 py-2.5 font-mono-technical text-[10px] font-bold uppercase tracking-[0.22em] text-red-300 transition hover:border-red-400/65 hover:bg-red-950/50 disabled:opacity-50 sm:w-auto"
            >
              {signingOut ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <LogOut className="size-4" strokeWidth={1.75} aria-hidden />
              )}
              {signingOut ? 'ÇIKIŞ YAPILIYOR…' : 'ÇIKIŞ YAP'}
            </button>
          </div>
        </SettingsAccordionSection>

        {isAdmin ? (
          <section className="w-full border-t border-white/10 px-4 py-5">
            <div className="rounded-xl border border-amber-900/40 bg-slate-950/80 p-4 shadow-[0_0_32px_-12px_rgba(255,180,0,0.2)]">
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
                className="w-full rounded-lg border border-amber-500/45 bg-amber-950/40 px-4 py-2.5 font-mono text-[10px] font-bold uppercase tracking-wider text-amber-300 transition hover:border-amber-400/70 hover:bg-amber-950/60 disabled:opacity-50 sm:w-auto"
              >
                {tokenBusy ? 'ÜRETİLİYOR…' : 'YENİ EĞİTMEN KODU ÜRET'}
              </button>

              {generatedToken ? (
                <div
                  className="mt-4 border border-amber-500/50 bg-amber-950/40 p-2 font-mono"
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
            </div>
          </section>
        ) : null}
      </div>
    </PageShell>
  )
}
