'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return

    if (session?.user) {
      // Redirect to appropriate dashboard based on role
      const role = session.user.role
      switch (role) {
        case 'admin':
          router.replace('/admin')
          break
        case 'staff':
          router.replace('/staff')
          break
        case 'student':
          router.replace('/student')
          break
        case 'accounts':
          router.replace('/accounts')
          break
        default:
          router.replace('/student')
      }
    } else {
      // Not logged in, redirect to login
      router.replace('/login')
    }
  }, [session, status, router])

  // Show loading state while checking session
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400"></div>
        <p className="mt-4 text-gray-300">Loading...</p>
      </div>
    </div>
  )
}
