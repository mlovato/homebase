'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { User, UserRole } from '@/lib/types'

const inputClass = 'px-3 py-2 rounded-lg retro:rounded-none border border-gray-300 dark:border-gray-600 retro:border-retro-dim bg-white dark:bg-gray-700 retro:bg-retro-bg text-gray-900 dark:text-gray-100 retro:text-retro-green focus:outline-none focus:ring-2 focus:ring-indigo-500 retro:focus:ring-retro-green text-sm'

interface UsersTabProps {
  showError: (msg: string) => void
}

type Modal =
  | { type: 'none' }
  | { type: 'create' }
  | { type: 'edit'; user: User }

export function UsersTab({ showError }: UsersTabProps) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<Modal>({ type: 'none' })

  const loadUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/users')
      if (!res.ok) { showError('Failed to load users'); return }
      setUsers(await res.json())
    } catch {
      showError('Network error loading users')
    }
  }, [showError])

  useEffect(() => {
    loadUsers().finally(() => setLoading(false))
  }, [loadUsers])

  async function handleDelete(user: User) {
    if (!confirm(`Delete user "${user.email}"? All their data will be permanently removed.`)) return
    try {
      const res = await fetch(`/api/users/${user.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        showError(data.error ?? 'Failed to delete user')
        return
      }
      await loadUsers()
    } catch {
      showError('Network error deleting user')
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl">
        <h2 className="text-xl font-semibold retro:text-retro-green mb-8">Users</h2>
        <p className="text-gray-500 dark:text-gray-400 retro:text-retro-dim text-sm">Loading…</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-xl font-semibold retro:text-retro-green">Users</h2>
        <button
          onClick={() => setModal({ type: 'create' })}
          className="px-4 py-2 rounded-lg retro:rounded-none bg-indigo-600 retro:bg-retro-dim text-white retro:text-retro-green text-sm font-medium hover:bg-indigo-700 retro:hover:bg-retro-green retro:hover:text-black transition-colors"
        >
          + Add user
        </button>
      </div>

      <div className="border border-gray-200 dark:border-gray-700 retro:border-retro-dim rounded-lg retro:rounded-none overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-700/50 retro:bg-transparent border-b border-gray-200 dark:border-gray-700 retro:border-retro-dim">
              <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400 retro:text-retro-dim">Email</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400 retro:text-retro-dim">Role</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400 retro:text-retro-dim">Created</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400 retro:text-retro-dim">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} className="border-b last:border-b-0 border-gray-200 dark:border-gray-700 retro:border-retro-dim">
                <td className="px-4 py-3 text-gray-900 dark:text-gray-100 retro:text-retro-green">{user.email}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                    user.role === 'admin'
                      ? 'bg-amber-100 dark:bg-amber-900/30 retro:bg-transparent text-amber-700 dark:text-amber-400 retro:text-retro-green retro:border retro:border-retro-green'
                      : 'bg-gray-100 dark:bg-gray-700 retro:bg-transparent text-gray-600 dark:text-gray-400 retro:text-retro-dim retro:border retro:border-retro-dim'
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400 retro:text-retro-dim">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => setModal({ type: 'edit', user })}
                      className="text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 retro:text-retro-dim retro:hover:text-retro-green transition-colors"
                      title="Edit"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(user)}
                      className="text-gray-400 hover:text-red-500 retro:text-retro-dim retro:hover:text-retro-green transition-colors"
                      title="Delete"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400 dark:text-gray-500 retro:text-retro-dim">
                  No users yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modal.type !== 'none' && (
        <UserFormModal
          modal={modal}
          onClose={() => setModal({ type: 'none' })}
          onSaved={() => { setModal({ type: 'none' }); loadUsers() }}
          showError={showError}
        />
      )}
    </div>
  )
}

function UserFormModal({
  modal,
  onClose,
  onSaved,
  showError,
}: {
  modal: { type: 'create' } | { type: 'edit'; user: User }
  onClose: () => void
  onSaved: () => void
  showError: (msg: string) => void
}) {
  const isEdit = modal.type === 'edit'
  const [email, setEmail] = useState(isEdit ? modal.user.email : '')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>(isEdit ? modal.user.role : 'user')
  const [saving, setSaving] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    try {
      let url: string
      let method: string
      let payload: Record<string, string>

      if (isEdit) {
        const body: Record<string, string> = {}
        if (email !== modal.user.email) body.email = email
        if (password) body.password = password
        if (role !== modal.user.role) body.role = role
        if (Object.keys(body).length === 0) { onClose(); return }
        url = `/api/users/${modal.user.id}`
        method = 'PUT'
        payload = body
      } else {
        url = '/api/users'
        method = 'POST'
        payload = { email, password, role }
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        showError(data.error ?? `Failed to ${isEdit ? 'update' : 'create'} user`)
        return
      }
      onSaved()
    } catch {
      showError('Network error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={e => { if (e.target === overlayRef.current) onClose() }}
    >
      <div className="bg-white dark:bg-gray-800 retro:bg-retro-bg retro:border retro:border-retro-green rounded-xl retro:rounded-none shadow-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4 retro:text-retro-green">
          {isEdit ? 'Edit user' : 'Create user'}
        </h3>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 retro:text-retro-dim">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 retro:text-retro-dim">
              Password{isEdit ? ' (leave blank to keep)' : ''}
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required={!isEdit}
              minLength={4}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 retro:text-retro-dim">Role</label>
            <select
              value={role}
              onChange={e => setRole(e.target.value as UserRole)}
              className={inputClass}
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg retro:rounded-none text-sm font-medium text-gray-600 dark:text-gray-400 retro:text-retro-dim hover:bg-gray-100 dark:hover:bg-gray-700 retro:hover:text-retro-green transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg retro:rounded-none bg-indigo-600 retro:bg-retro-dim text-white retro:text-retro-green text-sm font-medium hover:bg-indigo-700 retro:hover:bg-retro-green retro:hover:text-black disabled:opacity-60 transition-colors"
            >
              {saving ? 'Saving…' : isEdit ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
