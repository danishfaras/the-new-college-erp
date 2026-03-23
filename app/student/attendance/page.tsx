'use client'

import { useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import { Header } from '@/components/layout/Header'

export default function StudentAttendancePage() {
  const { data: session } = useSession()

  // Fetch all classes to find student's class
  const { data: classesData } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const res = await fetch('/api/classes')
      if (!res.ok) return null
      return res.json()
    },
  })

  // Get student's profile
  const { data: profileData } = useQuery({
    queryKey: ['profile', session?.user.id],
    queryFn: async () => {
      if (!session?.user.id) return null
      const res = await fetch(`/api/users/${session.user.id}`)
      if (!res.ok) return null
      return res.json()
    },
    enabled: !!session?.user.id,
  })

  const studentClass = classesData?.classes?.find((cls: any) =>
    (cls.studentIds && cls.studentIds.includes(session?.user?.id)) ||
    cls.department === profileData?.user?.profile?.department
  )

  // Fetch attendance
  const { data: attendanceData, isLoading } = useQuery({
    queryKey: ['attendance', studentClass?.id],
    queryFn: async () => {
      if (!studentClass?.id) return null
      const startDate = new Date()
      startDate.setMonth(startDate.getMonth() - 6) // Last 6 months
      const endDate = new Date()
      const res = await fetch(
        `/api/attendance/${studentClass.id}?start=${startDate.toISOString()}&end=${endDate.toISOString()}`
      )
      if (!res.ok) return null
      return res.json()
    },
    enabled: !!studentClass?.id,
  })

  const summary = attendanceData?.summary || {}
  const attendanceRecords = attendanceData?.attendance || []

  // Get student's attendance records (one per period)
  const studentRecords = attendanceRecords.flatMap((att: any) => {
    const records = att.records as any[]
    const periodLabel = att.subject
      ? `${att.subject} (${att.startTime || ''}–${att.endTime || ''})`
      : '—'
    return records
      .filter((r: any) => r.studentId === session?.user.id)
      .map((r: any) => ({
        date: att.date,
        period: periodLabel,
        status: r.status,
        note: r.note,
        takenBy: att.takenByUser,
      }))
  }).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">Attendance Records</h1>
            <p className="text-slate-500">
              {studentClass ? `${studentClass.name} • ${studentClass.department}` : 'Your attendance history'}
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-4 mb-8">
          {[
            {
              label: 'Total Periods',
              value: summary.total || 0,
              gradient: 'from-blue-500 to-cyan-500',
            },
            {
              label: 'Present',
              value: summary.present || 0,
              gradient: 'from-green-500 to-emerald-500',
            },
            {
              label: 'Absent',
              value: summary.absent || 0,
              gradient: 'from-red-500 to-pink-500',
            },
            {
              label: 'Attendance %',
              value: summary.percentage ? `${summary.percentage.toFixed(1)}%` : '0%',
              gradient: 'from-purple-500 to-pink-500',
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

        {/* Attendance Records */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-400"></div>
            <p className="mt-4 text-slate-500">Loading attendance...</p>
          </div>
        ) : studentRecords.length > 0 ? (
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h2 className="text-xl font-bold text-slate-900">Attendance History (by period)</h2>
              <p className="text-sm text-slate-500 mt-1">Your attendance per class period for the last 6 months</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Period</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Taken By</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {studentRecords.map((record: any, index: number) => (
                    <tr key={index} className="hover:bg-slate-50 transition-colors duration-200">
                      <td className="px-6 py-4 whitespace-nowrap text-slate-900">
                        {new Date(record.date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-700 font-medium">
                        {record.period}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {record.status === 'present' ? (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-400 border border-green-500/30">
                            Present
                          </span>
                        ) : record.status === 'late' ? (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            Late
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/30">
                            Absent
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-600 text-sm">
                        {record.takenBy?.name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-sm">
                        {record.note || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm shadow-2xl p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-500/20 mb-4">
              <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-slate-500 text-lg">No attendance records found</p>
            <p className="text-slate-500 text-sm mt-2">Your attendance records will appear here once they're recorded</p>
          </div>
        )}
      </main>
    </div>
  )
}
