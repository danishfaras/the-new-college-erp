'use client'

import { useSession } from 'next-auth/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Header } from '@/components/layout/Header'
import { useState } from 'react'

export default function StaffMyAttendancePage() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [status, setStatus] = useState<'present' | 'absent' | 'late'>('present')
  const [submitting, setSubmitting] = useState(false)

  // For now, we'll store staff attendance in a simple way
  // In a real app, you might want a separate StaffAttendance model
  // For now, we'll use localStorage or create a simple API endpoint
  const [myAttendance, setMyAttendance] = useState<Record<string, string>>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`staff-attendance-${session?.user.id}`)
      return stored ? JSON.parse(stored) : {}
    }
    return {}
  })

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
    .map(([date, stat]) => ({ date, status: stat }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 30) // Last 30 records

  const thisMonthRecords = attendanceRecords.filter((r) => {
    const recordDate = new Date(r.date)
    const now = new Date()
    return recordDate.getMonth() === now.getMonth() && recordDate.getFullYear() === now.getFullYear()
  })

  const thisMonthStats = {
    total: thisMonthRecords.length,
    present: thisMonthRecords.filter((r) => r.status === 'present' || r.status === 'late').length,
    absent: thisMonthRecords.filter((r) => r.status === 'absent').length,
    percentage: thisMonthRecords.length > 0
      ? ((thisMonthRecords.filter((r) => r.status === 'present' || r.status === 'late').length / thisMonthRecords.length) * 100).toFixed(1)
      : '0',
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">My Attendance</h1>
            <p className="text-gray-400">Track your own attendance and work records</p>
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
              className="backdrop-blur-xl bg-white/5 rounded-xl border border-white/10 p-6 hover:bg-white/10 transition-all duration-300"
            >
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{stat.label}</p>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Mark Attendance Form */}
        <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 shadow-2xl mb-8 p-6">
          <h2 className="text-2xl font-bold text-white mb-6">Mark Today's Attendance</h2>
          <form onSubmit={handleMarkAttendance} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Date</label>
                <input
                  type="date"
                  required
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="block w-full px-4 py-3 bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                <select
                  required
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'present' | 'absent' | 'late')}
                  className="block w-full px-4 py-3 bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200"
                >
                  <option value="present" className="bg-slate-800">Present</option>
                  <option value="late" className="bg-slate-800">Late</option>
                  <option value="absent" className="bg-slate-800">Absent</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end space-x-4 pt-4 border-t border-white/10">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {submitting ? 'Marking...' : 'Mark Attendance'}
              </button>
            </div>
          </form>
        </div>

        {/* Attendance History */}
        <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10 bg-gradient-to-r from-blue-500/10 to-cyan-500/10">
            <h2 className="text-xl font-bold text-white">Attendance History</h2>
            <p className="text-sm text-gray-400 mt-1">Your attendance records</p>
          </div>
          <div className="overflow-x-auto">
            {attendanceRecords.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Day</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {attendanceRecords.map((record, index) => (
                    <tr key={index} className="hover:bg-white/5 transition-colors duration-200">
                      <td className="px-6 py-4 whitespace-nowrap text-white">
                        {new Date(record.date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-400">
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
                  <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-gray-400 text-lg">No attendance records</p>
                <p className="text-gray-500 text-sm mt-2">Mark your attendance to get started</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
