'use client'

import { useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import { Header } from '@/components/layout/Header'
import Link from 'next/link'
import { useState } from 'react'

export default function AdminAuditPage() {
  const { data: session } = useSession()
  const [filterAction, setFilterAction] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [limit] = useState(100)

  const { data: auditData, isLoading } = useQuery({
    queryKey: ['audit', filterAction, limit],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filterAction !== 'all') params.append('action', filterAction)
      params.append('limit', limit.toString())
      
      const res = await fetch(`/api/audit?${params.toString()}`)
      if (!res.ok) return null
      return res.json()
    },
  })

  const getActionColor = (action: string) => {
    if (action.includes('CREATE') || action.includes('APPROVE')) {
      return 'from-green-500 to-emerald-500'
    }
    if (action.includes('UPDATE') || action.includes('EDIT')) {
      return 'from-blue-500 to-cyan-500'
    }
    if (action.includes('DELETE') || action.includes('REJECT')) {
      return 'from-red-500 to-pink-500'
    }
    return 'from-gray-500 to-gray-600'
  }

  const filteredLogs = auditData?.logs?.filter((log: any) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      log.action?.toLowerCase().includes(query) ||
      log.actor?.name?.toLowerCase().includes(query) ||
      log.actor?.email?.toLowerCase().includes(query) ||
      log.targetId?.toLowerCase().includes(query)
    )
  }) || []

  const actionTypes: string[] = Array.from(
    new Set(auditData?.logs?.map((log: any) => log.action as string) || [])
  ).sort() as string[]

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 mb-2">Audit Logs</h1>
              <p className="text-slate-500">View system activity and changes</p>
            </div>
            <Link
              href="/admin"
              className="px-4 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-white transition-all duration-200 flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Back to Dashboard</span>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
          {[
            { label: 'Total Logs', value: auditData?.pagination?.total || 0, gradient: 'from-blue-500 to-cyan-500' },
            { label: 'Showing', value: filteredLogs.length, gradient: 'from-purple-500 to-pink-500' },
            { label: 'Actions', value: actionTypes.length, gradient: 'from-amber-500 to-orange-500' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 hover:bg-slate-100 transition-all duration-300"
            >
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 mb-8">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Search */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-12 pr-4 py-3 bg-slate-50 backdrop-blur-sm border border-slate-300 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all duration-200"
              />
            </div>

            {/* Action Filter */}
            <div>
              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="block w-full px-4 py-3 bg-slate-50 backdrop-blur-sm border border-slate-300 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all duration-200"
              >
                <option value="all" className="bg-slate-800">All Actions</option>
                {actionTypes.map((action) => (
                  <option key={action} value={action} className="bg-slate-800">
                    {action}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Audit Logs Table */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm shadow-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
            <h2 className="text-xl font-bold text-slate-900">Activity Logs</h2>
          </div>

          <div className="erp-table-scroll">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-amber-400"></div>
                <p className="mt-4 text-slate-500">Loading audit logs...</p>
              </div>
            ) : filteredLogs.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Timestamp</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Action</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actor</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Target ID</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredLogs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors duration-200">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-slate-600 text-sm">
                          {new Date(log.createdAt).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r ${getActionColor(log.action)} text-white`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {log.actor ? (
                          <div>
                            <div className="text-white font-medium">{log.actor.name || 'Unknown'}</div>
                            <div className="text-slate-500 text-xs">{log.actor.email}</div>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-sm">System</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-slate-600 font-mono text-sm">
                          {log.targetId ? log.targetId.slice(0, 8) + '...' : '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {log.meta ? (
                          <details className="cursor-pointer">
                            <summary className="text-blue-400 hover:text-blue-300 text-sm">View Details</summary>
                            <pre className="mt-2 p-3 bg-black/20 rounded-lg text-xs text-slate-600 overflow-x-auto">
                              {JSON.stringify(log.meta, null, 2)}
                            </pre>
                          </details>
                        ) : (
                          <span className="text-slate-500 text-sm">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-500/20 mb-4">
                  <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-slate-500 text-lg">No audit logs found</p>
                <p className="text-slate-500 text-sm mt-2">Activity logs will appear here</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
