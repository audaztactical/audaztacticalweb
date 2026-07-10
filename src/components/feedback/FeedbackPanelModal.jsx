import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ImagePlus, Loader2, Send, Trash2, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useFeedbackPanelOptional } from '../../context/FeedbackPanelContext'
import { emitFirebaseError } from '../../lib/firebaseErrorBus'
import { MAX_FEEDBACK_IMAGES, uploadFeedbackImage } from '../../lib/feedbackMedia'
import {
  STORAGE_ERROR_CODES,
  formatStorageErrorDisplay,
} from '../../services/storageService'
import {
  OPERATOR_FEEDBACK_TYPE_LABELS,
  OPERATOR_FEEDBACK_TYPES,
  submitOperatorFeedback,
} from '../../lib/firestoreFeedback'

/** @typedef {(typeof OPERATOR_FEEDBACK_TYPES)[number]} OperatorFeedbackType */

const inputClass =
  'mt-1.5 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-lime-500/50 focus:ring-1 focus:ring-lime-500/30 disabled:cursor-not-allowed disabled:opacity-50'

const labelClass = 'block text-[10px] font-bold uppercase tracking-wider text-zinc-500'

/**
 * @typedef {{ id: string; file: File; previewUrl: string }} PendingImage
 */

export default function FeedbackPanelModal() {
  const { t } = useTranslation('common')
  const ctx = useFeedbackPanelOptional()
  const { user, userData } = useAuth()
  const fileInputRef = useRef(/** @type {HTMLInputElement | null} */ (null))

  const [type, setType] = useState(/** @type {OperatorFeedbackType} */ ('suggestion'))
  const [fullName, setFullName] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [pendingImages, setPendingImages] = useState(/** @type {PendingImage[]} */ ([]))
  const [busy, setBusy] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(/** @type {number | null} */ (null))
  const [error, setError] = useState(/** @type {string | null} */ (null))

  const open = Boolean(ctx?.panelOpen)

  useEffect(() => {
    if (!open) return
    const prefilled =
      [userData?.callsign, userData?.username].filter(Boolean).join(' · ') ||
      user?.displayName ||
      ''
    setFullName(prefilled.trim())
    setSubject('')
    setMessage('')
    setType('suggestion')
    setPendingImages([])
    setBusy(false)
    setUploadProgress(null)
    setError(null)
  }, [open, user?.displayName, userData?.callsign, userData?.username])

  useEffect(() => {
    if (open) return undefined
    setPendingImages((prev) => {
      prev.forEach((img) => URL.revokeObjectURL(img.previewUrl))
      return []
    })
    return undefined
  }, [open])

  const revokeAndRemove = useCallback((/** @type {string} */ id) => {
    setPendingImages((prev) => {
      const target = prev.find((p) => p.id === id)
      if (target) URL.revokeObjectURL(target.previewUrl)
      return prev.filter((p) => p.id !== id)
    })
  }, [])

  const handleFiles = (/** @type {FileList | null} */ fileList) => {
    if (!fileList?.length) return
    const slots = MAX_FEEDBACK_IMAGES - pendingImages.length
    if (slots <= 0) return

    const next = [...pendingImages]
    for (const file of Array.from(fileList).slice(0, slots)) {
      if (!file.type.startsWith('image/')) continue
      next.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        previewUrl: URL.createObjectURL(file),
      })
    }
    setPendingImages(next)
  }

  const handleSubmit = async (/** @type {import('react').FormEvent} */ e) => {
    e.preventDefault()
    if (!user?.uid || !ctx) return

    setBusy(true)
    setError(null)
    setUploadProgress(null)

    try {
      const imageUrls = []
      for (let i = 0; i < pendingImages.length; i++) {
        setUploadProgress(Math.round(((i + 0.05) / pendingImages.length) * 100))
        const url = await uploadFeedbackImage(pendingImages[i].file, user.uid, (pct) => {
          const base = (i / pendingImages.length) * 100
          const slice = 100 / pendingImages.length
          setUploadProgress(Math.min(99, Math.round(base + (pct / 100) * slice)))
        })
        imageUrls.push(url)
      }
      setUploadProgress(100)

      await submitOperatorFeedback({
        type,
        fullName,
        subject,
        message,
        imageUrls,
        userId: user.uid,
        userEmail: user.email ?? userData?.email ?? '',
        callsign: userData?.callsign ?? user.displayName ?? '',
      })

      pendingImages.forEach((img) => URL.revokeObjectURL(img.previewUrl))
      setPendingImages([])
      setSubject('')
      setMessage('')
      ctx.pushToast(t('feedback.success'))
      ctx.closePanel()
    } catch (err) {
      emitFirebaseError(err)
      const audaz =
        err && typeof err === 'object' && '__audazCode' in err
          ? String(/** @type {{ __audazCode?: string }} */ (err).__audazCode ?? '')
          : ''
      const code =
        err && typeof err === 'object' && 'code' in err
          ? String(/** @type {{ code?: string }} */ (err).code ?? '')
          : ''
      const message = err instanceof Error ? String(err.message ?? '').trim() : ''
      const isStorage =
        STORAGE_ERROR_CODES.has(audaz) ||
        STORAGE_ERROR_CODES.has(message) ||
        code.startsWith('storage/') ||
        code === 'upload-busy'
      setError(isStorage ? formatStorageErrorDisplay(err) : t('feedback.submitFailed'))
    } finally {
      setBusy(false)
      setUploadProgress(null)
    }
  }

  if (!ctx || !open) return null

  const canAddImages = pendingImages.length < MAX_FEEDBACK_IMAGES

  return (
    <div
      className="fixed inset-0 z-[85] flex items-end justify-center bg-black/75 p-3 font-mono backdrop-blur-sm sm:items-center sm:p-4"
      role="presentation"
      onClick={ctx.closePanel}
    >
      <div
        className="flex max-h-[min(94dvh,calc(100dvh-2rem))] w-full max-w-lg flex-col overflow-hidden rounded-md border border-accent/35 bg-zinc-950 shadow-2xl shadow-accent/10"
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-panel-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-4 py-3">
          <div>
            <h2 id="feedback-panel-title" className="text-xs font-bold uppercase tracking-[0.22em] text-accent">
              Şikayet & Öneri
            </h2>
            <p className="mt-0.5 text-[9px] uppercase tracking-wider text-zinc-600">Operatör geri bildirim kanalı</p>
          </div>
          <button
            type="button"
            onClick={ctx.closePanel}
            className="rounded p-1 text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-200"
            aria-label="Kapat"
          >
            <X className="size-4" strokeWidth={2} aria-hidden />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <fieldset>
            <legend className={labelClass}>Tür</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {OPERATOR_FEEDBACK_TYPES.map((value) => (
                <label
                  key={value}
                  className={[
                    'cursor-pointer rounded border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition',
                    type === value
                      ? 'border-accent/55 bg-accent/10 text-accent'
                      : 'border-zinc-700 bg-zinc-900 text-zinc-500 hover:border-zinc-600',
                  ].join(' ')}
                >
                  <input
                    type="radio"
                    name="feedback-type"
                    value={value}
                    checked={type === value}
                    disabled={busy}
                    onChange={() => setType(value)}
                    className="sr-only"
                  />
                  {OPERATOR_FEEDBACK_TYPE_LABELS[value]}
                </label>
              ))}
            </div>
          </fieldset>

          <label className={labelClass}>
            Ad Soyad
            <input
              type="text"
              required
              maxLength={120}
              disabled={busy}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={inputClass}
              autoComplete="name"
            />
          </label>

          <label className={labelClass}>
            Konu Başlığı
            <input
              type="text"
              required
              maxLength={200}
              disabled={busy}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className={inputClass}
            />
          </label>

          <label className={labelClass}>
            Mesaj
            <textarea
              required
              rows={5}
              maxLength={4000}
              disabled={busy}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Şikayet detayı veya öneri açıklaması…"
              className={`${inputClass} min-h-[6.5rem] resize-y`}
            />
          </label>

          <div>
            <p className={labelClass}>Görsel (opsiyonel, en fazla {MAX_FEEDBACK_IMAGES})</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              disabled={busy || !canAddImages}
              className="sr-only"
              onChange={(e) => {
                handleFiles(e.target.files)
                e.target.value = ''
              }}
            />
            <button
              type="button"
              disabled={busy || !canAddImages}
              onClick={() => fileInputRef.current?.click()}
              className="mt-2 inline-flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400 transition hover:border-accent/40 hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ImagePlus className="size-4" strokeWidth={1.75} aria-hidden />
              Görsel ekle
            </button>

            {pendingImages.length > 0 ? (
              <ul className="mt-3 flex flex-wrap gap-2">
                {pendingImages.map((img) => (
                  <li key={img.id} className="relative">
                    <img
                      src={img.previewUrl}
                      alt="Ek görsel önizleme"
                      className="size-16 rounded border border-zinc-700 object-cover"
                    />
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => revokeAndRemove(img.id)}
                      className="absolute -right-1.5 -top-1.5 inline-flex size-5 items-center justify-center rounded-full border border-zinc-700 bg-zinc-950 text-zinc-400 hover:text-red-400"
                      aria-label="Görseli kaldır"
                    >
                      <Trash2 className="size-3" strokeWidth={2} aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {uploadProgress != null ? (
            <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-accent/90">
              [ GÖRSEL YÜKLENİYOR… %{uploadProgress} ]
            </p>
          ) : null}

          {error ? (
            <p role="alert" className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={busy || !user?.uid || !fullName.trim() || !subject.trim() || !message.trim()}
            className="inline-flex w-full items-center justify-center gap-2 rounded border border-accent/45 bg-accent/10 px-4 py-2.5 font-mono-technical text-[10px] font-bold uppercase tracking-[0.2em] text-accent transition hover:border-accent/70 hover:bg-accent/15 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Send className="size-4" strokeWidth={1.75} aria-hidden />
            )}
            {busy ? 'GÖNDERİLİYOR…' : 'GÖNDER'}
          </button>
        </form>
      </div>
    </div>
  )
}
