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
  const [selectedSlot, setSelectedSlot] = useState<{ subject: string; start: string; end: string; day: string } | null>(null)
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
      const studentIds = classData?.class?.studentIds || []
      // Prefer students assigned to this class (studentIds); fallback to department
      if (studentIds.length > 0) {
        return {
          users: data.users?.filter((user: any) => studentIds.includes(user.id)) || []
        }
      }
      return {
        users: data.users?.filter((user: any) =>
          user.profile?.department === classData?.class?.department
        ) || []
      }
    },
    enabled: !!classData?.class,
  })

  // Fetch timetable for this class (to get periods for per-class attendance)
  const { data: timetableData } = useQuery({
    queryKey: ['timetable', classId],
    queryFn: async () => {
      const res = await fetch(`/api/timetable/${classId}`)
      if (!res.ok) return null
      return res.json()
    },
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

  // Today's periods from timetable (based on selected date)
  const timetableEntries = (timetableData?.timetable?.entries as any[]) || []
  const dayName = attendanceDate
    ? new Date(attendanceDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' })
    : ''
  // Only show periods assigned to this staff (admin sees all)
  const todaySlots = dayName
    ? timetableEntries
        .filter((e: any) => e.day?.toLowerCase() === dayName.toLowerCase())
        .filter(
          (e: any) =>
            session?.user?.role === 'admin' || !e.staffId || e.staffId === session?.user?.id
        )
        .map((e: any) => ({
          subject: e.subject || 'Period',
          start: e.start || '',
          end: e.end || '',
          day: e.day || dayName,
        }))
    : []
  // Reset selected slot when date or timetable changes; clear if slot no longer in list
  useEffect(() => {
    if (!selectedSlot) return
    const stillValid = todaySlots.some(
      (s) => s.subject === selectedSlot.subject && s.start === selectedSlot.start && s.end === selectedSlot.end
    )
    if (!stillValid) setSelectedSlot(null)
  }, [attendanceDate, todaySlots])

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
    if (!selectedSlot) {
      alert('Please select a period (class slot) first.')
      return
    }
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
          slot: {
            subject: selectedSlot.subject,
            startTime: selectedSlot.start,
            endTime: selectedSlot.end,
            day: selectedSlot.day,
          },
          records,
        }),
      })

      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ['attendance', classId] })
        setAttendanceRecords({})
        setSelectedSlot(null)
        alert('Attendance recorded successfully for ' + selectedSlot.subject + '!')
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
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">
              {classData?.class?.name || 'Class Details'}
            </h1>
            <p className="text-slate-500">
              {classData?.class?.code} • {classData?.class?.department}
            </p>
          </div>
        </div>

        {classLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
            <p className="mt-4 text-slate-500">Loading class details...</p>
          </div>
        ) : (
          <>
            {/* Take Attendance Form */}
            {action === 'take-attendance' && (
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm shadow-2xl mb-8 p-6">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Take Attendance (per period)</h2>
                <p className="text-slate-500 text-sm mb-6">Select date and period, then mark students for that class slot.</p>
                <form onSubmit={handleSubmitAttendance} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-2">Date</label>
                      <input
                        type="date"
                        required
                        value={attendanceDate}
                        onChange={(e) => { setAttendanceDate(e.target.value); setSelectedSlot(null) }}
                        className="block w-full max-w-xs px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-green-500/50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-2">Period (class slot)</label>
                      <select
                        value={selectedSlot ? `${selectedSlot.subject}|${selectedSlot.start}|${selectedSlot.end}|${selectedSlot.day}` : ''}
                        onChange={(e) => {
                          const v = e.target.value
                          if (!v) { setSelectedSlot(null); return }
                          const [subject, start, end, day] = v.split('|')
                          setSelectedSlot({ subject, start, end, day })
                        }}
                        className="block w-full max-w-xs px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-green-500/50"
                        required
                      >
                        <option value="">Select period</option>
                        {todaySlots.map((slot, idx) => {
                          const value = `${slot.subject}|${slot.start}|${slot.end}|${slot.day}`
                          const alreadyTaken = (attendanceData?.attendance || []).some(
                            (a: any) => a.subject === slot.subject && a.startTime === slot.start && a.endTime === slot.end && new Date(a.date).toISOString().slice(0, 10) === attendanceDate
                          )
                          return (
                            <option key={idx} value={value} disabled={alreadyTaken}>
                              {slot.subject} ({slot.start}–{slot.end}) {alreadyTaken ? '— taken' : ''}
                            </option>
                          )
                        })}
                      </select>
                      {dayName && todaySlots.length === 0 && (
                        <p className="text-amber-600 text-sm mt-1">No slots for {dayName}. Add timetable entries first.</p>
                      )}
                    </div>
                  </div>

                  {selectedSlot && (
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-slate-900">Mark attendance for {selectedSlot.subject} ({selectedSlot.start}–{selectedSlot.end})</h3>
                    <div className="max-h-96 overflow-y-auto space-y-2">
                      {students.map((student: any) => (
                        <div
                          key={student.id}
                          className="bg-slate-50 rounded-xl border border-slate-200 p-4"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold shadow-lg">
                                {student.name?.charAt(0).toUpperCase() || 'S'}
                              </div>
                              <div>
                                <p className="text-slate-900 font-semibold">{student.name || 'No Name'}</p>
                                <p className="text-slate-500 text-sm">{student.profile?.rollNo || 'No Roll No'}</p>
                              </div>
                            </div>
                            <select
                              value={attendanceRecords[student.id] || 'present'}
                              onChange={(e) =>
                                setAttendanceRecords({ ...attendanceRecords, [student.id]: e.target.value })
                              }
                              className="px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all duration-200"
                            >
                              <option value="present" className="bg-white text-slate-900">Present</option>
                              <option value="absent" className="bg-white text-slate-900">Absent</option>
                              <option value="late" className="bg-white text-slate-900">Late</option>
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  )}

                  <div className="flex items-center justify-end space-x-4 pt-4 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => window.history.back()}
                      className="px-6 py-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 transition-all duration-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingAttendance || students.length === 0 || !selectedSlot}
                      className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      {submittingAttendance ? 'Submitting...' : 'Submit Attendance'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* View Specific Attendance Record */}
            {selectedAttendance && (
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm shadow-2xl mb-8 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">Attendance Record</h2>
                    <p className="text-slate-500 text-sm mt-1">
                      {new Date(selectedAttendance.date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                      {selectedAttendance.subject && (
                        <span className="ml-2 font-medium text-slate-700">
                          • {selectedAttendance.subject} ({selectedAttendance.startTime}–{selectedAttendance.endTime})
                        </span>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => window.history.back()}
                    className="px-4 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 transition-all duration-200"
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
                        className="bg-slate-50 rounded-xl border border-slate-200 p-4"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold shadow-lg">
                              {student?.name?.charAt(0).toUpperCase() || 'S'}
                            </div>
                            <div>
                              <p className="text-slate-900 font-semibold">{student?.name || 'Unknown'}</p>
                              <p className="text-slate-500 text-sm">{student?.profile?.rollNo || 'No Roll No'}</p>
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
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm shadow-2xl mb-8 overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-xl font-bold text-slate-900">Students ({students.length})</h2>
                        <p className="text-sm text-slate-500 mt-1">View student attendance and details</p>
                      </div>
                      <a
                        href={`?action=take-attendance`}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-all duration-200"
                      >
                        Take Attendance
                      </a>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Student</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Roll No</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Total Classes</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Present</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Absent</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Attendance %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {students.map((student: any) => {
                          const summary = getStudentAttendanceSummary(student.id)
                          return (
                            <tr key={student.id} className="hover:bg-slate-50 transition-colors duration-200">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center space-x-3">
                                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold shadow-lg">
                                    {student.name?.charAt(0).toUpperCase() || 'S'}
                                  </div>
                                  <div>
                                    <div className="text-slate-900 font-semibold">{student.name || 'No Name'}</div>
                                    <div className="text-slate-500 text-sm">{student.email}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                                {student.profile?.rollNo || '—'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-slate-900 font-semibold">
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
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm shadow-2xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                    <h2 className="text-xl font-bold text-slate-900">Attendance History</h2>
                    <p className="text-sm text-slate-500 mt-1">All attendance records for this class</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Period</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Students</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Present</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Absent</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {attendanceRecordsList.map((att: any) => {
                          const records = att.records as any[]
                          const present = records.filter((r: any) => r.status === 'present' || r.status === 'late').length
                          const absent = records.length - present
                          const periodLabel = att.subject
                            ? `${att.subject} (${att.startTime || ''}–${att.endTime || ''})`
                            : '—'
                          return (
                            <tr key={att.id} className="hover:bg-slate-50 transition-colors duration-200">
                              <td className="px-6 py-4 whitespace-nowrap text-slate-900">
                                {new Date(att.date).toLocaleDateString('en-US', {
                                  weekday: 'long',
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                })}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-slate-700 font-medium">
                                {periodLabel}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-slate-600">
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
