'use client'

import { useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import { Header } from '@/components/layout/Header'
import Link from 'next/link'
import { useState, useEffect } from 'react'

export default function AdminDashboard() {
  const { data: session } = useSession()
  const [approvingUserId, setApprovingUserId] = useState<string | null>(null)
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingApprovals: 0,
    totalClasses: 0,
    totalFees: 0,
  })

  const { data: users, refetch } = useQuery({
    queryKey: ['users', 'pending'],
    queryFn: async () => {
      const res = await fetch('/api/users?approved=false')
      if (!res.ok) return null
      return res.json()
    },
  })

  const { data: allUsers } = useQuery({
    queryKey: ['users', 'all'],
    queryFn: async () => {
      const res = await fetch('/api/users')
      if (!res.ok) return null
      return res.json()
    },
  })

  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const res = await fetch('/api/classes')
      if (!res.ok) return null
      return res.json()
    },
  })

  useEffect(() => {
    if (allUsers?.users) {
      setStats(prev => ({
        ...prev,
        totalUsers: allUsers.users.length,
        pendingApprovals: allUsers.users.filter((u: any) => !u.approved).length,
      }))
    }
    if (classes?.classes) {
      setStats(prev => ({
        ...prev,
        totalClasses: classes.classes.length,
      }))
    }
  }, [allUsers, classes])

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

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      gradient: 'from-blue-500 to-cyan-500',
      change: '+12%',
    },
    {
      title: 'Pending Approvals',
      value: stats.pendingApprovals,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      gradient: 'from-amber-500 to-orange-500',
      change: stats.pendingApprovals > 0 ? 'Action Required' : 'All Clear',
    },
    {
      title: 'Total Classes',
      value: stats.totalClasses,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      gradient: 'from-purple-500 to-pink-500',
      change: 'Active',
    },
    {
      title: 'System Status',
      value: 'Online',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      gradient: 'from-green-500 to-emerald-500',
      change: '100% Uptime',
    },
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            Welcome back, {session?.user?.name || 'Admin'}
          </h1>
          <p className="text-slate-500">Manage your college ERP system from one place</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {statCards.map((stat, index) => (
            <div
              key={stat.title}
              className="group relative bg-white rounded-lg border border-slate-200 shadow-sm p-6 hover:bg-slate-100 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/20"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-lg bg-blue-100">
                  <div className="text-blue-600">{stat.icon}</div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500 uppercase tracking-wider">{stat.title}</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-xs px-2 py-1 rounded-full ${
                  stat.change.includes('+') || stat.change === 'All Clear' || stat.change === 'Active' || stat.change === '100% Uptime'
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-amber-500/20 text-amber-400'
                }`}>
                  {stat.change}
                </span>
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>

        <div className="mb-8 rounded-xl border border-slate-200 bg-white p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="font-semibold text-slate-900">Reports & CSV exports</p>
            <p className="text-sm text-slate-600">
              Attendance detail, student rosters, fees summary, and class overview (CSV for Excel).
            </p>
          </div>
          <Link
            href="/staff/reports"
            className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 shrink-0"
          >
            Open reports
          </Link>
        </div>

        {/* Pending Approvals Card */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm shadow-2xl mb-8 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-amber-500/20 rounded-lg">
                  <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Pending User Approvals</h2>
                  <p className="text-sm text-slate-500">Review and approve new student registrations</p>
                </div>
              </div>
              <div className="px-4 py-2 bg-amber-500/20 rounded-full">
                <span className="text-amber-400 font-semibold">{users?.users?.length || 0} Pending</span>
              </div>
            </div>
          </div>

          <div className="p-6">
            {users?.users?.length > 0 ? (
              <div className="space-y-3">
                {users.users.map((user: any) => (
                  <div
                    key={user.id}
                    className="group bg-slate-50 rounded-xl border border-slate-200 p-4 hover:bg-slate-100 transition-all duration-200 hover:border-slate-300"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-lg shadow-lg">
                          {user.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div>
                          <h3 className="text-slate-900 font-semibold">{user.name || 'No Name'}</h3>
                          <p className="text-slate-500 text-sm">{user.email}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="px-2 py-0.5 text-xs rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                              {user.role}
                            </span>
                            <span className="text-xs text-slate-500">
                              {new Date(user.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleApprove(user.id)}
                        disabled={approvingUserId === user.id}
                        className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
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
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 mb-4">
                  <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-slate-500 text-lg">All users have been approved</p>
                <p className="text-slate-500 text-sm mt-2">No pending approvals at this time</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              title: 'User Management',
              description: 'Manage all users and permissions',
              icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ),
              href: '/admin/users',
              gradient: 'from-blue-500 to-cyan-500',
            },
            {
              title: 'Class Management',
              description: 'Create and manage classes',
              icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              ),
              href: '/admin/classes',
              gradient: 'from-purple-500 to-pink-500',
            },
            {
              title: 'Fees Management',
              description: 'Manage student fees and invoices',
              icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ),
              href: '/admin/fees',
              gradient: 'from-green-500 to-emerald-500',
            },
            {
              title: 'Audit Logs',
              description: 'View system activity logs',
              icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              ),
              href: '/admin/audit',
              gradient: 'from-amber-500 to-orange-500',
            },
          ].map((action, index) => (
            <Link
              key={action.title}
              href={action.href}
              className="group relative bg-white rounded-lg border border-slate-200 shadow-sm p-6 hover:bg-slate-100 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/20 overflow-hidden"
            >
              <div className="relative z-10">
                <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${action.gradient} shadow-lg mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <div className="text-white">{action.icon}</div>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{action.title}</h3>
                <p className="text-slate-500 text-sm">{action.description}</p>
                <div className="mt-4 flex items-center text-blue-400 text-sm font-medium group-hover:translate-x-2 transition-transform duration-300">
                  <span>Open</span>
                  <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
              {/* Animated gradient background */}
              <div className={`absolute inset-0 bg-gradient-to-r ${action.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>
              {/* Shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
