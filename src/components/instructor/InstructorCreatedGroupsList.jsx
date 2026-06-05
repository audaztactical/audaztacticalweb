import { useState } from 'react'
import { Loader2, Users } from 'lucide-react'

/** @typedef {import('../../lib/firestoreGroups').TacticalGroup} TacticalGroup */

/**
 * @param {{ groups: TacticalGroup[]; loading?: boolean }} props
 */
export default function InstructorCreatedGroupsList({ groups, loading = false }) {
  const [visiblePasswords, setVisiblePasswords] = useState(/** @type {Record<string, boolean>} */ ({}))

  const togglePasswordVisibility = (groupId) => {
    setVisiblePasswords((prev) => ({ ...prev, [groupId]: !prev[groupId] }))
  }

  const maskPassword = (password) => {
    const value = String(password ?? '')
    if (!value) return '****'
    return value.replace(/./g, '*')
  }

  return (
    <div className="mt-4 border-t border-amber-900/25 pt-4">
      <p className="mb-2 font-mono text-[9px] font-bold uppercase tracking-wider text-slate-500">
        EĞİTMEN GRUPLARINIZ
      </p>
      {loading ? (
        <p className="flex items-center gap-2 font-mono text-[10px] uppercase text-slate-500">
          <Loader2 className="size-4 animate-spin text-amber-400" aria-hidden />
          GRUPLAR YÜKLENİYOR…
        </p>
      ) : groups.length === 0 ? (
        <p className="font-mono text-[10px] uppercase text-slate-600">HENÜZ GRUP YOK</p>
      ) : (
        <ul className="space-y-2">
          {groups.map((g) => {
            const visible = visiblePasswords[g.groupId] === true
            return (
              <li
                key={g.groupId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800/80 bg-black/30 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate font-mono text-xs font-bold uppercase text-amber-200">{g.groupName}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 font-mono text-[9px] text-slate-500">
                    <Users className="size-3 shrink-0" aria-hidden />
                    {g.members.length} ÜYE
                  </p>
                </div>
                <div className="flex shrink-0 items-center rounded border border-amber-700/50 bg-amber-950/40 px-2 py-1">
                  <span className="font-mono text-[10px] font-bold tracking-widest text-amber-300">
                    {visible ? g.groupPassword : maskPassword(g.groupPassword)}
                  </span>
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility(g.groupId)}
                    className="ml-2 border-0 bg-transparent p-0"
                    aria-label={visible ? 'Şifreyi gizle' : 'Şifreyi göster'}
                  >
                    {visible ? (
                      <i className="fas fa-eye-slash text-emerald-500 hover:text-emerald-400 cursor-pointer transition-colors" />
                    ) : (
                      <i className="fas fa-eye text-amber-500/70 hover:text-amber-400 cursor-pointer transition-colors" />
                    )}
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
