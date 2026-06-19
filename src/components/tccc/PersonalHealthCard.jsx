import { useCallback, useEffect, useState } from 'react'
import { HeartPulse, Pencil, Shield, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { isFirebaseConfigured } from '../../lib/firebase'
import {
  loadHealthOperatorProfile,
  mapHealthProfileFields,
  saveHealthOperatorProfile,
} from '../../lib/personalHealthRecord'

const TIBBI_ROL_OPTIONS = [
  { value: 'operator', label: 'Operatör (Kişisel İlk Yardım Düzeyi)' },
  { value: 'team_medic', label: 'Tim Sıhhiyesi (CLS / Combat Medic)' },
]

/** @typedef {'tıbbiRol' | 'alerjiler' | 'kronikHastalik' | 'duzenliIlaclar' | 'sonTetanozAşısı' | 'boyKilo'} HealthProfileField */

/** @type {Record<HealthProfileField, string>} */
const EMPTY_FORM = {
  tıbbiRol: '',
  alerjiler: '',
  kronikHastalik: '',
  duzenliIlaclar: '',
  sonTetanozAşısı: '',
  boyKilo: '',
}

const inputClass =
  'w-full rounded border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-sm text-app-text placeholder:text-app-text/45 transition focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500/30 disabled:cursor-not-allowed disabled:border-slate-800/80 disabled:bg-slate-900/60 disabled:text-app-text/55'

const labelClass = 'font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-app-text/70'

/** @param {Record<string, unknown> | undefined | null} data */
function mapDocToForm(data) {
  const mapped = mapHealthProfileFields(data ?? undefined)
  return mapped ? { ...EMPTY_FORM, ...mapped } : { ...EMPTY_FORM }
}

/**
 * @param {{
 *   id: string
 *   label: string
 *   children: import('react').ReactNode
 * }} props
 */
function FieldRow({ id, label, children }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      {children}
    </div>
  )
}

export default function PersonalHealthCard() {
  const { user, userData, loading, profileLoading } = useAuth()

  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [savedForm, setSavedForm] = useState({ ...EMPTY_FORM })
  const [docLoading, setDocLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState(/** @type {{ type: 'ok' | 'err'; text: string } | null} */ (null))

  const bloodType = (userData?.bloodType || '').trim() || 'BELİRTİLMEDİ'
  const authBusy = loading || profileLoading
  const waitingUser = authBusy || !user

  const patch = useCallback((/** @type {Partial<typeof EMPTY_FORM>} */ patch) => {
    setForm((f) => ({ ...f, ...patch }))
    setSaveMsg(null)
  }, [])

  useEffect(() => {
    if (!user?.uid || !isFirebaseConfigured()) {
      setDocLoading(false)
      return
    }

    let cancelled = false
    setDocLoading(true)

    ;(async () => {
      try {
        const profile = await loadHealthOperatorProfile(user.uid)
        if (cancelled) return
        const mapped = mapDocToForm(profile)
        setForm(mapped)
        setSavedForm(mapped)
      } catch {
        if (!cancelled) {
          setForm({ ...EMPTY_FORM })
          setSavedForm({ ...EMPTY_FORM })
        }
      } finally {
        if (!cancelled) setDocLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [user?.uid])

  const handleEdit = () => {
    setSaveMsg(null)
    setIsEditing(true)
  }

  const handleCancel = () => {
    setForm({ ...savedForm })
    setSaveMsg(null)
    setIsEditing(false)
  }

  const handleSave = async () => {
    if (!user?.uid || !isFirebaseConfigured()) return
    setSaving(true)
    setSaveMsg(null)
    try {
      const fields = {
        tıbbiRol: form.tıbbiRol.trim(),
        alerjiler: form.alerjiler.trim(),
        kronikHastalik: form.kronikHastalik.trim(),
        duzenliIlaclar: form.duzenliIlaclar.trim(),
        sonTetanozAşısı: form.sonTetanozAşısı.trim(),
        boyKilo: form.boyKilo.trim(),
      }
      await saveHealthOperatorProfile(user.uid, fields)
      const next = mapDocToForm(fields)
      setSavedForm(next)
      setForm(next)
      setIsEditing(false)
      setSaveMsg({ type: 'ok', text: 'KİŞİSEL_SAĞLIK_KÜNYESİ_KAYDEDİLDİ' })
    } catch {
      setSaveMsg({ type: 'err', text: 'KAYIT_BAŞARISIZ · YENİDEN_DENE' })
    } finally {
      setSaving(false)
    }
  }

  if (waitingUser || docLoading) {
    return (
      <section
        aria-label="Kişisel sağlık künyesi yükleniyor"
        className="flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-950 px-6 py-16"
      >
        <div className="relative flex size-14 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full border border-red-500/25" aria-hidden />
          <span className="size-10 animate-spin rounded-full border-2 border-red-500/70 border-t-transparent" aria-hidden />
        </div>
        <p className="mt-6 font-mono text-xs font-bold uppercase tracking-[0.35em] text-red-500/90 animate-pulse">
          YÜKLENİYOR…
        </p>
        <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-app-text/55">
          SAĞLIK_KÜNYESİ · VERİ_KANALI
        </p>
      </section>
    )
  }

  const locked = !isEditing

  return (
    <section
      aria-label="Kişisel sağlık künyesi"
      className="rounded-xl border border-slate-800 bg-slate-950 shadow-[inset_0_1px_0_0_rgba(248,113,113,0.06)]"
    >
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 bg-red-950/20 px-5 py-4">
        <div className="flex items-start gap-3">
          <Shield className="mt-0.5 size-5 shrink-0 text-red-500" strokeWidth={1.75} aria-hidden />
          <div>
            <h2 className="font-mono text-xs font-bold uppercase tracking-[0.28em] text-red-500">
              KİŞİSEL SAĞLIK KÜNYESİ
            </h2>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-app-text/55">
              TCCC · OPERATÖR MEDİKAL PROFİL
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!isEditing ? (
            <button
              type="button"
              onClick={handleEdit}
              className="inline-flex items-center gap-2 rounded border border-red-800 bg-red-950/50 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-red-400 transition hover:border-red-600 hover:bg-red-950 hover:text-red-300"
            >
              <Pencil className="size-3.5" aria-hidden />
              DÜZENLE
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleCancel}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-app-text/70 transition hover:border-slate-600 hover:text-app-text disabled:opacity-50"
              >
                <X className="size-3.5" aria-hidden />
                İPTAL
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded border border-red-700 bg-red-600/20 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-red-400 transition hover:bg-red-600/30 disabled:opacity-50"
              >
                <HeartPulse className="size-3.5" aria-hidden />
                {saving ? 'KAYDEDİLİYOR…' : 'KAYDET'}
              </button>
            </>
          )}
        </div>
      </header>

      <div className="space-y-6 p-5">
        <div className="rounded-lg border border-red-800/60 bg-red-950/30 px-5 py-4">
          <p className={labelClass}>KAN GRUBU · PROFİL KAYNAĞI</p>
          <p
            className="mt-2 font-mono text-3xl font-black uppercase tracking-[0.12em] text-red-500 sm:text-4xl"
            aria-readonly="true"
          >
            {bloodType}
          </p>
          <p className="mt-2 font-mono text-[9px] uppercase tracking-wider text-app-text/55">
            SALT OKUNUR · PROFİLİM / users · bloodType · health_records/{'{uid}'}
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <FieldRow id="phc-tibbi-rol" label="TIBBİ ROL">
            <select
              id="phc-tibbi-rol"
              value={form.tıbbiRol}
              disabled={locked}
              onChange={(e) => patch({ tıbbiRol: e.target.value })}
              className={`${inputClass} cursor-pointer`}
            >
              <option value="">— SEÇİM YAPIN —</option>
              {TIBBI_ROL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </FieldRow>

          <FieldRow id="phc-tetanoz" label="SON TETANOZ AŞISI">
            <input
              id="phc-tetanoz"
              type="date"
              value={form.sonTetanozAşısı}
              disabled={locked}
              onChange={(e) => patch({ sonTetanozAşısı: e.target.value })}
              className={inputClass}
            />
          </FieldRow>

          <FieldRow id="phc-boy-kilo" label="BOY / KİLO">
            <input
              id="phc-boy-kilo"
              type="text"
              value={form.boyKilo}
              disabled={locked}
              onChange={(e) => patch({ boyKilo: e.target.value })}
              placeholder="180 cm / 82 kg"
              className={inputClass}
            />
          </FieldRow>
        </div>

        <FieldRow id="phc-alerjiler" label="ALERJİLER">
          <input
            id="phc-alerjiler"
            type="text"
            value={form.alerjiler}
            disabled={locked}
            onChange={(e) => patch({ alerjiler: e.target.value })}
            placeholder="İlaç, gıda, antibiyotik…"
            className={inputClass}
          />
        </FieldRow>

        <FieldRow id="phc-kronik" label="KRONİK HASTALIK">
          <textarea
            id="phc-kronik"
            rows={2}
            value={form.kronikHastalik}
            disabled={locked}
            onChange={(e) => patch({ kronikHastalik: e.target.value })}
            placeholder="Bilinen kronik durumlar…"
            className={`${inputClass} resize-y min-h-[4rem]`}
          />
        </FieldRow>

        <FieldRow id="phc-ilac" label="DÜZENLİ İLAÇLAR">
          <textarea
            id="phc-ilac"
            rows={2}
            value={form.duzenliIlaclar}
            disabled={locked}
            onChange={(e) => patch({ duzenliIlaclar: e.target.value })}
            placeholder="Günlük / sürekli kullanılan ilaçlar…"
            className={`${inputClass} resize-y min-h-[4rem]`}
          />
        </FieldRow>

        {saveMsg ? (
          <p
            className={`font-mono text-[10px] font-bold uppercase tracking-wider ${saveMsg.type === 'ok' ? 'text-red-400/90' : 'text-amber-400'}`}
            role="status"
          >
            {saveMsg.text}
          </p>
        ) : null}
      </div>
    </section>
  )
}
