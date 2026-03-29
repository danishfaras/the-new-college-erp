'use client'

import { useSession } from 'next-auth/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Header } from '@/components/layout/Header'
import { useSearchParams } from 'next/navigation'
import { useMemo, useState, useEffect, Suspense } from 'react'
import { toAttendanceDay } from '@/lib/timetable-slot-utils'

function StaffCoveragePageInner() {
  const { data: session } = useSession()
  const searchParams = useSearchParams()
  const box = searchParams.get('box') || 'inbox'
  const queryClient = useQueryClient()

  const [offerClassId, setOfferClassId] = useState('')
  const [offerDate, setOfferDate] = useState('')
  const [offerSlotKey, setOfferSlotKey] = useState('')

  useEffect(() => {
    setOfferDate(new Date().toISOString().split('T')[0] || '')
  }, [])

  const { data: classesData } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const res = await fetch('/api/classes')
      if (!res.ok) return null
      return res.json()
    },
  })

  const myClasses = useMemo(
    () =>
      (classesData?.classes || []).filter((c: any) => c.staffIds?.includes(session?.user?.id)),
    [classesData, session?.user?.id]
  )

  const { data: timetableData } = useQuery({
    queryKey: ['timetable', offerClassId],
    queryFn: async () => {
      const res = await fetch(`/api/timetable/${offerClassId}`)
      if (!res.ok) return null
      return res.json()
    },
    enabled: !!offerClassId,
  })

  const dayName = offerDate
    ? new Date(offerDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' })
    : ''
  const expectedDay = offerDate ? toAttendanceDay(offerDate) : ''

  const coverableSlots = useMemo(() => {
    const entries = (timetableData?.timetable?.entries as any[]) || []
    const uid = session?.user?.id
    if (!dayName || !uid) return []
    return entries.filter(
      (e: any) =>
        e.day?.toLowerCase() === dayName.toLowerCase() &&
        e.staffId &&
        e.staffId !== uid
    )
  }, [timetableData, dayName, session?.user?.id])

  const { data: coverageData, isLoading: coverageLoading } = useQuery({
    queryKey: ['coverage', box],
    queryFn: async () => {
      const q = box === 'inbox' ? 'box=inbox' : box === 'outgoing' ? 'box=outgoing' : ''
      const res = await fetch(`/api/coverage?${q}`)
      if (!res.ok) return null
      return res.json()
    },
  })

  const createMutation = useMutation({
    mutationFn: async (body: Record<string, string>) => {
      const res = await fetch('/api/coverage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Request failed')
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coverage'] })
      setOfferSlotKey('')
      alert('Cover request sent. The assigned teacher will be notified.')
    },
    onError: (e: Error) => alert(e.message),
  })

  const patchMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: string }) => {
      const res = await fetch(`/api/coverage/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Update failed')
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['coverage'] }),
    onError: (e: Error) => alert(e.message),
  })

  const handleOfferCover = (e: React.FormEvent) => {
    e.preventDefault()
    if (!offerClassId || !offerDate || !offerSlotKey) {
      alert('Choose class, date, and period.')
      return
    }
    const [subject, start, end, day] = offerSlotKey.split('|')
    if (day && expectedDay && day.toLowerCase() !== expectedDay.toLowerCase()) {
      alert('Selected period does not match the weekday of the date.')
      return
    }
    createMutation.mutate({
      classId: offerClassId,
      date: offerDate,
      day: day || expectedDay,
      subject,
      startTime: start,
      endTime: end,
    })
  }

  const requests = coverageData?.requests || []

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Class cover</h1>
        <p className="text-slate-600 mb-8">
          Offer to cover a colleague&apos;s period; they accept in their inbox. After acceptance, you can take
          attendance for that slot.
        </p>

        <div className="flex gap-2 mb-8">
          <a
            href="/staff/coverage?box=inbox"
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              box === 'inbox' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-700'
            }`}
          >
            Inbox (to approve)
          </a>
          <a
            href="/staff/coverage?box=outgoing"
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              box === 'outgoing' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-700'
            }`}
          >
            My requests
          </a>
          <a
            href="/staff/coverage"
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              box !== 'inbox' && box !== 'outgoing'
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-slate-200 text-slate-700'
            }`}
          >
            All
          </a>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-10">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Offer cover</h2>
          <form onSubmit={handleOfferCover} className="space-y-4 max-w-lg">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Class</label>
              <select
                value={offerClassId}
                onChange={(e) => {
                  setOfferClassId(e.target.value)
                  setOfferSlotKey('')
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                required
              >
                <option value="">Select class</option>
                {myClasses.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Date</label>
              <input
                type="date"
                value={offerDate}
                onChange={(e) => {
                  setOfferDate(e.target.value)
                  setOfferSlotKey('')
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Their period (not yours)</label>
              <select
                value={offerSlotKey}
                onChange={(e) => setOfferSlotKey(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                required
                disabled={!offerClassId || !offerDate}
              >
                <option value="">Select period</option>
                {coverableSlots.map((s: any, i: number) => (
                  <option
                    key={i}
                    value={`${s.subject}|${s.start}|${s.end}|${s.day || dayName}`}
                  >
                    {s.subject} ({s.start}–{s.end})
                  </option>
                ))}
              </select>
              {offerClassId && offerDate && coverableSlots.length === 0 && (
                <p className="text-sm text-amber-600 mt-1">
                  No other teacher&apos;s slots on {dayName} in this timetable.
                </p>
              )}
            </div>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium disabled:opacity-50"
            >
              {createMutation.isPending ? 'Sending…' : 'Send cover request'}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            {box === 'inbox' ? 'Pending — your periods' : box === 'outgoing' ? 'Your pending offers' : 'Recent'}
          </h2>
          {coverageLoading ? (
            <p className="text-slate-500">Loading…</p>
          ) : requests.length === 0 ? (
            <p className="text-slate-500">No requests.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {requests.map((r: any) => (
                <li key={r.id} className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">
                      {r.class?.name} — {r.subject} ({r.startTime}–{r.endTime})
                    </p>
                    <p className="text-sm text-slate-500">
                      {new Date(r.date).toLocaleDateString()} · From {r.fromStaff?.name || r.fromStaff?.email} → To{' '}
                      {r.toStaff?.name || r.toStaff?.email} ·{' '}
                      <span className="font-semibold text-slate-700">{r.status}</span>
                    </p>
                  </div>
                  {r.status === 'pending' && r.fromStaffId === session?.user?.id && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm('Accept this cover?')) patchMutation.mutate({ id: r.id, action: 'accept' })
                        }}
                        className="px-3 py-1.5 bg-emerald-600 text-white text-sm rounded-lg"
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm('Reject this cover offer?')) patchMutation.mutate({ id: r.id, action: 'reject' })
                        }}
                        className="px-3 py-1.5 bg-slate-100 text-slate-800 text-sm rounded-lg border border-slate-200"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                  {r.status === 'pending' && r.requestedById === session?.user?.id && r.fromStaffId !== session?.user?.id && (
                    <button
                      type="button"
                      onClick={() => patchMutation.mutate({ id: r.id, action: 'cancel' })}
                      className="px-3 py-1.5 text-sm text-slate-600 underline"
                    >
                      Cancel request
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  )
}

export default function StaffCoveragePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">Loading…</div>
      }
    >
      <StaffCoveragePageInner />
    </Suspense>
  )
}
