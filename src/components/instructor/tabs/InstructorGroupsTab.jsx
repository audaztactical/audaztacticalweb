import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Edit2, Loader2, Plus, Trash2, Users } from 'lucide-react'
import {
  createTacticalGroup,
  deleteTacticalGroup,
  updateTacticalGroup,
} from '../../../lib/firestoreGroups'
import { emitFirebaseError } from '../../../lib/firebaseErrorBus'

/** @typedef {import('../../../lib/firestoreGroups').TacticalGroup} TacticalGroup */

const inputClass =
  'w-full rounded-sm border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-app-text outline-none transition-colors focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/25'

/**
 * @param {{
 *   groups: TacticalGroup[]
 *   loading: boolean
 *   instructorId: string
 * }} props
 */
export default function InstructorGroupsTab({ groups, loading, instructorId }) {
  const { t } = useTranslation('instructor')
  const [groupName, setGroupName] = useState('')
  const [groupPassword, setGroupPassword] = useState('')
  const [creating, setCreating] = useState(false)
  const [formMsg, setFormMsg] = useState('')
  const [formMsgOk, setFormMsgOk] = useState(false)

  const [editingId, setEditingId] = useState(/** @type {string | null} */ (null))
  const [editName, setEditName] = useState('')
  const [editPassword, setEditPassword] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [deletingId, setDeletingId] = useState(/** @type {string | null} */ (null))

  const [visiblePasswords, setVisiblePasswords] = useState(/** @type {Record<string, boolean>} */ ({}))

  const maskPassword = (password) => {
    const value = String(password ?? '')
    if (!value) return '****'
    return value.replace(/./g, '*')
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setFormMsg('')
    setFormMsgOk(false)
    if (!instructorId) return
    setCreating(true)
    try {
      const created = await createTacticalGroup(instructorId, groupName, groupPassword)
      setFormMsg(t('groups.createdSuccess', { name: created.groupName }))
      setFormMsgOk(true)
      setGroupName('')
      setGroupPassword('')
    } catch (err) {
      emitFirebaseError(err)
      setFormMsg(err instanceof Error ? err.message : t('groups.createFailed'))
      setFormMsgOk(false)
    } finally {
      setCreating(false)
    }
  }

  const startEdit = (g) => {
    setEditingId(g.groupId)
    setEditName(g.groupName)
    setEditPassword(g.groupPassword)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditName('')
    setEditPassword('')
  }

  const handleSaveEdit = async (groupId) => {
    setSavingEdit(true)
    try {
      await updateTacticalGroup(groupId, {
        groupName: editName,
        groupPassword: editPassword,
      })
      cancelEdit()
    } catch (err) {
      emitFirebaseError(err)
    } finally {
      setSavingEdit(false)
    }
  }

  const handleDelete = async (g) => {
    const ok = window.confirm(t('groups.deleteConfirm', { name: g.groupName }))
    if (!ok) return
    setDeletingId(g.groupId)
    try {
      await deleteTacticalGroup(g.groupId)
    } catch (err) {
      emitFirebaseError(err)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-amber-900/35 bg-slate-950/90 p-4">
        <p className="mb-3 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-amber-400">
          <Plus className="size-4" strokeWidth={1.5} aria-hidden />
          {t('groups.createTitle')}
        </p>
        <form onSubmit={handleCreate} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto]">
          <label className="space-y-1.5">
            <span className="font-mono text-[9px] font-bold uppercase text-app-text/55">
              {t('groups.nameLabel')}
            </span>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder={t('groups.namePlaceholder')}
              className={inputClass}
              required
            />
          </label>
          <label className="space-y-1.5">
            <span className="font-mono text-[9px] font-bold uppercase text-app-text/55">
              {t('groups.passwordLabel')}
            </span>
            <input
              type="text"
              value={groupPassword}
              onChange={(e) => setGroupPassword(e.target.value.toUpperCase())}
              placeholder={t('groups.passwordPlaceholder')}
              className={inputClass}
              required
              minLength={4}
            />
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={creating}
              className="h-[42px] w-full rounded border border-amber-500/45 bg-amber-950/50 px-4 font-mono text-[10px] font-bold uppercase tracking-wider text-amber-300 transition hover:border-amber-400/70 disabled:opacity-50 sm:w-auto"
            >
              {creating ? t('groups.creating') : t('groups.createButton')}
            </button>
          </div>
        </form>
        {formMsg ? (
          <p
            className={[
              'mt-3 font-mono text-[9px] font-bold uppercase',
              formMsgOk ? 'text-emerald-400' : 'text-red-400',
            ].join(' ')}
          >
            {formMsg}
          </p>
        ) : null}
      </section>

      <section className="rounded-xl border border-amber-900/25 bg-slate-950/60 p-4">
        <p className="mb-4 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-app-text/70">
          {t('groups.listTitle', { count: groups.length })}
        </p>
        {loading ? (
          <p className="flex items-center gap-2 py-12 font-mono text-[10px] uppercase text-app-text/55">
            <Loader2 className="size-4 animate-spin text-amber-400" aria-hidden />
            {t('groups.loading')}
          </p>
        ) : groups.length === 0 ? (
          <p className="py-10 text-center font-mono text-[10px] uppercase text-app-text/45">
            {t('groups.empty')}
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {groups.map((g) => {
              const editing = editingId === g.groupId
              const visible = visiblePasswords[g.groupId] === true
              return (
                <article
                  key={g.groupId}
                  className="rounded-lg border border-slate-800/90 bg-black/35 p-3"
                >
                  {editing ? (
                    <div className="space-y-2">
                      <input
                        className={inputClass}
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                      <input
                        className={inputClass}
                        value={editPassword}
                        onChange={(e) => setEditPassword(e.target.value.toUpperCase())}
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={savingEdit}
                          onClick={() => handleSaveEdit(g.groupId)}
                          className="flex-1 rounded border border-emerald-600/50 bg-emerald-950/40 py-1.5 font-mono text-[9px] font-bold uppercase text-emerald-300"
                        >
                          {t('groups.save')}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="rounded border border-slate-700 px-3 py-1.5 font-mono text-[9px] uppercase text-app-text/70"
                        >
                          {t('groups.cancel')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="truncate font-mono text-sm font-bold uppercase text-amber-200">{g.groupName}</p>
                      <p className="mt-1 flex items-center gap-1.5 font-mono text-[9px] text-app-text/55">
                        <Users className="size-3" aria-hidden />
                        {t('groups.memberCount', { count: g.members.length })}
                      </p>
                      <p className="mt-2 inline-flex items-center rounded border border-amber-800/50 bg-amber-950/30 px-2 py-0.5 font-mono text-[10px] font-bold tracking-widest text-amber-300">
                        {visible ? g.groupPassword : maskPassword(g.groupPassword)}
                        <button
                          type="button"
                          onClick={() =>
                            setVisiblePasswords((p) => ({ ...p, [g.groupId]: !p[g.groupId] }))
                          }
                          className="ml-2 border-0 bg-transparent p-0"
                          aria-label={t('groups.passwordVisibilityAria')}
                        >
                          {visible ? (
                            <i className="fas fa-eye-slash text-emerald-500 text-xs" />
                          ) : (
                            <i className="fas fa-eye text-amber-500/70 text-xs" />
                          )}
                        </button>
                      </p>
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(g)}
                          className="inline-flex items-center gap-1 rounded border border-slate-700 px-2 py-1 font-mono text-[9px] uppercase text-app-text/90 hover:border-amber-700/50"
                          aria-label={t('groups.editAria')}
                        >
                          <Edit2 className="size-3.5 text-amber-400" aria-hidden />
                          {t('groups.edit')}
                        </button>
                        <button
                          type="button"
                          disabled={deletingId === g.groupId}
                          onClick={() => handleDelete(g)}
                          className="inline-flex items-center gap-1 rounded border border-red-900/50 bg-red-950/30 px-2 py-1 font-mono text-[9px] uppercase text-red-300 hover:border-red-600/60 disabled:opacity-50"
                          aria-label={t('groups.deleteAria')}
                        >
                          {deletingId === g.groupId ? (
                            <Loader2 className="size-3.5 animate-spin" aria-hidden />
                          ) : (
                            <Trash2 className="size-3.5" aria-hidden />
                          )}
                          {t('groups.delete')}
                        </button>
                      </div>
                    </>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
