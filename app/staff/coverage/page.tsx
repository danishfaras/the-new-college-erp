'use client'

import { useSession } from 'next-auth/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Header } from '@/components/layout/Header'
import { useSearchParams } from 'next/navigation'
import { useMemo, useState, useEffect, Suspense } from 'react'
import { toAttendanceDay } from '@/lib/timetable-slot-utils'

function formatStaffList(staff: { name?: string | null; email?: string | null }[] | undefined) {
  if (!staff?.length) return 'No staff listed'
  return staff
    .map((s) => s.name?.trim() || s.email || 'Staff')
    .filter(Boolean)
    .join(', ')
}

type ConflictItem = {
  classId: string
  className: string
  classCode: string
  subject: string
  start: string
  end: string
  day: string
}

function StaffCoveragePageInner() {
  const { data: session } = useSession()
  const searchParams = useSearchParams()
  const boxParam = searchParams.get('box')
  const boxMode: 'inbox' | 'outgoing' | 'class' | 'all' =
    boxParam === 'outgoing'
      ? 'outgoing'
      : boxParam === 'class'
        ? 'class'
        : boxParam === 'all'
          ? 'all'
          : 'inbox'
  const queryClient = useQueryClient()

  const [offerClassId, setOfferClassId] = useState('')
  const [offerDate, setOfferDate] = useState('')
  const [offerSlotKey, setOfferSlotKey] = useState('')
  const [releaseSlotKey, setReleaseSlotKey] = useState('')
  const [conflictPayload, setConflictPayload] = useState<{
    conflicts: ConflictItem[]
    message: string
  } | null>(null)
  const [swapConflictKey, setSwapConflictKey] = useState('')

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

  const uid = session?.user?.id

  const slotsToTake = useMemo(() => {
    const entries = (timetableData?.timetable?.entries as any[]) || []
    if (!dayName || !uid) return []
    return entries.filter((e: any) => e.day?.toLowerCase() === dayName.toLowerCase()).filter((e: any) => {
      const sid = String(e.staffId || '').trim()
      if (!sid) return true
      return sid !== String(uid).trim()
    })
  }, [timetableData, dayName, uid])

  const mySlotsToRelease = useMemo(() => {
    const entries = (timetableData?.timetable?.entries as any[]) || []
    if (!dayName || !uid) return []
    return entries.filter(
      (e: any) =>
        e.day?.toLowerCase() === dayName.toLowerCase() &&
        String(e.staffId || '').trim() === String(uid).trim()
    )
  }, [timetableData, dayName, uid])

  const selectedClass = useMemo(
    () => myClasses.find((c: any) => c.id === offerClassId),
    [myClasses, offerClassId]
  )

  const staffNameById = useMemo(() => {
    const m = new Map<string, string>()
    for (const s of selectedClass?.staff || []) {
      m.set(s.id, (s.name && s.name.trim()) || s.email || 'Staff')
    }
    return m
  }, [selectedClass])

  const { data: coverageData, isLoading: coverageLoading } = useQuery({
    queryKey: ['coverage', boxMode],
    queryFn: async () => {
      const q =
        boxMode === 'inbox'
          ? 'box=inbox'
          : boxMode === 'outgoing'
            ? 'box=outgoing'
            : boxMode === 'class'
              ? 'box=class'
              : 'box=all'
      const res = await fetch(`/api/coverage?${q}`)
      if (!res.ok) return null
      return res.json()
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
  })

  const invalidateCoverage = () => queryClient.invalidateQueries({ queryKey: ['coverage'] })

  const createMutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch('/api/coverage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (res.status === 409 && data.code === 'SCHEDULE_CONFLICT') {
        const err = new Error('CONFLICT') as Error & { conflictData?: typeof data }
        err.conflictData = data
        throw err
      }
      if (!res.ok) throw new Error(data.error || 'Request failed')
      return data
    },
    onSuccess: (data: any) => {
      invalidateCoverage()
      setOfferSlotKey('')
      setConflictPayload(null)
      setSwapConflictKey('')
      if (data.autoApproved) {
        alert('Open period assigned to you immediately. You can take attendance for that slot.')
      } else {
        alert('Request sent. Staff on the class have been notified.')
      }
    },
    onError: (e: Error & { conflictData?: { conflicts?: ConflictItem[]; message?: string } }) => {
      if (e.message === 'CONFLICT' && e.conflictData?.conflicts?.length) {
        setConflictPayload({
          conflicts: e.conflictData.conflicts,
          message: e.conflictData.message || 'Schedule conflict.',
        })
        const c = e.conflictData.conflicts[0]!
        setSwapConflictKey(`${c.classId}|${c.subject}|${c.start}|${c.end}|${c.day}`)
        return
      }
      alert(e.message)
    },
  })

  const releaseMutation = useMutation({
    mutationFn: async (body: Record<string, string>) => {
      const res = await fetch('/api/coverage/release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to release')
      return data
    },
    onSuccess: () => {
      invalidateCoverage()
      setReleaseSlotKey('')
      alert('Period is open for colleagues to claim (Class pending).')
    },
    onError: (e: Error) => alert(e.message),
  })

  const claimMutation = useMutation({
    mutationFn: async (releaseId: string) => {
      const res = await fetch('/api/coverage/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ releaseId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Claim failed')
      return data
    },
    onSuccess: () => {
      invalidateCoverage()
      alert('Pickup sent. The staff who released it must confirm in their Inbox.')
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
    onSuccess: () => invalidateCoverage(),
    onError: (e: Error) => alert(e.message),
  })

  const parseSlotKey = (key: string) => {
    const [subject, start, end, day] = key.split('|')
    return { subject, start, end, day }
  }

  const handleOfferCover = (e: React.FormEvent) => {
    e.preventDefault()
    if (!offerClassId || !offerDate || !offerSlotKey) {
      alert('Choose class, date, and period.')
      return
    }
    const { subject, start, end, day } = parseSlotKey(offerSlotKey)
    if (day && expectedDay && day.toLowerCase() !== expectedDay.toLowerCase()) {
      alert('Selected period does not match the weekday of the date.')
      return
    }

    const base = {
      classId: offerClassId,
      date: offerDate,
      day: day || expectedDay,
      subject,
      startTime: start,
      endTime: end,
    }

    if (conflictPayload && swapConflictKey) {
      const [scId, scSubj, scStart, scEnd, scDay] = swapConflictKey.split('|')
      createMutation.mutate({
        ...base,
        kind: 'swap',
        swapOffer: {
          classId: scId,
          subject: scSubj,
          startTime: scStart,
          endTime: scEnd,
          day: scDay,
        },
      })
      return
    }

    createMutation.mutate({ ...base, kind: 'cover' })
  }

  const handleRelease = (e: React.FormEvent) => {
    e.preventDefault()
    if (!offerClassId || !offerDate || !releaseSlotKey) {
      alert('Choose class, date, and period to release.')
      return
    }
    const { subject, start, end, day } = parseSlotKey(releaseSlotKey)
    releaseMutation.mutate({
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
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Class cover & swaps</h1>
        <p className="text-slate-600 mb-6">
          <strong>Open timetable slot</strong> (no teacher): you get approved immediately. If you already teach
          another class at the same time, submit a <strong>parallel swap</strong> (you take this period; the other
          teacher takes one of your same-time periods). <strong>Release</strong> your period so others can claim it
          (you confirm pickup in Inbox).
        </p>

        <h2 className="text-lg font-semibold text-slate-900 mb-4">Manage Coverage Requests</h2>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
          <h3 className="text-md font-medium text-slate-900 mb-4">Select Class and Date</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Class</label>
              <select
                value={offerClassId}
                onChange={(e) => {
                  setOfferClassId(e.target.value)
                  setOfferSlotKey('')
                  setReleaseSlotKey('')
                  setConflictPayload(null)
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              >
                <option value="">Select class</option>
                {myClasses.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code}) — Staff: {formatStaffList(c.staff)}
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
                  setReleaseSlotKey('')
                  setConflictPayload(null)
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Request Coverage</h3>
            <p className="text-sm text-slate-600 mb-4">
              Take an open slot or cover for another teacher. Auto-approved for open slots.
            </p>
            <form onSubmit={handleOfferCover} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">
                  Period (another teacher or open slot)
                </label>
                <select
                  value={offerSlotKey}
                  onChange={(e) => {
                    setOfferSlotKey(e.target.value)
                    setConflictPayload(null)
                    setSwapConflictKey('')
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  required
                  disabled={!offerClassId || !offerDate}
                >
                  <option value="">Select period</option>
                  {slotsToTake.map((s: any, i: number) => {
                    const sid = s.staffId ? String(s.staffId).trim() : ''
                    const teacherLabel = sid
                      ? staffNameById.get(sid) || `Teacher (${sid.slice(-6)})`
                      : 'Open slot — auto-approved'
                    return (
                      <option key={i} value={`${s.subject}|${s.start}|${s.end}|${s.day || dayName}`}>
                        {s.subject} ({s.start}–{s.end}) — {teacherLabel}
                      </option>
                    )
                  })}
                </select>
                {offerClassId && offerDate && slotsToTake.length === 0 && (
                  <p className="text-sm text-amber-600 mt-1">No periods to take on {dayName} in this timetable.</p>
                )}
              </div>
              {conflictPayload && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-2">
                  <p className="text-sm text-amber-900 font-medium">{conflictPayload.message}</p>
                  <p className="text-sm text-amber-800">Choose which of your same-time periods you offer in exchange:</p>
                  <select
                    value={swapConflictKey}
                    onChange={(e) => setSwapConflictKey(e.target.value)}
                    className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm"
                  >
                    {conflictPayload.conflicts.map((c, i) => (
                      <option
                        key={i}
                        value={`${c.classId}|${c.subject}|${c.start}|${c.end}|${c.day}`}
                      >
                        {c.className}: {c.subject} ({c.start}–{c.end})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      setConflictPayload(null)
                      setSwapConflictKey('')
                    }}
                    className="text-sm text-amber-900 underline"
                  >
                    Cancel swap mode
                  </button>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={createMutation.isPending || !offerClassId || !offerDate}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium disabled:opacity-50"
                >
                  {createMutation.isPending
                    ? 'Sending…'
                    : conflictPayload
                      ? 'Send swap request'
                      : 'Send cover / take open slot'}
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Release My Period</h3>
            <p className="text-sm text-slate-600 mb-4">
              Cancel your commitment for a slot; colleagues can claim it. You approve claims in Inbox.
            </p>
            <form onSubmit={handleRelease} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">My period this day</label>
                <select
                  value={releaseSlotKey}
                  onChange={(e) => setReleaseSlotKey(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  required
                  disabled={!offerClassId || !offerDate}
                >
                  <option value="">Select period</option>
                  {mySlotsToRelease.map((s: any, i: number) => (
                    <option key={i} value={`${s.subject}|${s.start}|${s.end}|${s.day || dayName}`}>
                      {s.subject} ({s.start}–{s.end})
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={releaseMutation.isPending || !offerClassId || !offerDate}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg font-medium disabled:opacity-50"
              >
                {releaseMutation.isPending ? 'Releasing…' : 'Release for pickup'}
              </button>
            </form>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          <a
            href="/staff/coverage?box=inbox"
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              boxMode === 'inbox' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-700'
            }`}
          >
            Inbox (approve)
          </a>
          <a
            href="/staff/coverage?box=outgoing"
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              boxMode === 'outgoing' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-700'
            }`}
          >
            My offers / open releases
          </a>
          <a
            href="/staff/coverage?box=class"
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              boxMode === 'class' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-700'
            }`}
          >
            Class (pending + open)
          </a>
          <a
            href="/staff/coverage?box=all"
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              boxMode === 'all' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-700'
            }`}
          >
            All (mine)
          </a>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          {boxMode === 'class' && (
            <p className="text-sm text-slate-600 mb-3">
              Pending requests, open releases, and pickups for classes you are on. <strong>Claim</strong> open
              releases here. Only the assigned teacher (or releaser for pickups) can accept in Inbox.
            </p>
          )}
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            {boxMode === 'inbox'
              ? 'Needs your approval'
              : boxMode === 'outgoing'
                ? 'Your offers & open releases'
                : boxMode === 'class'
                  ? 'Class activity'
                  : 'Everything involving you'}
          </h2>
          {coverageLoading ? (
            <p className="text-slate-500">Loading…</p>
          ) : requests.length === 0 ? (
            <p className="text-slate-500">No items.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {requests.map((r: any) => (
                <li key={r.id} className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">
                      {r.class?.name} — {r.subject} ({r.startTime}–{r.endTime}){' '}
                      <span className="text-xs font-normal text-slate-500">
                        [{r.kind || 'cover'}] {r.status}
                        {r.autoApproved ? ' · auto' : ''}
                      </span>
                    </p>
                    {r.kind === 'swap' && r.swapSubject && (
                      <p className="text-sm text-slate-600">
                        Swap offer: {r.swapSubject} ({r.swapStartTime}–{r.swapEndTime}) in{' '}
                        {r.swapClass?.name || 'other class'}
                      </p>
                    )}
                    <p className="text-sm text-slate-500">
                      {new Date(r.date).toLocaleDateString()}
                      {r.status === 'open' && r.kind === 'release' ? (
                        <>
                          {' '}
                          · Released by {r.fromStaff?.name || r.fromStaff?.email || '—'}
                        </>
                      ) : (
                        <>
                          {' '}
                          · Teacher: {r.fromStaff?.name || r.fromStaff?.email || '—'} · With:{' '}
                          {r.toStaff?.name || r.toStaff?.email || '—'}
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {r.status === 'open' && r.kind === 'release' && r.fromStaffId !== session?.user?.id && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm('Claim this period? The colleague who released it must confirm.')) {
                            claimMutation.mutate(r.id)
                          }
                        }}
                        className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg"
                      >
                        Claim
                      </button>
                    )}
                    {r.status === 'open' && r.kind === 'release' && r.fromStaffId === session?.user?.id && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm('Cancel this open release?')) patchMutation.mutate({ id: r.id, action: 'cancel' })
                        }}
                        className="px-3 py-1.5 bg-slate-100 text-slate-800 text-sm rounded-lg border border-slate-200"
                      >
                        Cancel release
                      </button>
                    )}
                    {r.status === 'pending' && r.fromStaffId === session?.user?.id && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm('Accept?')) patchMutation.mutate({ id: r.id, action: 'accept' })
                          }}
                          className="px-3 py-1.5 bg-emerald-600 text-white text-sm rounded-lg"
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm('Decline?')) patchMutation.mutate({ id: r.id, action: 'reject' })
                          }}
                          className="px-3 py-1.5 bg-slate-100 text-slate-800 text-sm rounded-lg border border-slate-200"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {r.status === 'pending' &&
                      (r.requestedById === session?.user?.id || r.toStaffId === session?.user?.id) &&
                      r.fromStaffId !== session?.user?.id && (
                        <button
                          type="button"
                          onClick={() => patchMutation.mutate({ id: r.id, action: 'cancel' })}
                          className="px-3 py-1.5 text-sm text-slate-600 underline"
                        >
                          Cancel
                        </button>
                      )}
                  </div>
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
