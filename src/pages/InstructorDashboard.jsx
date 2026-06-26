import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  BarChart2,
  GraduationCap,
  Target,
  Users,
  UserCircle,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { fetchOperatorProfiles } from '../lib/firestoreInstructor'
import { subscribeInstructorGroups } from '../lib/firestoreGroups'
import { subscribeInstructorMergedGroupActivityLogs } from '../lib/firestoreGroupTraining'
import {
  subscribeInstructorMergedGroupTrainingResults,
  subscribeInstructorMergedGroupTrainings,
} from '../lib/firestoreGroupTrainings'
import { mergeInstructorGroupAnalytics } from '../lib/instructorGroupAnalytics'
import { emitFirebaseError } from '../lib/firebaseErrorBus'
import InstructorGroupsTab from '../components/instructor/tabs/InstructorGroupsTab'
import InstructorOperatorsTab from '../components/instructor/tabs/InstructorOperatorsTab'
import InstructorEgitimTab from '../components/instructor/tabs/InstructorEgitimTab'
import InstructorAnalyticsTab from '../components/instructor/tabs/InstructorAnalyticsTab'
import CleanFade from '../components/instructor/cleanTactical/CleanFade'
import {
  icHeaderEyebrow,
  icHeaderSubtitle,
  icHeaderTitle,
  icMainPanel,
  icNav,
  icNavBtn,
  icPage,
} from '../components/instructor/layout/instructorCommandTokens'

/** @typedef {import('../lib/firestoreInstructor').OperatorProfile} OperatorProfile */
/** @typedef {import('../lib/firestoreGroups').TacticalGroup} TacticalGroup */
/** @typedef {import('../lib/firestoreGroupTraining').GroupActivityLog} GroupActivityLog */
/** @typedef {import('../lib/firestoreGroupTrainings').TrainingResult} TrainingResult */
/** @typedef {import('../lib/firestoreGroupTrainings').GroupTraining} GroupTraining */

/** @typedef {'gruplar' | 'operatorler' | 'egitim' | 'basari'} InstructorTabId */

const NAV_ITEMS = [
  { id: /** @type {InstructorTabId} */ ('gruplar'), label: 'Gruplar', icon: Users },
  { id: 'operatorler', label: 'Operatör Raporlama', icon: UserCircle },
  { id: 'egitim', label: 'Eğitim', icon: Target },
  { id: 'basari', label: 'Analitik', icon: BarChart2 },
]

export default function InstructorDashboard() {
  const { user, userData } = useAuth()
  const [activeTab, setActiveTab] = useState(/** @type {InstructorTabId} */ ('operatorler'))
  const [selectedCategory, setSelectedCategory] = useState(/** @type {string | null} */ (null))

  const [groups, setGroups] = useState(/** @type {TacticalGroup[]} */ ([]))
  const [groupsLoading, setGroupsLoading] = useState(true)
  const [operators, setOperators] = useState(/** @type {OperatorProfile[]} */ ([]))
  const [operatorsLoading, setOperatorsLoading] = useState(true)
  const [activityLogs, setActivityLogs] = useState(/** @type {GroupActivityLog[]} */ ([]))
  const [trainingResults, setTrainingResults] = useState(/** @type {TrainingResult[]} */ ([]))
  const [groupTrainings, setGroupTrainings] = useState(/** @type {GroupTraining[]} */ ([]))
  const [logsLoading, setLogsLoading] = useState(false)

  const mergedActivityLogs = useMemo(
    () => mergeInstructorGroupAnalytics(activityLogs, trainingResults, groupTrainings),
    [activityLogs, trainingResults, groupTrainings],
  )

  const instructorName = (userData?.callsign || user?.displayName || 'Eğitmen').trim()
  const instructorId = user?.uid ?? ''

  useEffect(() => {
    if (!instructorId) {
      setGroups([])
      setGroupsLoading(false)
      return undefined
    }

    setGroupsLoading(true)
    const unsub = subscribeInstructorGroups(
      instructorId,
      (next) => {
        setGroups(next)
        setGroupsLoading(false)
      },
      (err) => {
        emitFirebaseError(err)
        setGroupsLoading(false)
      },
    )
    return unsub
  }, [instructorId])

  const loadOperators = useCallback(async () => {
    setOperatorsLoading(true)
    try {
      const profiles = await fetchOperatorProfiles()
      setOperators(profiles)
    } catch (err) {
      emitFirebaseError(err)
      setOperators([])
    } finally {
      setOperatorsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadOperators()
  }, [loadOperators])

  useEffect(() => {
    if (!groups.length) {
      setActivityLogs([])
      setTrainingResults([])
      setGroupTrainings([])
      setLogsLoading(false)
      return undefined
    }

    setLogsLoading(true)
    let pending = 3

    const markReady = () => {
      pending -= 1
      if (pending <= 0) setLogsLoading(false)
    }

    const groupIds = groups.map((g) => g.groupId)

    const unsubLogs = subscribeInstructorMergedGroupActivityLogs(
      groupIds,
      (next) => {
        setActivityLogs(next)
        markReady()
      },
      (err) => {
        emitFirebaseError(err)
        markReady()
      },
    )

    const unsubResults = subscribeInstructorMergedGroupTrainingResults(
      groupIds,
      (next) => {
        setTrainingResults(next)
        markReady()
      },
      (err) => {
        emitFirebaseError(err)
        markReady()
      },
    )

    const unsubTrainings = subscribeInstructorMergedGroupTrainings(
      groupIds,
      (next) => {
        setGroupTrainings(next)
        markReady()
      },
      (err) => {
        emitFirebaseError(err)
        markReady()
      },
    )

    return () => {
      unsubLogs()
      unsubResults()
      unsubTrainings()
    }
  }, [groups])

  useEffect(() => {
    if (activeTab !== 'egitim') setSelectedCategory(null)
  }, [activeTab])

  const tabPanel = useMemo(() => {
    switch (activeTab) {
      case 'gruplar':
        return <InstructorGroupsTab groups={groups} loading={groupsLoading} instructorId={instructorId} />
      case 'operatorler':
        return (
          <InstructorOperatorsTab
            groups={groups}
            operators={operators}
            activityLogs={mergedActivityLogs}
            loading={groupsLoading || operatorsLoading || logsLoading}
          />
        )
      case 'egitim':
        return (
          <InstructorEgitimTab
            groups={groups}
            operators={operators}
            instructorId={instructorId}
            selectedCategory={selectedCategory}
            onSelectedCategoryChange={setSelectedCategory}
          />
        )
      case 'basari':
        return <InstructorAnalyticsTab groups={groups} operators={operators} />
      default:
        return null
    }
  }, [
    activeTab,
    groups,
    groupsLoading,
    operators,
    operatorsLoading,
    mergedActivityLogs,
    logsLoading,
    instructorId,
    selectedCategory,
  ])

  return (
    <div className={`${icPage} min-w-0 overflow-x-hidden`}>
      <CleanFade>
        <header className="mb-8 border-b border-accent/15 pb-6">
          <p className={icHeaderEyebrow}>Eğitmen komuta merkezi</p>
          <h1 className={`${icHeaderTitle} mt-2 flex items-center gap-3`}>
            <GraduationCap className="size-7 text-accent/80" strokeWidth={1.5} aria-hidden />
            Eğitmen Kontrol Paneli
          </h1>
          <p className={icHeaderSubtitle}>
            Tek giriş noktası — grup yönetimi, canlı eğitim, operatör raporlama ve analitik · {instructorName}
          </p>
        </header>
      </CleanFade>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <nav className={icNav} aria-label="Eğitmen panel sekmeleri">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const active = activeTab === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={icNavBtn(active)}
                aria-current={active ? 'page' : undefined}
              >
                <Icon
                  className={`size-4 shrink-0 ${active ? 'text-accent' : 'text-app-text/45'}`}
                  strokeWidth={1.5}
                  aria-hidden
                />
                {item.label}
              </button>
            )
          })}
        </nav>

        <main className={icMainPanel}>
          <CleanFade key={activeTab + (selectedCategory ?? '')}>{tabPanel}</CleanFade>
        </main>
      </div>
    </div>
  )
}
