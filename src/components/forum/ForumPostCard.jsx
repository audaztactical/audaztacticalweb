import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, Flag, MessageSquare, ThumbsUp, UserCheck, UserPlus } from 'lucide-react'
import OperatorAvatar from '../ui/OperatorAvatar'
import { emitFirebaseError } from '../../lib/firebaseErrorBus'
import {
  fetchForumAuthorProfile,
  formatForumRoleLabel,
  formatForumTimestamp,
  sendForumContactRequest,
  subscribeForumContactRequestStatus,
  subscribeForumPeerInContacts,
  toggleForumPostLike,
} from '../../lib/firestoreForum'

/** @typedef {import('../../lib/firestoreForum').ForumPost} ForumPost */
/** @typedef {import('../../lib/firestoreForum').ForumAuthorProfile} ForumAuthorProfile */

const CATEGORY_STYLES = {
  'SİLAH SİSTEMLERİ': 'text-amber-400 border-amber-500/40 bg-amber-950/20',
  'CQB & TAKTİK': 'text-lime-400 border-lime-500/40 bg-lime-950/20',
  'TCCC & MEDİKAL': 'text-red-400 border-red-500/40 bg-red-950/20',
  'GENEL OPERASYON': 'text-zinc-400 border-zinc-600/40 bg-zinc-900/40',
}

/**
 * @param {{ category: string }} props
 */
function CategoryBadge({ category }) {
  const style = CATEGORY_STYLES[category] ?? CATEGORY_STYLES['GENEL OPERASYON']
  return (
    <span
      className={[
        'inline-block rounded border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider',
        style,
      ].join(' ')}
    >
      {category}
    </span>
  )
}

/**
 * Brifing Odası gönderi kartı — mutabık, yazar profili ve irtibat isteği.
 *
 * @param {{
 *   post: ForumPost
 *   currentUid: string | null
 *   currentCallsign: string
 *   currentCallsign: string
 *   onOpen: () => void
 *   onReport?: () => void
 * }} props
 */
export default function ForumPostCard({ post, currentUid, currentCallsign, onOpen, onReport }) {
  const [author, setAuthor] = useState(/** @type {ForumAuthorProfile | null} */ (null))
  const [authorLoading, setAuthorLoading] = useState(true)
  const [likeBusy, setLikeBusy] = useState(false)
  const [contactBusy, setContactBusy] = useState(false)
  const [isFriendRequestSent, setIsFriendRequestSent] = useState(false)
  const [isAlreadyFriend, setIsAlreadyFriend] = useState(false)

  const authorUid = useMemo(
    () => String(author?.uid ?? post.authorId ?? '').trim(),
    [author?.uid, post.authorId],
  )

  const isOwnPost = !!currentUid && !!authorUid && currentUid === authorUid
  const liked = !!currentUid && post.likes.includes(currentUid)
  const likeCount = post.likes.length
  const profilePath = authorUid ? `/profil/${authorUid}` : '/profil'

  useEffect(() => {
    let cancelled = false
    setAuthorLoading(true)

    ;(async () => {
      try {
        const profile = await fetchForumAuthorProfile(post.authorId)
        if (!cancelled) setAuthor(profile)
      } catch (err) {
        if (!cancelled) emitFirebaseError(err)
      } finally {
        if (!cancelled) setAuthorLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [post.authorId])

  useEffect(() => {
    if (!currentUid || !authorUid || isOwnPost) {
      setIsAlreadyFriend(false)
      return undefined
    }

    const unsub = subscribeForumPeerInContacts(
      currentUid,
      authorUid,
      (isFriend) => setIsAlreadyFriend(isFriend),
      (err) => {
        console.error('[ForumPostCard] Tim rehberi durumu okunamadı:', err)
        setIsAlreadyFriend(false)
      },
    )

    return unsub
  }, [currentUid, authorUid, isOwnPost])

  useEffect(() => {
    if (!currentUid || !authorUid || isOwnPost || isAlreadyFriend) {
      setIsFriendRequestSent(false)
      return undefined
    }

    const unsub = subscribeForumContactRequestStatus(
      currentUid,
      authorUid,
      (pending) => setIsFriendRequestSent(pending),
      (err) => {
        console.error('[ForumPostCard] Arkadaşlık isteği durumu okunamadı:', err)
        setIsFriendRequestSent(false)
      },
    )

    return unsub
  }, [currentUid, authorUid, isOwnPost, isAlreadyFriend])

  const handleLike = useCallback(
    async (e) => {
      e.stopPropagation()
      if (!currentUid || likeBusy) return

      setLikeBusy(true)
      try {
        await toggleForumPostLike(post.id, currentUid)
      } catch (err) {
        emitFirebaseError(err)
      } finally {
        setLikeBusy(false)
      }
    },
    [currentUid, likeBusy, post.id],
  )

  const handleAddFriend = useCallback(
    async (e) => {
      e.stopPropagation()

      const targetUid = String(author?.uid ?? post.authorId ?? '').trim()
      if (!currentUid || !targetUid) {
        console.error('[ForumPostCard] Arkadaşlık isteği gönderilemedi: yazar UID eksik.', {
          currentUid,
          authorUid: targetUid,
          postId: post.id,
        })
        return
      }

      if (currentUid === targetUid || contactBusy || isFriendRequestSent || isAlreadyFriend) return

      setContactBusy(true)
      try {
        await sendForumContactRequest(currentUid, targetUid, currentCallsign)
        setIsFriendRequestSent(true)
      } catch (err) {
        const code =
          err && typeof err === 'object' && 'code' in err
            ? String(/** @type {{ code?: string }} */ (err).code)
            : ''

        if (code === 'already-exists') {
          setIsFriendRequestSent(true)
          return
        }

        console.error('[ForumPostCard] Arkadaşlık isteği gönderilemedi:', err)
        emitFirebaseError(err)
      } finally {
        setContactBusy(false)
      }
    },
    [author?.uid, contactBusy, currentCallsign, currentUid, isAlreadyFriend, isFriendRequestSent, post.authorId, post.id],
  )

  const contactLabel = isAlreadyFriend
    ? '[ ARKADAŞ ]'
    : isFriendRequestSent
      ? '[ İSTEK İLETİLDİ ]'
      : '[ İRTİBAT EKLE ]'

  const authorCallsign = author?.callsign ?? post.authorCallsign
  const authorRole = formatForumRoleLabel(author?.role)
  const authorRank = author?.rank ?? authorRole

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen()
        }
      }}
      className="w-full cursor-pointer rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 text-left transition-colors hover:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <Link
          to={profilePath}
          onClick={(e) => e.stopPropagation()}
          className="group flex min-w-0 items-center gap-3 rounded-md border border-transparent px-1 py-0.5 transition hover:border-amber-500/30 hover:bg-zinc-950/60 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
          aria-label={`${authorCallsign} operatör profiline git`}
        >
          {authorLoading ? (
            <div className="flex size-10 items-center justify-center rounded-sm border border-zinc-700 bg-zinc-950">
              <Loader2 className="size-4 animate-spin text-amber-500/60" aria-hidden />
            </div>
          ) : (
            <OperatorAvatar
              uid={authorUid}
              callsign={authorCallsign}
              username={author?.username}
              photoUrl={author?.photoURL}
              size="md"
              className="transition group-hover:border-amber-500/60 group-hover:text-amber-400"
            />
          )}
          <div className="min-w-0">
            <p className="truncate font-mono text-xs font-bold uppercase tracking-wide text-lime-400 transition group-hover:text-amber-400">
              {authorCallsign}
            </p>
            <p className="font-mono text-[10px] uppercase tracking-wider text-amber-500/90">
              {authorRole}
              <span className="mx-1.5 text-zinc-600">·</span>
              <span className="text-zinc-400 transition group-hover:text-zinc-300">{authorRank}</span>
            </p>
          </div>
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <CategoryBadge category={post.category} />
          <span className="font-mono text-[10px] text-zinc-500">{formatForumTimestamp(post.timestamp)}</span>
        </div>
      </div>

      <h3 className="font-mono text-sm font-bold uppercase tracking-wide text-zinc-100">{post.title}</h3>

      {post.content ? (
        <p className="mt-2 line-clamp-2 font-mono text-xs leading-relaxed text-zinc-400">{post.content}</p>
      ) : null}
      {post.imageUrl ? (
        <div className="mt-2 overflow-hidden rounded-sm border border-lime-500/20 bg-black/30">
          <img src={post.imageUrl} alt="" className="max-h-28 w-full object-cover" loading="lazy" decoding="async" />
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800/80 pt-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleLike}
            disabled={!currentUid || likeBusy}
            className={[
              'inline-flex items-center gap-1.5 rounded border px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest transition disabled:cursor-not-allowed disabled:opacity-40',
              liked
                ? 'border-lime-500/60 bg-lime-950/40 text-lime-400'
                : 'border-zinc-700 bg-zinc-950 text-zinc-400 hover:border-lime-500/40 hover:text-lime-400',
            ].join(' ')}
          >
            {likeBusy ? (
              <Loader2 className="size-3 animate-spin" aria-hidden />
            ) : (
              <ThumbsUp className="size-3" strokeWidth={2} aria-hidden />
            )}
            Mutabık · {likeCount}
          </button>

          <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-zinc-500">
            <MessageSquare className="size-3" strokeWidth={1.75} aria-hidden />
            {post.replyCount} yanıt
          </span>

          {currentUid && !isOwnPost && onReport ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onReport()
              }}
              className="inline-flex items-center gap-1.5 rounded border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500 transition hover:border-amber-500/40 hover:text-amber-400"
            >
              <Flag className="size-3" strokeWidth={2} aria-hidden />
              Şikayet et
            </button>
          ) : null}
        </div>

        {!isOwnPost ? (
          <button
            type="button"
            onClick={handleAddFriend}
            disabled={!currentUid || !authorUid || contactBusy || isFriendRequestSent || isAlreadyFriend}
            className={[
              'inline-flex items-center gap-1.5 rounded border px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest transition disabled:cursor-not-allowed',
              isAlreadyFriend
                ? 'border-lime-500/50 bg-lime-950/30 text-lime-400 opacity-90'
                : isFriendRequestSent
                  ? 'border-zinc-700 bg-zinc-950 text-zinc-500 opacity-70'
                  : 'border-amber-500/40 bg-amber-950/20 text-amber-400 hover:border-amber-500 hover:bg-amber-950/40 disabled:opacity-40',
            ].join(' ')}
          >
            {contactBusy ? (
              <Loader2 className="size-3 animate-spin" aria-hidden />
            ) : isAlreadyFriend ? (
              <UserCheck className="size-3" strokeWidth={2} aria-hidden />
            ) : (
              <UserPlus className="size-3" strokeWidth={2} aria-hidden />
            )}
            {contactLabel}
          </button>
        ) : null}
      </div>
    </article>
  )
}
