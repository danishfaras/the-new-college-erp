'use client'

import { useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import { Header } from '@/components/layout/Header'
import Link from 'next/link'

export default function StaffClassesPage() {
  const { data: session } = useSession()

  // Fetch classes assigned to this staff member
  const { data: classesData, isLoading } = useQuery({
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

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">My Classes</h1>
            <p className="text-slate-500">Classes you are assigned to teach</p>
          </div>
        </div>

        {/* Classes Grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
            <p className="mt-4 text-slate-500">Loading classes...</p>
          </div>
        ) : myClasses.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {myClasses.map((cls: any) => (
              <Link
                key={cls.id}
                href={`/staff/classes/${cls.id}`}
                className="group bg-white rounded-lg border border-slate-200 shadow-sm p-6 hover:bg-slate-100 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/20"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-slate-900 mb-1">{cls.name}</h3>
                    <p className="text-slate-500 text-sm mb-2">Code: {cls.code}</p>
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                      {cls.department}
                    </span>
                  </div>
                  <svg className="w-5 h-5 text-slate-500 group-hover:text-blue-600 group-hover:translate-x-1 transition-all duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>

                <div className="space-y-3 pt-4 border-t border-slate-200">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Timetables</span>
                    <span className="text-slate-900 font-semibold">{cls._count?.timetables || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Exams</span>
                    <span className="text-slate-900 font-semibold">{cls._count?.exams || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Attendance Records</span>
                    <span className="text-slate-900 font-semibold">{cls._count?.attendance || 0}</span>
                  </div>
                  <div className="pt-2">
                    <span className="inline-block px-3 py-1 rounded-lg text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                      Class Teacher
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm shadow-2xl p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-500/20 mb-4">
              <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <p className="text-slate-500 text-lg">No classes assigned</p>
            <p className="text-slate-500 text-sm mt-2">You haven't been assigned to any classes yet</p>
          </div>
        )}
      </main>
    </div>
  )
}
