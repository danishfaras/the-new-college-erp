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
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-2 border-slate-200 border-t-blue-600 rounded-full"></div>
        <p className="mt-4 text-slate-600">Loading...</p>
      </div>
    </div>
  )
}
