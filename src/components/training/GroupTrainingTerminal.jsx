import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  CheckCircle2,
  Crosshair,
  Eye,
  History,
  Loader2,
  Radio,
  Timer,
  Users,
  XCircle,
} from 'lucide-react'
import AmberAlert from '../common/AmberAlert'
import Input from '../common/Input'
import Button from '../common/Button'
import TacticalPanel from '../ui/TacticalPanel'
import { useAuth } from '../../context/AuthContext'
import { useOperatorGroup } from '../../hooks/useOperatorGroup'
import {
  computeGroupTrainingAssessment,
  formatGroupTrainingStatusLabel,
  getOperatorSessionStatusStyles,
  getOperatorTrainingSessionStatus,
} from '../../lib/groupTrainingAssessment'
import {
  fetchGroupTrainingForOperator,
  subscribeGroupTrainingResults,
  subscribeGroupTrainings,
  submitTrainingResult,
} from '../../lib/firestoreGroupTrainings'
import { filterOperatorVisibleTrainings, isTrainingSessionExpired } from '../../lib/groupTrainingSessionAccess'
import { timestampToMs } from '../../lib/firestoreSnapshot'
import { emitFirebaseError } from '../../lib/firebaseErrorBus'

/** @typedef {import('../../lib/firestoreGroupTrainings').GroupTraining} GroupTraining */
/** @typedef {import('../../lib/firestoreGroupTrainings').TrainingResult} TrainingResult */

const hudLabel =
  'font-mono-technical text-[8px] font-bold uppercase tracking-[0.22em] text-slate-500'
const hudReadonly =
  'rounded border border-[#00FF41]/25 bg-[#0A0A0A] px-3 py-2.5 font-mono-technical text-sm font-semibold tabular-nums text-[#00FF41]'

/** @param {unknown} ts */
function formatTrainingDate(ts) {
  const ms = timestampToMs(ts)
  if (!ms) return '—'
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(ms))
}

/**
 * @param {{
 *   training: GroupTraining
 *   results: TrainingResult[]
 *   currentUid: string
 * }} props
 */
/**
 * @param {TrainingResult} result
 * @param {GroupTraining} training
 */
function resolveResultAssessment(result, training) {
  return computeGroupTrainingAssessment({
    totalAmmo: training.totalAmmo,
    minPassScore: training.minPassScore,
    hits: result.hits,
    isTimed: training.isTimed,
    targetTimeSec: training.targetTimeSec,
    time: result.time,
  })
}

function GroupTrainingDetailPanel({ training, results, currentUid }) {
  const trainingResults = results.filter((r) => r.trainingId === training.id)
  const myResult = trainingResults.find((r) => r.operatorId === currentUid) ?? null
  const isActive = training.status === 'active'
  const myAssessment = myResult ? resolveResultAssessment(myResult, training) : null

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <TacticalPanel className="p-3">
          <p className={hudLabel}>Durum</p>
          <p className={hudReadonly}>{isActive ? 'AKTİF' : 'TAMAMLANDI'}</p>
        </TacticalPanel>
        <TacticalPanel className="p-3">
          <p className={hudLabel}>Mühimmat</p>
          <p className={hudReadonly}>{training.totalAmmo}</p>
        </TacticalPanel>
        <TacticalPanel className="p-3">
          <p className={hudLabel}>Geçer baraj</p>
          <p className={hudReadonly}>{training.minPassScore}</p>
        </TacticalPanel>
        <TacticalPanel className="p-3">
          <p className={hudLabel}>Tarih</p>
          <p className="font-mono-technical text-xs text-[#00FF41]">{formatTrainingDate(training.createdAt)}</p>
        </TacticalPanel>
      </div>

      {myResult && myAssessment ? (
        <TacticalPanel className="p-4">
          <p className={hudLabel}>Sizin durumunuz</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <span className="font-mono-technical text-sm text-white">
              {myResult.hits}/{training.totalAmmo} vuruş
              {training.isTimed && myResult.time != null ? ` · ${myResult.time}s` : ''}
              {training.isTimed && training.targetTimeSec != null ? ` (hedef ${training.targetTimeSec}s)` : ''}
            </span>
            <span
              className={[
                'inline-flex items-center gap-1 rounded border px-2 py-0.5 font-mono-technical text-[9px] font-bold uppercase',
                myAssessment.isPassed
                  ? 'border-lime-500/40 bg-lime-950/30 text-lime-400'
                  : myAssessment.statusResult === 'SÜRE İHLALİ'
                    ? 'border-amber-500/40 bg-amber-950/30 text-amber-400'
                    : 'border-red-500/40 bg-red-950/30 text-red-400',
              ].join(' ')}
            >
              {myAssessment.isPassed ? (
                <CheckCircle2 className="size-3" aria-hidden />
              ) : (
                <XCircle className="size-3" aria-hidden />
              )}
              {formatGroupTrainingStatusLabel(myAssessment.statusResult, myAssessment.isPassed)}
            </span>
          </div>
          {!myAssessment.isPassed ? (
            <p className="mt-2 font-mono-technical text-[9px] uppercase text-slate-500">
              {myAssessment.statusResult === 'SÜRE İHLALİ'
                ? 'Vuruş barajı geçildi ancak süre hedefi aşıldı.'
                : 'Vuruş barajı altında kaldı.'}
            </p>
          ) : null}
        </TacticalPanel>
      ) : (
        <TacticalPanel className="p-4">
          <p className="font-mono-technical text-xs text-slate-500">
            {isActive ? 'Henüz sonuç göndermediniz — Canlı Oturum sekmesinden giriş yapabilirsiniz.' : 'Bu eğitime katılım kaydınız yok.'}
          </p>
        </TacticalPanel>
      )}

      <TacticalPanel className="overflow-hidden p-0">
        <div className="border-b border-[#00FF41]/15 px-4 py-2.5">
          <p className="font-mono-technical text-[9px] font-bold uppercase tracking-[0.28em] text-[#00FF41]/80">
            [ GRUP SONUÇLARI · SALT OKUNUR ]
          </p>
        </div>
        {trainingResults.length === 0 ? (
          <p className="px-4 py-6 text-center font-mono-technical text-xs text-slate-500">
            Henüz sonuç bildirilmedi.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[28rem] text-left font-mono-technical text-[10px]">
              <thead className="border-b border-white/10 bg-black/40 text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-bold uppercase tracking-wider">Operatör</th>
                  <th className="px-3 py-2 font-bold uppercase tracking-wider">Vuruş</th>
                  <th className="px-3 py-2 font-bold uppercase tracking-wider">Süre</th>
                  <th className="px-3 py-2 font-bold uppercase tracking-wider">Sonuç</th>
                  <th className="px-3 py-2 font-bold uppercase tracking-wider">Tarih</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {trainingResults.map((row) => {
                  const rowAssessment = resolveResultAssessment(row, training)
                  const rowLabel = formatGroupTrainingStatusLabel(
                    rowAssessment.statusResult,
                    rowAssessment.isPassed,
                  )
                  return (
                  <tr
                    key={row.id}
                    className={row.operatorId === currentUid ? 'bg-[#00FF41]/[0.06]' : 'text-slate-300'}
                  >
                    <td className="px-3 py-2.5">
                      {row.operatorName}
                      {row.operatorId === currentUid ? (
                        <span className="ml-1 text-[#00FF41]/70">(siz)</span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums">
                      {row.hits}/{training.totalAmmo}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums">
                      {training.isTimed && row.time != null ? `${row.time}s` : '—'}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={
                          rowAssessment.isPassed
                            ? 'text-lime-400'
                            : rowAssessment.statusResult === 'SÜRE İHLALİ'
                              ? 'text-amber-400'
                              : 'text-red-400'
                        }
                      >
                        {rowLabel}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-slate-500">{formatTrainingDate(row.submittedAt)}</td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </TacticalPanel>
    </div>
  )
}

/**
 * @param {{ onBack: () => void, initialTrainingId?: string }} props
 */
export default function GroupTrainingTerminal({ onBack, initialTrainingId = '' }) {
  const { user, userData } = useAuth()
  const { membership, isMember, loading: groupLoading } = useOperatorGroup()

  const [tab, setTab] = useState(/** @type {'live' | 'history'} */ ('live'))
  const [trainings, setTrainings] = useState(/** @type {GroupTraining[]} */ ([]))
  const [results, setResults] = useState(/** @type {TrainingResult[]} */ ([]))
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState('')
  const [detailId, setDetailId] = useState('')
  const [hits, setHits] = useState('')
  const [timeSec, setTimeSec] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [deepLinkBlocked, setDeepLinkBlocked] = useState(/** @type {string | null} */ (null))

  const operatorName = (userData?.callsign || user?.displayName || 'Operatör').trim()
  const uid = user?.uid ?? ''
  const groupId = membership?.groupId ?? ''

  const visibleTrainings = useMemo(
    () => filterOperatorVisibleTrainings(trainings, groupId, { includeCompleted: true }),
    [trainings, groupId],
  )

  const activeTrainings = useMemo(
    () => visibleTrainings.filter((t) => t.status === 'active'),
    [visibleTrainings],
  )

  const openActiveTrainings = useMemo(
    () =>
      activeTrainings.filter(
        (t) => getOperatorTrainingSessionStatus(t, results, uid).key === 'open',
      ),
    [activeTrainings, results, uid],
  )

  const historyTrainings = useMemo(() => visibleTrainings, [visibleTrainings])

  const selected = useMemo(
    () => visibleTrainings.find((t) => t.id === selectedId) ?? null,
    [visibleTrainings, selectedId],
  )

  const selectedSessionStatus = useMemo(() => {
    if (!selected) return null
    return getOperatorTrainingSessionStatus(selected, results, uid)
  }, [selected, results, uid])

  const detailTraining = useMemo(
    () => visibleTrainings.find((t) => t.id === detailId) ?? null,
    [visibleTrainings, detailId],
  )

  const myResultForSelected = useMemo(() => {
    if (!selectedId || !uid) return null
    return results.find((r) => r.trainingId === selectedId && r.operatorId === uid) ?? null
  }, [results, selectedId, uid])

  const mySelectedAssessment = useMemo(() => {
    if (!selected || !myResultForSelected) return null
    return resolveResultAssessment(myResultForSelected, selected)
  }, [selected, myResultForSelected])

  useEffect(() => {
    if (!isMember || !groupId) {
      setTrainings([])
      setResults([])
      setLoading(false)
      return undefined
    }

    let active = true
    setLoading(true)

    const unsubTrainings = subscribeGroupTrainings(
      groupId,
      (rows) => {
        if (!active) return
        setTrainings(rows)
        setLoading(false)
      },
      (err) => {
        if (!active) return
        emitFirebaseError(err)
        setLoading(false)
      },
    )

    const unsubResults = subscribeGroupTrainingResults(
      groupId,
      (rows) => {
        if (!active) return
        setResults(rows)
      },
      (err) => {
        if (!active) return
        emitFirebaseError(err)
      },
    )

    return () => {
      active = false
      unsubTrainings()
      unsubResults()
    }
  }, [isMember, groupId])

  useEffect(() => {
    const preferredId = String(initialTrainingId ?? '').trim()
    if (!preferredId || loading) return

    const applyDeepLink = async () => {
      setDeepLinkBlocked(null)
      let training = visibleTrainings.find((t) => t.id === preferredId) ?? null
      if (!training) {
        try {
          training = await fetchGroupTrainingForOperator(preferredId, groupId)
          if (!training) {
            setDeepLinkBlocked('Oturum bulunamadı, süresi dolmuş veya grubunuza açık değil.')
            return
          }
          setTrainings((prev) => {
            if (prev.some((t) => t.id === training.id)) return prev
            return [training, ...prev].sort(
              (a, b) => timestampToMs(b.createdAt) - timestampToMs(a.createdAt),
            )
          })
        } catch {
          setDeepLinkBlocked('Oturuma erişim doğrulanamadı.')
          return
        }
      }

      if (!training) return

      setDetailId(training.id)
      if (training.status === 'active') {
        setTab('live')
        setSelectedId(training.id)
      } else {
        setTab('history')
      }
    }

    void applyDeepLink()
  }, [initialTrainingId, visibleTrainings, loading, groupId])

  useEffect(() => {
    setHits('')
    setTimeSec('')
    setMsg('')
  }, [selectedId])

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault()
      if (!selected || !uid || selected.status !== 'active') return
      if (isTrainingSessionExpired(selected)) {
        setMsg('Oturum süresi dolmuş — sonuç gönderilemez.')
        return
      }
      if (myResultForSelected) {
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
        const assessment = computeGroupTrainingAssessment({
          totalAmmo: selected.totalAmmo,
          minPassScore: selected.minPassScore,
          hits: hitsNum,
          isTimed: selected.isTimed,
          targetTimeSec: selected.targetTimeSec,
          time: selected.isTimed ? Number(timeSec) : null,
        })
        setMsg(
          `Sonuç iletildi — ${formatGroupTrainingStatusLabel(assessment.statusResult, assessment.isPassed)}.`,
        )
        setHits('')
        setTimeSec('')
      } catch (err) {
        emitFirebaseError(err)
        setMsg(err instanceof Error ? err.message : 'Gönderim başarısız.')
      } finally {
        setBusy(false)
      }
    },
    [selected, uid, operatorName, hits, timeSec, myResultForSelected],
  )

  const openDetail = (/** @type {GroupTraining} */ training) => {
    setDetailId(training.id)
  }

  if (groupLoading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center gap-2 text-[#00FF41]">
        <Loader2 className="size-5 animate-spin" aria-hidden />
        <span className="font-mono-technical text-xs uppercase tracking-widest">Grup doğrulanıyor…</span>
      </div>
    )
  }

  if (!isMember || !groupId) {
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
      {deepLinkBlocked ? (
        <AmberAlert label="[ OTURUM_ERİŞİMİ_RED ]">{deepLinkBlocked}</AmberAlert>
      ) : null}
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
          Grup eğitimi — görüntüleme ve canlı giriş
        </h2>
        <p className="mt-1 font-mono-technical text-[9px] uppercase text-slate-500">
          Geçmiş kayıtlar salt okunur · yalnızca aktif oturuma skor gönderilebilir
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTab('live')}
          className={[
            'inline-flex items-center gap-2 rounded border px-3 py-2 font-mono-technical text-[9px] font-bold uppercase tracking-wider transition',
            tab === 'live'
              ? 'border-[#00FF41]/50 bg-[#00FF41]/10 text-[#00FF41]'
              : 'border-white/10 text-slate-500 hover:border-[#00FF41]/30 hover:text-[#00FF41]',
          ].join(' ')}
        >
          <Radio className="size-3.5" aria-hidden />
          Canlı oturum
          {openActiveTrainings.length > 0 ? (
            <span className="rounded bg-lime-500 px-1.5 py-0.5 text-[8px] text-black">
              {openActiveTrainings.length}
            </span>
          ) : null}
        </button>
        <button
          type="button"
          onClick={() => setTab('history')}
          className={[
            'inline-flex items-center gap-2 rounded border px-3 py-2 font-mono-technical text-[9px] font-bold uppercase tracking-wider transition',
            tab === 'history'
              ? 'border-[#00FF41]/50 bg-[#00FF41]/10 text-[#00FF41]'
              : 'border-white/10 text-slate-500 hover:border-[#00FF41]/30 hover:text-[#00FF41]',
          ].join(' ')}
        >
          <History className="size-3.5" aria-hidden />
          Geçmiş ve kayıtlar
        </button>
      </div>

      {loading ? (
        <p className="flex items-center gap-2 font-mono-technical text-xs text-slate-500">
          <Loader2 className="size-4 animate-spin text-[#00FF41]" aria-hidden />
          Grup eğitim verileri yükleniyor…
        </p>
      ) : tab === 'live' ? (
        <div className="space-y-4">
          <TacticalPanel className="p-4 sm:p-5">
            <p className={hudLabel}>Aktif oturumlar</p>
            {activeTrainings.length === 0 ? (
              <p className="mt-2 rounded border border-amber-500/30 bg-amber-950/20 px-3 py-2 font-mono-technical text-xs text-amber-200/90">
                Şu an aktif grup eğitimi yok. Geçmiş kayıtlar için &quot;Geçmiş ve kayıtlar&quot; sekmesine geçin.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {activeTrainings.map((training) => {
                  const sessionStatus = getOperatorTrainingSessionStatus(training, results, uid)
                  const styles = getOperatorSessionStatusStyles(sessionStatus.key)
                  const isSelected = selectedId === training.id
                  const isClosedForMe = sessionStatus.key === 'closed_for_me'

                  return (
                    <li key={training.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(training.id)}
                        className={[
                          'flex w-full items-start justify-between gap-3 rounded-lg border px-3 py-3 text-left transition',
                          isSelected ? styles.rowSelected : styles.row,
                          isClosedForMe ? 'opacity-85' : '',
                        ].join(' ')}
                      >
                        <span className="min-w-0">
                          <span
                            className={[
                              'block font-mono-technical text-sm font-semibold',
                              isClosedForMe ? 'text-zinc-400' : 'text-white',
                            ].join(' ')}
                          >
                            {training.trainingName}
                          </span>
                          <span className="mt-0.5 block font-mono-technical text-[9px] uppercase text-slate-500">
                            {training.level && training.level !== '—' ? `${training.level} · ` : ''}
                            {training.isTimed ? 'Zamanlı · ' : ''}
                            {formatTrainingDate(training.createdAt)}
                          </span>
                          <span className="mt-1 block font-mono-technical text-[8px] uppercase tracking-wide text-slate-600">
                            {sessionStatus.hint}
                          </span>
                        </span>
                        <span
                          className={[
                            'shrink-0 rounded border px-2 py-0.5 font-mono-technical text-[8px] font-bold uppercase tracking-wider',
                            styles.badge,
                          ].join(' ')}
                        >
                          {sessionStatus.label}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </TacticalPanel>

          {selected && selected.status === 'active' ? (
            <>
              <GroupTrainingDetailPanel training={selected} results={results} currentUid={uid} />

              {selectedSessionStatus?.key === 'closed_for_me' && myResultForSelected && mySelectedAssessment ? (
                <AmberAlert label="[ OTURUM_KAPALI ]">
                  Bu oturuma katıldınız — {myResultForSelected.hits}/{selected.totalAmmo} vuruş
                  {selected.isTimed && myResultForSelected.time != null
                    ? ` · ${myResultForSelected.time}s`
                    : ''}{' '}
                  · {formatGroupTrainingStatusLabel(mySelectedAssessment.statusResult, mySelectedAssessment.isPassed)}.
                  Oturum sizin için kapalı; yalnızca kayıtları görüntüleyebilirsiniz.
                </AmberAlert>
              ) : myResultForSelected && mySelectedAssessment ? (
                <AmberAlert label="[ KAYIT_MEVCUT ]">
                  Bu eğitime {myResultForSelected.hits}/{selected.totalAmmo} vuruş
                  {selected.isTimed && myResultForSelected.time != null
                    ? ` · ${myResultForSelected.time}s`
                    : ''}{' '}
                  ile {formatGroupTrainingStatusLabel(mySelectedAssessment.statusResult, mySelectedAssessment.isPassed)}{' '}
                  — sonuç gönderildi, düzenleme yapılamaz.
                </AmberAlert>
              ) : selectedSessionStatus?.key === 'open' ? (
                <form onSubmit={handleSubmit} className="space-y-4">
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
                        disabled={busy}
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
                            disabled={busy}
                          />
                        </div>
                      ) : null}
                    </div>

                    {msg ? (
                      <p className="mt-3 font-mono-technical text-xs text-[#00FF41]/90">{msg}</p>
                    ) : null}

                    <Button type="submit" variant="primary" className="mt-4 w-full" disabled={busy}>
                      {busy ? 'Gönderiliyor…' : 'Sonucu ilet'}
                    </Button>
                  </TacticalPanel>
                </form>
              ) : null}
            </>
          ) : null}
        </div>
      ) : (
        <div className="space-y-4">
          {historyTrainings.length === 0 ? (
            <TacticalPanel className="p-6 text-center">
              <p className="font-mono-technical text-xs text-slate-500">Henüz grup eğitimi kaydı yok.</p>
            </TacticalPanel>
          ) : (
            <TacticalPanel className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[32rem] text-left font-mono-technical text-[10px]">
                  <thead className="border-b border-white/10 bg-black/40 text-slate-500">
                    <tr>
                      <th className="px-3 py-2 font-bold uppercase tracking-wider">Eğitim</th>
                      <th className="px-3 py-2 font-bold uppercase tracking-wider">Durum</th>
                      <th className="px-3 py-2 font-bold uppercase tracking-wider">Tarih</th>
                      <th className="px-3 py-2 font-bold uppercase tracking-wider">Sizin sonucunuz</th>
                      <th className="px-3 py-2 font-bold uppercase tracking-wider">Katılım</th>
                      <th className="px-3 py-2 font-bold uppercase tracking-wider" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {historyTrainings.map((training) => {
                      const mine = results.find((r) => r.trainingId === training.id && r.operatorId === uid)
                      const mineAssessment = mine ? resolveResultAssessment(mine, training) : null
                      const count = results.filter((r) => r.trainingId === training.id).length
                      const sessionStatus = getOperatorTrainingSessionStatus(training, results, uid)
                      const sessionStyles = getOperatorSessionStatusStyles(sessionStatus.key)
                      return (
                        <tr
                          key={training.id}
                          className={[
                            detailId === training.id ? 'bg-[#00FF41]/[0.06]' : '',
                            sessionStatus.key === 'closed_for_me' ? 'bg-zinc-950/45 text-zinc-400' : '',
                            sessionStatus.key === 'completed' ? 'bg-slate-950/35 text-slate-400' : '',
                            sessionStatus.key === 'open' ? 'text-slate-300' : '',
                          ].join(' ')}
                        >
                          <td className="px-3 py-2.5">
                            <span className="font-semibold text-white">{training.trainingName}</span>
                            {training.level && training.level !== '—' ? (
                              <span className="mt-0.5 block text-slate-500">{training.level}</span>
                            ) : null}
                          </td>
                          <td className="px-3 py-2.5">
                            <span
                              className={[
                                'inline-flex rounded border px-2 py-0.5 font-mono-technical text-[8px] font-bold uppercase tracking-wider',
                                sessionStyles.badge,
                              ].join(' ')}
                            >
                              {sessionStatus.label}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-slate-500">{formatTrainingDate(training.createdAt)}</td>
                          <td className="px-3 py-2.5">
                            {mine && mineAssessment ? (
                              <span
                                className={
                                  mineAssessment.isPassed
                                    ? 'text-lime-400'
                                    : mineAssessment.statusResult === 'SÜRE İHLALİ'
                                      ? 'text-amber-400'
                                      : 'text-red-400'
                                }
                              >
                                {mine.hits}/{training.totalAmmo} ·{' '}
                                {formatGroupTrainingStatusLabel(
                                  mineAssessment.statusResult,
                                  mineAssessment.isPassed,
                                )}
                              </span>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 tabular-nums">{count} operatör</td>
                          <td className="px-3 py-2.5">
                            <button
                              type="button"
                              onClick={() => openDetail(training)}
                              className="inline-flex items-center gap-1 rounded border border-white/10 px-2 py-1 text-[9px] uppercase tracking-wider text-slate-400 transition hover:border-[#00FF41]/40 hover:text-[#00FF41]"
                            >
                              <Eye className="size-3" aria-hidden />
                              Detay
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </TacticalPanel>
          )}

          {detailTraining ? (
            <div className="space-y-3">
              <p className="font-mono-technical text-[9px] font-bold uppercase tracking-[0.28em] text-[#00FF41]/75">
                [ DETAY · {detailTraining.trainingName} ]
              </p>
              <GroupTrainingDetailPanel training={detailTraining} results={results} currentUid={uid} />
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
