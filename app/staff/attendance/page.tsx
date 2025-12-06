'use client'

import { useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import { Header } from '@/components/layout/Header'
import Link from 'next/link'

export default function StaffAttendancePage() {
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

  // Fetch attendance records for all classes with student details
  const { data: attendanceData, isLoading } = useQuery({
    queryKey: ['attendance', 'all', 'with-students'],
    queryFn: async () => {
      const attendancePromises = myClasses.map(async (cls: any) => {
        const res = await fetch(`/api/attendance/${cls.id}`)
        if (!res.ok) return []
        const data = await res.json()
        
        // Get students for this class
        const studentsRes = await fetch('/api/users?role=student')
        const studentsData = studentsRes.ok ? await studentsRes.json() : { users: [] }
        const classStudents = studentsData.users?.filter((u: any) => 
          u.profile?.department === cls.department
        ) || []

        return (data.attendance || []).map((att: any) => {
          const records = att.records as any[]
          const present = records.filter((r: any) => r.status === 'present' || r.status === 'late').length
          const absent = records.length - present
          
          return {
            ...att,
            className: cls.name,
            classId: cls.id,
            totalStudents: classStudents.length,
            present,
            absent,
          }
        })
      })
      const results = await Promise.all(attendancePromises)
      return results.flat().sort((a: any, b: any) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      )
    },
    enabled: myClasses.length > 0,
  })

  const attendanceRecords = attendanceData || []

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Attendance Management</h1>
            <p className="text-gray-400">Take and view attendance for your classes</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-8">
          {/* Take Attendance for Classes */}
          {myClasses.length > 0 && (
            <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 shadow-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">Take Student Attendance</h2>
              <p className="text-gray-400 text-sm mb-4">Mark attendance for students in your classes</p>
              <div className="space-y-3">
                {myClasses.map((cls: any) => (
                  <Link
                    key={cls.id}
                    href={`/staff/classes/${cls.id}?action=take-attendance`}
                    className="group backdrop-blur-sm bg-white/5 rounded-xl border border-white/10 p-4 hover:bg-white/10 transition-all duration-200 flex items-center justify-between"
                  >
                    <div>
                      <h3 className="text-white font-semibold">{cls.name}</h3>
                      <p className="text-gray-400 text-sm">{cls.code}</p>
                    </div>
                    <svg className="w-5 h-5 text-gray-400 group-hover:text-white group-hover:translate-x-1 transition-all duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* My Attendance */}
          <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 shadow-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">My Attendance</h2>
            <p className="text-gray-400 text-sm mb-4">Track your own work attendance</p>
            <Link
              href="/staff/my-attendance"
              className="group backdrop-blur-sm bg-white/5 rounded-xl border border-white/10 p-4 hover:bg-white/10 transition-all duration-200 flex items-center justify-between"
            >
              <div>
                <h3 className="text-white font-semibold">View My Attendance</h3>
                <p className="text-gray-400 text-sm">Track your work records</p>
              </div>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-white group-hover:translate-x-1 transition-all duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Attendance Records */}
        <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10 bg-gradient-to-r from-green-500/10 to-emerald-500/10">
            <h2 className="text-xl font-bold text-white">Attendance Records</h2>
            <p className="text-sm text-gray-400 mt-1">All attendance records you've taken</p>
          </div>

          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-400"></div>
                <p className="mt-4 text-gray-400">Loading attendance...</p>
              </div>
            ) : attendanceRecords.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Class</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Total</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Present</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Absent</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {attendanceRecords.map((att: any) => (
                    <tr key={att.id} className="hover:bg-white/5 transition-colors duration-200">
                      <td className="px-6 py-4 whitespace-nowrap text-white">
                        {new Date(att.date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-white font-medium">{att.className}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-300">
                        {att.totalStudents || (Array.isArray(att.records) ? att.records.length : 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-green-400 font-semibold">
                        {att.present || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-red-400 font-semibold">
                        {att.absent || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          href={`/staff/classes/${att.classId}?view-attendance=${att.id}`}
                          className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                        >
                          View Details
                        </Link>
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
                <p className="text-gray-400 text-lg">No attendance records found</p>
                <p className="text-gray-500 text-sm mt-2">Take attendance for your classes to get started</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
