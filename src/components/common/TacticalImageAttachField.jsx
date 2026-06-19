import { useRef } from 'react'
import { ImagePlus, Loader2, X } from 'lucide-react'
import TacticalUploadProgress from './TacticalUploadProgress'

/**
 * HUD görsel ekleme alanı — önizleme + yükleme durumu.
 * @param {{
 *   label?: string
 *   previewUrl?: string | null
 *   uploading?: boolean
 *   progress?: number
 *   error?: string | null
 *   disabled?: boolean
 *   onPick: (file: File) => void
 *   onClear?: () => void
 *   className?: string
 * }} props
 */
export default function TacticalImageAttachField({
  label = 'GÖRSEL EKLE',
  previewUrl = null,
  uploading = false,
  progress = 0,
  error = null,
  disabled = false,
  onPick,
  onClear,
  className = '',
}) {
  const inputRef = useRef(/** @type {HTMLInputElement | null} */ (null))
  const preview = typeof previewUrl === 'string' ? previewUrl.trim() : ''

  const handleChange = (/** @type {import('react').ChangeEvent<HTMLInputElement>} */ e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    onPick(file)
  }

  return (
    <div className={['space-y-2', className].filter(Boolean).join(' ')}>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        onChange={handleChange}
        disabled={disabled || uploading}
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || uploading}
          className="inline-flex items-center gap-1.5 rounded-sm border border-emerald-500/35 bg-emerald-950/20 px-3 py-1.5 font-mono-technical text-[9px] font-bold uppercase tracking-[0.14em] text-emerald-400 transition hover:border-emerald-400/55 hover:bg-emerald-950/35 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {uploading ? (
            <Loader2 className="size-3 animate-spin" aria-hidden />
          ) : (
            <ImagePlus className="size-3" strokeWidth={1.75} aria-hidden />
          )}
          [ {uploading ? 'YÜKLENİYOR…' : label} ]
        </button>
        {preview && onClear ? (
          <button
            type="button"
            onClick={onClear}
            disabled={uploading}
            className="inline-flex items-center gap-1 rounded-sm border border-zinc-700 px-2 py-1 font-mono-technical text-[8px] uppercase tracking-wider text-zinc-500 transition hover:border-red-500/40 hover:text-red-400 disabled:opacity-45"
          >
            <X className="size-3" aria-hidden />
            KALDIR
          </button>
        ) : null}
      </div>
      {preview ? (
        <div className="overflow-hidden rounded-sm border border-emerald-500/25 bg-black/40">
          <img src={preview} alt="" className="max-h-40 w-full object-contain" loading="lazy" decoding="async" />
        </div>
      ) : null}
      {uploading ? <TacticalUploadProgress progress={progress} label="GÖRSEL_SYNC" error={error} /> : null}
      {!uploading && error ? (
        <p className="font-mono-technical text-[8px] uppercase tracking-wider text-amber-400/90">[ {error} ]</p>
      ) : null}
    </div>
  )
}
