import { Fragment, useEffect, useMemo, useState } from 'react'
import {
  Ban,
  Flag,
  Loader2,
  MessagesSquare,
  ScanSearch,
  ShieldOff,
  Trash2,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import ForumImageBlock from '../common/ForumImageBlock'
import { isFirebaseConfigured } from '../../lib/firebase'
import {
  formatForumTimestamp,
  subscribeForumPosts,
  subscribeForumReplies,
} from '../../lib/firestoreForum'
import {
  FORUM_REPORT_REASONS,
  FORUM_REPORT_STATUS_LABELS,
  FORUM_REPORT_STATUS_VALUES,
  fetchForumReportTargetContent,
  formatForumReportTimestamp,
  groupForumReportsByTarget,
  softRemoveForumPost,
  softRemoveForumReply,
  subscribeForumReportsForAdmin,
  updateForumReportStatus,
  updateForumReportsForTarget,
} from '../../lib/firestoreForumReports'
import {
  ADMIN_BADGE,
  ADMIN_BTN_DANGER,
  ADMIN_BTN_GHOST,
  ADMIN_BTN_PRIMARY,
  ADMIN_EMPTY_STATE,
  ADMIN_TABLE,
  ADMIN_TABLE_HEAD,
  ADMIN_TABLE_ROW,
  ADMIN_TABLE_TD,
  ADMIN_TABLE_TH,
  ADMIN_TABLE_WRAP,
} from './adminUi'

/** @typedef {import('../../lib/firestoreForum').ForumPost} ForumPost */
/** @typedef {import('../../lib/firestoreForum').ForumReply} ForumReply */
/** @typedef {import('../../lib/firestoreForumReports').ForumReportRecord} ForumReportRecord */
/** @typedef {import('../../lib/firestoreForumReports').ForumReportStatus} ForumReportStatus */

const STATUS_TONE = {
  pending: 'border-amber-500/40 bg-amber-950/25 text-amber-300',
  reviewed: 'border-sky-500/35 bg-sky-950/25 text-sky-300',
  dismissed: 'border-zinc-600/50 bg-zinc-900/50 text-zinc-400',
}

/**
 * @param {string} text
 * @param {number} max
 */
function truncate(text, max = 160) {
  const t = String(text ?? '').trim()
  if (t.length <= max) return t
  return `${t.slice(0, max)}…`
}

/**
 * @param {{
 *   group: ReturnType<typeof groupForumReportsByTarget>[number]
 *   content: Awaited<ReturnType<typeof fetchForumReportTargetContent>>
 * }} props
 */
function TargetContentPreview({ group, content }) {
  if (!content) {
    return (
      <p className="rounded border border-red-500/25 bg-red-950/15 px-3 py-2 text-xs text-red-300">
        İçerik bulunamadı veya silinmiş olabilir.
      </p>
    )
  }

  if (content.type === 'post' && content.post) {
    const post = content.post
    return (
      <div className="space-y-2 rounded border border-white/10 bg-black/35 p-3">
        <div className="flex flex-wrap items-center gap-2 font-mono-technical text-[10px] uppercase">
          <span className="font-bold text-lime-300">{post.authorCallsign}</span>
          <span className="text-app-text/45">{formatForumTimestamp(post.timestamp)}</span>
          {post.removed ? (
            <span className="rounded border border-red-500/35 bg-red-950/25 px-1.5 py-0.5 text-red-300">
              Kaldırıldı
            </span>
          ) : null}
        </div>
        <p className="font-mono-technical text-xs font-bold uppercase text-app-text">{post.title}</p>
        {post.content ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-app-text/75">{post.content}</p>
        ) : null}
        <ForumImageBlock url={post.imageUrl} alt={post.title} />
      </div>
    )
  }

  if (content.type === 'comment' && content.reply) {
    const reply = content.reply
    return (
      <div className="space-y-2 rounded border border-white/10 bg-black/35 p-3">
        <p className="font-mono-technical text-[9px] font-bold uppercase tracking-wider text-app-text/45">
          Bağlı gönderi: {content.post?.title ?? group.parentPostId}
        </p>
        <div className="flex flex-wrap items-center gap-2 font-mono-technical text-[10px] uppercase">
          <span className="font-bold text-lime-300">{reply.authorCallsign}</span>
          <span className="text-app-text/45">{formatForumTimestamp(reply.timestamp)}</span>
          {reply.removed ? (
            <span className="rounded border border-red-500/35 bg-red-950/25 px-1.5 py-0.5 text-red-300">
              Kaldırıldı
            </span>
          ) : null}
        </div>
        {reply.content ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-app-text/75">{reply.content}</p>
        ) : null}
        <ForumImageBlock url={reply.imageUrl} />
      </div>
    )
  }

  return (
    <p className="text-xs text-app-text/45">Yorum içeriği yüklenemedi.</p>
  )
}

/**
 * @param {{
 *   group: ReturnType<typeof groupForumReportsByTarget>[number]
 *   reports: ForumReportRecord[]
 *   adminUid: string
 *   busyKey: string
 *   onBusyKey: (key: string) => void
 *   onFeedback?: (type: 'ok' | 'err', message: string) => void
 *   onNavigateToUser?: (uid: string) => void
 * }} props
 */
function QueueReportCard({ group, reports, adminUid, busyKey, onBusyKey, onFeedback, onNavigateToUser }) {
  const [content, setContent] = useState(
    /** @type {Awaited<ReturnType<typeof fetchForumReportTargetContent>>} */ (null),
  )
  const [contentLoading, setContentLoading] = useState(true)

  const key = `${group.targetType}:${group.parentPostId ?? ''}:${group.targetId}`

  useEffect(() => {
    let cancelled = false
    setContentLoading(true)
    fetchForumReportTargetContent(group.reports[0])
      .then((next) => {
        if (!cancelled) setContent(next)
      })
      .catch(() => {
        if (!cancelled) setContent(null)
      })
      .finally(() => {
        if (!cancelled) setContentLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [group.reports, group.targetType, group.targetId, group.parentPostId])

  const authorUid =
    content?.type === 'post'
      ? content.post?.authorId
      : content?.type === 'comment'
        ? content.reply?.authorId
        : ''
  const busy = busyKey === key

  const handleRemoveContent = async () => {
    if (!adminUid) return
    const ok = window.confirm('Bu içeriği kaldırmak istediğinize emin misiniz? (Soft delete — audit için saklanır)')
    if (!ok) return

    onBusyKey(key)
    try {
      const reason = group.reports.map((r) => FORUM_REPORT_REASONS[r.reason]).join(', ')
      if (group.targetType === 'post') {
        await softRemoveForumPost(group.targetId, adminUid, reason)
      } else if (group.parentPostId) {
        await softRemoveForumReply(group.parentPostId, group.targetId, adminUid, reason)
      }
      await updateForumReportsForTarget(
        group.targetType,
        group.targetId,
        group.parentPostId,
        'reviewed',
        reports,
      )
      onFeedback?.('ok', 'İçerik kaldırıldı, şikayetler incelendi olarak işaretlendi.')
    } catch (err) {
      onFeedback?.('err', err instanceof Error ? err.message : 'Kaldırma başarısız.')
    } finally {
      onBusyKey('')
    }
  }

  const handleDismissReports = async () => {
    onBusyKey(key)
    try {
      await updateForumReportsForTarget(
        group.targetType,
        group.targetId,
        group.parentPostId,
        'dismissed',
        reports,
      )
      onFeedback?.('ok', 'Şikayet reddedildi — içerik korundu.')
    } catch (err) {
      onFeedback?.('err', err instanceof Error ? err.message : 'Güncelleme başarısız.')
    } finally {
      onBusyKey('')
    }
  }

  return (
    <article className="rounded-xl border border-violet-500/20 bg-black/35 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono-technical text-[10px] font-bold uppercase tracking-wider text-violet-300">
            {group.targetType === 'post' ? 'Gönderi şikayeti' : 'Yorum şikayeti'}
            <span className="ml-2 text-app-text/45">· {group.reportCount} şikayet</span>
            {group.pendingCount > 0 ? (
              <span className="ml-2 text-amber-300">({group.pendingCount} bekleyen)</span>
            ) : null}
          </p>
          <p className="mt-1 font-mono-technical text-[9px] uppercase text-app-text/45">
            Hedef ID: {group.targetId}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={busy} onClick={handleRemoveContent} className={ADMIN_BTN_DANGER}>
            {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Trash2 className="size-3.5" aria-hidden />}
            İçeriği kaldır
          </button>
          <button type="button" disabled={busy} onClick={handleDismissReports} className={ADMIN_BTN_GHOST}>
            <ShieldOff className="size-3.5" aria-hidden />
            Şikayeti reddet
          </button>
          {authorUid && onNavigateToUser ? (
            <button type="button" onClick={() => onNavigateToUser(authorUid)} className={ADMIN_BTN_PRIMARY}>
              <Ban className="size-3.5" aria-hidden />
              Kullanıcıyı askıya al
            </button>
          ) : null}
        </div>
      </div>

      {contentLoading ? (
        <p className="flex items-center gap-2 text-xs text-app-text/55">
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
          İçerik önizlemesi yükleniyor…
        </p>
      ) : (
        <TargetContentPreview group={group} content={content} />
      )}

      <div className={`${ADMIN_TABLE_WRAP} mt-4`}>
        <table className={`${ADMIN_TABLE} font-mono-technical text-xs`}>
          <thead className={ADMIN_TABLE_HEAD}>
            <tr>
              <th className={ADMIN_TABLE_TH}>Tarih</th>
              <th className={ADMIN_TABLE_TH}>Şikayet eden</th>
              <th className={ADMIN_TABLE_TH}>Sebep</th>
              <th className={ADMIN_TABLE_TH}>Durum</th>
              <th className={ADMIN_TABLE_TH}>Açıklama</th>
            </tr>
          </thead>
          <tbody>
            {group.reports.map((report) => (
              <tr key={report.id} className={ADMIN_TABLE_ROW}>
                <td className={`${ADMIN_TABLE_TD} whitespace-nowrap tabular-nums text-app-text/70`}>
                  {formatForumReportTimestamp(report.createdAt)}
                </td>
                <td className={ADMIN_TABLE_TD}>
                  <span className="font-bold text-app-text/85">{report.reporterCallsign}</span>
                  <span className="mt-0.5 block text-[10px] text-app-text/45">{report.reporterId.slice(0, 8)}…</span>
                </td>
                <td className={ADMIN_TABLE_TD}>{FORUM_REPORT_REASONS[report.reason]}</td>
                <td className={ADMIN_TABLE_TD}>
                  <select
                    value={report.status}
                    onChange={(e) =>
                      updateForumReportStatus(
                        report.id,
                        /** @type {ForumReportStatus} */ (e.target.value),
                      )
                        .then(() => onFeedback?.('ok', 'Durum güncellendi.'))
                        .catch((err) =>
                          onFeedback?.('err', err instanceof Error ? err.message : 'Güncellenemedi.'),
                        )
                    }
                    className="rounded border border-white/10 bg-black/40 px-2 py-1 text-[10px] uppercase text-app-text"
                  >
                    {FORUM_REPORT_STATUS_VALUES.map((s) => (
                      <option key={s} value={s}>
                        {FORUM_REPORT_STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </td>
                <td className={`${ADMIN_TABLE_TD} max-w-xs text-app-text/70`}>
                  {truncate(report.description, 120) || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  )
}

/**
 * @param {{
 *   onFeedback?: (type: 'ok' | 'err', message: string) => void
 *   onNavigateToUser?: (uid: string) => void
 * }} props
 */
export default function ForumModerationTable({ onFeedback, onNavigateToUser }) {
  const { user } = useAuth()
  const adminUid = user?.uid ?? ''

  const [view, setView] = useState(/** @type {'queue' | 'browse'} */ ('queue'))
  const [statusFilter, setStatusFilter] = useState(/** @type {'pending' | 'all'} */ ('pending'))
  const [reports, setReports] = useState(/** @type {ForumReportRecord[]} */ ([]))
  const [posts, setPosts] = useState(/** @type {ForumPost[]} */ ([]))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyKey, setBusyKey] = useState('')
  const [browseQuery, setBrowseQuery] = useState('')
  const [expandedPostId, setExpandedPostId] = useState(/** @type {string | null} */ (null))
  const [expandedReplies, setExpandedReplies] = useState(/** @type {ForumReply[]} */ ([]))

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setReports([])
      setLoading(false)
      setError('Firebase yapılandırılmadı.')
      return undefined
    }

    setLoading(true)
    setError('')

    const unsub = subscribeForumReportsForAdmin(
      (next) => {
        setReports(next)
        setLoading(false)
      },
      (err) => {
        const code = err && typeof err === 'object' && 'code' in err ? String(err.code) : ''
        const message =
          code === 'permission-denied'
            ? 'Şikayet listesi için Firestore kuralları güncel değil veya admin yetkisi eksik. npm run deploy-backend çalıştırın.'
            : err instanceof Error
              ? err.message
              : 'Şikayetler yüklenemedi.'
        setError(message)
        setLoading(false)
      },
    )

    return unsub
  }, [onFeedback])

  useEffect(() => {
    if (view !== 'browse') return undefined

    const unsub = subscribeForumPosts(
      (rows) => setPosts(rows),
      (err) => onFeedback?.('err', err instanceof Error ? err.message : 'Forum yüklenemedi.'),
      { includeRemoved: true },
    )
    return unsub
  }, [view, onFeedback])

  useEffect(() => {
    if (!expandedPostId) {
      setExpandedReplies([])
      return undefined
    }

    const unsub = subscribeForumReplies(
      expandedPostId,
      (rows) => setExpandedReplies(rows),
      () => setExpandedReplies([]),
      { includeRemoved: true },
    )
    return unsub
  }, [expandedPostId])

  const filteredReports = useMemo(() => {
    if (statusFilter === 'all') return reports
    return reports.filter((r) => r.status === 'pending')
  }, [reports, statusFilter])

  const groupedQueue = useMemo(() => groupForumReportsByTarget(filteredReports), [filteredReports])

  const filteredPosts = useMemo(() => {
    const q = browseQuery.trim().toLowerCase()
    if (!q) return posts
    return posts.filter((p) => {
      const hay = [p.title, p.content, p.authorCallsign, p.category, p.id].join(' ').toLowerCase()
      return hay.includes(q)
    })
  }, [posts, browseQuery])

  /**
   * @param {ForumPost} post
   */
  const handleBrowseRemovePost = async (post) => {
    if (!adminUid) return
    const ok = window.confirm(`"${post.title}" gönderisini kaldırmak istediğinize emin misiniz?`)
    if (!ok) return
    setBusyKey(`browse-post-${post.id}`)
    try {
      await softRemoveForumPost(post.id, adminUid, 'Admin tarama — manuel kaldırma')
      onFeedback?.('ok', 'Gönderi kaldırıldı.')
    } catch (err) {
      onFeedback?.('err', err instanceof Error ? err.message : 'Kaldırma başarısız.')
    } finally {
      setBusyKey('')
    }
  }

  /**
   * @param {string} postId
   * @param {ForumReply} reply
   */
  const handleBrowseRemoveReply = async (postId, reply) => {
    if (!adminUid) return
    const ok = window.confirm('Bu yorumu kaldırmak istediğinize emin misiniz?')
    if (!ok) return
    setBusyKey(`browse-reply-${reply.id}`)
    try {
      await softRemoveForumReply(postId, reply.id, adminUid, 'Admin tarama — manuel kaldırma')
      onFeedback?.('ok', 'Yorum kaldırıldı.')
    } catch (err) {
      onFeedback?.('err', err instanceof Error ? err.message : 'Kaldırma başarısız.')
    } finally {
      setBusyKey('')
    }
  }

  const viewBtn = (id, label, icon) => {
    const Icon = icon
    const active = view === id
    return (
      <button
        type="button"
        onClick={() => setView(id)}
        className={[
          'inline-flex items-center gap-2 rounded border px-3 py-2 font-mono-technical text-[10px] font-bold uppercase tracking-wider transition',
          active
            ? 'border-violet-500/50 bg-violet-950/30 text-violet-300'
            : 'border-white/10 text-app-text/55 hover:border-violet-500/30 hover:text-violet-200',
        ].join(' ')}
      >
        <Icon className="size-3.5" aria-hidden />
        {label}
      </button>
    )
  }

  if (loading && view === 'queue') {
    return (
      <div className="flex min-h-[240px] items-center justify-center gap-2 font-mono-technical text-sm text-app-text/55">
        <Loader2 className="size-4 animate-spin text-violet-400" aria-hidden />
        Şikayet kuyruğu yükleniyor…
      </div>
    )
  }

  if (error && view === 'queue') {
    return (
      <p className="rounded-lg border border-red-500/30 bg-red-950/20 px-4 py-3 font-mono-technical text-sm text-red-300">
        {error}
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {viewBtn('queue', 'Şikayet kuyruğu', Flag)}
        {viewBtn('browse', 'Tüm gönderiler / yorumlar', ScanSearch)}
      </div>

      {view === 'queue' ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'pending', label: 'Bekleyen' },
              { id: 'all', label: 'Tüm durumlar' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setStatusFilter(/** @type {'pending' | 'all'} */ (opt.id))}
                className={[
                  'rounded border px-2.5 py-1 font-mono-technical text-[10px] font-bold uppercase tracking-wider',
                  statusFilter === opt.id
                    ? 'border-violet-500/45 bg-violet-950/25 text-violet-300'
                    : 'border-white/10 text-app-text/50 hover:border-violet-500/25',
                ].join(' ')}
              >
                {opt.label}
              </button>
            ))}
            {FORUM_REPORT_STATUS_VALUES.map((status) => (
              <span
                key={status}
                className={[
                  'rounded border px-2 py-0.5 font-mono-technical text-[9px] font-bold uppercase',
                  STATUS_TONE[status],
                ].join(' ')}
              >
                {FORUM_REPORT_STATUS_LABELS[status]}: {reports.filter((r) => r.status === status).length}
              </span>
            ))}
          </div>

          {groupedQueue.length === 0 ? (
            <div className={ADMIN_EMPTY_STATE}>
              <Flag className="size-8 text-app-text/45" strokeWidth={1.25} aria-hidden />
              <p className="font-mono-technical text-sm font-bold uppercase tracking-wider text-app-text/55">
                {statusFilter === 'pending' ? 'Bekleyen şikayet yok' : 'Şikayet kaydı yok'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {groupedQueue.map((group) => {
                const key = `${group.targetType}:${group.parentPostId ?? ''}:${group.targetId}`
                return (
                  <QueueReportCard
                    key={key}
                    group={group}
                    reports={reports}
                    adminUid={adminUid}
                    busyKey={busyKey}
                    onBusyKey={setBusyKey}
                    onFeedback={onFeedback}
                    onNavigateToUser={onNavigateToUser}
                  />
                )
              })}
            </div>
          )}
        </>
      ) : (
        <>
          <label className="block max-w-md space-y-1">
            <span className="font-mono-technical text-[10px] font-bold uppercase text-app-text/55">Ara</span>
            <input
              type="search"
              value={browseQuery}
              onChange={(e) => setBrowseQuery(e.target.value)}
              placeholder="Başlık, içerik, callsign…"
              className="w-full rounded border border-white/10 bg-black/40 px-3 py-2 font-mono-technical text-xs text-app-text outline-none focus:border-violet-500/40"
            />
          </label>

          <div className={ADMIN_TABLE_WRAP}>
            <table className={`${ADMIN_TABLE} font-mono-technical text-xs`}>
              <thead className={ADMIN_TABLE_HEAD}>
                <tr>
                  <th className={ADMIN_TABLE_TH}>Tarih</th>
                  <th className={ADMIN_TABLE_TH}>Yazar</th>
                  <th className={ADMIN_TABLE_TH}>Başlık / içerik</th>
                  <th className={ADMIN_TABLE_TH}>Durum</th>
                  <th className={ADMIN_TABLE_TH}>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {filteredPosts.map((post) => (
                  <Fragment key={post.id}>
                    <tr className={ADMIN_TABLE_ROW}>
                      <td className={`${ADMIN_TABLE_TD} whitespace-nowrap tabular-nums text-app-text/70`}>
                        {formatForumTimestamp(post.timestamp)}
                      </td>
                      <td className={ADMIN_TABLE_TD}>
                        <span className="font-bold text-app-text/85">{post.authorCallsign}</span>
                        <button
                          type="button"
                          onClick={() => onNavigateToUser?.(post.authorId)}
                          className="mt-1 block text-[10px] text-violet-300 hover:underline"
                        >
                          UID: {post.authorId.slice(0, 10)}…
                        </button>
                      </td>
                      <td className={`${ADMIN_TABLE_TD} max-w-md`}>
                        <p className="font-bold uppercase text-app-text">{post.title}</p>
                        <p className="mt-1 text-app-text/65">{truncate(post.content, 120)}</p>
                      </td>
                      <td className={ADMIN_TABLE_TD}>
                        {post.removed ? (
                          <span className={`${ADMIN_BADGE} border-red-500/35 bg-red-950/25 text-red-300`}>Kaldırıldı</span>
                        ) : (
                          <span className={`${ADMIN_BADGE} border-emerald-500/35 bg-emerald-950/25 text-emerald-300`}>Aktif</span>
                        )}
                      </td>
                      <td className={ADMIN_TABLE_TD}>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setExpandedPostId((prev) => (prev === post.id ? null : post.id))}
                            className={ADMIN_BTN_GHOST}
                          >
                            <MessagesSquare className="size-3.5" aria-hidden />
                            Yorumlar ({post.replyCount})
                          </button>
                          {!post.removed ? (
                            <button
                              type="button"
                              disabled={busyKey === `browse-post-${post.id}`}
                              onClick={() => handleBrowseRemovePost(post)}
                              className={ADMIN_BTN_DANGER}
                            >
                              Kaldır
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                    {expandedPostId === post.id ? (
                      <tr className={ADMIN_TABLE_ROW}>
                        <td colSpan={5} className={ADMIN_TABLE_TD}>
                          <div className="space-y-2 border-l-2 border-violet-500/25 pl-3">
                            {expandedReplies.length === 0 ? (
                              <p className="text-app-text/45">Yorum yok.</p>
                            ) : (
                              expandedReplies.map((reply) => (
                                <div
                                  key={reply.id}
                                  className="rounded border border-white/10 bg-black/30 p-3"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="font-mono-technical text-[10px] uppercase">
                                      <span className="font-bold text-lime-300">{reply.authorCallsign}</span>
                                      <span className="ml-2 text-app-text/45">
                                        {formatForumTimestamp(reply.timestamp)}
                                      </span>
                                      {reply.removed ? (
                                        <span className="ml-2 text-red-300">[Kaldırıldı]</span>
                                      ) : null}
                                    </p>
                                    <div className="flex gap-2">
                                      <button
                                        type="button"
                                        onClick={() => onNavigateToUser?.(reply.authorId)}
                                        className={ADMIN_BTN_GHOST}
                                      >
                                        Askıya al
                                      </button>
                                      {!reply.removed ? (
                                        <button
                                          type="button"
                                          disabled={busyKey === `browse-reply-${reply.id}`}
                                          onClick={() => handleBrowseRemoveReply(post.id, reply)}
                                          className={ADMIN_BTN_DANGER}
                                        >
                                          Kaldır
                                        </button>
                                      ) : null}
                                    </div>
                                  </div>
                                  {reply.content ? (
                                    <p className="mt-2 whitespace-pre-wrap text-sm text-app-text/75">{reply.content}</p>
                                  ) : null}
                                </div>
                              ))
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
