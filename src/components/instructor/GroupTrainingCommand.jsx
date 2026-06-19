import { useEffect, useMemo, useState } from 'react'
import { ClipboardList, Crosshair, Loader2, Target, Zap } from 'lucide-react'
import ProgressHudPanels from '../progress/ProgressHudPanels'
import { useAuth } from '../../context/AuthContext'
import {
  GROUP_TRAINING_DISCIPLINE_OPTIONS,
  createGroupTrainingTemplate,
  submitGroupActivityLog,
  subscribeGroupActivityLogs,
  subscribeGroupTrainingTemplates,
} from '../../lib/firestoreGroupTraining'
import { groupLogsToProgressRows } from '../../lib/groupActivityHud'
import { computeProgressStats, buildTrendSeries } from '../../lib/progressAnalytics'
import { buildLogsById } from '../../lib/progressTacticalTooltip'
import { emitFirebaseError } from '../../lib/firebaseErrorBus'

/** @typedef {import('../../lib/firestoreGroups').TacticalGroup} TacticalGroup */
/** @typedef {import('../../lib/firestoreInstructor').OperatorProfile} OperatorProfile */
/** @typedef {import('../../lib/firestoreGroupTraining').GroupTrainingTemplate} GroupTrainingTemplate */
/** @typedef {import('../../lib/firestoreGroupTraining').GroupActivityLog} GroupActivityLog */

const atisInputClass =
  'w-full rounded border border-accent/30 bg-app-bg px-2 py-2 font-mono-technical text-sm text-slate-100 outline-none placeholder:text-app-text/45 focus:border-accent/60'

const atisLabelClass = 'font-mono-technical text-[8px] font-bold uppercase tracking-[0.22em] text-app-text/55'

const atisSelectClass =
  'dossier-blood-select w-full rounded border border-accent/35 bg-app-bg py-2 pl-2 pr-8 font-mono-technical text-[11px] uppercase text-app-text outline-none focus:border-accent/60'

const criteriaBoxClass =
  'rounded border border-accent/20 bg-accent/[0.04] p-3 font-mono-technical text-[10px] uppercase text-app-text/70'

/**
 * @param {{
 *   groups: TacticalGroup[]
 *   operators: OperatorProfile[]
 *   instructorId: string
 * }} props
 */
export default function GroupTrainingCommand({ groups, operators, instructorId }) {
  const { user } = useAuth()

  const [activeGroupId, setActiveGroupId] = useState('')
  const [templates, setTemplates] = useState(/** @type {GroupTrainingTemplate[]} */ ([]))
  const [activityLogs, setActivityLogs] = useState(/** @type {GroupActivityLog[]} */ ([]))
  const [templatesLoading, setTemplatesLoading] = useState(false)
  const [logsLoading, setLogsLoading] = useState(false)

  const [tplDiscipline, setTplDiscipline] = useState('atis')
  const [tplDrillName, setTplDrillName] = useState('')
  const [tplTargetType, setTplTargetType] = useState('IPSC / Silüet')
  const [tplMaxSeconds, setTplMaxSeconds] = useState('3.5')
  const [tplTotalRounds, setTplTotalRounds] = useState('10')
  const [tplSaving, setTplSaving] = useState(false)
  const [tplMsg, setTplMsg] = useState('')

  const [logOperatorId, setLogOperatorId] = useState('')
  const [logTemplateId, setLogTemplateId] = useState('')
  const [logScore, setLogScore] = useState('')
  const [logDuration, setLogDuration] = useState('')
  const [logNotes, setLogNotes] = useState('')
  const [logSaving, setLogSaving] = useState(false)
  const [logMsg, setLogMsg] = useState('')

  const [hudOperatorId, setHudOperatorId] = useState('')
  const [hudExpandedPanel, setHudExpandedPanel] = useState(
    /** @type {'MATRIX' | 'RADAR' | 'WAVE' | 'TCCC' | 'TREND' | null} */ (null),
  )

  const activeGroup = useMemo(
    () => groups.find((g) => g.groupId === activeGroupId) ?? null,
    [groups, activeGroupId],
  )

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.templateId === logTemplateId) ?? null,
    [templates, logTemplateId],
  )

  const groupMembers = useMemo(() => {
    if (!activeGroup) return []
    const set = new Set(activeGroup.members)
    return operators.filter((op) => set.has(op.uid))
  }, [activeGroup, operators])

  useEffect(() => {
    if (groups.length > 0 && !activeGroupId) {
      setActiveGroupId(groups[0].groupId)
    }
  }, [groups, activeGroupId])

  useEffect(() => {
    if (!activeGroupId) {
      setTemplates([])
      return undefined
    }

    setTemplatesLoading(true)
    const unsub = subscribeGroupTrainingTemplates(
      activeGroupId,
      (next) => {
        setTemplates(next)
        setTemplatesLoading(false)
      },
      (err) => {
        emitFirebaseError(err)
        setTemplatesLoading(false)
      },
    )
    return unsub
  }, [activeGroupId])

  useEffect(() => {
    if (!activeGroupId) {
      setActivityLogs([])
      return undefined
    }

    setLogsLoading(true)
    const unsub = subscribeGroupActivityLogs(
      activeGroupId,
      (next) => {
        setActivityLogs(next)
        setLogsLoading(false)
      },
      (err) => {
        emitFirebaseError(err)
        setLogsLoading(false)
      },
    )
    return unsub
  }, [activeGroupId])

  useEffect(() => {
    if (groupMembers.length > 0 && !logOperatorId) {
      setLogOperatorId(groupMembers[0].uid)
      setHudOperatorId(groupMembers[0].uid)
    }
  }, [groupMembers, logOperatorId])

  useEffect(() => {
    if (templates.length > 0 && !logTemplateId) {
      setLogTemplateId(templates[0].templateId)
    }
  }, [templates, logTemplateId])

  const hudProgressLogs = useMemo(
    () => groupLogsToProgressRows(activityLogs, hudOperatorId || null),
    [activityLogs, hudOperatorId],
  )

  const hudStats = useMemo(() => computeProgressStats(hudProgressLogs, { activeDiscipline: 'all' }), [hudProgressLogs])
  const hudTrendSeries = useMemo(() => {
    const bars = buildTrendSeries(hudProgressLogs, 8)
    const byId = buildLogsById(hudProgressLogs)
    return bars.map((bar) => ({ ...bar, logRow: byId.get(bar.id) ?? null }))
  }, [hudProgressLogs])

  const handleCreateTemplate = async (e) => {
    e.preventDefault()
    setTplMsg('')
    if (!activeGroupId || !instructorId) return

    setTplSaving(true)
    try {
      await createGroupTrainingTemplate({
        instructorId,
        groupId: activeGroupId,
        discipline: /** @type {'atis' | 'cqb' | 'fof'} */ (tplDiscipline),
        drillName: tplDrillName,
        targetType: tplTargetType,
        maxSeconds: Number(tplMaxSeconds),
        totalRounds: Number(tplTotalRounds),
      })
      setTplMsg('ŞABLON KAYDEDİLDİ')
      setTplDrillName('')
    } catch (err) {
      emitFirebaseError(err)
      setTplMsg(err instanceof Error ? err.message : 'ŞABLON KAYDI BAŞARISIZ')
    } finally {
      setTplSaving(false)
    }
  }

  const handleSubmitLog = async (e) => {
    e.preventDefault()
    setLogMsg('')
    if (!activeGroupId || !instructorId || !selectedTemplate || !logOperatorId) return

    const score = Number(logScore)
    const duration = Number(logDuration)
    if (!Number.isFinite(score) || score < 0) {
      setLogMsg('VURUŞ SAYISI GEÇERSİZ')
      return
    }
    if (!Number.isFinite(duration) || duration < 0) {
      setLogMsg('SÜRE GEÇERSİZ')
      return
    }

    setLogSaving(true)
    try {
      await submitGroupActivityLog({
        groupId: activeGroupId,
        operatorId: logOperatorId,
        templateId: selectedTemplate.templateId,
        instructorId,
        score,
        duration,
        instructorNotes: logNotes,
        template: selectedTemplate,
      })
      setLogMsg('EĞİTİM KAYDI SİSTEME İŞLENDİ')
      setLogScore('')
      setLogDuration('')
      setLogNotes('')
    } catch (err) {
      emitFirebaseError(err)
      setLogMsg(err instanceof Error ? err.message : 'KAYIT BAŞARISIZ')
    } finally {
      setLogSaving(false)
    }
  }

  const disciplineLabel =
    GROUP_TRAINING_DISCIPLINE_OPTIONS.find((o) => o.id === selectedTemplate?.discipline)?.label ?? '—'

  if (!user?.uid) {
    return (
      <p className="font-mono text-[10px] uppercase text-app-text/45">OTURUM GEREKLİ · GRUP EĞİTİM KOMUTASI</p>
    )
  }

  return (
    <section className="space-y-4 rounded-xl border border-accent/25 bg-slate-950/95 p-4 shadow-[0_0_24px_-8px_color-mix(in_srgb,var(--accent-color)_35%,transparent)]]">
      <header className="flex flex-col gap-3 border-b border-accent/15 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="font-mono-technical text-[10px] font-bold uppercase tracking-[0.28em] text-accent/90">
            [ GRUP EĞİTİM & EĞİTMEN LOG · AKADEMİK KOMUTA ]
          </p>
          <p className="max-w-xl font-mono text-[10px] leading-relaxed text-app-text/55">
            Kişisel antrenman loglarından bağımsız · yalnızca eğitmen onaylı grup metrikleri
          </p>
        </div>
        <label className="w-full space-y-1 sm:max-w-xs">
          <span className={atisLabelClass}>Aktif Grup</span>
          <select
            value={activeGroupId}
            onChange={(e) => {
              setActiveGroupId(e.target.value)
              setLogOperatorId('')
              setLogTemplateId('')
              setHudOperatorId('')
            }}
            disabled={groups.length === 0}
            className={atisSelectClass}
          >
            {groups.length === 0 ? (
              <option value="">ÖNCE GRUP OLUŞTURUN</option>
            ) : (
              groups.map((g) => (
                <option key={g.groupId} value={g.groupId}>
                  {g.groupName} · {g.members.length} ÜYE
                </option>
              ))
            )}
          </select>
        </label>
      </header>

      {!activeGroup ? (
        <p className="py-8 text-center font-mono text-[10px] uppercase text-app-text/45">AKTİF GRUP SEÇİN</p>
      ) : (
        <>
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-lg border border-accent/20 bg-app-bg/90 p-4">
              <p className="mb-3 flex items-center gap-2 border-b border-accent/15 pb-2 font-mono-technical text-[9px] font-bold uppercase tracking-[0.22em] text-accent">
                <ClipboardList className="size-4" strokeWidth={1.5} aria-hidden />
                [ 📑 AKADEMİ EĞİTİM ŞABLONU OLUŞTUR ]
              </p>
              <form onSubmit={handleCreateTemplate} className="space-y-3">
                <label className="block space-y-1">
                  <span className={atisLabelClass}>Disiplin</span>
                  <select
                    value={tplDiscipline}
                    onChange={(e) => setTplDiscipline(e.target.value)}
                    className={atisSelectClass}
                  >
                    {GROUP_TRAINING_DISCIPLINE_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-1">
                  <span className={atisLabelClass}>Drill Adı</span>
                  <input
                    className={atisInputClass}
                    placeholder='örn. "15m Double Tap"'
                    value={tplDrillName}
                    onChange={(e) => setTplDrillName(e.target.value)}
                    required
                  />
                </label>
                <label className="block space-y-1">
                  <span className={atisLabelClass}>Hedef Tipi</span>
                  <input
                    className={atisInputClass}
                    value={tplTargetType}
                    onChange={(e) => setTplTargetType(e.target.value)}
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block space-y-1">
                    <span className={atisLabelClass}>Max Geçme Süresi (SN)</span>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      className={`${atisInputClass} tabular-nums`}
                      value={tplMaxSeconds}
                      onChange={(e) => setTplMaxSeconds(e.target.value)}
                      required
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className={atisLabelClass}>Toplam Hedef Mermisi</span>
                    <input
                      type="number"
                      min={1}
                      className={`${atisInputClass} tabular-nums`}
                      value={tplTotalRounds}
                      onChange={(e) => setTplTotalRounds(e.target.value)}
                      required
                    />
                  </label>
                </div>
                <button
                  type="submit"
                  disabled={tplSaving}
                  className="w-full rounded border border-accent/50 bg-accent/10 py-2 font-mono-technical text-[10px] font-bold uppercase tracking-wider text-accent transition hover:bg-accent/20 disabled:opacity-50"
                >
                  {tplSaving ? '…' : 'ŞABLONU KAYDET'}
                </button>
                {tplMsg ? (
                  <p
                    className={[
                      'font-mono text-[9px] font-bold uppercase',
                      tplMsg.includes('KAYDEDİLDİ') ? 'text-emerald-400' : 'text-red-400',
                    ].join(' ')}
                  >
                    {tplMsg}
                  </p>
                ) : null}
                {templatesLoading ? (
                  <p className="flex items-center gap-2 font-mono text-[9px] uppercase text-app-text/55">
                    <Loader2 className="size-3 animate-spin text-accent" aria-hidden />
                    Şablonlar yükleniyor…
                  </p>
                ) : (
                  <p className="font-mono text-[9px] uppercase text-app-text/45">
                    {templates.length} KAYITLI ŞABLON
                  </p>
                )}
              </form>
            </div>

            <div className="rounded-lg border border-accent/25 bg-app-bg/90 p-4">
              <p className="mb-3 flex items-center gap-2 border-b border-accent/15 pb-2 font-mono-technical text-[9px] font-bold uppercase tracking-[0.22em] text-app-text">
                <Zap className="size-4 text-accent" strokeWidth={1.5} aria-hidden />
                [ HIZLI TAKIM LOG KONSOLU · 40-OPERATÖR MATRİS ]
              </p>
              <form onSubmit={handleSubmitLog} className="space-y-3">
                <p className="font-mono text-[8px] font-bold uppercase tracking-wider text-amber-500/80">
                  ADIM 1 · OPERATÖR
                </p>
                <select
                  value={logOperatorId}
                  onChange={(e) => setLogOperatorId(e.target.value)}
                  className={atisSelectClass}
                  required
                  disabled={groupMembers.length === 0}
                >
                  {groupMembers.length === 0 ? (
                    <option value="">GRUPTA ÜYE YOK</option>
                  ) : (
                    groupMembers.map((op) => (
                      <option key={op.uid} value={op.uid}>
                        {op.callsign || op.username || op.uid.slice(0, 8)}
                      </option>
                    ))
                  )}
                </select>

                <p className="font-mono text-[8px] font-bold uppercase tracking-wider text-amber-500/80">
                  ADIM 2 · DRİLL ŞABLONU
                </p>
                <select
                  value={logTemplateId}
                  onChange={(e) => setLogTemplateId(e.target.value)}
                  className={atisSelectClass}
                  required
                  disabled={templates.length === 0}
                >
                  {templates.length === 0 ? (
                    <option value="">ÖNCE ŞABLON OLUŞTURUN</option>
                  ) : (
                    templates.map((t) => (
                      <option key={t.templateId} value={t.templateId}>
                        [{t.discipline.toUpperCase()}] {t.drillName}
                      </option>
                    ))
                  )}
                </select>

                <p className="font-mono text-[8px] font-bold uppercase tracking-wider text-accent/80">
                  ADIM 3 · OTOMATİK KRİTER (ŞABLONDAN)
                </p>
                {selectedTemplate ? (
                  <div className={criteriaBoxClass}>
                    <p className="text-accent">{disciplineLabel} · {selectedTemplate.drillName}</p>
                    <p className="mt-1">
                      Hedef: {selectedTemplate.criticalMetrics.targetType || '—'} · Max{' '}
                      {selectedTemplate.criticalMetrics.maxSeconds}s · {selectedTemplate.criticalMetrics.totalRounds}{' '}
                      mermi
                    </p>
                  </div>
                ) : (
                  <div className={criteriaBoxClass}>ŞABLON SEÇİN</div>
                )}

                <p className="font-mono text-[8px] font-bold uppercase tracking-wider text-app-text/70">
                  ADIM 4 · MANUEL GİRİŞ
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block space-y-1">
                    <span className={atisLabelClass}>Vuruş Sayısı / Skor</span>
                    <input
                      type="number"
                      min={0}
                      max={selectedTemplate?.criticalMetrics.totalRounds ?? 999}
                      className={`${atisInputClass} tabular-nums`}
                      value={logScore}
                      onChange={(e) => setLogScore(e.target.value)}
                      required
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className={atisLabelClass}>Geçen Süre (Saniye)</span>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      className={`${atisInputClass} tabular-nums`}
                      value={logDuration}
                      onChange={(e) => setLogDuration(e.target.value)}
                      required
                    />
                  </label>
                </div>

                <label className="block space-y-1">
                  <span className={atisLabelClass}>Eğitmen Notu (Opsiyonel)</span>
                  <textarea
                    className={`${atisInputClass} min-h-[4rem] resize-y normal-case`}
                    value={logNotes}
                    onChange={(e) => setLogNotes(e.target.value)}
                    placeholder="Taktik geri bildirim…"
                  />
                </label>

                <button
                  type="submit"
                  disabled={logSaving || !selectedTemplate || groupMembers.length === 0}
                  className="inline-flex w-full items-center justify-center gap-2 rounded border border-amber-500/50 bg-amber-950/50 py-2.5 font-mono-technical text-[10px] font-bold uppercase tracking-wider text-amber-300 shadow-[0_0_20px_-6px_rgba(255,180,0,0.4)] transition hover:border-amber-400/70 disabled:opacity-50"
                >
                  {logSaving ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <Target className="size-4" strokeWidth={1.5} aria-hidden />
                  )}
                  EĞİTİM KAYDINI SİSTEME İŞLE
                </button>
                {logMsg ? (
                  <p
                    className={[
                      'font-mono text-[9px] font-bold uppercase',
                      logMsg.includes('İŞLENDİ') ? 'text-emerald-400' : 'text-red-400',
                    ].join(' ')}
                  >
                    {logMsg}
                  </p>
                ) : null}
              </form>
            </div>
          </div>

          <div className="rounded-xl border border-emerald-900/35 bg-slate-950/80 p-4">
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <p className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-400">
                <Crosshair className="size-4" strokeWidth={1.5} aria-hidden />
                [ AKADEMİK İLERLEME HUD · group_activity_logs ]
              </p>
              <label className="w-full space-y-1 sm:max-w-xs">
                <span className={atisLabelClass}>HUD Operatörü</span>
                <select
                  value={hudOperatorId}
                  onChange={(e) => setHudOperatorId(e.target.value)}
                  className={atisSelectClass}
                  disabled={groupMembers.length === 0}
                >
                  {groupMembers.map((op) => (
                    <option key={op.uid} value={op.uid}>
                      {op.callsign || op.username}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { label: 'GENEL BAŞARI', value: `%${hudStats.overallSuccess}` },
                { label: 'ATIŞ', value: `%${hudStats.disciplineSuccess.atis}` },
                { label: 'CQB', value: `%${hudStats.disciplineSuccess.cqb}` },
                { label: 'FoF', value: `%${hudStats.disciplineSuccess.fof}` },
              ].map((kpi) => (
                <div
                  key={kpi.label}
                  className="rounded-lg border border-slate-800/80 bg-black/35 px-2.5 py-2"
                >
                  <p className="font-mono text-[8px] uppercase text-app-text/55">{kpi.label}</p>
                  <p className="mt-1 font-mono text-lg font-black tabular-nums text-emerald-400">{kpi.value}</p>
                </div>
              ))}
            </div>

            {logsLoading ? (
              <p className="mb-2 flex items-center gap-2 font-mono text-[9px] uppercase text-amber-400/90">
                <Loader2 className="size-3 animate-spin" aria-hidden />
                GRUP LOG AKIŞI SENKRONİZE EDİLİYOR…
              </p>
            ) : null}

            <div className="min-h-[min(42vh,420px)] overflow-hidden rounded-lg border border-emerald-900/30 bg-black/40 p-2">
              {hudProgressLogs.length === 0 ? (
                <p className="flex h-40 items-center justify-center font-mono text-[10px] uppercase text-app-text/45">
                  BU OPERATÖR İÇİN AKADEMİK KAYIT YOK
                </p>
              ) : (
                <ProgressHudPanels
                  logs={hudProgressLogs}
                  focusedLogId={null}
                  radarLogs={hudProgressLogs}
                  expandedPanel={hudExpandedPanel}
                  onExpandedPanelChange={setHudExpandedPanel}
                  trendSeries={hudTrendSeries}
                  barsAnimate
                />
              )}
            </div>
          </div>
        </>
      )}
    </section>
  )
}
