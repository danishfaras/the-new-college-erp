'use client'

import { useSession } from 'next-auth/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Header } from '@/components/layout/Header'
import { useState } from 'react'

const emptyStaffForm = {
  name: '',
  email: '',
  password: '',
  role: 'staff' as 'staff' | 'accounts',
  department: '',
  phone: '',
}
const emptyStudentForm = { name: '', email: '', password: '', rollNo: '', department: '', phone: '' }

export default function AdminUsersPage() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<string>('approval')
  const [filterApproved, setFilterApproved] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [approvingUserId, setApprovingUserId] = useState<string | null>(null)
  const [showAddStaff, setShowAddStaff] = useState(false)
  const [showAddStudent, setShowAddStudent] = useState(false)
  const [staffForm, setStaffForm] = useState(emptyStaffForm)
  const [studentForm, setStudentForm] = useState(emptyStudentForm)
  const [createError, setCreateError] = useState('')

  // Fetch all users for stats
  const { data: allUsersData } = useQuery({
    queryKey: ['users', 'all'],
    queryFn: async () => {
      const res = await fetch('/api/users')
      if (!res.ok) return null
      return res.json()
    },
  })

  const { data: usersData, refetch } = useQuery({
    queryKey: ['users', activeTab, filterApproved],
    queryFn: async () => {
      const params = new URLSearchParams()
      
      // Handle approval tab
      if (activeTab === 'approval') {
        params.append('approved', 'false')
      } else if (activeTab !== 'all') {
        params.append('role', activeTab)
      }
      
      // Additional approval filter (only if not on approval tab)
      if (activeTab !== 'approval' && filterApproved !== 'all') {
        params.append('approved', filterApproved)
      }
      
      const res = await fetch(`/api/users?${params.toString()}`)
      if (!res.ok) return null
      return res.json()
    },
  })

  const createStaffMutation = useMutation({
    mutationFn: async (data: typeof emptyStaffForm) => {
      const res = await fetch('/api/users/create-staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          password: data.password,
          role: data.role,
          department: data.department || undefined,
          phone: data.phone || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to create staff')
      return json
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setShowAddStaff(false)
      setStaffForm(emptyStaffForm)
      setCreateError('')
    },
    onError: (e: Error) => setCreateError(e.message),
  })

  const createStudentMutation = useMutation({
    mutationFn: async (data: typeof emptyStudentForm) => {
      const res = await fetch('/api/users/create-student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          password: data.password,
          rollNo: data.rollNo || undefined,
          department: data.department || undefined,
          phone: data.phone || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to create student')
      return json
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setShowAddStudent(false)
      setStudentForm(emptyStudentForm)
      setCreateError('')
    },
    onError: (e: Error) => setCreateError(e.message),
  })

  const handleApprove = async (userId: string) => {
    setApprovingUserId(userId)
    try {
      const res = await fetch('/api/auth/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      if (res.ok) refetch()
    } catch (error) {
      console.error('Failed to approve user:', error)
    } finally {
      setApprovingUserId(null)
    }
  }

  const filteredUsers = usersData?.users?.filter((user: any) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      user.name?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query) ||
      user.profile?.rollNo?.toLowerCase().includes(query) ||
      user.profile?.department?.toLowerCase().includes(query)
    )
  }) || []

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800'
      case 'staff': return 'bg-blue-100 text-blue-800'
      case 'student': return 'bg-emerald-100 text-emerald-800'
      case 'accounts': return 'bg-slate-100 text-slate-800'
      default: return 'bg-slate-100 text-slate-600'
    }
  }

  const roleStats = {
    all: allUsersData?.users?.length || 0,
    admin: allUsersData?.users?.filter((u: any) => u.role === 'admin').length || 0,
    staff: allUsersData?.users?.filter((u: any) => u.role === 'staff').length || 0,
    student: allUsersData?.users?.filter((u: any) => u.role === 'student').length || 0,
    accounts: allUsersData?.users?.filter((u: any) => u.role === 'accounts').length || 0,
    pending: allUsersData?.users?.filter((u: any) => !u.approved).length || 0,
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
            <p className="text-slate-500 text-sm mt-1">Manage users, roles, and add staff or students</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setShowAddStaff(true); setCreateError(''); }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg"
            >
              Add Staff
            </button>
            <button
              onClick={() => { setShowAddStudent(true); setCreateError(''); }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg"
            >
              Add Student
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5 mb-6">
          {[
            { label: 'Pending', value: roleStats.pending },
            { label: 'Admins', value: roleStats.admin },
            { label: 'Staff', value: roleStats.staff },
            { label: 'Students', value: roleStats.student },
            { label: 'Accounts', value: roleStats.accounts },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-2 mb-6 flex flex-wrap gap-1">
          {(['approval', 'admin', 'staff', 'student'] as const).map((id) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                activeTab === id ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {id.charAt(0).toUpperCase() + id.slice(1)} ({id === 'approval' ? roleStats.pending : roleStats[id]})
            </button>
          ))}
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg border border-slate-200 p-6 mb-8">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Search */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-12 pr-4 py-3 bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200"
              />
            </div>

            {/* Approval Filter - Only show when not on approval tab */}
            {activeTab !== 'approval' && (
              <div>
                <select
                  value={filterApproved}
                  onChange={(e) => setFilterApproved(e.target.value)}
                  className="block w-full px-4 py-3 bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200"
                >
                  <option value="all" className="bg-slate-800">All Status</option>
                  <option value="true" className="bg-slate-800">Approved</option>
                  <option value="false" className="bg-slate-800">Pending</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
            <h2 className="text-xl font-bold text-slate-900">
              Users ({filteredUsers.length})
            </h2>
          </div>

          <div className="overflow-x-auto">
            {filteredUsers.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Department</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Joined</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((user: any) => (
                    <tr key={user.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-full ${getRoleColor(user.role)} flex items-center justify-center font-bold text-sm`}>
                            {user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <div>
                            <div className="font-medium text-slate-900">{user.name || 'No Name'}</div>
                            <div className="text-slate-500 text-sm">{user.email}</div>
                            {user.profile?.rollNo && <div className="text-slate-400 text-xs">Roll: {user.profile.rollNo}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getRoleColor(user.role)}`}>{user.role}</span>
                      </td>
                      <td className="px-6 py-4 text-slate-600 text-sm">{user.profile?.department || '—'}</td>
                      <td className="px-6 py-4">
                        {user.approved ? (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">Approved</span>
                        ) : (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-amber-100 text-amber-800">Pending</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-sm">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        {!user.approved && (
                          <button
                            onClick={() => handleApprove(user.id)}
                            disabled={approvingUserId === user.id}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg disabled:opacity-50"
                          >
                            {approvingUserId === user.id ? 'Approving...' : 'Approve'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-12 text-slate-500">No users found. Try adjusting filters or add staff/students above.</div>
            )}
          </div>
        </div>

        {showAddStaff && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Add Staff</h2>
              {createError && <p className="text-red-600 text-sm mb-4">{createError}</p>}
              <form onSubmit={(e) => { e.preventDefault(); createStaffMutation.mutate(staffForm); }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                  <input value={staffForm.name} onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })} required className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="Full name" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input type="email" value={staffForm.email} onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })} required className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="staff@college.edu" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                  <input type="password" value={staffForm.password} onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })} required minLength={6} className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="Min 6 characters" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                  <select value={staffForm.role} onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value as 'staff' | 'accounts' })} className="w-full px-3 py-2 border border-slate-300 rounded-lg">
                    <option value="staff">Staff</option>
                    <option value="accounts">Accounts</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Department (optional)</label>
                  <input value={staffForm.department} onChange={(e) => setStaffForm({ ...staffForm, department: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="e.g. Computer Science" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone (optional)</label>
                  <input value={staffForm.phone} onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => { setShowAddStaff(false); setCreateError(''); }} className="flex-1 py-2 border border-slate-300 rounded-lg text-slate-700">Cancel</button>
                  <button type="submit" disabled={createStaffMutation.isPending} className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">Create Staff</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showAddStudent && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Add Student</h2>
              {createError && <p className="text-red-600 text-sm mb-4">{createError}</p>}
              <form onSubmit={(e) => { e.preventDefault(); createStudentMutation.mutate(studentForm); }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                  <input value={studentForm.name} onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })} required className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="Full name" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input type="email" value={studentForm.email} onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })} required className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="student@college.edu" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                  <input type="password" value={studentForm.password} onChange={(e) => setStudentForm({ ...studentForm, password: e.target.value })} required minLength={6} className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="Min 6 characters" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Roll No (optional)</label>
                  <input value={studentForm.rollNo} onChange={(e) => setStudentForm({ ...studentForm, rollNo: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Department (optional)</label>
                  <input value={studentForm.department} onChange={(e) => setStudentForm({ ...studentForm, department: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" placeholder="e.g. Computer Science" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone (optional)</label>
                  <input value={studentForm.phone} onChange={(e) => setStudentForm({ ...studentForm, phone: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => { setShowAddStudent(false); setCreateError(''); }} className="flex-1 py-2 border border-slate-300 rounded-lg text-slate-700">Cancel</button>
                  <button type="submit" disabled={createStudentMutation.isPending} className="flex-1 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">Create Student</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
