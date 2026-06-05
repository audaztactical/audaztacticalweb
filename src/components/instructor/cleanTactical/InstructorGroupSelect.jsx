import { Users } from 'lucide-react'
import { ctInput, ctLabel } from './tokens'

/**
 * @param {{
 *   groups: { groupId: string; groupName: string; members?: string[] }[]
 *   value: string
 *   onChange: (id: string) => void
 *   id?: string
 *   className?: string
 * }} props
 */
export default function InstructorGroupSelect({
  groups,
  value,
  onChange,
  id = 'instructor-group-select',
  className = '',
}) {
  return (
    <label className={`block space-y-1.5 ${className}`} htmlFor={id}>
      <span className={`${ctLabel} inline-flex items-center gap-1.5`}>
        <Users className="size-3.5 text-zinc-500" aria-hidden />
        Aktif grup
      </span>
      <select
        id={id}
        className={ctInput}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={groups.length === 0}
      >
        {groups.length === 0 ? (
          <option value="">Önce grup oluşturun</option>
        ) : (
          groups.map((g) => (
            <option key={g.groupId} value={g.groupId}>
              {g.groupName} · {g.members?.length ?? 0} operatör
            </option>
          ))
        )}
      </select>
    </label>
  )
}
