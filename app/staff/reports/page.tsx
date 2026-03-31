'use client'

import { useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import { Header } from '@/components/layout/Header'
import { useMemo, useState } from 'react'

function downloadUrl(path: string) {
  window.location.href = path
}

export default function ReportsPage() {
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'admin'

  const [classId, setClassId] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')

  const { data: classesData } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const res = await fetch('/api/classes')
      if (!res.ok) return null
      return res.json()
    },
  })

  const classes = useMemo(() => {
    const all = classesData?.classes || []
    if (isAdmin) return all
    return all.filter((c: any) => c.staffIds?.includes(session?.user?.id))
  }, [classesData, isAdmin, session?.user?.id])

  const rangeQs = [start ? `start=${encodeURIComponent(start)}` : '', end ? `end=${encodeURIComponent(end)}` : '']
    .filter(Boolean)
    .join('&')
  const classQs = classId ? `classId=${encodeURIComponent(classId)}` : ''
  const base = (type: string) =>
    `/api/reports?type=${type}${classQs ? `&${classQs}` : ''}${rangeQs ? `&${rangeQs}` : ''}`

  const btn =
    'inline-flex items-center justify-center px-4 py-3 rounded-xl text-sm font-semibold border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-sm'

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Reports & exports</h1>
        <p className="text-slate-600 mb-8">
          Download CSV files for registers, attendance analysis, and fees. Optional date range applies to attendance
          exports. Leave dates empty to include all recorded history for the selected scope.
        </p>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-8 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Filters</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Class</label>
              <select
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
              >
                <option value="">All {isAdmin ? 'classes' : 'my classes'}</option>
                {classes.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">From (attendance)</label>
                <input
                  type="date"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">To (attendance)</label>
                <input
                  type="date"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Attendance</h2>
            <p className="text-sm text-slate-600 mb-4">
              Line-by-line period marks, or one row per student with counts and percentage (present + late counted toward
              %).
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap gap-3">
              <button type="button" className={btn} onClick={() => downloadUrl(base('attendance-detail'))}>
                Download attendance detail (CSV)
              </button>
              <button type="button" className={btn} onClick={() => downloadUrl(base('attendance-summary'))}>
                Download attendance summary by student (CSV)
              </button>
            </div>
          </section>

          <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Students</h2>
            <p className="text-sm text-slate-600 mb-4">
              Class roster with roll number, contact, and approval flag (uses class enrolment or department match).
            </p>
            <button type="button" className={btn} onClick={() => downloadUrl(base('student-roster'))}>
              Download student roster (CSV)
            </button>
          </section>

          <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Fees</h2>
            <p className="text-sm text-slate-600 mb-4">
              Per-student fee counts and unpaid totals for students linked to the selected class scope.
            </p>
            <button type="button" className={btn} onClick={() => downloadUrl(base('fees-summary'))}>
              Download fees summary (CSV)
            </button>
          </section>

          {isAdmin && (
            <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-2">Institution overview</h2>
              <p className="text-sm text-slate-600 mb-4">
                High-level class list with staff and enrolled-student ID counts (admin: all classes; filter narrows to one
                class).
              </p>
              <button type="button" className={btn} onClick={() => downloadUrl(base('classes-overview'))}>
                Download classes overview (CSV)
              </button>
            </section>
          )}
        </div>
      </main>
    </div>
  )
}
