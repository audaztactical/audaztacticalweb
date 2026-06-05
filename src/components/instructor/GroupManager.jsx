import { useEffect, useState } from 'react'
import { Loader2, Shield } from 'lucide-react'
import InstructorCreatedGroupsList from './InstructorCreatedGroupsList'
import { useAuth } from '../../context/AuthContext'
import { createTacticalGroup, subscribeInstructorGroups } from '../../lib/firestoreGroups'
import { emitFirebaseError } from '../../lib/firebaseErrorBus'

const inputClass =
  'w-full rounded-sm border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-slate-200 outline-none transition-colors focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/25'

/**
 * @param {{ onGroupsChange?: (groups: import('../../lib/firestoreGroups').TacticalGroup[]) => void }} props
 */
export default function GroupManager({ onGroupsChange }) {
  const { user } = useAuth()
  const instructorId = user?.uid ?? ''

  const [groupName, setGroupName] = useState('')
  const [groupPassword, setGroupPassword] = useState('')
  const [groups, setGroups] = useState(/** @type {import('../../lib/firestoreGroups').TacticalGroup[]} */ ([]))
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [formMsg, setFormMsg] = useState('')

  useEffect(() => {
    if (!instructorId) {
      setGroups([])
      setLoading(false)
      return undefined
    }

    setLoading(true)
    const unsub = subscribeInstructorGroups(
      instructorId,
      (next) => {
        setGroups(next)
        onGroupsChange?.(next)
        setLoading(false)
      },
      (err) => {
        emitFirebaseError(err)
        setLoading(false)
      },
    )

    return unsub
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setState stabil
  }, [instructorId])

  const handleCreate = async (e) => {
    e.preventDefault()
    setFormMsg('')
    if (!instructorId) return

    setSubmitting(true)
    try {
      const created = await createTacticalGroup(instructorId, groupName, groupPassword)
      setFormMsg(`• [BAŞARILI]: "${created.groupName}" oluşturuldu · KOD: ${created.groupPassword}`)
      setGroupName('')
      setGroupPassword('')
    } catch (err) {
      emitFirebaseError(err)
      setFormMsg(err instanceof Error ? err.message : 'Grup oluşturulamadı')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="rounded-xl border border-amber-900/35 bg-slate-950/90 p-4 shadow-[0_0_32px_-14px_rgba(255,180,0,0.2)]">
      <p className="mb-3 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-amber-400">
        <Shield className="size-4 shrink-0" strokeWidth={1.5} aria-hidden />
        [ GRUP OLUŞTURMA & ATAMA ]
      </p>

      <form onSubmit={handleCreate} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto]">
        <label className="space-y-1.5">
          <span className="font-mono text-[9px] font-bold uppercase text-slate-500">Grup Adı</span>
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="ÖRN: MESKÛN MAHAL A TİMİ"
            className={inputClass}
            required
          />
        </label>
        <label className="space-y-1.5">
          <span className="font-mono text-[9px] font-bold uppercase text-slate-500">Grup Katılım Şifresi</span>
          <input
            type="text"
            value={groupPassword}
            onChange={(e) => setGroupPassword(e.target.value.toUpperCase())}
            placeholder="ÖRN: ALPHA99"
            className={inputClass}
            required
            minLength={4}
          />
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={submitting}
            className="h-[42px] w-full rounded border border-amber-500/45 bg-amber-950/50 px-4 font-mono text-[10px] font-bold uppercase tracking-wider text-amber-300 transition hover:border-amber-400/70 disabled:opacity-50 sm:w-auto"
          >
            {submitting ? '…' : 'GRUP OLUŞTUR'}
          </button>
        </div>
      </form>

      {formMsg ? (
        <p
          className={[
            'mt-3 font-mono text-[9px] font-bold uppercase',
            formMsg.includes('BAŞARILI') ? 'text-emerald-400' : 'text-red-400',
          ].join(' ')}
        >
          {formMsg}
        </p>
      ) : null}

      <InstructorCreatedGroupsList groups={groups} loading={loading} />
    </section>
  )
}
