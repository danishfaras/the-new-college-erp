'use client'

import { useSession } from 'next-auth/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Header } from '@/components/layout/Header'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import type { TimetableEntry } from '@/types'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const emptyEntry: TimetableEntry = {
  day: 'Monday',
  start: '09:00',
  end: '10:00',
  subject: '',
  staffId: '',
  location: '',
}

export default function AdminClassTimetablePage() {
  const { data: session } = useSession()
  const params = useParams()
  const queryClient = useQueryClient()
  const classId = params.id as string
  const [entries, setEntries] = useState<TimetableEntry[]>([])
  const [initialized, setInitialized] = useState(false)

  const { data: classData } = useQuery({
    queryKey: ['class', classId],
    queryFn: async () => {
      const res = await fetch(`/api/classes/${classId}`)
      if (!res.ok) return null
      return res.json()
    },
  })

  const { data: timetableData } = useQuery({
    queryKey: ['timetable', classId],
    queryFn: async () => {
      const res = await fetch(`/api/timetable/${classId}`)
      if (!res.ok) return { timetable: { entries: [] } }
      return res.json()
    },
  })

  useEffect(() => {
    if (initialized || !timetableData) return
    const list = timetableData?.timetable?.entries
    if (Array.isArray(list) && list.length > 0) {
      setEntries(list as TimetableEntry[])
    } else {
      setEntries([{ ...emptyEntry }])
    }
    setInitialized(true)
  }, [timetableData, initialized])

  const { data: staffData } = useQuery({
    queryKey: ['users', 'staff'],
    queryFn: async () => {
      const res = await fetch('/api/users?role=staff')
      if (!res.ok) return null
      return res.json()
    },
  })

  const saveMutation = useMutation({
    mutationFn: async (entriesToSave: TimetableEntry[]) => {
      const valid = entriesToSave.filter((e) => e.subject.trim() && e.staffId)
      const res = await fetch(`/api/timetable/${classId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries: valid }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to save timetable')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timetable', classId] })
    },
  })

  const addRow = () => setEntries((e) => [...e, { ...emptyEntry }])
  const removeRow = (i: number) => setEntries((e) => e.filter((_, idx) => idx !== i))
  const updateRow = (i: number, field: keyof TimetableEntry, value: string) => {
    setEntries((e) => e.map((row, idx) => (idx === i ? { ...row, [field]: value } : row)))
  }

  const cls = classData?.class

  if (!session || session.user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <p className="text-slate-600">You do not have permission to edit timetables.</p>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link href="/admin/classes" className="text-sm text-blue-600 hover:underline mb-1 block">← Back to Classes</Link>
            <h1 className="text-2xl font-bold text-slate-900">
              Timetable {cls ? `— ${cls.name}` : ''}
            </h1>
            <p className="text-slate-500 text-sm mt-1">Add or edit schedule entries. Each entry needs day, time, subject, and assigned staff.</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={addRow}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100"
            >
              Add Row
            </button>
            <button
              type="button"
              onClick={() => saveMutation.mutate(entries)}
              disabled={saveMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saveMutation.isPending ? 'Saving...' : 'Save Timetable'}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 shadow-sm erp-table-scroll">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Day</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Start</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">End</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Subject</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Staff</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Location</th>
                <th className="px-4 py-3 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {entries.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-4 py-2">
                    <select
                      value={row.day}
                      onChange={(e) => updateRow(i, 'day', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 text-sm"
                    >
                      {DAYS.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="time"
                      value={row.start}
                      onChange={(e) => updateRow(i, 'start', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 text-sm"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="time"
                      value={row.end}
                      onChange={(e) => updateRow(i, 'end', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 text-sm"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      value={row.subject}
                      onChange={(e) => updateRow(i, 'subject', e.target.value)}
                      placeholder="Subject name"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 text-sm"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <select
                      value={row.staffId}
                      onChange={(e) => updateRow(i, 'staffId', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 text-sm"
                    >
                      <option value="">Select staff</option>
                      {(staffData?.users || []).map((s: any) => (
                        <option key={s.id} value={s.id}>{s.name} ({s.email})</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      value={row.location || ''}
                      onChange={(e) => updateRow(i, 'location', e.target.value)}
                      placeholder="Room"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 text-sm"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <button
                      type="button"
                      onClick={() => removeRow(i)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {saveMutation.isError && (
          <p className="mt-4 text-red-600 text-sm">{(saveMutation.error as Error).message}</p>
        )}
      </main>
    </div>
  )
}
