'use client'

import { useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import { Header } from '@/components/layout/Header'
import { useState } from 'react'

export default function AdminUsersPage() {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState<string>('approval') // 'approval', 'admin', 'staff', 'student'
  const [filterApproved, setFilterApproved] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [approvingUserId, setApprovingUserId] = useState<string | null>(null)

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

  const handleApprove = async (userId: string) => {
    setApprovingUserId(userId)
    try {
      const res = await fetch('/api/auth/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      if (res.ok) {
        refetch()
      }
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
      case 'admin':
        return 'from-red-500 to-pink-500'
      case 'staff':
        return 'from-blue-500 to-cyan-500'
      case 'student':
        return 'from-green-500 to-emerald-500'
      case 'accounts':
        return 'from-purple-500 to-indigo-500'
      default:
        return 'from-gray-500 to-gray-600'
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">User Management</h1>
            <p className="text-gray-400">Manage all users, roles, and permissions</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5 mb-8">
          {[
            { label: 'Pending', value: roleStats.pending, color: 'from-amber-500 to-orange-500' },
            { label: 'Admins', value: roleStats.admin, color: 'from-red-500 to-pink-500' },
            { label: 'Staff', value: roleStats.staff, color: 'from-blue-500 to-cyan-500' },
            { label: 'Students', value: roleStats.student, color: 'from-green-500 to-emerald-500' },
            { label: 'Accounts', value: roleStats.accounts, color: 'from-purple-500 to-indigo-500' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="backdrop-blur-xl bg-white/5 rounded-xl border border-white/10 p-4 hover:bg-white/10 transition-all duration-300"
            >
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{stat.label}</p>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 p-2 mb-6">
          <div className="flex space-x-2">
            {[
              { id: 'approval', label: 'Approval', icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ), count: roleStats.pending, gradient: 'from-amber-500 to-orange-500' },
              { id: 'admin', label: 'Admins', icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              ), count: roleStats.admin, gradient: 'from-red-500 to-pink-500' },
              { id: 'staff', label: 'Staff', icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              ), count: roleStats.staff, gradient: 'from-blue-500 to-cyan-500' },
              { id: 'student', label: 'Students', icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14v9M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                </svg>
              ), count: roleStats.student, gradient: 'from-green-500 to-emerald-500' },
            ].map((tab) => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex-1 flex items-center justify-center space-x-2 px-6 py-4 rounded-xl font-semibold transition-all duration-300 ${
                    isActive
                      ? `bg-gradient-to-r ${tab.gradient || 'from-purple-500 to-indigo-500'} text-white shadow-lg shadow-purple-500/50 scale-105`
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <div className={isActive ? 'text-white' : 'text-gray-400'}>{tab.icon}</div>
                  <span>{tab.label}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-white/10 text-gray-400'
                  }`}>
                    {tab.count}
                  </span>
                  {/* Active indicator */}
                  {isActive && (
                    <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1/2 h-1 bg-white rounded-full"></div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Filters and Search */}
        <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 p-6 mb-8">
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
        <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10 bg-gradient-to-r from-blue-500/10 to-purple-500/10">
            <h2 className="text-xl font-bold text-white">
              Users ({filteredUsers.length})
            </h2>
          </div>

          <div className="overflow-x-auto">
            {filteredUsers.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">User</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Department</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Joined</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {filteredUsers.map((user: any) => (
                    <tr
                      key={user.id}
                      className="hover:bg-white/5 transition-colors duration-200"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-4">
                          <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${getRoleColor(user.role)} flex items-center justify-center text-white font-bold text-lg shadow-lg`}>
                            {user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <div>
                            <div className="text-white font-semibold">{user.name || 'No Name'}</div>
                            <div className="text-gray-400 text-sm">{user.email}</div>
                            {user.profile?.rollNo && (
                              <div className="text-gray-500 text-xs">Roll: {user.profile.rollNo}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r ${getRoleColor(user.role)} text-white`}>
                          {user.role.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-gray-300">
                          {user.profile?.department || '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.approved ? (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-400 border border-green-500/30">
                            Approved
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-400 text-sm">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {!user.approved && (
                          <button
                            onClick={() => handleApprove(user.id)}
                            disabled={approvingUserId === user.id}
                            className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold rounded-lg shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center space-x-2"
                          >
                            {approvingUserId === user.id ? (
                              <>
                                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>Approving...</span>
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <span>Approve</span>
                              </>
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-500/20 mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <p className="text-gray-400 text-lg">No users found</p>
                <p className="text-gray-500 text-sm mt-2">Try adjusting your filters</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
