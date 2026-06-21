import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Ban,
  Loader2,
  Search,
  ShieldOff,
  Trash2,
  UserCog,
  Users,
  X,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { callAdminDeleteUser } from '../../lib/cloudFunctions'
import {
  downgradeUserMembership,
  formatAccountStatusLabel,
  formatAdminUserDate,
  formatAdminUserDisplayName,
  formatMembershipLabel,
  subscribeUsersForAdmin,
  SUSPENSION_DURATION_OPTIONS,
  suspendUserAccount,
  unsuspendUserAccount,
} from '../../lib/firestoreAdminUsers'
import {
  ADMIN_EMPTY_STATE,
  ADMIN_TABLE,
  ADMIN_TABLE_HEAD,
  ADMIN_TABLE_ROW,
  ADMIN_TABLE_TD,
  ADMIN_TABLE_TH,
  ADMIN_TABLE_WRAP,
} from './adminUi'

/** @typedef {import('../../lib/firestoreAdminUsers').AdminUserRecord} AdminUserRecord */

const ROLE_TONE = {
  admin: 'border-amber-500/40 bg-amber-950/30 text-amber-300',
  instructor: 'border-sky-500/35 bg-sky-950/25 text-sky-300',
  premium_member: 'border-accent/40 bg-accent/10 text-accent',
  member: 'border-zinc-600/50 bg-zinc-900/40 text-zinc-400',
}

const STATUS_TONE = {
  active: 'border-emerald-500/35 bg-emerald-950/25 text-emerald-300',
  suspended: 'border-orange-500/40 bg-orange-950/30 text-orange-300',
  locked: 'border-red-500/40 bg-red-950/30 text-red-300',
}

/**
 * @param {{
 *   open: boolean
 *   row: AdminUserRecord | null
 *   onClose: () => void
 *   onConfirm: (opts: { days: number | null; reason: string }) => Promise<void>
 *   busy: boolean
 * }} props
 */
function SuspendModal({ open, row, onClose, onConfirm, busy }) {
  const [durationId, setDurationId] = useState('7d')
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (!open) return
    setDurationId('7d')
    setReason('')
  }, [open, row?.id])

  if (!open || !row) return null

  const selected = SUSPENSION_DURATION_OPTIONS.find((o) => o.id === durationId) ?? SUSPENSION_DURATION_OPTIONS[2]

  return (
    <ModalShell title="Süreli Erişim Engeli" onClose={onClose}>
      <p className="text-sm text-app-text/70">
        <strong className="text-app-text">{formatAdminUserDisplayName(row)}</strong>
        {row.email ? ` (${row.email})` : ''} hesabına erişim askıya alınacak.
      </p>
      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="font-mono-technical text-[10px] font-bold uppercase tracking-wider text-accent/80">
            Süre
          </span>
          <select
            value={durationId}
            onChange={(e) => setDurationId(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2.5 text-sm text-app-text"
          >
            {SUSPENSION_DURATION_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id} className="bg-zinc-950">
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="font-mono-technical text-[10px] font-bold uppercase tracking-wider text-accent/80">
            Sebep (opsiyonel)
          </span>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Askı gerekçesi — kullanıcıya gösterilir"
            className="mt-1.5 w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2.5 text-sm text-app-text placeholder:text-app-text/40"
          />
        </label>
      </div>
      <ModalActions
        busy={busy}
        confirmLabel="Askıya Al"
        confirmTone="danger"
        onCancel={onClose}
        onConfirm={() => onConfirm({ days: selected.days, reason })}
      />
    </ModalShell>
  )
}

/**
 * @param {{
 *   open: boolean
 *   row: AdminUserRecord | null
 *   onClose: () => void
 *   onDowngrade: () => Promise<void>
 *   onDelete: () => void
 *   busy: boolean
 * }} props
 */
function MembershipModal({ open, row, onClose, onDowngrade, onDelete, busy }) {
  if (!open || !row) return null

  return (
    <ModalShell title="Üyelik Yönetimi" onClose={onClose}>
      <p className="text-sm text-app-text/70">
        <strong className="text-app-text">{formatAdminUserDisplayName(row)}</strong>
        {' · '}
        Mevcut: {formatMembershipLabel(row)}
      </p>
      <div className="mt-5 space-y-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => void onDowngrade()}
          className="flex w-full items-start gap-3 rounded-lg border border-amber-500/35 bg-amber-950/20 px-4 py-3 text-left transition hover:bg-amber-950/35 disabled:opacity-50"
        >
          <ShieldOff className="mt-0.5 size-4 shrink-0 text-amber-400" aria-hidden />
          <span>
            <span className="block font-display text-sm font-bold uppercase tracking-wide text-amber-300">
              Sadece Düşür
            </span>
            <span className="mt-0.5 block text-xs text-app-text/55">
              Premium alanları temizlenir, rol ücretsiz üyeye (member) döner.
            </span>
          </span>
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onDelete}
          className="flex w-full items-start gap-3 rounded-lg border border-red-500/40 bg-red-950/20 px-4 py-3 text-left transition hover:bg-red-950/35 disabled:opacity-50"
        >
          <Trash2 className="mt-0.5 size-4 shrink-0 text-red-400" aria-hidden />
          <span>
            <span className="block font-display text-sm font-bold uppercase tracking-wide text-red-400">
              Hesabı Tamamen Sil
            </span>
            <span className="mt-0.5 block text-xs text-app-text/55">
              Firebase Auth + Firestore profili kalıcı olarak silinir. Geri alınamaz.
            </span>
          </span>
        </button>
      </div>
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-white/15 px-4 py-2 font-mono-technical text-[10px] uppercase tracking-wider text-app-text/70 hover:bg-white/5"
        >
          İptal
        </button>
      </div>
    </ModalShell>
  )
}

/**
 * @param {{
 *   open: boolean
 *   row: AdminUserRecord | null
 *   onClose: () => void
 *   onConfirm: () => Promise<void>
 *   busy: boolean
 * }} props
 */
function DeleteConfirmModal({ open, row, onClose, onConfirm, busy }) {
  const [emailConfirm, setEmailConfirm] = useState('')
  const [ack, setAck] = useState(false)

  useEffect(() => {
    if (!open) return
    setEmailConfirm('')
    setAck(false)
  }, [open, row?.id])

  if (!open || !row) return null

  const targetEmail = row.email.trim().toLowerCase()
  const emailOk = !targetEmail || emailConfirm.trim().toLowerCase() === targetEmail
  const canDelete = ack && emailOk

  return (
    <ModalShell title="Hesabı Kalıcı Sil" onClose={onClose} danger>
      <div className="rounded-lg border border-red-500/40 bg-red-950/25 px-4 py-3">
        <p className="flex items-center gap-2 font-mono-technical text-[10px] font-bold uppercase tracking-wider text-red-400">
          <AlertTriangle className="size-4" aria-hidden />
          Bu işlem geri alınamaz
        </p>
        <p className="mt-2 text-sm text-red-200/90">
          {formatAdminUserDisplayName(row)} hesabı ve tüm ilişkili veriler kalıcı olarak silinecek.
        </p>
      </div>
      {targetEmail ? (
        <label className="mt-4 block">
          <span className="font-mono-technical text-[10px] font-bold uppercase tracking-wider text-app-text/55">
            Onay için e-postayı yazın: <span className="text-accent">{row.email}</span>
          </span>
          <input
            type="email"
            value={emailConfirm}
            onChange={(e) => setEmailConfirm(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2.5 text-sm text-app-text"
            autoComplete="off"
          />
        </label>
      ) : null}
      <label className="mt-4 flex cursor-pointer items-start gap-2 text-sm text-app-text/80">
        <input
          type="checkbox"
          checked={ack}
          onChange={(e) => setAck(e.target.checked)}
          className="mt-1 size-4 rounded border-white/20 bg-black/50 text-red-500"
        />
        <span>Kalıcı silme işlemini anladım ve onaylıyorum.</span>
      </label>
      <ModalActions
        busy={busy}
        confirmLabel="Hesabı Sil"
        confirmTone="danger"
        confirmDisabled={!canDelete}
        onCancel={onClose}
        onConfirm={onConfirm}
      />
    </ModalShell>
  )
}

/**
 * @param {{ title: string; onClose: () => void; danger?: boolean; children: import('react').ReactNode }} props
 */
function ModalShell({ title, onClose, danger = false, children }) {
  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className={[
          'max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border bg-zinc-950 p-5 shadow-2xl',
          danger ? 'border-red-500/40' : 'border-accent/30',
        ].join(' ')}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="font-display text-lg font-bold uppercase tracking-wide text-app-text">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 p-1.5 text-app-text/60 hover:text-app-text"
            aria-label="Kapat"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

/**
 * @param {{
 *   busy: boolean
 *   confirmLabel: string
 *   confirmTone?: 'danger' | 'primary'
 *   confirmDisabled?: boolean
 *   onCancel: () => void
 *   onConfirm: () => void | Promise<void>
 * }} props
 */
function ModalActions({ busy, confirmLabel, confirmTone = 'primary', confirmDisabled = false, onCancel, onConfirm }) {
  return (
    <div className="mt-6 flex flex-wrap justify-end gap-2">
      <button
        type="button"
        onClick={onCancel}
        disabled={busy}
        className="rounded-lg border border-white/15 px-4 py-2 font-mono-technical text-[10px] uppercase tracking-wider text-app-text/70 hover:bg-white/5 disabled:opacity-50"
      >
        İptal
      </button>
      <button
        type="button"
        disabled={busy || confirmDisabled}
        onClick={() => void onConfirm()}
        className={[
          'inline-flex items-center gap-2 rounded-lg border px-4 py-2 font-mono-technical text-[10px] font-bold uppercase tracking-wider disabled:opacity-50',
          confirmTone === 'danger'
            ? 'border-red-500/45 bg-red-950/40 text-red-300 hover:bg-red-950/55'
            : 'border-accent/45 bg-accent/15 text-accent hover:bg-accent/25',
        ].join(' ')}
      >
        {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
        {confirmLabel}
      </button>
    </div>
  )
}

/**
 * @param {{ onFeedback?: (type: 'ok' | 'err', text: string) => void }} props
 */
export default function UsersManagementTable({ onFeedback }) {
  const { user } = useAuth()
  const adminUid = user?.uid ?? ''

  const [rows, setRows] = useState(/** @type {AdminUserRecord[]} */ ([]))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)

  const [suspendTarget, setSuspendTarget] = useState(/** @type {AdminUserRecord | null} */ (null))
  const [membershipTarget, setMembershipTarget] = useState(/** @type {AdminUserRecord | null} */ (null))
  const [deleteTarget, setDeleteTarget] = useState(/** @type {AdminUserRecord | null} */ (null))

  useEffect(() => {
    setLoading(true)
    setError('')
    const unsub = subscribeUsersForAdmin(
      (next) => {
        setRows(next)
        setLoading(false)
      },
      (err) => {
        const message = err instanceof Error ? err.message : 'Kullanıcılar yüklenemedi.'
        setError(message)
        setLoading(false)
        onFeedback?.('err', message)
      },
    )
    return unsub
  }, [onFeedback])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((row) => {
      const hay = [
        row.email,
        row.callsign,
        row.username,
        formatAdminUserDisplayName(row),
        row.id,
      ]
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [rows, query])

  const isSelf = (/** @type {AdminUserRecord} */ row) => row.id === adminUid

  const isSuspendedRow = (/** @type {AdminUserRecord} */ row) => row.accountStatus === 'suspended'

  const handleSuspend = async (opts) => {
    if (!suspendTarget) return
    setBusy(true)
    try {
      await suspendUserAccount(suspendTarget.id, opts)
      onFeedback?.('ok', 'Hesap askıya alındı.')
      setSuspendTarget(null)
    } catch (err) {
      onFeedback?.('err', err instanceof Error ? err.message : 'Askıya alma başarısız.')
    } finally {
      setBusy(false)
    }
  }

  const handleUnsuspend = async (/** @type {AdminUserRecord} */ row) => {
    setBusy(true)
    try {
      await unsuspendUserAccount(row.id)
      onFeedback?.('ok', 'Engel kaldırıldı.')
    } catch (err) {
      onFeedback?.('err', err instanceof Error ? err.message : 'Engel kaldırılamadı.')
    } finally {
      setBusy(false)
    }
  }

  const handleDowngrade = async () => {
    if (!membershipTarget) return
    setBusy(true)
    try {
      await downgradeUserMembership(membershipTarget.id)
      onFeedback?.('ok', 'Üyelik ücretsiz seviyeye düşürüldü.')
      setMembershipTarget(null)
    } catch (err) {
      onFeedback?.('err', err instanceof Error ? err.message : 'Düşürme başarısız.')
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setBusy(true)
    try {
      await callAdminDeleteUser(deleteTarget.id)
      onFeedback?.('ok', 'Hesap kalıcı olarak silindi.')
      setDeleteTarget(null)
      setMembershipTarget(null)
    } catch (err) {
      onFeedback?.('err', err instanceof Error ? err.message : 'Silme başarısız.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center gap-2 font-mono-technical text-sm text-app-text/55">
        <Loader2 className="size-4 animate-spin text-accent" aria-hidden />
        Kullanıcılar yükleniyor…
      </div>
    )
  }

  if (error) {
    return (
      <p className="rounded-lg border border-red-500/30 bg-red-950/20 px-4 py-3 font-mono-technical text-sm text-red-300">
        {error}
      </p>
    )
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-app-text/40"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="İsim veya e-posta ara…"
            className="w-full rounded-lg border border-white/15 bg-black/40 py-2.5 pl-10 pr-3 font-mono-technical text-sm text-app-text placeholder:text-app-text/40 focus:border-accent/40 focus:outline-none focus:ring-1 focus:ring-accent/25"
          />
        </div>
        <span className="font-mono-technical text-[10px] uppercase tracking-wider text-app-text/50">
          {filtered.length} / {rows.length} operatör
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className={ADMIN_EMPTY_STATE}>
          <Users className="size-8 text-app-text/45" strokeWidth={1.25} aria-hidden />
          <p className="font-mono-technical text-sm text-app-text/55">
            {query.trim() ? 'Arama sonucu bulunamadı.' : 'Henüz kullanıcı kaydı yok.'}
          </p>
        </div>
      ) : (
        <div className={ADMIN_TABLE_WRAP}>
          <table className={`${ADMIN_TABLE} font-mono-technical text-xs`}>
            <thead className={ADMIN_TABLE_HEAD}>
              <tr>
                <th className={ADMIN_TABLE_TH}>Operatör</th>
                <th className={ADMIN_TABLE_TH}>E-posta</th>
                <th className={ADMIN_TABLE_TH}>Rol</th>
                <th className={ADMIN_TABLE_TH}>Hesap</th>
                <th className={ADMIN_TABLE_TH}>Üyelik</th>
                <th className={ADMIN_TABLE_TH}>Kayıt</th>
                <th className={`${ADMIN_TABLE_TH} text-right`}>Aksiyon</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const self = isSelf(row)
                const suspended = isSuspendedRow(row)
                return (
                  <tr key={row.id} className={ADMIN_TABLE_ROW}>
                    <td className={ADMIN_TABLE_TD}>
                      <p className="font-bold text-app-text">{formatAdminUserDisplayName(row)}</p>
                      {row.username ? (
                        <p className="mt-0.5 text-[10px] text-accent/70">@{row.username}</p>
                      ) : null}
                      {self ? (
                        <span className="mt-1 inline-block rounded border border-amber-500/35 bg-amber-950/25 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-300">
                          Siz
                        </span>
                      ) : null}
                    </td>
                    <td className={`${ADMIN_TABLE_TD} max-w-[180px] truncate text-app-text/70`} title={row.email}>
                      {row.email || '—'}
                    </td>
                    <td className={ADMIN_TABLE_TD}>
                      <span
                        className={[
                          'inline-block rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                          ROLE_TONE[row.role] ?? ROLE_TONE.member,
                        ].join(' ')}
                      >
                        {row.role}
                      </span>
                    </td>
                    <td className={ADMIN_TABLE_TD}>
                      <span
                        className={[
                          'inline-block rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                          STATUS_TONE[row.accountStatus] ?? STATUS_TONE.active,
                        ].join(' ')}
                      >
                        {formatAccountStatusLabel(row)}
                      </span>
                    </td>
                    <td className={ADMIN_TABLE_TD}>{formatMembershipLabel(row)}</td>
                    <td className={`${ADMIN_TABLE_TD} whitespace-nowrap tabular-nums text-app-text/60`}>
                      {formatAdminUserDate(row.enrolledAt)}
                    </td>
                    <td className={`${ADMIN_TABLE_TD} text-right`}>
                      {self ? (
                        <span className="text-[10px] uppercase tracking-wider text-app-text/40">—</span>
                      ) : (
                        <div className="flex flex-wrap justify-end gap-1">
                          {suspended ? (
                            <ActionBtn
                              label="Engeli Kaldır"
                              icon={ShieldOff}
                              tone="accent"
                              disabled={busy}
                              onClick={() => void handleUnsuspend(row)}
                            />
                          ) : (
                            <ActionBtn
                              label="Süreli Engelle"
                              icon={Ban}
                              tone="warn"
                              disabled={busy}
                              onClick={() => setSuspendTarget(row)}
                            />
                          )}
                          <ActionBtn
                            label="Üyeliği Yönet"
                            icon={UserCog}
                            tone="neutral"
                            disabled={busy}
                            onClick={() => setMembershipTarget(row)}
                          />
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <SuspendModal
        open={Boolean(suspendTarget)}
        row={suspendTarget}
        onClose={() => setSuspendTarget(null)}
        onConfirm={handleSuspend}
        busy={busy}
      />

      <MembershipModal
        open={Boolean(membershipTarget) && !deleteTarget}
        row={membershipTarget}
        onClose={() => setMembershipTarget(null)}
        onDowngrade={handleDowngrade}
        onDelete={() => membershipTarget && setDeleteTarget(membershipTarget)}
        busy={busy}
      />

      <DeleteConfirmModal
        open={Boolean(deleteTarget)}
        row={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        busy={busy}
      />
    </>
  )
}

/**
 * @param {{
 *   label: string
 *   icon: import('lucide-react').LucideIcon
 *   tone: 'accent' | 'warn' | 'neutral'
 *   disabled?: boolean
 *   onClick: () => void
 * }} props
 */
function ActionBtn({ label, icon, tone, disabled, onClick }) {
  const IconComponent = icon
  const tones = {
    accent: 'border-accent/35 text-accent hover:bg-accent/10',
    warn: 'border-orange-500/35 text-orange-300 hover:bg-orange-950/30',
    neutral: 'border-white/15 text-app-text/70 hover:bg-white/5',
  }
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        'inline-flex items-center gap-1 rounded border px-2 py-1 text-[9px] font-bold uppercase tracking-wider transition disabled:opacity-50',
        tones[tone],
      ].join(' ')}
    >
      <IconComponent className="size-3" aria-hidden />
      {label}
    </button>
  )
}
