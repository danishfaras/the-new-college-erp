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
    <div className="erp-auth-shell min-h-screen min-h-[100dvh] flex items-center justify-center px-4">
      <div className="text-center space-y-5">
        <div className="relative inline-flex h-14 w-14 items-center justify-center" role="status" aria-label="Loading">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 opacity-15 blur-2xl scale-150 animate-pulse" aria-hidden />
          <div className="relative h-12 w-12 rounded-full border-[3px] border-slate-200/90 border-t-blue-600 animate-spin" style={{ animationDuration: '0.8s' }} />
        </div>
        <div className="space-y-1">
          <p className="text-slate-800 font-medium tracking-tight">NextGen Edu.ERP</p>
          <p className="text-sm text-slate-500">Preparing your workspace…</p>
        </div>
      </div>
    </div>
  )
}
