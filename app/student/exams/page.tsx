'use client'

import { useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import { Header } from '@/components/layout/Header'

export default function StudentExamsPage() {
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
    cls.department === profileData?.user?.profile?.department
  )

  // Fetch all exams
  const { data: examsData, isLoading } = useQuery({
    queryKey: ['exams', studentClass?.id],
    queryFn: async () => {
      if (!studentClass?.id) return null
      const res = await fetch(`/api/exams/${studentClass.id}`)
      if (!res.ok) return null
      return res.json()
    },
    enabled: !!studentClass?.id,
  })

  const exams = examsData?.exams || []
  const upcomingExams = exams.filter((exam: any) => new Date(exam.date) >= new Date())
  const pastExams = exams.filter((exam: any) => new Date(exam.date) < new Date())

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Exam Schedule</h1>
            <p className="text-gray-400">
              {studentClass ? `${studentClass.name} • ${studentClass.department}` : 'Your exam schedule'}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400"></div>
            <p className="mt-4 text-gray-400">Loading exams...</p>
          </div>
        ) : (
          <>
            {/* Upcoming Exams */}
            {upcomingExams.length > 0 && (
              <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 shadow-2xl mb-8 overflow-hidden">
                <div className="px-6 py-4 border-b border-white/10 bg-gradient-to-r from-purple-500/10 to-pink-500/10">
                  <h2 className="text-xl font-bold text-white">Upcoming Exams</h2>
                  <p className="text-sm text-gray-400 mt-1">Prepare for your upcoming assessments</p>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {upcomingExams.map((exam: any) => {
                      const daysUntil = Math.ceil(
                        (new Date(exam.date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                      )
                      return (
                        <div
                          key={exam.id}
                          className="backdrop-blur-sm bg-white/5 rounded-xl border border-white/10 p-6 hover:bg-white/10 transition-all duration-200"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="text-white font-bold text-xl mb-2">{exam.name}</h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                <div>
                                  <p className="text-gray-400 text-sm">Date</p>
                                  <p className="text-white font-semibold">
                                    {new Date(exam.date).toLocaleDateString('en-US', {
                                      weekday: 'long',
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric',
                                    })}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-gray-400 text-sm">Time</p>
                                  <p className="text-white font-semibold">
                                    {exam.startTime} - {exam.endTime}
                                  </p>
                                </div>
                              </div>
                              {exam.subjects && Array.isArray(exam.subjects) && exam.subjects.length > 0 && (
                                <div className="mt-4">
                                  <p className="text-gray-400 text-sm mb-2">Subjects</p>
                                  <div className="flex flex-wrap gap-2">
                                    {exam.subjects.map((subject: any, idx: number) => (
                                      <span
                                        key={idx}
                                        className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-400 border border-purple-500/30"
                                      >
                                        {subject.subject || subject} {subject.code ? `(${subject.code})` : ''}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="ml-6 text-right">
                              <span className="px-4 py-2 rounded-full text-sm font-semibold bg-purple-500/20 text-purple-400 border border-purple-500/30">
                                {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days`}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Past Exams */}
            {pastExams.length > 0 && (
              <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-white/10 bg-gradient-to-r from-gray-500/10 to-gray-600/10">
                  <h2 className="text-xl font-bold text-white">Past Exams</h2>
                  <p className="text-sm text-gray-400 mt-1">Your completed examinations</p>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {pastExams.map((exam: any) => (
                      <div
                        key={exam.id}
                        className="backdrop-blur-sm bg-white/5 rounded-xl border border-white/10 p-6 hover:bg-white/10 transition-all duration-200 opacity-75"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-white font-bold text-xl mb-2">{exam.name}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                              <div>
                                <p className="text-gray-400 text-sm">Date</p>
                                <p className="text-white font-semibold">
                                  {new Date(exam.date).toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                  })}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-400 text-sm">Time</p>
                                <p className="text-white font-semibold">
                                  {exam.startTime} - {exam.endTime}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="ml-6 text-right">
                            <span className="px-4 py-2 rounded-full text-sm font-semibold bg-gray-500/20 text-gray-400 border border-gray-500/30">
                              Completed
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {exams.length === 0 && (
              <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 shadow-2xl p-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-500/20 mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-gray-400 text-lg">No exams scheduled</p>
                <p className="text-gray-500 text-sm mt-2">Your exam schedule will appear here once it's published</p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
