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
import { emitFirebaseError } from '../lib/firebaseErrorBus'
import InstructorGroupsTab from '../components/instructor/tabs/InstructorGroupsTab'
import InstructorOperatorsTab from '../components/instructor/tabs/InstructorOperatorsTab'
import InstructorEgitimTab from '../components/instructor/tabs/InstructorEgitimTab'
import InstructorAnalyticsTab from '../components/instructor/tabs/InstructorAnalyticsTab'
import CleanFade from '../components/instructor/cleanTactical/CleanFade'
import {
  ctHeaderEyebrow,
  ctHeaderSubtitle,
  ctHeaderTitle,
  ctMainPanel,
  ctNav,
  ctNavBtn,
  ctPage,
} from '../components/instructor/cleanTactical/tokens'

/** @typedef {import('../lib/firestoreInstructor').OperatorProfile} OperatorProfile */
/** @typedef {import('../lib/firestoreGroups').TacticalGroup} TacticalGroup */
/** @typedef {import('../lib/firestoreGroupTraining').GroupActivityLog} GroupActivityLog */

/** @typedef {'gruplar' | 'operatorler' | 'egitim' | 'basari'} InstructorTabId */

const NAV_ITEMS = [
  { id: /** @type {InstructorTabId} */ ('gruplar'), label: 'Gruplar', icon: Users },
  { id: 'operatorler', label: 'Operatörler', icon: UserCircle },
  { id: 'egitim', label: 'Eğitim', icon: Target },
  { id: 'basari', label: 'Analitik', icon: BarChart2 },
]

export default function InstructorDashboard() {
  const { user, userData } = useAuth()
  const [activeTab, setActiveTab] = useState(/** @type {InstructorTabId} */ ('egitim'))
  const [selectedCategory, setSelectedCategory] = useState(/** @type {string | null} */ (null))

  const [groups, setGroups] = useState(/** @type {TacticalGroup[]} */ ([]))
  const [groupsLoading, setGroupsLoading] = useState(true)
  const [operators, setOperators] = useState(/** @type {OperatorProfile[]} */ ([]))
  const [operatorsLoading, setOperatorsLoading] = useState(true)
  const [activityLogs, setActivityLogs] = useState(/** @type {GroupActivityLog[]} */ ([]))
  const [logsLoading, setLogsLoading] = useState(false)

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
      setLogsLoading(false)
      return undefined
    }

    setLogsLoading(true)
    const groupIds = groups.map((g) => g.groupId)
    const unsub = subscribeInstructorMergedGroupActivityLogs(
      groupIds,
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
            activityLogs={activityLogs}
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
    activityLogs,
    logsLoading,
    instructorId,
    selectedCategory,
  ])

  return (
    <div className={ctPage}>
      <CleanFade>
        <header className="mb-8 border-b border-zinc-800 pb-6">
          <p className={ctHeaderEyebrow}>Eğitmen komuta</p>
          <h1 className={`${ctHeaderTitle} mt-2 flex items-center gap-3`}>
            <GraduationCap className="size-7 text-zinc-400" strokeWidth={1.5} aria-hidden />
            Eğitmen paneli
          </h1>
          <p className={ctHeaderSubtitle}>
            Grup yönetimi, sektör eğitimleri ve canlı oturum takibi — {instructorName}
          </p>
        </header>
      </CleanFade>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <nav className={ctNav} aria-label="Eğitmen panel sekmeleri">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const active = activeTab === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={ctNavBtn(active)}
                aria-current={active ? 'page' : undefined}
              >
                <Icon className="size-4 shrink-0 text-zinc-500" strokeWidth={1.5} aria-hidden />
                {item.label}
              </button>
            )
          })}
        </nav>

        <main className={ctMainPanel}>
          <CleanFade key={activeTab + (selectedCategory ?? '')}>{tabPanel}</CleanFade>
        </main>
      </div>
    </div>
  )
}
