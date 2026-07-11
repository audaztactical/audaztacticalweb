import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  Ban,
  ChevronDown,
  Loader2,
  MessageSquareWarning,
  ScanSearch,
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
  findGhostUserRecords,
  formatAccountStatusLabel,
  formatAdminUserDate,
  formatAdminUserDisplayName,
  formatMembershipLabel,
  isSafeGhostDeleteCandidate,
  subscribeUsersForAdmin,
  SUSPENSION_DURATION_OPTIONS,
  suspendUserAccount,
  unsuspendUserAccount,
} from '../../lib/firestoreAdminUsers'
import {
  formatFeedbackTimestamp,
  replyToSuspensionAppeal,
  subscribeAppealById,
  subscribePendingAppealsByUser,
} from '../../lib/firestoreSuspensionAppeals'
import {
  ADMIN_BADGE,
  ADMIN_BTN_DANGER,
  ADMIN_BTN_GHOST,
  ADMIN_BTN_PREVIEW,
  ADMIN_BTN_PRIMARY,
  ADMIN_EMPTY_STATE,
  ADMIN_TABLE,
  ADMIN_TABLE_HEAD,
  ADMIN_TABLE_ROW,
  ADMIN_TABLE_TD,
  ADMIN_TABLE_TH,
  ADMIN_TABLE_WRAP,
} from './adminUi'

/** @typedef {import('../../lib/firestoreAdminUsers').AdminUserRecord} AdminUserRecord */
/** @typedef {import('../../lib/firestoreSuspensionAppeals').SuspensionAppealRecord} SuspensionAppealRecord */

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
 * @param {AdminUserRecord} row
 */
function inferAdminUserProfileKind(row) {
  const hasUsername = Boolean(row.username?.trim())
  const hasEmail = Boolean(row.email?.trim())
  const hasCallsign = Boolean(row.callsign?.trim())
  const hasEnrolled = Boolean(row.enrolledAt)

  if (hasUsername && hasEnrolled) {
    return {
      kind: 'complete',
      label: 'Kayıt tamamlanmış',
      hint: hasEmail
        ? 'E-posta/şifre — registerOperatorProfile'
        : 'Profil oluşturulmuş (e-posta Firestore\'da boş)',
    }
  }
  if (hasEmail && !hasUsername) {
    return {
      kind: 'partial',
      label: 'Yarım profil',
      hint: 'Auth oturumu var; username/callsign atanmamış (kayıt yarım kalmış olabilir)',
    }
  }
  if (!hasUsername && !hasEmail && !hasCallsign) {
    return {
      kind: 'ghost',
      label: 'Hayalet belge',
      hint: 'Presence heartbeat veya ayar merge ile oluşmuş minimal users/{uid}. Anonymous auth yok.',
    }
  }
  return {
    kind: 'unknown',
    label: 'Eksik profil',
    hint: 'Standart kayıt akışı dışında oluşturulmuş olabilir',
  }
}

/**
 * @param {{
 *   row: AdminUserRecord
 *   isSelf: boolean
 *   open: boolean
 *   onToggle: () => void
 *   onClose: () => void
 * }} props
 */
function OperatorRowDetailPopover({ row, isSelf, open, onToggle, onClose }) {
  const rootRef = useRef(/** @type {HTMLDivElement | null} */ (null))
  const profile = inferAdminUserProfileKind(row)

  useEffect(() => {
    if (!open) return undefined
    const onDocClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(/** @type {Node} */ (e.target))) {
        onClose()
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open, onClose])

  return (
    <div ref={rootRef} className="relative shrink-0" data-operator-detail>
      <button
        type="button"
        aria-expanded={open}
        aria-label="Operatör detayları"
        onClick={onToggle}
        className={[
          'inline-flex size-6 items-center justify-center rounded border transition',
          open
            ? 'border-accent/45 bg-accent/10 text-accent'
            : 'border-white/10 text-app-text/45 hover:border-white/20 hover:text-app-text/70',
        ].join(' ')}
      >
        <ChevronDown
          className={['size-3.5 transition-transform', open ? 'rotate-180' : ''].join(' ')}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Operatör detay paneli"
          className="absolute left-0 top-full z-30 mt-1.5 w-[min(18rem,calc(100vw-2rem))] rounded-lg border border-white/12 bg-zinc-950/95 p-3 shadow-[0_12px_40px_-8px_rgba(0,0,0,0.85)] backdrop-blur-sm"
        >
          <p className="font-mono-technical text-[9px] font-bold uppercase tracking-wider text-accent/80">
            Operatör detayı
          </p>
          <dl className="mt-2 space-y-2 font-mono-technical text-[10px]">
            <div>
              <dt className="uppercase text-app-text/45">UID</dt>
              <dd className="mt-0.5 break-all text-app-text/80">{row.id}</dd>
            </div>
            <div>
              <dt className="uppercase text-app-text/45">Username</dt>
              <dd className="mt-0.5 text-app-text/80">{row.username ? `@${row.username}` : '—'}</dd>
            </div>
            <div>
              <dt className="uppercase text-app-text/45">Callsign</dt>
              <dd className="mt-0.5 text-app-text/80">{row.callsign.trim() || '—'}</dd>
            </div>
            <div>
              <dt className="uppercase text-app-text/45">Profil kaynağı</dt>
              <dd className="mt-0.5">
                <span
                  className={[
                    'inline-block rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider',
                    profile.kind === 'complete'
                      ? 'border-emerald-500/35 bg-emerald-950/25 text-emerald-300'
                      : profile.kind === 'ghost'
                        ? 'border-zinc-500/40 bg-zinc-900/50 text-zinc-400'
                        : 'border-amber-500/35 bg-amber-950/25 text-amber-300',
                  ].join(' ')}
                >
                  {profile.label}
                </span>
                <p className="mt-1 leading-relaxed text-app-text/55">{profile.hint}</p>
              </dd>
            </div>
            {isSelf ? (
              <div>
                <span className="inline-block rounded border border-amber-500/35 bg-amber-950/25 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-300">
                  Siz
                </span>
              </div>
            ) : null}
          </dl>
        </div>
      ) : null}
    </div>
  )
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
 * @param {{
 *   open: boolean
 *   appeal: SuspensionAppealRecord | null
 *   row: AdminUserRecord | null
 *   onClose: () => void
 *   onFeedback?: (type: 'ok' | 'err', text: string) => void
 * }} props
 */
function AppealViewModal({ open, appeal: initialAppeal, row, onClose, onFeedback }) {
  const { user } = useAuth()
  const [appeal, setAppeal] = useState(/** @type {SuspensionAppealRecord | null} */ (null))
  const [replyText, setReplyText] = useState('')
  const [editMode, setEditMode] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open || !initialAppeal?.id) {
      setAppeal(null)
      setReplyText('')
      setEditMode(false)
      return undefined
    }

    setAppeal(initialAppeal)
    setReplyText(initialAppeal.adminReply ?? '')
    setEditMode(false)

    const unsub = subscribeAppealById(initialAppeal.id, (next) => {
      if (next) setAppeal(next)
    })

    return unsub
  }, [open, initialAppeal])

  if (!open || !row || !appeal) return null

  const hasReply = Boolean(String(appeal.adminReply ?? '').trim())

  const handleSendReply = async () => {
    const body = replyText.trim()
    if (!body) return
    setBusy(true)
    try {
      await replyToSuspensionAppeal(appeal.id, {
        adminReply: body,
        repliedBy: user?.uid ?? '',
        repliedByEmail: user?.email ?? '',
        recipientId: row.id,
      })
      onFeedback?.('ok', 'Yanıt gönderildi ve kullanıcıya bildirildi.')
      setEditMode(false)
    } catch (err) {
      onFeedback?.('err', err instanceof Error ? err.message : 'Yanıt gönderilemedi.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ModalShell title={hasReply && !editMode ? 'İtiraz Yanıtlandı' : 'Bekleyen İtiraz'} onClose={onClose}>
      <p className="text-sm text-app-text/70">
        <strong className="text-app-text">{formatAdminUserDisplayName(row)}</strong>
        {row.email ? ` · ${row.email}` : ''}
      </p>
      {appeal.createdAt ? (
        <p className="mt-2 font-mono-technical text-[10px] uppercase tracking-wider text-app-text/50">
          Gönderim: {formatFeedbackTimestamp(appeal.createdAt)}
        </p>
      ) : null}
      {appeal.suspensionReasonSnapshot ? (
        <p className="mt-3 font-mono-technical text-[10px] text-orange-300/80">
          Askı sebebi (anlık): {appeal.suspensionReasonSnapshot}
        </p>
      ) : null}
      <div className="mt-4 rounded-lg border border-orange-500/30 bg-orange-950/20 px-4 py-3">
        <p className="font-mono-technical text-[10px] font-bold uppercase tracking-wider text-orange-400">
          İtiraz mesajı
        </p>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-app-text/90">{appeal.message}</p>
      </div>

      {hasReply && !editMode ? (
        <div className="mt-4 rounded-lg border border-accent/30 bg-accent/5 px-4 py-3">
          <p className="font-mono-technical text-[10px] font-bold uppercase tracking-wider text-accent">
            Gönderilen yanıt
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-app-text/90">{appeal.adminReply}</p>
          {appeal.repliedAt ? (
            <p className="mt-2 font-mono-technical text-[10px] text-app-text/50">
              {formatFeedbackTimestamp(appeal.repliedAt)}
              {appeal.repliedByEmail ? ` · ${appeal.repliedByEmail}` : ''}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => {
              setEditMode(true)
              setReplyText(appeal.adminReply)
            }}
            className="mt-3 rounded border border-white/15 px-3 py-1.5 font-mono-technical text-[10px] uppercase tracking-wider text-app-text/70 hover:bg-white/5"
          >
            Yanıtı Güncelle
          </button>
        </div>
      ) : (
        <div className="mt-4">
          <label className="font-mono-technical text-[10px] font-bold uppercase tracking-wider text-accent/80">
            Yanıt Yaz
          </label>
          <textarea
            rows={4}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            disabled={busy}
            placeholder="Kullanıcıya iletilecek yanıt…"
            className="mt-1.5 w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2.5 text-sm text-app-text placeholder:text-app-text/40 focus:border-accent/40 focus:outline-none disabled:opacity-50"
          />
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            {editMode ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setEditMode(false)
                  setReplyText(appeal.adminReply ?? '')
                }}
                className="rounded-lg border border-white/15 px-4 py-2 font-mono-technical text-[10px] uppercase tracking-wider text-app-text/70 hover:bg-white/5 disabled:opacity-50"
              >
                İptal
              </button>
            ) : null}
            <button
              type="button"
              disabled={busy || !replyText.trim()}
              onClick={() => void handleSendReply()}
              className="inline-flex items-center gap-2 rounded-lg border border-accent/45 bg-accent/15 px-4 py-2 font-mono-technical text-[10px] font-bold uppercase tracking-wider text-accent hover:bg-accent/25 disabled:opacity-50"
            >
              {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
              Yanıtı Gönder
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-white/15 px-4 py-2 font-mono-technical text-[10px] uppercase tracking-wider text-app-text/70 hover:bg-white/5"
        >
          Kapat
        </button>
      </div>
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
 * @param {{
 *   open: boolean
 *   candidates: AdminUserRecord[]
 *   busy: boolean
 *   onClose: () => void
 *   onFeedback?: (type: 'ok' | 'err', text: string) => void
 * }} props
 */
function GhostAccountsModal({ open, candidates, busy, onClose, onFeedback }) {
  const [selectedIds, setSelectedIds] = useState(/** @type {Set<string>} */ (new Set()))
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [result, setResult] = useState(/** @type {{ ok: number; fail: number; errors: string[] } | null} */ (null))

  useEffect(() => {
    if (!open) return
    setSelectedIds(new Set())
    setConfirmOpen(false)
    setDeleteBusy(false)
    setResult(null)
  }, [open, candidates])

  if (!open) return null

  const allSelected = candidates.length > 0 && selectedIds.size === candidates.length

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(candidates.map((c) => c.id)))
    }
  }

  const toggleOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectedList = candidates.filter((c) => selectedIds.has(c.id))

  const handleDeleteConfirmed = async () => {
    setDeleteBusy(true)
    let ok = 0
    let fail = 0
    /** @type {string[]} */
    const errors = []

    for (const row of selectedList) {
      if (!isSafeGhostDeleteCandidate(row)) {
        fail += 1
        errors.push(`${row.id.slice(0, 8)}… — güvenlik filtresi reddetti`)
        continue
      }
      try {
        await callAdminDeleteUser(row.id)
        ok += 1
      } catch (err) {
        fail += 1
        const msg = err instanceof Error ? err.message : 'Silinemedi'
        errors.push(`${row.id.slice(0, 8)}… — ${msg}`)
      }
    }

    setResult({ ok, fail, errors })
    setConfirmOpen(false)
    setDeleteBusy(false)
    setSelectedIds(new Set())
    onFeedback?.(fail === 0 ? 'ok' : 'err', `${ok} silindi, ${fail} hata.`)
  }

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-zinc-600/40 bg-zinc-950 p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ScanSearch className="size-5 text-zinc-400" aria-hidden />
            <h3 className="font-display text-lg font-bold uppercase tracking-wide text-app-text">
              Hayalet Hesap Taraması
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={deleteBusy || busy}
            className="rounded-lg border border-white/10 p-1.5 text-app-text/60 hover:text-app-text disabled:opacity-50"
            aria-label="Kapat"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        <p className="font-mono-technical text-[10px] uppercase leading-relaxed text-app-text/55">
          Önizleme modu — username, callsign, e-posta ve kayıt tarihi olmayan profiller.
          Silme yalnızca onay sonrası çalışır.
        </p>

        <div className={`${ADMIN_BADGE} mt-3 border-zinc-500/40 bg-zinc-900/50 text-zinc-300`}>
          {candidates.length} hayalet hesap bulundu
        </div>

        {result ? (
          <div className="mt-4 rounded-lg border border-white/10 bg-black/30 p-4">
            <p className="font-mono-technical text-sm text-app-text">
              <span className="text-emerald-300">{result.ok} başarılı</span>
              {' · '}
              <span className={result.fail ? 'text-red-300' : 'text-app-text/50'}>
                {result.fail} hata
              </span>
            </p>
            {result.errors.length ? (
              <ul className="mt-2 max-h-32 overflow-y-auto font-mono-technical text-[10px] text-red-300/90">
                {result.errors.map((line) => (
                  <li key={line} className="mt-1">
                    {line}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        {candidates.length === 0 ? (
          <div className={`${ADMIN_EMPTY_STATE} mt-4 min-h-[120px]`}>
            <p className="font-mono-technical text-[10px] uppercase text-app-text/50">
              Hayalet hesap bulunamadı
            </p>
          </div>
        ) : (
          <>
            <div className="mt-4 flex items-center justify-between gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 font-mono-technical text-[10px] uppercase text-app-text/70">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  disabled={deleteBusy || busy}
                  className="size-3.5 rounded border-white/20 accent-accent"
                />
                Tümünü seç ({candidates.length})
              </label>
              <span className="font-mono-technical text-[10px] text-app-text/45">
                {selectedIds.size} seçili
              </span>
            </div>

            <div className={`${ADMIN_TABLE_WRAP} mt-3 max-h-[40vh] overflow-y-auto`}>
              <table className={`${ADMIN_TABLE} font-mono-technical text-xs`}>
                <thead className={ADMIN_TABLE_HEAD}>
                  <tr>
                    <th className={`${ADMIN_TABLE_TH} w-10`} />
                    <th className={ADMIN_TABLE_TH}>UID</th>
                    <th className={ADMIN_TABLE_TH}>Son görülme</th>
                    <th className={ADMIN_TABLE_TH}>Kayıt</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((row) => (
                    <tr key={row.id} className={ADMIN_TABLE_ROW}>
                      <td className={ADMIN_TABLE_TD}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(row.id)}
                          onChange={() => toggleOne(row.id)}
                          disabled={deleteBusy || busy}
                          className="size-3.5 rounded border-white/20 accent-accent"
                          aria-label={`Seç: ${row.id}`}
                        />
                      </td>
                      <td className={`${ADMIN_TABLE_TD} font-mono text-[11px]`}>
                        {row.id}
                      </td>
                      <td className={`${ADMIN_TABLE_TD} text-app-text/60`}>
                        {formatAdminUserDate(row.lastSeenAt) || '—'}
                      </td>
                      <td className={`${ADMIN_TABLE_TD} text-app-text/60`}>
                        {formatAdminUserDate(row.enrolledAt) || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {!result && candidates.length > 0 ? (
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              disabled={deleteBusy || busy}
              onClick={onClose}
              className={ADMIN_BTN_GHOST}
            >
              Kapat
            </button>
            <button
              type="button"
              disabled={deleteBusy || busy || selectedIds.size === 0}
              onClick={() => setConfirmOpen(true)}
              className={ADMIN_BTN_DANGER}
            >
              <Trash2 className="size-3" aria-hidden />
              Seçilenleri Sil ({selectedIds.size})
            </button>
          </div>
        ) : (
          <div className="mt-4 flex justify-end">
            <button type="button" onClick={onClose} className={ADMIN_BTN_PRIMARY}>
              Kapat
            </button>
          </div>
        )}

        {confirmOpen ? (
          <div
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4"
            role="alertdialog"
            aria-modal="true"
            onClick={() => !deleteBusy && setConfirmOpen(false)}
          >
            <div
              className="w-full max-w-md rounded-xl border border-red-500/40 bg-zinc-950 p-5 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="flex items-start gap-2 text-sm text-app-text/80">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-400" aria-hidden />
                <span>
                  <strong className="text-app-text">{selectedList.length} hesap</strong> kalıcı
                  olarak silinecek. Firebase Auth ve Firestore kayıtları kaldırılır — bu işlem geri
                  alınamaz.
                </span>
              </p>
              <ModalActions
                busy={deleteBusy}
                confirmLabel="Kalıcı Olarak Sil"
                confirmTone="danger"
                confirmDisabled={selectedList.length === 0}
                onCancel={() => setConfirmOpen(false)}
                onConfirm={handleDeleteConfirmed}
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

/**
 * @param {{ onFeedback?: (type: 'ok' | 'err', text: string) => void; focusUserId?: string }} props
 */
export default function UsersManagementTable({ onFeedback, focusUserId = '' }) {
  const { user } = useAuth()
  const adminUid = user?.uid ?? ''

  const [rows, setRows] = useState(/** @type {AdminUserRecord[]} */ ([]))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (focusUserId) setQuery(focusUserId)
  }, [focusUserId])
  const [busy, setBusy] = useState(false)

  const [suspendTarget, setSuspendTarget] = useState(/** @type {AdminUserRecord | null} */ (null))
  const [membershipTarget, setMembershipTarget] = useState(/** @type {AdminUserRecord | null} */ (null))
  const [deleteTarget, setDeleteTarget] = useState(/** @type {AdminUserRecord | null} */ (null))
  const [pendingAppeals, setPendingAppeals] = useState(/** @type {Record<string, SuspensionAppealRecord>} */ ({}))
  const [appealView, setAppealView] = useState(
    /** @type {{ row: AdminUserRecord; appeal: SuspensionAppealRecord } | null} */ (null),
  )
  const [openDetailId, setOpenDetailId] = useState('')
  const [ghostModalOpen, setGhostModalOpen] = useState(false)
  const [ghostCandidates, setGhostCandidates] = useState(/** @type {AdminUserRecord[]} */ ([]))

  useEffect(() => {
    const unsub = subscribePendingAppealsByUser(setPendingAppeals)
    return unsub
  }, [])

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

  const handleScanGhosts = () => {
    const found = findGhostUserRecords(rows, adminUid)
    setGhostCandidates(found)
    setGhostModalOpen(true)
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
        <button
          type="button"
          disabled={busy}
          onClick={handleScanGhosts}
          className={ADMIN_BTN_PREVIEW}
        >
          <ScanSearch className="size-3.5" aria-hidden />
          Hayalet Hesapları Tara
        </button>
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
                    <td className={`${ADMIN_TABLE_TD} relative`}>
                      <div className="flex min-w-0 items-center gap-1.5">
                        <p className="min-w-0 truncate font-bold text-app-text">
                          {formatAdminUserDisplayName(row)}
                        </p>
                        <OperatorRowDetailPopover
                          row={row}
                          isSelf={self}
                          open={openDetailId === row.id}
                          onToggle={() =>
                            setOpenDetailId((prev) => (prev === row.id ? '' : row.id))
                          }
                          onClose={() => setOpenDetailId('')}
                        />
                      </div>
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
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={[
                            'inline-block rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                            STATUS_TONE[row.accountStatus] ?? STATUS_TONE.active,
                          ].join(' ')}
                        >
                          {formatAccountStatusLabel(row)}
                        </span>
                        {suspended && pendingAppeals[row.id] ? (
                          <button
                            type="button"
                            title="Bekleyen itiraz"
                            onClick={() =>
                              setAppealView({ row, appeal: pendingAppeals[row.id] })
                            }
                            className="inline-flex items-center gap-0.5 rounded border border-orange-500/40 bg-orange-950/30 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-orange-300 transition hover:bg-orange-950/50"
                          >
                            <MessageSquareWarning className="size-3" aria-hidden />
                            İtiraz
                          </button>
                        ) : null}
                      </div>
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

      <AppealViewModal
        open={Boolean(appealView)}
        appeal={appealView?.appeal ?? null}
        row={appealView?.row ?? null}
        onClose={() => setAppealView(null)}
        onFeedback={onFeedback}
      />

      <GhostAccountsModal
        open={ghostModalOpen}
        candidates={ghostCandidates}
        busy={busy}
        onClose={() => setGhostModalOpen(false)}
        onFeedback={onFeedback}
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
