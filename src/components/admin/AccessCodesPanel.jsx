import { useEffect, useState } from 'react'
import { Copy, KeyRound, Loader2, ShieldOff } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import {
  ACCESS_CODE_PLANS,
  createAccessCode,
  formatAccessCodePlanLabel,
  formatAccessCodeStatusLabel,
  revokeAccessCode,
  subscribeAccessCodesForAdmin,
} from '../../lib/firestoreAccessCodes'
import { formatAdminUserDate } from '../../lib/firestoreAdminUsers'
import { emitFirebaseError } from '../../lib/firebaseErrorBus'
import {
  ADMIN_BADGE,
  ADMIN_BTN_DANGER,
  ADMIN_BTN_PRIMARY,
  ADMIN_EMPTY_STATE,
  ADMIN_FORM_CARD,
  ADMIN_FORM_CARD_HEADER,
  ADMIN_SUMMARY_BAR,
  ADMIN_TABLE,
  ADMIN_TABLE_HEAD,
  ADMIN_TABLE_ROW,
  ADMIN_TABLE_TD,
  ADMIN_TABLE_TH,
  ADMIN_TABLE_WRAP,
} from './adminUi'

/** @typedef {import('../../lib/firestoreAccessCodes').AccessCodeRecord} AccessCodeRecord */

const STATUS_TONE = {
  active: 'border-emerald-500/40 bg-emerald-950/30 text-emerald-300',
  depleted: 'border-zinc-500/40 bg-zinc-900/50 text-zinc-400',
  revoked: 'border-orange-500/40 bg-orange-950/30 text-orange-300',
  expired: 'border-red-500/40 bg-red-950/30 text-red-300',
}

const inputClass =
  'w-full rounded border border-white/10 bg-black/40 px-3 py-2 font-mono-technical text-sm text-app-text outline-none transition focus:border-accent/45'

/**
 * @param {{ onFeedback?: (msg: string) => void }} props
 */
export default function AccessCodesPanel({ onFeedback }) {
  const { user } = useAuth()
  const [rows, setRows] = useState(/** @type {AccessCodeRecord[]} */ ([]))
  const [loading, setLoading] = useState(true)
  const [plan, setPlan] = useState('premium')
  const [maxUses, setMaxUses] = useState('5')
  const [expiresAt, setExpiresAt] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [revokingId, setRevokingId] = useState('')
  const [lastCreated, setLastCreated] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const unsub = subscribeAccessCodesForAdmin(
      (list) => {
        setRows(list)
        setLoading(false)
      },
      (err) => {
        emitFirebaseError(err)
        setLoading(false)
      },
    )
    return unsub
  }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!user?.uid) return

    const uses = Math.max(1, Math.floor(Number(maxUses) || 1))
    setBusy(true)
    setCopied(false)
    try {
      const expiry = expiresAt.trim()
        ? new Date(`${expiresAt.trim()}T23:59:59`)
        : null
      const { code } = await createAccessCode({
        plan: plan === 'pro_instructor' ? 'pro_instructor' : 'premium',
        maxUses: uses,
        expiresAt: expiry,
        note,
        createdBy: user.uid,
      })
      setLastCreated(code)
      onFeedback?.(`Erişim kodu oluşturuldu: ${code}`)
    } catch (err) {
      emitFirebaseError(err)
      onFeedback?.(err instanceof Error ? err.message : 'Kod oluşturulamadı.')
    } finally {
      setBusy(false)
    }
  }

  const handleRevoke = async (row) => {
    if (!user?.uid || row.status === 'revoked') return
    if (!window.confirm(`"${row.code}" kodunu iptal etmek istediğinize emin misiniz?`)) return

    setRevokingId(row.id)
    try {
      await revokeAccessCode(row.id, user.uid)
      onFeedback?.(`Kod iptal edildi: ${row.code}`)
    } catch (err) {
      emitFirebaseError(err)
      onFeedback?.(err instanceof Error ? err.message : 'İptal başarısız.')
    } finally {
      setRevokingId('')
    }
  }

  const handleCopy = async (code) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      onFeedback?.('Panoya kopyalanamadı.')
    }
  }

  const activeCount = rows.filter((r) => r.status === 'active').length

  return (
    <div className="space-y-6">
      <ADMIN_SUMMARY_BAR>
        <KeyRound className="size-4 text-accent/80" aria-hidden />
        <span className="text-app-text/70">
          Erişim kodları: <strong className="text-accent">{rows.length}</strong> toplam ·{' '}
          <strong className="text-emerald-300">{activeCount}</strong> aktif
        </span>
      </ADMIN_SUMMARY_BAR>

      <ADMIN_FORM_CARD>
        <div className={ADMIN_FORM_CARD_HEADER}>
          <KeyRound className="size-4 text-accent" aria-hidden />
          <h3 className="font-mono-technical text-xs font-bold uppercase tracking-wider text-accent">
            Erişim Kodu Oluştur
          </h3>
        </div>
        <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1.5 sm:col-span-1">
            <span className="font-mono-technical text-[10px] font-bold uppercase text-app-text/60">
              Plan
            </span>
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              className={inputClass}
            >
              {ACCESS_CODE_PLANS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5 sm:col-span-1">
            <span className="font-mono-technical text-[10px] font-bold uppercase text-app-text/60">
              Kişi sayısı (max kullanım)
            </span>
            <input
              type="number"
              min={1}
              max={9999}
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              className={inputClass}
              required
            />
          </label>

          <label className="space-y-1.5 sm:col-span-1">
            <span className="font-mono-technical text-[10px] font-bold uppercase text-app-text/60">
              Son kullanma (opsiyonel)
            </span>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className={inputClass}
            />
          </label>

          <label className="space-y-1.5 sm:col-span-1">
            <span className="font-mono-technical text-[10px] font-bold uppercase text-app-text/60">
              Not (opsiyonel)
            </span>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Örn: X Kulübü için"
              className={inputClass}
              maxLength={120}
            />
          </label>

          <div className="sm:col-span-2">
            <button type="submit" disabled={busy} className={ADMIN_BTN_PRIMARY}>
              {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              Kod Oluştur
            </button>
          </div>
        </form>

        {lastCreated ? (
          <div className="mt-4 rounded border border-accent/30 bg-accent/5 p-3">
            <p className="font-mono-technical text-[10px] uppercase text-accent/80">
              Yeni kod
            </p>
            <p className="mt-1 break-all font-mono text-sm font-bold tracking-wider text-accent">
              {lastCreated}
            </p>
            <button
              type="button"
              onClick={() => handleCopy(lastCreated)}
              className="mt-2 inline-flex items-center gap-1.5 font-mono-technical text-[10px] uppercase text-accent/90 hover:text-accent"
            >
              <Copy className="size-3.5" aria-hidden />
              {copied ? 'Kopyalandı' : 'Kopyala'}
            </button>
          </div>
        ) : null}
      </ADMIN_FORM_CARD>

      {loading ? (
        <div className={ADMIN_EMPTY_STATE}>
          <Loader2 className="size-6 animate-spin text-accent/60" aria-hidden />
          <p className="font-mono-technical text-[10px] uppercase text-app-text/50">Yükleniyor…</p>
        </div>
      ) : rows.length === 0 ? (
        <div className={ADMIN_EMPTY_STATE}>
          <KeyRound className="size-8 text-app-text/25" aria-hidden />
          <p className="font-mono-technical text-[10px] uppercase text-app-text/50">
            Henüz erişim kodu yok
          </p>
        </div>
      ) : (
        <ADMIN_TABLE_WRAP>
          <table className={ADMIN_TABLE}>
            <thead className={ADMIN_TABLE_HEAD}>
              <tr>
                <th className={ADMIN_TABLE_TH}>Kod</th>
                <th className={ADMIN_TABLE_TH}>Plan</th>
                <th className={ADMIN_TABLE_TH}>Kullanım</th>
                <th className={ADMIN_TABLE_TH}>Durum</th>
                <th className={ADMIN_TABLE_TH}>Not</th>
                <th className={ADMIN_TABLE_TH}>Oluşturulma</th>
                <th className={ADMIN_TABLE_TH}>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className={ADMIN_TABLE_ROW}>
                  <td className={`${ADMIN_TABLE_TD} font-mono text-xs`}>{row.code}</td>
                  <td className={ADMIN_TABLE_TD}>{formatAccessCodePlanLabel(row)}</td>
                  <td className={ADMIN_TABLE_TD}>
                    {row.usedCount}/{row.maxUses}
                  </td>
                  <td className={ADMIN_TABLE_TD}>
                    <span className={`${ADMIN_BADGE} ${STATUS_TONE[row.status] ?? STATUS_TONE.active}`}>
                      {formatAccessCodeStatusLabel(row)}
                    </span>
                  </td>
                  <td className={`${ADMIN_TABLE_TD} max-w-[140px] truncate text-app-text/60`}>
                    {row.note || '—'}
                  </td>
                  <td className={`${ADMIN_TABLE_TD} text-app-text/60`}>
                    {formatAdminUserDate(row.createdAt)}
                  </td>
                  <td className={ADMIN_TABLE_TD}>
                    {row.status === 'revoked' ? (
                      <span className="font-mono-technical text-[10px] uppercase text-app-text/40">
                        —
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={revokingId === row.id}
                        onClick={() => handleRevoke(row)}
                        className={ADMIN_BTN_DANGER}
                      >
                        {revokingId === row.id ? (
                          <Loader2 className="size-3 animate-spin" aria-hidden />
                        ) : (
                          <ShieldOff className="size-3" aria-hidden />
                        )}
                        İptal
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ADMIN_TABLE_WRAP>
      )}
    </div>
  )
}
