import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronLeft, Loader2, MessagesSquare, Plus, Send } from 'lucide-react'
import ForumPostCard from '../components/forum/ForumPostCard'
import PageShell from '../components/layout/PageShell'
import { useAuth } from '../context/AuthContext'
import { emitFirebaseError } from '../lib/firebaseErrorBus'
import {
  FORUM_CATEGORIES,
  createForumPost,
  createForumReply,
  formatForumTimestamp,
  fetchForumPostById,
  subscribeForumPosts,
  subscribeForumReplies,
} from '../lib/firestoreForum'

/** @typedef {import('../lib/firestoreForum').ForumPost} ForumPost */
/** @typedef {import('../lib/firestoreForum').ForumReply} ForumReply */
/** @typedef {import('../lib/firestoreForum').ForumCategory} ForumCategory */

/** @param {string} title */
function normalizeForumTitle(title) {
  return String(title ?? '').trim().toLowerCase()
}

/**
 * @param {ForumPost[]} posts
 * @param {string} title
 * @returns {ForumPost | undefined}
 */
function findForumPostByTitle(posts, title) {
  const needle = normalizeForumTitle(title)
  if (!needle) return undefined

  const exact = posts.find((p) => normalizeForumTitle(p.title) === needle)
  if (exact) return exact

  return posts.find((p) => {
    const hay = normalizeForumTitle(p.title)
    return hay.includes(needle) || needle.includes(hay)
  })
}

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
    <span className={['inline-block rounded border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider', style].join(' ')}>
      {category}
    </span>
  )
}

/**
 * @param {{
 *   post: ForumPost
 *   uid: string | null
 *   callsign: string
 *   onBack: () => void
 * }} props
 */
function ForumThreadView({ post, uid, callsign, onBack }) {
  const [replies, setReplies] = useState(/** @type {ForumReply[]} */ ([]))
  const [loading, setLoading] = useState(true)
  const [replyDraft, setReplyDraft] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setLoading(true)
    const unsub = subscribeForumReplies(
      post.id,
      (rows) => {
        setReplies(rows)
        setLoading(false)
      },
      (err) => {
        emitFirebaseError(err)
        setLoading(false)
      },
    )
    return unsub
  }, [post.id])

  const handleReply = async (e) => {
    e.preventDefault()
    if (!uid || !replyDraft.trim() || submitting) return

    setSubmitting(true)
    try {
      await createForumReply(post.id, {
        content: replyDraft.trim(),
        authorId: uid,
        authorCallsign: callsign,
      })
      setReplyDraft('')
    } catch (err) {
      emitFirebaseError(err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500 transition hover:text-lime-400"
      >
        <ChevronLeft className="size-3.5" strokeWidth={2} aria-hidden />
        [ &lt; MERKEZE DÖN ]
      </button>

      <article className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <CategoryBadge category={post.category} />
          <span className="font-mono text-[10px] text-zinc-500">{formatForumTimestamp(post.timestamp)}</span>
        </div>
        <h2 className="font-mono text-lg font-bold uppercase tracking-wide text-zinc-100">{post.title}</h2>
        <p className="mt-2 font-mono text-xs text-lime-500">{post.authorCallsign}</p>
        <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">{post.content}</p>
      </article>

      <section className="mt-6" aria-label="Yanıtlar">
        <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-zinc-500">
          [ YANITLAR ] · {post.replyCount}
        </p>

        {loading ? (
          <p className="flex items-center gap-2 font-mono text-xs text-zinc-500">
            <Loader2 className="size-3 animate-spin" aria-hidden />
            Yanıtlar yükleniyor…
          </p>
        ) : replies.length === 0 ? (
          <p className="rounded border border-zinc-800 bg-zinc-950/40 px-4 py-6 text-center font-mono text-xs text-zinc-500">
            Henüz yanıt yok. İlk brifing notunu ekle.
          </p>
        ) : (
          <ul className="space-y-3">
            {replies.map((reply) => (
              <li key={reply.id} className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
                <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-wider">
                  <span className="font-bold text-lime-400">{reply.authorCallsign}</span>
                  <span className="text-zinc-500">{formatForumTimestamp(reply.timestamp)}</span>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">{reply.content}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <form onSubmit={handleReply} className="mt-6 rounded-lg border border-zinc-700 bg-zinc-900 p-4">
        <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500">[ YANIT EKLE ]</p>
        <textarea
          value={replyDraft}
          onChange={(e) => setReplyDraft(e.target.value)}
          rows={3}
          maxLength={2000}
          disabled={!uid || submitting}
          placeholder="Brifing notunu yaz…"
          className="w-full resize-y rounded border border-zinc-800 bg-zinc-950 px-3 py-2.5 font-mono text-sm text-zinc-300 placeholder:text-zinc-600 focus:border-lime-500/40 focus:outline-none focus:ring-1 focus:ring-lime-500/30 disabled:opacity-40"
        />
        <div className="mt-3 flex justify-end">
          <button
            type="submit"
            disabled={!uid || !replyDraft.trim() || submitting}
            className="inline-flex items-center gap-2 rounded border border-lime-500/40 bg-lime-950/20 px-4 py-2 font-mono text-xs font-bold uppercase tracking-widest text-lime-400 transition hover:border-lime-500 hover:bg-lime-950/40 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" strokeWidth={1.75} aria-hidden />}
            GÖNDER
          </button>
        </div>
      </form>
    </div>
  )
}

export default function Forum() {
  const { user, userData } = useAuth()
  const uid = user?.uid ?? null
  const callsign = (userData?.callsign || user?.displayName || 'OPERATÖR').trim()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const postIdFromUrl = searchParams.get('post')?.trim() ?? ''
  const postIdFromState = String(/** @type {{ forumPostId?: string } | null} */ (location.state)?.forumPostId ?? '').trim()
  const postTitleFromState = String(/** @type {{ forumPostTitle?: string } | null} */ (location.state)?.forumPostTitle ?? '').trim()
  const postTargetId = postIdFromUrl || postIdFromState

  const [posts, setPosts] = useState(/** @type {ForumPost[]} */ ([]))
  const [loading, setLoading] = useState(true)
  const [listenError, setListenError] = useState(/** @type {string | null} */ (null))

  const [activePost, setActivePost] = useState(/** @type {ForumPost | null} */ (null))
  const [showNewForm, setShowNewForm] = useState(false)

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState(/** @type {ForumCategory} */ ('GENEL OPERASYON'))
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setLoading(true)
    const unsub = subscribeForumPosts(
      (rows) => {
        setPosts(rows)
        setListenError(null)
        setLoading(false)
        setActivePost((prev) => {
          if (!prev) return prev
          return rows.find((p) => p.id === prev.id) ?? prev
        })
      },
      (err) => {
        emitFirebaseError(err)
        setListenError(err instanceof Error ? err.message : 'Forum yüklenemedi.')
        setLoading(false)
      },
    )
    return unsub
  }, [])

  const clearForumDeepLinkState = useCallback(
    (/** @type {string} */ postId) => {
      if (!postIdFromState && !postTitleFromState) return
      navigate(postId ? `/forum?post=${encodeURIComponent(postId)}` : '/forum', {
        replace: true,
        state: {},
      })
    },
    [navigate, postIdFromState, postTitleFromState],
  )

  const openPostById = useCallback(
    (/** @type {ForumPost} */ post) => {
      setActivePost(post)
      setSearchParams({ post: post.id }, { replace: true })
      clearForumDeepLinkState(post.id)
    },
    [setSearchParams, clearForumDeepLinkState],
  )

  useEffect(() => {
    if (!postTargetId && !postTitleFromState) return

    const openByTitle = () => {
      if (!postTitleFromState || loading) return false
      const foundByTitle = findForumPostByTitle(posts, postTitleFromState)
      if (!foundByTitle) return false
      openPostById(foundByTitle)
      return true
    }

    if (postTargetId) {
      const found = posts.find((p) => p.id === postTargetId)
      if (found) {
        openPostById(found)
        return undefined
      }

      if (loading) return undefined

      let cancelled = false
      ;(async () => {
        try {
          const remote = await fetchForumPostById(postTargetId)
          if (cancelled) return
          if (remote) {
            openPostById(remote)
            return
          }
          openByTitle()
        } catch (err) {
          if (!cancelled) {
            emitFirebaseError(err)
            openByTitle()
          }
        }
      })()

      return () => {
        cancelled = true
      }
    }

    openByTitle()
    return undefined
  }, [postTargetId, postTitleFromState, posts, loading, openPostById, location.key])

  const openPost = useCallback(
    (/** @type {ForumPost} */ post) => {
      openPostById(post)
    },
    [openPostById],
  )

  const closePost = useCallback(() => {
    setActivePost(null)
    setSearchParams({}, { replace: true })
    navigate('/forum', { replace: true, state: {} })
  }, [setSearchParams, navigate])

  const handleCreatePost = useCallback(
    async (e) => {
      e.preventDefault()
      if (!uid || !title.trim() || !content.trim() || submitting) return

      setSubmitting(true)
      try {
        await createForumPost({
          title: title.trim(),
          content: content.trim(),
          category,
          authorId: uid,
          authorCallsign: callsign,
        })
        setTitle('')
        setContent('')
        setCategory('GENEL OPERASYON')
        setShowNewForm(false)
      } catch (err) {
        emitFirebaseError(err)
      } finally {
        setSubmitting(false)
      }
    },
    [uid, title, content, category, callsign, submitting],
  )

  return (
    <PageShell
      title="Brifing Odası"
      subtitle="Operasyonel tartışma ve taktik brifing forumu."
      headerAction={
        <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-zinc-500">
          <MessagesSquare className="size-3.5 text-lime-500/70" strokeWidth={1.75} aria-hidden />
          BRF-03 · FORUM
        </span>
      }
    >
      {activePost ? (
        <ForumThreadView post={activePost} uid={uid} callsign={callsign} onBack={closePost} />
      ) : (
        <>
          <div className="mb-6">
            <button
              type="button"
              onClick={() => setShowNewForm((v) => !v)}
              className={[
                'inline-flex items-center gap-2 rounded border px-4 py-2 font-mono text-xs font-bold uppercase tracking-widest transition',
                showNewForm
                  ? 'border-lime-500/60 bg-lime-950/30 text-lime-400'
                  : 'border-zinc-700 text-zinc-400 hover:border-lime-500/40 hover:text-lime-400',
              ].join(' ')}
            >
              <Plus className="size-4" strokeWidth={2} aria-hidden />
              [ YENİ BRİFİNG BAŞLAT ]
            </button>
          </div>

          {showNewForm ? (
            <form onSubmit={handleCreatePost} className="mb-6 rounded-lg border border-zinc-700 bg-zinc-900 p-4">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
                placeholder="[ BRİFİNG BAŞLIĞI ]"
                className="mb-3 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2.5 font-mono text-sm text-zinc-300 placeholder:text-zinc-600 focus:border-lime-500/40 focus:outline-none focus:ring-1 focus:ring-lime-500/30"
              />

              <div className="mb-3 flex flex-wrap gap-2">
                {FORUM_CATEGORIES.map((cat) => (
                  <label
                    key={cat}
                    className={[
                      'cursor-pointer rounded border px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-widest transition',
                      category === cat
                        ? 'border-lime-500/60 bg-lime-950/30 text-lime-400'
                        : 'border-zinc-700 bg-zinc-950 text-zinc-500 hover:border-zinc-600',
                    ].join(' ')}
                  >
                    <input
                      type="radio"
                      name="forum-category"
                      value={cat}
                      checked={category === cat}
                      onChange={() => setCategory(cat)}
                      className="sr-only"
                    />
                    {cat}
                  </label>
                ))}
              </div>

              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={5}
                maxLength={4000}
                placeholder="[ BRİFİNG İÇERİĞİ ] — Tartışma konusunu detaylandır…"
                className="w-full resize-y rounded border border-zinc-800 bg-zinc-950 px-3 py-2.5 font-mono text-sm text-zinc-300 placeholder:text-zinc-600 focus:border-lime-500/40 focus:outline-none focus:ring-1 focus:ring-lime-500/30"
              />

              <div className="mt-3 flex justify-end">
                <button
                  type="submit"
                  disabled={!uid || !title.trim() || !content.trim() || submitting}
                  className="inline-flex items-center gap-2 rounded border border-lime-500/40 bg-lime-950/20 px-4 py-2 font-mono text-xs font-bold uppercase tracking-widest text-lime-400 transition hover:border-lime-500 hover:bg-lime-950/40 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {submitting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" strokeWidth={1.75} aria-hidden />}
                  [ İLET ]
                </button>
              </div>
            </form>
          ) : null}

          <section aria-label="Forum başlıkları">
            <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-zinc-500">
              [ AKTİF BRİFİNGLER ] · {posts.length} BAŞLIK
            </p>

            {loading ? (
              <div className="flex items-center justify-center gap-2 py-16 font-mono text-xs text-zinc-500">
                <Loader2 className="size-4 animate-spin text-lime-500/60" aria-hidden />
                Forum senkronize ediliyor…
              </div>
            ) : listenError ? (
              <p className="rounded border border-red-900/50 bg-red-950/20 px-4 py-3 font-mono text-xs text-red-300">{listenError}</p>
            ) : posts.length === 0 ? (
              <p className="rounded border border-zinc-800 bg-zinc-950/40 px-4 py-10 text-center font-mono text-xs text-zinc-500">
                Henüz brifing başlığı yok. İlk tartışmayı başlat.
              </p>
            ) : (
              <ul className="space-y-3">
                {posts.map((post) => (
                  <li key={post.id}>
                    <ForumPostCard
                      post={post}
                      currentUid={uid}
                      currentCallsign={callsign}
                      onOpen={() => openPost(post)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </PageShell>
  )
}
