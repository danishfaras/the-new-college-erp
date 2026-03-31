'use client'

import { useSession } from 'next-auth/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Header } from '@/components/layout/Header'
import { useState, useEffect } from 'react'

export default function StaffMyAttendancePage() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  // Use empty string initially so server and client match; set today's date after mount
  const [selectedDate, setSelectedDate] = useState('')
  const [status, setStatus] = useState<'present' | 'absent' | 'late'>('present')
  const [submitting, setSubmitting] = useState(false)
  // Today's date string (set after mount to avoid server/client mismatch)
  const [todayStr, setTodayStr] = useState('')

  // Always start with {} so SSR and client initial render match
  const [myAttendance, setMyAttendance] = useState<Record<string, string>>({})

  // After mount: set today's date and load from localStorage (client-only)
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    setSelectedDate(today)
    setTodayStr(today)
    if (typeof window !== 'undefined' && session?.user?.id) {
      const stored = localStorage.getItem(`staff-attendance-${session.user.id}`)
      if (stored) {
        try {
          setMyAttendance(JSON.parse(stored))
        } catch {
          // ignore invalid JSON
        }
      }
    }
  }, [session?.user?.id])

  const handleMarkAttendance = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      // Store in localStorage for now
      // In production, you'd want to create an API endpoint for staff attendance
      const updated = { ...myAttendance, [selectedDate]: status }
      setMyAttendance(updated)
      if (typeof window !== 'undefined') {
        localStorage.setItem(`staff-attendance-${session?.user.id}`, JSON.stringify(updated))
      }
      alert('Attendance marked successfully!')
      setSelectedDate(new Date().toISOString().split('T')[0])
    } catch (error) {
      console.error('Failed to mark attendance:', error)
      alert('Failed to mark attendance')
    } finally {
      setSubmitting(false)
    }
  }

  // Get attendance records for display
  const attendanceRecords = Object.entries(myAttendance)
    .map(([date, stat]: [string, string]) => ({ date, status: stat }))
    .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 30) // Last 30 records

  const thisMonthRecords = attendanceRecords.filter((r: any) => {
    const recordDate = new Date(r.date)
    const now = new Date()
    return recordDate.getMonth() === now.getMonth() && recordDate.getFullYear() === now.getFullYear()
  })

  const thisMonthStats = {
    total: thisMonthRecords.length,
    present: thisMonthRecords.filter((r: any) => r.status === 'present' || r.status === 'late').length,
    absent: thisMonthRecords.filter((r: any) => r.status === 'absent').length,
    percentage: thisMonthRecords.length > 0
      ? ((thisMonthRecords.filter((r: any) => r.status === 'present' || r.status === 'late').length / thisMonthRecords.length) * 100).toFixed(1)
      : '0',
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">My Attendance</h1>
            <p className="text-slate-500">Track your own attendance and work records</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-4 mb-8">
          {[
            {
              label: 'This Month',
              value: thisMonthStats.total,
              gradient: 'from-blue-500 to-cyan-500',
            },
            {
              label: 'Present',
              value: thisMonthStats.present,
              gradient: 'from-green-500 to-emerald-500',
            },
            {
              label: 'Absent',
              value: thisMonthStats.absent,
              gradient: 'from-red-500 to-pink-500',
            },
            {
              label: 'Attendance %',
              value: `${thisMonthStats.percentage}%`,
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

        {/* Mark Attendance Form */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm shadow-2xl mb-8 p-6">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Mark Today's Attendance</h2>
          <form onSubmit={handleMarkAttendance} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">Date</label>
                <input
                  type="date"
                  required
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  max={todayStr}
                  className="block w-full px-4 py-3 bg-slate-50 backdrop-blur-sm border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">Status</label>
                <select
                  required
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'present' | 'absent' | 'late')}
                  className="block w-full px-4 py-3 bg-slate-50 backdrop-blur-sm border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200"
                >
                  <option value="present" className="bg-white text-slate-900">Present</option>
                  <option value="late" className="bg-white text-slate-900">Late</option>
                  <option value="absent" className="bg-white text-slate-900">Absent</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end space-x-4 pt-4 border-t border-slate-200">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-3 bg-blue-600 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {submitting ? 'Marking...' : 'Mark Attendance'}
              </button>
            </div>
          </form>
        </div>

        {/* Attendance History */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm shadow-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
            <h2 className="text-xl font-bold text-slate-900">Attendance History</h2>
            <p className="text-sm text-slate-500 mt-1">Your attendance records</p>
          </div>
          <div className="erp-table-scroll">
            {attendanceRecords.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Day</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {attendanceRecords.map((record, index) => (
                    <tr key={index} className="hover:bg-slate-50 transition-colors duration-200">
                      <td className="px-6 py-4 whitespace-nowrap text-slate-900">
                        {new Date(record.date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-500">
                        {new Date(record.date).toLocaleDateString('en-US', { weekday: 'long' })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            record.status === 'present'
                              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                              : record.status === 'late'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-red-500/20 text-red-400 border border-red-500/30'
                          }`}
                        >
                          {record.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-500/20 mb-4">
                  <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-slate-500 text-lg">No attendance records</p>
                <p className="text-slate-500 text-sm mt-2">Mark your attendance to get started</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
