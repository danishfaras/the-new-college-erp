'use client'

import { useSession } from 'next-auth/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Header } from '@/components/layout/Header'
import { useParams, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'

export default function StaffClassDetailPage() {
  const { data: session } = useSession()
  const params = useParams()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const classId = params.id as string
  const action = searchParams.get('action')
  const viewAttendanceId = searchParams.get('view-attendance')

  // Use empty string initially so server and client match; set today after mount
  const [attendanceDate, setAttendanceDate] = useState('')
  useEffect(() => {
    setAttendanceDate(new Date().toISOString().split('T')[0])
  }, [])
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, string>>({})
  const [submittingAttendance, setSubmittingAttendance] = useState(false)

  // Fetch class details
  const { data: classData, isLoading: classLoading } = useQuery({
    queryKey: ['class', classId],
    queryFn: async () => {
      const res = await fetch(`/api/classes/${classId}`)
      if (!res.ok) return null
      return res.json()
    },
  })

  // Fetch students in this class (by department)
  const { data: studentsData } = useQuery({
    queryKey: ['students', classData?.class?.department],
    queryFn: async () => {
      const res = await fetch('/api/users?role=student')
      if (!res.ok) return null
      const data = await res.json()
      // Filter students by department matching the class
      return {
        users: data.users?.filter((user: any) => 
          user.profile?.department === classData?.class?.department
        ) || []
      }
    },
    enabled: !!classData?.class?.department,
  })

  // Fetch attendance for this class
  const { data: attendanceData } = useQuery({
    queryKey: ['attendance', classId],
    queryFn: async () => {
      const res = await fetch(`/api/attendance/${classId}`)
      if (!res.ok) return null
      return res.json()
    },
  })

  // Initialize attendance records when students load
  useEffect(() => {
    if (studentsData?.users && Object.keys(attendanceRecords).length === 0) {
      const initialRecords: Record<string, string> = {}
      studentsData.users.forEach((student: any) => {
        initialRecords[student.id] = 'present'
      })
      setAttendanceRecords(initialRecords)
    }
  }, [studentsData?.users])

  const handleSubmitAttendance = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmittingAttendance(true)
    try {
      const records = Object.entries(attendanceRecords).map(([studentId, status]) => ({
        studentId,
        status,
      }))

      const res = await fetch(`/api/attendance/${classId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: attendanceDate,
          records,
        }),
      })

      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ['attendance', classId] })
        setAttendanceRecords({})
        alert('Attendance recorded successfully!')
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to record attendance')
      }
    } catch (error) {
      console.error('Failed to submit attendance:', error)
      alert('Failed to record attendance')
    } finally {
      setSubmittingAttendance(false)
    }
  }

  // Calculate attendance summary for each student
  const getStudentAttendanceSummary = (studentId: string) => {
    const records = attendanceData?.attendance?.flatMap((att: any) => {
      const attRecords = att.records as any[]
      return attRecords
        .filter((r: any) => r.studentId === studentId)
        .map((r: any) => ({
          date: att.date,
          status: r.status,
        }))
    }) || []

    const total = records.length
    const present = records.filter((r: any) => r.status === 'present' || r.status === 'late').length
    const percentage = total > 0 ? (present / total) * 100 : 0

    return { total, present, absent: total - present, percentage }
  }

  const students = studentsData?.users || []
  const attendanceRecordsList = attendanceData?.attendance || []
  const selectedAttendance = viewAttendanceId
    ? attendanceRecordsList.find((att: any) => att.id === viewAttendanceId)
    : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">
              {classData?.class?.name || 'Class Details'}
            </h1>
            <p className="text-gray-400">
              {classData?.class?.code} • {classData?.class?.department}
            </p>
          </div>
        </div>

        {classLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
            <p className="mt-4 text-gray-400">Loading class details...</p>
          </div>
        ) : (
          <>
            {/* Take Attendance Form */}
            {action === 'take-attendance' && (
              <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 shadow-2xl mb-8 p-6">
                <h2 className="text-2xl font-bold text-white mb-6">Take Attendance</h2>
                <form onSubmit={handleSubmitAttendance} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Date</label>
                    <input
                      type="date"
                      required
                      value={attendanceDate}
                      onChange={(e) => setAttendanceDate(e.target.value)}
                      className="block w-full max-w-xs px-4 py-3 bg-white/5 backdrop-blur-sm border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all duration-200"
                    />
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-white">Mark Attendance</h3>
                    <div className="max-h-96 overflow-y-auto space-y-2">
                      {students.map((student: any) => (
                        <div
                          key={student.id}
                          className="backdrop-blur-sm bg-white/5 rounded-xl border border-white/10 p-4"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-bold shadow-lg">
                                {student.name?.charAt(0).toUpperCase() || 'S'}
                              </div>
                              <div>
                                <p className="text-white font-semibold">{student.name || 'No Name'}</p>
                                <p className="text-gray-400 text-sm">{student.profile?.rollNo || 'No Roll No'}</p>
                              </div>
                            </div>
                            <select
                              value={attendanceRecords[student.id] || 'present'}
                              onChange={(e) =>
                                setAttendanceRecords({ ...attendanceRecords, [student.id]: e.target.value })
                              }
                              className="px-4 py-2 bg-white/5 backdrop-blur-sm border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all duration-200"
                            >
                              <option value="present" className="bg-slate-800">Present</option>
                              <option value="absent" className="bg-slate-800">Absent</option>
                              <option value="late" className="bg-slate-800">Late</option>
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-end space-x-4 pt-4 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => window.history.back()}
                      className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-all duration-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingAttendance || students.length === 0}
                      className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      {submittingAttendance ? 'Submitting...' : 'Submit Attendance'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* View Specific Attendance Record */}
            {selectedAttendance && (
              <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 shadow-2xl mb-8 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-white">Attendance Record</h2>
                    <p className="text-gray-400 text-sm mt-1">
                      {new Date(selectedAttendance.date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                  <button
                    onClick={() => window.history.back()}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-all duration-200"
                  >
                    Close
                  </button>
                </div>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {(selectedAttendance.records as any[]).map((record: any) => {
                    const student = students.find((s: any) => s.id === record.studentId)
                    return (
                      <div
                        key={record.studentId}
                        className="backdrop-blur-sm bg-white/5 rounded-xl border border-white/10 p-4"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-bold shadow-lg">
                              {student?.name?.charAt(0).toUpperCase() || 'S'}
                            </div>
                            <div>
                              <p className="text-white font-semibold">{student?.name || 'Unknown'}</p>
                              <p className="text-gray-400 text-sm">{student?.profile?.rollNo || 'No Roll No'}</p>
                            </div>
                          </div>
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
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Students List with Attendance Summary */}
            {!action && !viewAttendanceId && (
              <>
                <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 shadow-2xl mb-8 overflow-hidden">
                  <div className="px-6 py-4 border-b border-white/10 bg-gradient-to-r from-blue-500/10 to-cyan-500/10">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-xl font-bold text-white">Students ({students.length})</h2>
                        <p className="text-sm text-gray-400 mt-1">View student attendance and details</p>
                      </div>
                      <a
                        href={`?action=take-attendance`}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold text-sm transition-all duration-200"
                      >
                        Take Attendance
                      </a>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Student</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Roll No</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Total Classes</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Present</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Absent</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Attendance %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10">
                        {students.map((student: any) => {
                          const summary = getStudentAttendanceSummary(student.id)
                          return (
                            <tr key={student.id} className="hover:bg-white/5 transition-colors duration-200">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center space-x-3">
                                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-bold shadow-lg">
                                    {student.name?.charAt(0).toUpperCase() || 'S'}
                                  </div>
                                  <div>
                                    <div className="text-white font-semibold">{student.name || 'No Name'}</div>
                                    <div className="text-gray-400 text-sm">{student.email}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-gray-300">
                                {student.profile?.rollNo || '—'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-white font-semibold">
                                {summary.total}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-green-400 font-semibold">
                                {summary.present}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-red-400 font-semibold">
                                {summary.absent}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span
                                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                    summary.percentage >= 75
                                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                      : summary.percentage >= 50
                                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                      : 'bg-red-500/20 text-red-400 border border-red-500/30'
                                  }`}
                                >
                                  {summary.total > 0 ? `${summary.percentage.toFixed(1)}%` : 'N/A'}
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Attendance History */}
                <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-white/10 bg-gradient-to-r from-green-500/10 to-emerald-500/10">
                    <h2 className="text-xl font-bold text-white">Attendance History</h2>
                    <p className="text-sm text-gray-400 mt-1">All attendance records for this class</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Students</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Present</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Absent</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10">
                        {attendanceRecordsList.map((att: any) => {
                          const records = att.records as any[]
                          const present = records.filter((r: any) => r.status === 'present' || r.status === 'late').length
                          const absent = records.length - present
                          return (
                            <tr key={att.id} className="hover:bg-white/5 transition-colors duration-200">
                              <td className="px-6 py-4 whitespace-nowrap text-white">
                                {new Date(att.date).toLocaleDateString('en-US', {
                                  weekday: 'long',
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                })}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-gray-300">
                                {records.length}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-green-400 font-semibold">
                                {present}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-red-400 font-semibold">
                                {absent}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <a
                                  href={`?view-attendance=${att.id}`}
                                  className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                                >
                                  View Details
                                </a>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  )
}
