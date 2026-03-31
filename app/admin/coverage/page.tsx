'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Header } from '@/components/layout/Header'

export default function AdminCoveragePage() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['coverage', 'all-pending'],
    queryFn: async () => {
      const res = await fetch('/api/coverage?all=true')
      if (!res.ok) return null
      return res.json()
    },
  })

  const patchMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: string }) => {
      const res = await fetch(`/api/coverage/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || 'Failed')
      return j
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['coverage', 'all-pending'] }),
    onError: (e: Error) => alert(e.message),
  })

  const requests = data?.requests || []

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Pending cover requests</h1>
        <p className="text-slate-600 mb-8">All pending class-cover offers across the college.</p>
        {isLoading ? (
          <p className="text-slate-500">Loading…</p>
        ) : requests.length === 0 ? (
          <p className="text-slate-500">No pending requests.</p>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="erp-table-scroll">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Class</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Slot</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Teacher</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Volunteer</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map((r: any) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3 text-slate-900">{r.class?.name}</td>
                    <td className="px-4 py-3">
                      {r.subject} ({r.startTime}–{r.endTime})
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {new Date(r.date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{r.fromStaff?.name || r.fromStaff?.email}</td>
                    <td className="px-4 py-3 text-slate-600">{r.toStaff?.name || r.toStaff?.email}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm('Accept on behalf of workflow?')) {
                              patchMutation.mutate({ id: r.id, action: 'accept' })
                            }
                          }}
                          className="px-2 py-1 bg-emerald-600 text-white rounded text-xs"
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          onClick={() => patchMutation.mutate({ id: r.id, action: 'reject' })}
                          className="px-2 py-1 bg-slate-100 border border-slate-200 rounded text-xs"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
