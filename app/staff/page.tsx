'use client'

import { useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import { Header } from '@/components/layout/Header'
import Link from 'next/link'

export default function StaffDashboard() {
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

  // Get today's classes and timetable
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' })
  const todayClasses: any[] = []

  // Fetch timetables for all classes
  const { data: timetablesData } = useQuery({
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

  // Find today's classes
  if (timetablesData) {
    timetablesData.forEach((timetable: any) => {
      const todayEntries = (timetable.entries as any[]).filter((entry: any) =>
        entry.day?.toLowerCase() === today.toLowerCase()
      )
      todayEntries.forEach((entry: any) => {
        todayClasses.push({
          ...entry,
          className: timetable.class?.name,
          classId: timetable.classId,
        })
      })
    })
  }

  // Fetch recent attendance records
  const { data: recentAttendance } = useQuery({
    queryKey: ['attendance', 'recent'],
    queryFn: async () => {
      const attendancePromises = myClasses.map(async (cls: any) => {
        const res = await fetch(`/api/attendance/${cls.id}`)
        if (!res.ok) return []
        const data = await res.json()
        return (data.attendance || []).slice(0, 1).map((att: any) => ({
          ...att,
          className: cls.name,
        }))
      })
      const results = await Promise.all(attendancePromises)
      return results.flat().sort((a: any, b: any) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      ).slice(0, 5)
    },
    enabled: myClasses.length > 0,
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Welcome back, {session?.user?.name || 'Staff'}!
          </h1>
          <p className="text-gray-400">Manage your classes, timetable, and attendance</p>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <Link
            href="/staff/classes"
            className="group relative backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 p-6 hover:bg-white/10 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/20"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg group-hover:scale-110 transition-transform duration-300">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">My Classes</p>
            <p className="text-2xl font-bold text-white">{myClasses.length}</p>
            <div className="mt-4 flex items-center text-blue-400 text-sm font-medium group-hover:translate-x-2 transition-transform duration-300">
              <span>View Details</span>
              <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>

          <Link
            href="/staff/timetable"
            className="group relative backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 p-6 hover:bg-white/10 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/20"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg group-hover:scale-110 transition-transform duration-300">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Today's Classes</p>
            <p className="text-2xl font-bold text-white">{todayClasses.length}</p>
            <div className="mt-4 flex items-center text-blue-400 text-sm font-medium group-hover:translate-x-2 transition-transform duration-300">
              <span>View Timetable</span>
              <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>

          <Link
            href="/staff/attendance"
            className="group relative backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 p-6 hover:bg-white/10 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-green-500/20"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 shadow-lg group-hover:scale-110 transition-transform duration-300">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Recent Attendance</p>
            <p className="text-2xl font-bold text-white">{recentAttendance?.length || 0}</p>
            <p className="text-xs text-gray-500 mt-1">Last 5 records</p>
            <div className="mt-4 flex items-center text-blue-400 text-sm font-medium group-hover:translate-x-2 transition-transform duration-300">
              <span>View Records</span>
              <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>

          <Link
            href="/staff/notifications"
            className="group relative backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 p-6 hover:bg-white/10 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-amber-500/20"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg group-hover:scale-110 transition-transform duration-300">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Notifications</p>
            <p className="text-2xl font-bold text-white">New</p>
            <div className="mt-4 flex items-center text-blue-400 text-sm font-medium group-hover:translate-x-2 transition-transform duration-300">
              <span>View All</span>
              <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        </div>

        {/* Quick Overview Cards */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* My Classes Preview */}
          {myClasses.length > 0 && (
            <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-white/10 bg-gradient-to-r from-blue-500/10 to-cyan-500/10">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white">My Classes</h2>
                    <p className="text-sm text-gray-400 mt-1">Classes you teach</p>
                  </div>
                  <Link
                    href="/staff/classes"
                    className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs transition-all duration-200"
                  >
                    View All
                  </Link>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {myClasses.slice(0, 3).map((cls: any) => (
                    <div
                      key={cls.id}
                      className="backdrop-blur-sm bg-white/5 rounded-xl border border-white/10 p-3"
                    >
                      <h3 className="text-white font-semibold">{cls.name}</h3>
                      <p className="text-gray-400 text-sm">{cls.code}</p>
                      <span className="inline-block mt-2 px-2 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                        {cls.department}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Today's Schedule Preview */}
          {todayClasses.length > 0 && (
            <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-white/10 bg-gradient-to-r from-purple-500/10 to-pink-500/10">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white">Today's Schedule</h2>
                    <p className="text-sm text-gray-400 mt-1">{today}</p>
                  </div>
                  <Link
                    href="/staff/timetable"
                    className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs transition-all duration-200"
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
                      className="backdrop-blur-sm bg-white/5 rounded-xl border border-white/10 p-3"
                    >
                      <h3 className="text-white font-semibold">{entry.subject || 'Class'}</h3>
                      <p className="text-gray-400 text-sm">{entry.className}</p>
                      <p className="text-gray-400 text-sm">{entry.start} - {entry.end}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
