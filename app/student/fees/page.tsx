'use client'

import { useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import { Header } from '@/components/layout/Header'

export default function StudentFeesPage() {
  const { data: session } = useSession()

  // Fetch student's fees
  const { data: feesData, isLoading } = useQuery({
    queryKey: ['fees', session?.user.id],
    queryFn: async () => {
      if (!session?.user.id) return null
      const res = await fetch(`/api/fees/student/${session.user.id}`)
      if (!res.ok) return null
      return res.json()
    },
    enabled: !!session?.user.id,
  })

  const fees = feesData?.fees || []
  const summary = feesData?.summary || { total: 0, paid: 0, pending: 0 }
  const paidFees = fees.filter((fee: any) => fee.paid)
  const pendingFees = fees.filter((fee: any) => !fee.paid)

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">Fees & Payments</h1>
            <p className="text-slate-500">View and manage your fee invoices</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 mb-8">
          {[
            {
              label: 'Total Fees',
              value: `₹${summary.total?.toFixed(2) || '0.00'}`,
              gradient: 'from-blue-500 to-cyan-500',
            },
            {
              label: 'Paid',
              value: `₹${summary.paid?.toFixed(2) || '0.00'}`,
              gradient: 'from-green-500 to-emerald-500',
            },
            {
              label: 'Pending',
              value: `₹${summary.pending?.toFixed(2) || '0.00'}`,
              gradient: 'from-amber-500 to-orange-500',
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 hover:bg-slate-100 transition-all duration-300"
            >
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            </div>
          ))}
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-amber-400"></div>
            <p className="mt-4 text-slate-500">Loading fees...</p>
          </div>
        ) : (
          <>
            {/* Pending Fees */}
            {pendingFees.length > 0 && (
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm shadow-2xl mb-8 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                  <h2 className="text-xl font-bold text-slate-900">Pending Payments</h2>
                  <p className="text-sm text-slate-500 mt-1">Fees that need to be paid</p>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {pendingFees.map((fee: any) => (
                      <div
                        key={fee.id}
                        className="bg-slate-50 rounded-xl border border-slate-200 p-6 hover:bg-slate-100 transition-all duration-200"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-4 mb-3">
                              <h3 className="text-slate-900 font-bold text-lg">Invoice #{fee.invoiceId || fee.id.slice(0, 8)}</h3>
                              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                Pending
                              </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <p className="text-slate-500 text-sm">Amount</p>
                                <p className="text-slate-900 font-semibold text-xl">₹{fee.amount.toLocaleString()}</p>
                              </div>
                              <div>
                                <p className="text-slate-500 text-sm">Due Date</p>
                                <p className="text-slate-900 font-semibold">
                                  {new Date(fee.dueDate).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                  })}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="ml-6">
                            <button
                              disabled
                              className="px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white font-semibold rounded-xl shadow-lg opacity-50 cursor-not-allowed"
                            >
                              Pay at Office
                            </button>
                            <p className="text-xs text-slate-500 mt-2 text-center">Payment gateway coming soon</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Paid Fees */}
            {paidFees.length > 0 && (
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm shadow-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                  <h2 className="text-xl font-bold text-slate-900">Paid Fees</h2>
                  <p className="text-sm text-slate-500 mt-1">Your completed payments</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Invoice ID</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Amount</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Due Date</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Paid Date</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {paidFees.map((fee: any) => (
                        <tr key={fee.id} className="hover:bg-slate-50 transition-colors duration-200">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-slate-900 font-mono text-sm">
                              #{fee.invoiceId || fee.id.slice(0, 8)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-slate-900 font-semibold">
                            ₹{fee.amount.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-slate-500 text-sm">
                            {new Date(fee.dueDate).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-slate-500 text-sm">
                            {fee.paidAt ? new Date(fee.paidAt).toLocaleDateString() : '—'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-400 border border-green-500/30">
                              Paid
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {fees.length === 0 && (
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm shadow-2xl p-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-500/20 mb-4">
                  <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-slate-500 text-lg">No fees found</p>
                <p className="text-slate-500 text-sm mt-2">Your fee invoices will appear here once they're generated</p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
