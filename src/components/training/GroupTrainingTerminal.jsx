import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Crosshair, Loader2, Timer, Users } from 'lucide-react'
import AmberAlert from '../common/AmberAlert'
import Input from '../common/Input'
import Button from '../common/Button'
import TacticalPanel from '../ui/TacticalPanel'
import { useAuth } from '../../context/AuthContext'
import { useOperatorGroup } from '../../hooks/useOperatorGroup'
import {
  fetchOperatorTrainingResult,
  subscribeActiveGroupTrainings,
  submitTrainingResult,
} from '../../lib/firestoreGroupTrainings'
import { emitFirebaseError } from '../../lib/firebaseErrorBus'

/** @typedef {import('../../lib/firestoreGroupTrainings').GroupTraining} GroupTraining */

const hudLabel =
  'font-mono-technical text-[8px] font-bold uppercase tracking-[0.22em] text-slate-500'
const hudReadonly =
  'rounded border border-[#00FF41]/25 bg-[#0A0A0A] px-3 py-2.5 font-mono-technical text-sm font-semibold tabular-nums text-[#00FF41]'

/**
 * @param {{ onBack: () => void }} props
 */
export default function GroupTrainingTerminal({ onBack }) {
  const { user, userData } = useAuth()
  const { membership, isMember, loading: groupLoading } = useOperatorGroup()

  const [trainings, setTrainings] = useState(/** @type {GroupTraining[]} */ ([]))
  const [trainingsLoading, setTrainingsLoading] = useState(true)
  const [selectedId, setSelectedId] = useState('')
  const [hits, setHits] = useState('')
  const [timeSec, setTimeSec] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [existingResult, setExistingResult] = useState(/** @type {import('../../lib/firestoreGroupTrainings').TrainingResult | null} */ (null))

  const operatorName = (userData?.callsign || user?.displayName || 'Operatör').trim()
  const uid = user?.uid ?? ''

  const selected = useMemo(
    () => trainings.find((t) => t.id === selectedId) ?? null,
    [trainings, selectedId],
  )

  useEffect(() => {
    if (!isMember || !membership?.groupId) {
      setTrainings([])
      setTrainingsLoading(false)
      return undefined
    }

    let active = true
    setTrainingsLoading(true)
    const unsub = subscribeActiveGroupTrainings(
      membership.groupId,
      (rows) => {
        if (!active) return
        setTrainings(rows)
        setTrainingsLoading(false)
      },
      (err) => {
        if (!active) return
        emitFirebaseError(err)
        setTrainingsLoading(false)
      },
    )
    return () => {
      active = false
      unsub()
    }
  }, [isMember, membership?.groupId])

  useEffect(() => {
    setHits('')
    setTimeSec('')
    setMsg('')
    setExistingResult(null)
    if (!selectedId || !uid) return undefined

    let cancelled = false
    ;(async () => {
      try {
        const prev = await fetchOperatorTrainingResult(selectedId, uid)
        if (!cancelled) setExistingResult(prev)
      } catch {
        if (!cancelled) setExistingResult(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [selectedId, uid])

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault()
      if (!selected || !uid) return
      if (existingResult) {
        setMsg('Bu eğitime zaten sonuç gönderdiniz.')
        return
      }

      const hitsNum = Number(hits)
      if (!Number.isFinite(hitsNum) || hitsNum < 0 || hitsNum > selected.totalAmmo) {
        setMsg(`Vuruş sayısı 0–${selected.totalAmmo} arasında olmalı.`)
        return
      }

      setBusy(true)
      setMsg('')
      try {
        await submitTrainingResult({
          training: selected,
          operatorId: uid,
          operatorName,
          hits: hitsNum,
          time: selected.isTimed ? Number(timeSec) : null,
        })
        setMsg('Sonuç eğitmene iletildi.')
        setHits('')
        setTimeSec('')
        const prev = await fetchOperatorTrainingResult(selected.id, uid)
        setExistingResult(prev)
      } catch (err) {
        emitFirebaseError(err)
        setMsg(err instanceof Error ? err.message : 'Gönderim başarısız.')
      } finally {
        setBusy(false)
      }
    },
    [selected, uid, operatorName, hits, timeSec, existingResult],
  )

  if (groupLoading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center gap-2 text-[#00FF41]">
        <Loader2 className="size-5 animate-spin" aria-hidden />
        <span className="font-mono-technical text-xs uppercase tracking-widest">Grup doğrulanıyor…</span>
      </div>
    )
  }

  if (!isMember || !membership?.groupId) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 font-mono-technical text-[10px] uppercase tracking-widest text-slate-500 hover:text-[#00FF41]"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Kategorilere dön
        </button>
        <AmberAlert label="[ GRUP_GEREKLİ ]">
          Grup eğitimine katılmak için önce bir taktik grubuna dahil olmalısınız (Başarılar → Gruba Katıl).
        </AmberAlert>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 font-mono-technical text-[10px] uppercase tracking-widest text-slate-500 transition hover:text-[#00FF41]"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Kategorilere dön
        </button>
        <p className="flex items-center gap-2 font-mono-technical text-[10px] uppercase tracking-widest text-[#00FF41]/80">
          <Users className="size-4" aria-hidden />
          {membership.groupName ?? membership.groupId}
        </p>
      </div>

      <header className="border-b border-[#00FF41]/15 pb-3">
        <p className="font-mono-technical text-[10px] font-semibold uppercase tracking-[0.32em] text-[#00FF41]/85">
          [ GRUP EĞİTİMİ · GRP-07 ]
        </p>
        <h2 className="font-display mt-1 text-lg font-bold tracking-[0.1em] text-white">
          Canlı grup eğitimi — operatör girişi
        </h2>
      </header>

      <TacticalPanel className="p-4 sm:p-5">
        <label className={hudLabel} htmlFor="grp-training-select">
          Aktif eğitim
        </label>
        {trainingsLoading ? (
          <p className="mt-2 flex items-center gap-2 font-mono-technical text-xs text-slate-500">
            <Loader2 className="size-4 animate-spin text-[#00FF41]" aria-hidden />
            Eğitimler yükleniyor…
          </p>
        ) : trainings.length === 0 ? (
          <p className="mt-2 rounded border border-amber-500/30 bg-amber-950/20 px-3 py-2 font-mono-technical text-xs text-amber-200/90">
            Eğitmen henüz bu grup için aktif eğitim açmadı.
          </p>
        ) : (
          <select
            id="grp-training-select"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="mt-2 w-full rounded border border-[#00FF41]/35 bg-[#0A0A0A] py-2.5 pl-3 pr-8 font-mono-technical text-sm text-white outline-none focus:border-[#00FF41]/60"
          >
            <option value="">— Eğitim seçin —</option>
            {trainings.map((t) => (
              <option key={t.id} value={t.id}>
                {t.trainingName}
                {t.level && t.level !== '—' ? ` · ${t.level}` : ''}
                {t.isTimed ? ' · Zamanlı' : ''}
              </option>
            ))}
          </select>
        )}
      </TacticalPanel>

      {selected ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <TacticalPanel className="p-4">
              <p className={hudLabel}>Toplam mühimmat</p>
              <p className={hudReadonly} aria-readonly="true">
                {selected.totalAmmo}
              </p>
            </TacticalPanel>
            <TacticalPanel className="p-4">
              <p className={hudLabel}>Geçer baraj (min. vuruş)</p>
              <p className={hudReadonly} aria-readonly="true">
                {selected.minPassScore}
              </p>
            </TacticalPanel>
          </div>

          {existingResult ? (
            <AmberAlert label="[ KAYIT_MEVCUT ]">
              Bu eğitime {existingResult.hits} vuruş ile{' '}
              {existingResult.isPassed ? 'GEÇTİ' : 'KALDI'} — sonuç gönderildi.
            </AmberAlert>
          ) : null}

          <TacticalPanel className="p-4 sm:p-5">
            <div className="flex items-center gap-2 text-[#00FF41]">
              <Crosshair className="size-5" strokeWidth={1.5} aria-hidden />
              <span className="font-display text-xs font-bold uppercase tracking-widest">Skor girişi</span>
            </div>

            <div className="mt-4 space-y-3">
              <Input
                variant="gold"
                label="Vuruş sayısı"
                id="grp-hits"
                type="number"
                min={0}
                max={selected.totalAmmo}
                value={hits}
                onChange={(e) => setHits(e.target.value)}
                placeholder={`0 – ${selected.totalAmmo}`}
                required
                disabled={Boolean(existingResult) || busy}
              />

              {selected.isTimed ? (
                <div className="flex items-start gap-2">
                  <Timer className="mt-2 size-4 shrink-0 text-[#ffb400]/80" aria-hidden />
                  <Input
                    variant="gold"
                    label="Süre (saniye)"
                    id="grp-time"
                    type="number"
                    min={0}
                    step="0.01"
                    value={timeSec}
                    onChange={(e) => setTimeSec(e.target.value)}
                    placeholder="örn. 12.40"
                    required
                    disabled={Boolean(existingResult) || busy}
                  />
                </div>
              ) : null}
            </div>

            {msg ? (
              <p className="mt-3 font-mono-technical text-xs text-[#00FF41]/90">{msg}</p>
            ) : null}

            <Button
              type="submit"
              variant="primary"
              className="mt-4 w-full"
              disabled={busy || Boolean(existingResult)}
            >
              {busy ? 'Gönderiliyor…' : 'Sonucu ilet'}
            </Button>
          </TacticalPanel>
        </form>
      ) : null}
    </div>
  )
}
