'use client'

import { useSession } from 'next-auth/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Header } from '@/components/layout/Header'
import Link from 'next/link'
import { useState } from 'react'

export default function AdminFeesPage() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [formData, setFormData] = useState({
    studentId: '',
    amount: '',
    dueDate: '',
    invoiceId: '',
  })

  // Fetch all students
  const { data: studentsData } = useQuery({
    queryKey: ['users', 'students'],
    queryFn: async () => {
      const res = await fetch('/api/users?role=student')
      if (!res.ok) return null
      return res.json()
    },
  })

  // Fetch all fees by getting fees for each student
  const { data: allFeesData, isLoading } = useQuery({
    queryKey: ['fees', 'all'],
    queryFn: async () => {
      if (!studentsData?.users) return { fees: [] }
      
      const feePromises = studentsData.users.map(async (student: any) => {
        const res = await fetch(`/api/fees/student/${student.id}`)
        if (!res.ok) return { student, fees: [] }
        const data = await res.json()
        return { student, fees: data.fees || [] }
      })
      
      const results = await Promise.all(feePromises)
      const allFees = results.flatMap((result) =>
        result.fees.map((fee: any) => ({ ...fee, student: result.student }))
      )
      
      return { fees: allFees }
    },
    enabled: !!studentsData?.users,
  })

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/fees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          amount: parseFloat(data.amount),
        }),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to create fee')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fees'] })
      setShowCreateModal(false)
      setFormData({ studentId: '', amount: '', dueDate: '', invoiceId: '' })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate(formData)
  }

  const filteredFees = allFeesData?.fees?.filter((fee: any) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      fee.student?.name?.toLowerCase().includes(query) ||
      fee.student?.email?.toLowerCase().includes(query) ||
      fee.invoiceId?.toLowerCase().includes(query)
    )
  }) || []

  const stats = {
    total: filteredFees.reduce((sum: number, fee: any) => sum + fee.amount, 0),
    paid: filteredFees.filter((f: any) => f.paid).reduce((sum: number, fee: any) => sum + fee.amount, 0),
    pending: filteredFees.filter((f: any) => !f.paid).reduce((sum: number, fee: any) => sum + fee.amount, 0),
    totalCount: filteredFees.length,
    paidCount: filteredFees.filter((f: any) => f.paid).length,
    pendingCount: filteredFees.filter((f: any) => !f.paid).length,
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 mb-2">Fees Management</h1>
              <p className="text-slate-500">Manage student fees and invoices</p>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/admin"
                className="px-4 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-white transition-all duration-200 flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Back</span>
              </Link>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200 flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Create Invoice</span>
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4 mb-8">
          {[
            { label: 'Total Fees', value: `₹${stats.total.toLocaleString()}`, count: stats.totalCount, gradient: 'from-blue-500 to-cyan-500' },
            { label: 'Paid', value: `₹${stats.paid.toLocaleString()}`, count: stats.paidCount, gradient: 'from-green-500 to-emerald-500' },
            { label: 'Pending', value: `₹${stats.pending.toLocaleString()}`, count: stats.pendingCount, gradient: 'from-amber-500 to-orange-500' },
            { label: 'Collection Rate', value: stats.total > 0 ? `${((stats.paid / stats.total) * 100).toFixed(1)}%` : '0%', gradient: 'from-purple-500 to-pink-500' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 hover:bg-slate-100 transition-all duration-300"
            >
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-900 mb-1">{stat.value}</p>
              {stat.count !== undefined && <p className="text-xs text-slate-500">{stat.count} invoices</p>}
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 mb-8">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search by student name, email, or invoice ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-12 pr-4 py-3 bg-slate-50 backdrop-blur-sm border border-slate-300 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all duration-200"
            />
          </div>
        </div>

        {/* Fees Table */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm shadow-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
            <h2 className="text-xl font-bold text-slate-900">Fee Invoices ({filteredFees.length})</h2>
          </div>

          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-400"></div>
                <p className="mt-4 text-slate-500">Loading fees...</p>
              </div>
            ) : filteredFees.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Student</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Invoice ID</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Due Date</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Paid Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredFees.map((fee: any) => (
                    <tr key={fee.id} className="hover:bg-slate-50 transition-colors duration-200">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold shadow-lg">
                            {fee.student?.name?.charAt(0).toUpperCase() || 'S'}
                          </div>
                          <div>
                            <div className="text-white font-semibold">{fee.student?.name || 'Unknown'}</div>
                            <div className="text-slate-500 text-sm">{fee.student?.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-slate-600 font-mono text-sm">{fee.invoiceId || fee.id.slice(0, 8)}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-white font-semibold">₹{fee.amount.toLocaleString()}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-500 text-sm">
                        {new Date(fee.dueDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {fee.paid ? (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-400 border border-green-500/30">
                            Paid
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-500 text-sm">
                        {fee.paidAt ? new Date(fee.paidAt).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-500/20 mb-4">
                  <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-slate-500 text-lg">No fees found</p>
                <p className="text-slate-500 text-sm mt-2">Create an invoice to get started</p>
              </div>
            )}
          </div>
        </div>

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="backdrop-blur-xl bg-slate-800/90 rounded-2xl border border-slate-300 shadow-2xl max-w-lg w-full">
              <div className="p-6 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-slate-900">Create Fee Invoice</h2>
                  <button
                    onClick={() => {
                      setShowCreateModal(false)
                      setFormData({ studentId: '', amount: '', dueDate: '', invoiceId: '' })
                    }}
                    className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-white transition-all duration-200"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">Student</label>
                  <select
                    required
                    value={formData.studentId}
                    onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                    className="block w-full px-4 py-3 bg-slate-50 backdrop-blur-sm border border-slate-300 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all duration-200"
                  >
                    <option value="" className="bg-slate-800">Select a student</option>
                    {studentsData?.users?.map((student: any) => (
                      <option key={student.id} value={student.id} className="bg-slate-800">
                        {student.name} ({student.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">Amount (₹)</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="block w-full px-4 py-3 bg-slate-50 backdrop-blur-sm border border-slate-300 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all duration-200"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">Due Date</label>
                  <input
                    type="date"
                    required
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="block w-full px-4 py-3 bg-slate-50 backdrop-blur-sm border border-slate-300 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all duration-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">Invoice ID (Optional)</label>
                  <input
                    type="text"
                    value={formData.invoiceId}
                    onChange={(e) => setFormData({ ...formData, invoiceId: e.target.value })}
                    className="block w-full px-4 py-3 bg-slate-50 backdrop-blur-sm border border-slate-300 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all duration-200"
                    placeholder="INV-2024-001"
                  />
                </div>

                <div className="flex items-center justify-end space-x-4 pt-4 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false)
                      setFormData({ studentId: '', amount: '', dueDate: '', invoiceId: '' })
                    }}
                    className="px-6 py-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-white transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {createMutation.isPending ? 'Creating...' : 'Create Invoice'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
