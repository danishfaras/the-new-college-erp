'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function PendingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      router.push('/login')
      return
    }

    if (session.user.approved) {
      // Redirect based on role
      const role = session.user.role
      switch (role) {
        case 'admin':
          router.push('/admin')
          break
        case 'staff':
          router.push('/staff')
          break
        case 'student':
          router.push('/student')
          break
        case 'accounts':
          router.push('/accounts')
          break
        default:
          router.push('/dashboard')
      }
    }
  }, [session, status, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Account Pending Approval
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Your account is waiting for administrator approval.
          </p>
          <p className="mt-4 text-sm text-gray-500">
            You will receive an email notification once your account has been approved.
            Please contact the administrator if you have any questions.
          </p>
        </div>
      </div>
    </div>
  )
}
