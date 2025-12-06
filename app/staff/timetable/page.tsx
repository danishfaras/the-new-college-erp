'use client'

import { useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import { Header } from '@/components/layout/Header'
import Link from 'next/link'

export default function StaffTimetablePage() {
  const { data: session } = useSession()

  // Fetch classes assigned to this staff member
  const { data: classesData } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const res = await fetch('/api/classes')
      if (!res.ok) return null
      return res.json()
    },
  })

  const myClasses = classesData?.classes?.filter((cls: any) =>
    cls.staffIds?.includes(session?.user.id)
  ) || []

  // Fetch timetables for all classes
  const { data: timetablesData, isLoading } = useQuery({
    queryKey: ['timetables', myClasses.map((c: any) => c.id)],
    queryFn: async () => {
      const timetablePromises = myClasses.map(async (cls: any) => {
        const res = await fetch(`/api/timetable/${cls.id}`)
        if (!res.ok) return { classId: cls.id, entries: [] }
        const data = await res.json()
        return { classId: cls.id, class: cls, entries: data.timetable?.entries || [] }
      })
      return Promise.all(timetablePromises)
    },
    enabled: myClasses.length > 0,
  })

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const allEntries = timetablesData?.flatMap((t: any) => 
    (t.entries as any[]).map((e: any) => ({ ...e, className: t.class?.name, classId: t.classId }))
  ) || []
  const timeSlots = Array.from(new Set(allEntries.map((e: any) => `${e.start}-${e.end}`))).sort()

  const getEntriesForDay = (day: string) => {
    return allEntries.filter((e: any) => e.day?.toLowerCase() === day.toLowerCase())
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Timetable Editor</h1>
            <p className="text-gray-400">View and edit timetables for your classes</p>
          </div>
        </div>

        {/* Timetable Grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400"></div>
            <p className="mt-4 text-gray-400">Loading timetable...</p>
          </div>
        ) : allEntries.length > 0 ? (
          <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Time</th>
                    {days.map((day) => (
                      <th key={day} className="px-6 py-4 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {timeSlots.map((slot) => {
                    const [start, end] = slot.split('-')
                    return (
                      <tr key={slot} className="hover:bg-white/5 transition-colors duration-200">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-300">
                          {start} - {end}
                        </td>
                        {days.map((day) => {
                          const dayEntries = getEntriesForDay(day).filter(
                            (e: any) => e.start === start && e.end === end
                          )
                          return (
                            <td key={day} className="px-4 py-4">
                              {dayEntries.map((entry: any, idx: number) => (
                                <div
                                  key={idx}
                                  className="backdrop-blur-sm bg-purple-500/20 border border-purple-500/30 rounded-lg p-3 mb-2 hover:bg-purple-500/30 transition-all duration-200"
                                >
                                  <div className="text-white font-semibold text-sm">{entry.subject}</div>
                                  <div className="text-purple-300 text-xs mt-1">{entry.className}</div>
                                  {entry.location && (
                                    <div className="text-purple-300 text-xs mt-1">📍 {entry.location}</div>
                                  )}
                                </div>
                              ))}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 shadow-2xl p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-500/20 mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-gray-400 text-lg">No timetable available</p>
            <p className="text-gray-500 text-sm mt-2">Timetables for your classes will appear here</p>
          </div>
        )}

        {/* Class Links */}
        {myClasses.length > 0 && (
          <div className="mt-8 backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 shadow-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Edit Class Timetables</h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {myClasses.map((cls: any) => (
                <Link
                  key={cls.id}
                  href={`/staff/classes/${cls.id}`}
                  className="backdrop-blur-sm bg-white/5 rounded-xl border border-white/10 p-4 hover:bg-white/10 transition-all duration-200"
                >
                  <h3 className="text-white font-semibold">{cls.name}</h3>
                  <p className="text-gray-400 text-sm">{cls.code}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
