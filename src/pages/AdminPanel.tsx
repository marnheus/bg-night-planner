import { useEffect, useState } from 'react'
import { Shield, Clock, Users, Calendar, Plus, Trash2, X } from 'lucide-react'
import { gameNightService, RecurringSchedule } from '../services/gameNightService'
import { userService } from '../services/userService'
import { User, UserRole } from '../types'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export const AdminPanel = () => {
  const [tab, setTab] = useState<'schedules' | 'users' | 'adhoc'>('schedules')
  const [schedules, setSchedules] = useState<RecurringSchedule[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddSchedule, setShowAddSchedule] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [scheduleForm, setScheduleForm] = useState({ dayOfWeek: 5, startTime: '20:45', endTime: '03:00', location: '' })

  const [adHocForm, setAdHocForm] = useState({ title: '', scheduledDate: '', location: '', maxAttendees: 0 })

  useEffect(() => {
    const load = async () => {
      try {
        const [s, u] = await Promise.all([
          gameNightService.getRecurringSchedules().catch(() => []),
          userService.getAllUsers().catch(() => [])
        ])
        setSchedules(s)
        setUsers(u)
      } catch (err) {
        console.error('Failed to load admin data:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await gameNightService.createRecurringSchedule(scheduleForm)
      const updated = await gameNightService.getRecurringSchedules()
      setSchedules(updated)
      setShowAddSchedule(false)
      setScheduleForm({ dayOfWeek: 5, startTime: '20:45', endTime: '03:00', location: '' })
    } catch (err) {
      console.error('Failed to create schedule:', err)
    }
  }

  const handleDeleteSchedule = async (id: string) => {
    if (!confirm('Delete this recurring schedule?')) return
    try {
      await gameNightService.deleteRecurringSchedule(id)
      setSchedules(prev => prev.filter(s => s.id !== id))
    } catch (err) {
      console.error('Failed to delete schedule:', err)
    }
  }

  const handleInviteAdmin = async () => {
    if (!inviteEmail) return
    try {
      await userService.inviteAdmin(inviteEmail)
      const updated = await userService.getAllUsers()
      setUsers(updated)
      setShowInvite(false)
      setInviteEmail('')
    } catch (err) {
      console.error('Failed to invite admin:', err)
    }
  }

  const handleRoleChange = async (userId: string, role: UserRole) => {
    try {
      await userService.updateUserRole(userId, role)
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u))
    } catch (err) {
      console.error('Failed to update role:', err)
    }
  }

  const handleCreateAdHoc = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await gameNightService.createGameNight({
        title: adHocForm.title,
        scheduledDate: new Date(adHocForm.scheduledDate),
        location: adHocForm.location || undefined,
        maxAttendees: adHocForm.maxAttendees || undefined
      })
      setAdHocForm({ title: '', scheduledDate: '', location: '', maxAttendees: 0 })
      alert('Ad-hoc game night created!')
    } catch (err) {
      console.error('Failed to create ad-hoc night:', err)
    }
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="w-8 h-8 text-red-600" />
        <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {([['schedules', 'Recurring Schedules', Clock], ['users', 'User Management', Users], ['adhoc', 'Ad-hoc Events', Calendar]] as const).map(([key, label, Icon]) => (
          <button key={key} onClick={() => setTab(key as typeof tab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === key ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {/* Recurring Schedules Tab */}
      {tab === 'schedules' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">Recurring Schedules</h2>
            <button onClick={() => setShowAddSchedule(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
              <Plus className="w-4 h-4" /> Add Schedule
            </button>
          </div>

          {schedules.length === 0 ? (
            <div className="bg-white p-8 rounded-lg shadow text-center">
              <p className="text-gray-500">No recurring schedules set up.</p>
              <p className="text-gray-400 text-sm mt-1">Create one to auto-generate game nights.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {schedules.map(s => (
                <div key={s.id} className="bg-white p-4 rounded-lg shadow flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Every {DAYS[s.dayOfWeek]}</p>
                    <p className="text-sm text-gray-500">{s.startTime} – {s.endTime}{s.location ? ` · ${s.location}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${s.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {s.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <button onClick={() => handleDeleteSchedule(s.id)} className="text-red-400 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* User Management Tab */}
      {tab === 'users' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">Users ({users.length})</h2>
            <button onClick={() => setShowInvite(true)} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
              <Plus className="w-4 h-4" /> Invite Admin
            </button>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Name</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Email</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Role</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{u.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${u.role === UserRole.Admin ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <select value={u.role} onChange={e => handleRoleChange(u.id, e.target.value as UserRole)}
                        className="text-sm border rounded px-2 py-1">
                        <option value={UserRole.Member}>Member</option>
                        <option value={UserRole.Admin}>Admin</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Ad-hoc Events Tab */}
      {tab === 'adhoc' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">Create Ad-hoc Game Night</h2>
          </div>
          <div className="bg-white p-6 rounded-lg shadow max-w-lg">
            <form onSubmit={handleCreateAdHoc} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input required value={adHocForm.title} onChange={e => setAdHocForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="e.g., Special Weekend Game Night" className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time *</label>
                <input type="datetime-local" required value={adHocForm.scheduledDate} onChange={e => setAdHocForm(p => ({ ...p, scheduledDate: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input value={adHocForm.location} onChange={e => setAdHocForm(p => ({ ...p, location: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Attendees (0 = unlimited)</label>
                <input type="number" min={0} value={adHocForm.maxAttendees} onChange={e => setAdHocForm(p => ({ ...p, maxAttendees: parseInt(e.target.value) || 0 }))}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 w-full">Create Ad-hoc Game Night</button>
            </form>
          </div>
        </div>
      )}

      {/* Add Schedule Modal */}
      {showAddSchedule && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-lg font-semibold">Add Recurring Schedule</h2>
              <button onClick={() => setShowAddSchedule(false)}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAddSchedule} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Day of Week</label>
                <select value={scheduleForm.dayOfWeek} onChange={e => setScheduleForm(p => ({ ...p, dayOfWeek: parseInt(e.target.value) }))}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none">
                  {DAYS.map((day, i) => <option key={i} value={i}>{day}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                  <input type="time" value={scheduleForm.startTime} onChange={e => setScheduleForm(p => ({ ...p, startTime: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                  <input type="time" value={scheduleForm.endTime} onChange={e => setScheduleForm(p => ({ ...p, endTime: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input value={scheduleForm.location} onChange={e => setScheduleForm(p => ({ ...p, location: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowAddSchedule(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Create Schedule</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite Admin Modal */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-lg font-semibold">Invite Admin</h2>
              <button onClick={() => setShowInvite(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                  placeholder="admin@example.com" className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none" />
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowInvite(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
                <button onClick={handleInviteAdmin} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">Send Invite</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
