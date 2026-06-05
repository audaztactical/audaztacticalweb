import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Play, Radio, Target } from 'lucide-react'
import {
  completeGroupTraining,
  createGroupTraining,
  subscribeInstructorActiveGroupTrainings,
  subscribeTrainingResults,
} from '../../lib/firestoreGroupTrainings'
import { emitFirebaseError } from '../../lib/firebaseErrorBus'
import BentoCard from './cleanTactical/BentoCard'
import InstructorGroupSelect from './cleanTactical/InstructorGroupSelect'
import LiveOperatorsTable from './cleanTactical/LiveOperatorsTable'
import CleanFade from './cleanTactical/CleanFade'
import {
  ctBentoGrid,
  ctBentoSpan5,
  ctBentoSpan7,
  ctBtnGhost,
  ctBtnPrimary,
  ctInput,
  ctLabel,
  ctMsgErr,
  ctMsgOk,
} from './cleanTactical/tokens'

/** @typedef {import('../../lib/firestoreGroups').TacticalGroup} TacticalGroup */
/** @typedef {import('../../lib/firestoreGroupTrainings').GroupTraining} GroupTraining */
/** @typedef {import('../../lib/firestoreGroupTrainings').TrainingResult} TrainingResult */

/**
 * @param {{
 *   groups: TacticalGroup[]
 *   instructorId: string
 *   loading?: boolean
 * }} props
 */
export default function InstructorGroupTrainingPanel({ groups, instructorId, loading = false }) {
  const [activeGroupId, setActiveGroupId] = useState('')
  const [trainings, setTrainings] = useState(/** @type {GroupTraining[]} */ ([]))
  const [trainingsLoading, setTrainingsLoading] = useState(false)
  const [liveTrainingId, setLiveTrainingId] = useState('')
  const [results, setResults] = useState(/** @type {TrainingResult[]} */ ([]))
  const [resultsLoading, setResultsLoading] = useState(false)

  const [trainingName, setTrainingName] = useState('')
  const [isTimed, setIsTimed] = useState(false)
  const [totalAmmo, setTotalAmmo] = useState('10')
  const [minPassScore, setMinPassScore] = useState('6')
  const [creating, setCreating] = useState(false)
  const [formMsg, setFormMsg] = useState('')

  const liveTraining = useMemo(
    () => trainings.find((t) => t.id === liveTrainingId) ?? trainings[0] ?? null,
    [trainings, liveTrainingId],
  )

  useEffect(() => {
    if (!groups.length) {
      setActiveGroupId('')
      return
    }
    if (!activeGroupId || !groups.some((g) => g.groupId === activeGroupId)) {
      setActiveGroupId(groups[0].groupId)
    }
  }, [groups, activeGroupId])

  useEffect(() => {
    if (!activeGroupId || !instructorId) {
      setTrainings([])
      return undefined
    }

    let active = true
    setTrainingsLoading(true)
    const unsub = subscribeInstructorActiveGroupTrainings(
      activeGroupId,
      instructorId,
      (rows) => {
        if (!active) return
        setTrainings(rows)
        setTrainingsLoading(false)
        if (rows.length && !rows.some((t) => t.id === liveTrainingId)) {
          setLiveTrainingId(rows[0].id)
        }
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
  }, [activeGroupId, instructorId, liveTrainingId])

  useEffect(() => {
    const tid = liveTraining?.id
    if (!tid) {
      setResults([])
      setResultsLoading(false)
      return undefined
    }

    let active = true
    setResultsLoading(true)
    const unsub = subscribeTrainingResults(
      tid,
      (rows) => {
        if (!active) return
        setResults(rows)
        setResultsLoading(false)
      },
      (err) => {
        if (!active) return
        emitFirebaseError(err)
        setResultsLoading(false)
      },
    )
    return () => {
      active = false
      unsub()
    }
  }, [liveTraining?.id])

  const handleCreate = useCallback(
    async (e) => {
      e.preventDefault()
      if (!activeGroupId || !instructorId) return

      const name = trainingName.trim()
      if (!name) {
        setFormMsg('Eğitim adı zorunludur.')
        return
      }

      const ammo = Number(totalAmmo)
      const baraj = Number(minPassScore)
      if (!Number.isFinite(ammo) || ammo < 1) {
        setFormMsg('Toplam mühimmat en az 1 olmalı.')
        return
      }
      if (!Number.isFinite(baraj) || baraj < 0 || baraj > ammo) {
        setFormMsg(`Geçer baraj 0–${ammo} arasında olmalı.`)
        return
      }

      setCreating(true)
      setFormMsg('')
      try {
        const created = await createGroupTraining({
          groupId: activeGroupId,
          instructorId,
          templateId: null,
          trainingName: name,
          level: '—',
          isTimed,
          totalAmmo: ammo,
          minPassScore: baraj,
        })
        setLiveTrainingId(created.id)
        setTrainingName('')
        setFormMsg('Oturum açıldı — canlı takip aktif.')
      } catch (err) {
        emitFirebaseError(err)
        setFormMsg(err instanceof Error ? err.message : 'Eğitim oluşturulamadı.')
      } finally {
        setCreating(false)
      }
    },
    [activeGroupId, instructorId, trainingName, isTimed, totalAmmo, minPassScore],
  )

  const handleComplete = useCallback(async () => {
    if (!liveTraining?.id) return
    try {
      await completeGroupTraining(liveTraining.id)
      setFormMsg('Eğitim tamamlandı.')
      setLiveTrainingId('')
    } catch (err) {
      emitFirebaseError(err)
    }
  }, [liveTraining?.id])

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center gap-2 text-zinc-400">
        <Loader2 className="size-5 animate-spin" aria-hidden />
        <span className="text-sm">Yükleniyor…</span>
      </div>
    )
  }

  if (!groups.length) {
    return (
      <CleanFade>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-6 text-sm text-zinc-400">
          Önce <strong className="text-zinc-300">Gruplar</strong> sekmesinden bir taktik grubu oluşturun.
        </div>
      </CleanFade>
    )
  }

  const msgOk = formMsg.includes('açıldı') || formMsg.includes('tamamlandı')

  return (
    <div className="space-y-5">
      <header>
        <h2 className="text-lg font-semibold text-zinc-100">Grup eğitimi · canlı oturum</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Operatörler antrenman modülünden sonuç girer; tablo anlık güncellenir.
        </p>
      </header>

      <div className={ctBentoGrid}>
        <div className={`${ctBentoSpan7} space-y-4`}>
          <BentoCard title="Oturum başlat" description="Ad ve parametreler — tek tıkla aç" icon={Target}>
            <InstructorGroupSelect
              groups={groups}
              value={activeGroupId}
              onChange={setActiveGroupId}
              className="mb-4 max-w-sm"
            />

            <form onSubmit={handleCreate} className="space-y-4">
              <label className="block space-y-1.5">
                <span className={ctLabel}>Eğitim adı</span>
                <input
                  id="grp-tr-name"
                  className={ctInput}
                  value={trainingName}
                  onChange={(e) => setTrainingName(e.target.value)}
                  placeholder="Örn. Mesafe atışı — Modül A"
                  required
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1.5">
                  <span className={ctLabel}>Toplam mühimmat</span>
                  <input
                    type="number"
                    min={1}
                    max={999}
                    value={totalAmmo}
                    onChange={(e) => setTotalAmmo(e.target.value)}
                    className={ctInput}
                    required
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className={ctLabel}>Geçer baraj</span>
                  <input
                    type="number"
                    min={0}
                    value={minPassScore}
                    onChange={(e) => setMinPassScore(e.target.value)}
                    className={ctInput}
                    required
                  />
                </label>
              </div>

              <label className="flex items-center gap-2.5 text-sm text-zinc-400">
                <input
                  type="checkbox"
                  className="size-4 rounded accent-zinc-300"
                  checked={isTimed}
                  onChange={(e) => setIsTimed(e.target.checked)}
                />
                Zamanlı oturum
              </label>

              {formMsg ? <p className={msgOk ? ctMsgOk : ctMsgErr}>{formMsg}</p> : null}

              <button type="submit" disabled={creating} className={ctBtnPrimary}>
                {creating ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Play className="size-4" aria-hidden />
                )}
                Oturumu başlat
              </button>
            </form>
          </BentoCard>
        </div>

        <div className={ctBentoSpan5}>
          <BentoCard
            title="Canlı takip"
            description={liveTraining?.trainingName ?? 'Aktif oturum yok'}
            icon={Radio}
            action={
              liveTraining ? (
                <button type="button" onClick={handleComplete} className={ctBtnGhost}>
                  Kapat
                </button>
              ) : trainings.length > 1 ? (
                <select
                  value={liveTrainingId}
                  onChange={(e) => setLiveTrainingId(e.target.value)}
                  className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-300"
                >
                  {trainings.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.trainingName}
                    </option>
                  ))}
                </select>
              ) : null
            }
          >
            <LiveOperatorsTable
              rows={results}
              loading={resultsLoading || trainingsLoading}
              idle={!liveTraining}
              totalAmmo={liveTraining?.totalAmmo ?? 0}
              minPassScore={liveTraining?.minPassScore ?? 0}
            />
          </BentoCard>
        </div>
      </div>
    </div>
  )
}
