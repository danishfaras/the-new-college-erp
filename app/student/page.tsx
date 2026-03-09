'use client'

import { useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import { Header } from '@/components/layout/Header'
import Link from 'next/link'
import { useState, useEffect } from 'react'

export default function StudentDashboard() {
  const { data: session } = useSession()
  const [today, setToday] = useState('')
  useEffect(() => {
    setToday(new Date().toLocaleDateString('en-US', { weekday: 'long' }))
  }, [])

  // Fetch student's fees
  const { data: fees } = useQuery({
    queryKey: ['fees', session?.user.id],
    queryFn: async () => {
      if (!session?.user.id) return null
      const res = await fetch(`/api/fees/student/${session.user.id}`)
      if (!res.ok) return null
      return res.json()
    },
    enabled: !!session?.user.id,
  })

  // Fetch all classes to find student's class (based on department)
  const { data: classesData } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const res = await fetch('/api/classes')
      if (!res.ok) return null
      return res.json()
    },
  })

  // Get student's profile to find their class
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

  // Find student's class: prefer class where student is in studentIds; fallback to department
  const studentClass = classesData?.classes?.find((cls: any) =>
    (cls.studentIds && cls.studentIds.includes(session?.user?.id)) ||
    cls.department === profileData?.user?.profile?.department
  )

  // Fetch timetable for student's class
  const { data: timetableData } = useQuery({
    queryKey: ['timetable', studentClass?.id],
    queryFn: async () => {
      if (!studentClass?.id) return null
      const res = await fetch(`/api/timetable/${studentClass.id}`)
      if (!res.ok) return null
      return res.json()
    },
    enabled: !!studentClass?.id,
  })

  // Fetch upcoming exams
  const { data: examsData } = useQuery({
    queryKey: ['exams', studentClass?.id, 'upcoming'],
    queryFn: async () => {
      if (!studentClass?.id) return null
      const res = await fetch(`/api/exams/${studentClass.id}?upcoming=true`)
      if (!res.ok) return null
      return res.json()
    },
    enabled: !!studentClass?.id,
  })

  // Fetch attendance summary
  const { data: attendanceData } = useQuery({
    queryKey: ['attendance', studentClass?.id, 'summary'],
    queryFn: async () => {
      if (!studentClass?.id) return null
      const startDate = new Date()
      startDate.setMonth(startDate.getMonth() - 3) // Last 3 months
      const endDate = new Date()
      const res = await fetch(
        `/api/attendance/${studentClass.id}?start=${startDate.toISOString()}&end=${endDate.toISOString()}`
      )
      if (!res.ok) return null
      return res.json()
    },
    enabled: !!studentClass?.id,
  })

  // Get today's classes from timetable (today set in useEffect to avoid hydration mismatch)
  const todayClasses = today && timetableData?.timetable?.entries
    ? (timetableData.timetable.entries as any[]).filter((entry: any) =>
        entry.day?.toLowerCase() === today.toLowerCase()
      )
    : []

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Welcome back, {session?.user?.name || 'Student'}!
          </h1>
          <p className="text-slate-500">
            {studentClass ? `${studentClass.name} • ${studentClass.department}` : 'Your academic dashboard'}
          </p>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <Link
            href="/student/fees"
            className="group relative bg-white rounded-lg border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow hover:shadow-amber-500/20"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-amber-100">
                <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Pending Fees</p>
            <p className="text-2xl font-bold text-slate-900">₹{fees?.summary?.pending?.toFixed(2) || '0.00'}</p>
            <div className="mt-4 flex items-center text-blue-600 text-sm font-medium">
              <span>View Details</span>
              <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>

          <Link
            href="/student/timetable"
            className="group relative bg-white rounded-lg border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow hover:shadow-blue-500/20"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-blue-100">
                <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Today's Classes</p>
            <p className="text-2xl font-bold text-slate-900">{todayClasses.length}</p>
            <div className="mt-4 flex items-center text-blue-600 text-sm font-medium">
              <span>View Timetable</span>
              <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>

          <Link
            href="/student/attendance"
            className="group relative bg-white rounded-lg border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow hover:shadow-green-500/20"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-emerald-100">
                <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Attendance</p>
            <p className="text-2xl font-bold text-slate-900">
              {attendanceData?.summary?.percentage
                ? `${attendanceData.summary.percentage.toFixed(1)}%`
                : 'N/A'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {attendanceData?.summary
                ? `${attendanceData.summary.present}/${attendanceData.summary.total} present`
                : 'No data'}
            </p>
            <div className="mt-4 flex items-center text-blue-600 text-sm font-medium">
              <span>View Records</span>
              <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>

          <Link
            href="/student/exams"
            className="group relative bg-white rounded-lg border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow hover:shadow-purple-500/20"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-slate-100">
                <svg className="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Upcoming Exams</p>
            <p className="text-2xl font-bold text-slate-900">{examsData?.exams?.length || 0}</p>
            <div className="mt-4 flex items-center text-blue-600 text-sm font-medium">
              <span>View Schedule</span>
              <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        </div>

        {/* Quick Overview Cards */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Today's Schedule Preview */}
          {todayClasses.length > 0 && (
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Today's Schedule</h2>
                    <p className="text-sm text-slate-500 mt-1">{today}</p>
                  </div>
                  <Link
                    href="/student/timetable"
                    className="px-3 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 text-xs transition-all duration-200"
                  >
                    View All
                  </Link>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {todayClasses.slice(0, 3).map((entry: any, index: number) => (
                    <div
                      key={index}
                      className="bg-slate-50 rounded-lg border border-slate-200 p-3"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-slate-900 font-semibold">{entry.subject || 'Class'}</h3>
                          <p className="text-slate-500 text-sm">{entry.start} - {entry.end}</p>
                        </div>
                        {entry.location && (
                          <span className="text-gray-500 text-xs">📍 {entry.location}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Upcoming Exams Preview */}
          {examsData?.exams && examsData.exams.length > 0 && (
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Upcoming Exams</h2>
                    <p className="text-sm text-slate-500 mt-1">Next assessments</p>
                  </div>
                  <Link
                    href="/student/exams"
                    className="px-3 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 text-xs transition-all duration-200"
                  >
                    View All
                  </Link>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {examsData.exams.slice(0, 3).map((exam: any) => {
                    const daysUntil = Math.ceil(
                      (new Date(exam.date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                    )
                    return (
                      <div
                        key={exam.id}
                        className="bg-slate-50 rounded-lg border border-slate-200 p-3"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-slate-900 font-semibold">{exam.name}</h3>
                            <p className="text-slate-500 text-sm">
                              {new Date(exam.date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </p>
                          </div>
                          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-400 border border-purple-500/30">
                            {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil}d`}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
