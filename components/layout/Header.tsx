'use client'

import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'

export function Header() {
  const { data: session } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMenu])

  if (!session) return null

  const handleSignOut = async () => {
    await signOut({ redirect: false })
    router.push('/login')
  }

  const getDashboardLink = () => {
    switch (session.user.role) {
      case 'admin':
        return '/admin'
      case 'staff':
        return '/staff'
      case 'student':
        return '/student'
      case 'accounts':
        return '/accounts'
      default:
        return '/dashboard'
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-600 text-white'
      case 'staff':
        return 'bg-blue-600 text-white'
      case 'student':
        return 'bg-emerald-600 text-white'
      case 'accounts':
        return 'bg-slate-600 text-white'
      default:
        return 'bg-slate-500 text-white'
    }
  }

  const navLink = (href: string) =>
    pathname === href
      ? 'px-4 py-2 rounded-lg text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200'
      : 'px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100'

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link href={getDashboardLink()} className="flex items-center space-x-2 group">
              <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <span className="text-xl font-bold text-slate-900">NextGen Edu.ERP</span>
            </Link>
            <nav className="hidden md:flex space-x-1">
              <Link href={getDashboardLink()} className={navLink(getDashboardLink())}>
                Dashboard
              </Link>
              {session.user.role === 'admin' && (
                <>
                  <Link href="/admin/users" className={navLink('/admin/users')}>Users</Link>
                  <Link href="/admin/classes" className={navLink('/admin/classes')}>Classes</Link>
                  <Link href="/admin/coverage" className={navLink('/admin/coverage')}>Cover requests</Link>
                  <Link href="/staff/reports" className={navLink('/staff/reports')}>Reports</Link>
                  <Link href="/admin/audit" className={navLink('/admin/audit')}>Audit Logs</Link>
                </>
              )}
              {session.user.role === 'student' && (
                <>
                  <Link href="/student/fees" className={navLink('/student/fees')}>Fees</Link>
                  <Link href="/student/timetable" className={navLink('/student/timetable')}>Classes</Link>
                  <Link href="/student/attendance" className={navLink('/student/attendance')}>Attendance</Link>
                  <Link href="/student/exams" className={navLink('/student/exams')}>Exams</Link>
                </>
              )}
              {session.user.role === 'staff' && (
                <>
                  <Link href="/staff/classes" className={navLink('/staff/classes')}>Classes</Link>
                  <Link href="/staff/coverage" className={navLink('/staff/coverage')}>Cover requests</Link>
                  <Link href="/staff/timetable" className={navLink('/staff/timetable')}>Timetable</Link>
                  <Link href="/staff/attendance" className={navLink('/staff/attendance')}>Attendance</Link>
                  <Link href="/staff/reports" className={navLink('/staff/reports')}>Reports</Link>
                  <Link href="/staff/my-attendance" className={navLink('/staff/my-attendance')}>My Attendance</Link>
                  <Link href="/staff/notifications" className={navLink('/staff/notifications')}>Notifications</Link>
                </>
              )}
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            <button className="relative p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="flex items-center space-x-3 px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
              >
                <div className={`w-8 h-8 rounded-lg ${getRoleColor(session.user.role)} flex items-center justify-center font-bold text-sm`}>
                  {session.user.name?.charAt(0).toUpperCase() || session.user.email?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-slate-900">{session.user.name || 'User'}</p>
                  <p className="text-xs text-slate-500">{session.user.email}</p>
                </div>
                <div className={`hidden md:block px-2 py-0.5 rounded ${getRoleColor(session.user.role)} text-xs font-medium`}>
                  {session.user.role.toUpperCase()}
                </div>
                <svg className={`w-4 h-4 text-slate-400 ${showMenu ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-lg shadow-lg py-2 z-50">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="text-sm font-medium text-slate-900">{session.user.name || 'User'}</p>
                    <p className="text-xs text-slate-500 mt-1">{session.user.email}</p>
                  </div>
                  <Link
                    href="/profile"
                    className="block px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                    onClick={() => setShowMenu(false)}
                  >
                    <span className="flex items-center gap-2">Profile Settings</span>
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <span className="flex items-center gap-2">Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
