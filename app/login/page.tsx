'use client'

import { useState, useEffect } from 'react'
import { getSession, signIn, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Redirect if already logged in
  useEffect(() => {
    if (session?.user) {
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
          router.push('/student')
      }
    }
  }, [session, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError(result.error)
        return
      }

      if (!result?.ok) {
        setError('Sign-in did not complete. Please try again.')
        return
      }

      router.refresh()
      const session = await getSession()
      const role = session?.user?.role || 'student'
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
          router.push('/student')
      }
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="erp-auth-shell min-h-screen min-h-[100dvh] flex flex-col items-center justify-center py-8 sm:py-12 px-3 sm:px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="w-full max-w-[420px] min-w-0">
        <div className="erp-glass-card rounded-2xl p-6 sm:p-9 space-y-8">
          <div className="text-center space-y-5">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-600/25 ring-4 ring-blue-500/10">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div className="space-y-1.5">
              <h1 className="text-2xl sm:text-[1.65rem] font-bold tracking-tight text-slate-900">NextGen Edu.ERP</h1>
              <p className="text-slate-500 text-sm leading-relaxed">Sign in to your college workspace</p>
            </div>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div
                role="alert"
                className="bg-red-50/90 border border-red-200/80 text-red-800 px-4 py-3 rounded-xl text-sm animate-shake flex gap-3 items-start"
              >
                <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="leading-snug">{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/80 text-slate-900 placeholder:text-slate-400 shadow-sm transition-shadow focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 focus:shadow-md"
                placeholder="you@college.edu"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/80 text-slate-900 placeholder:text-slate-400 shadow-sm transition-shadow focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 focus:shadow-md"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold text-[15px] shadow-md shadow-blue-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2 active:scale-[0.99]"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24" aria-hidden>
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <p className="text-center text-xs text-slate-500 leading-relaxed">
            Encrypted session · Role-based access
          </p>
        </div>
      </div>
    </div>
  )
}
