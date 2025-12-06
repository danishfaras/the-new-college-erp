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
        return 'from-red-500 to-pink-500'
      case 'staff':
        return 'from-blue-500 to-cyan-500'
      case 'student':
        return 'from-green-500 to-emerald-500'
      case 'accounts':
        return 'from-purple-500 to-indigo-500'
      default:
        return 'from-gray-500 to-gray-600'
    }
  }

  return (
    <header className="backdrop-blur-xl bg-white/5 border-b border-white/10 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link 
              href={getDashboardLink()} 
              className="flex items-center space-x-2 group"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                The New College
              </span>
            </Link>
            <nav className="hidden md:flex space-x-1">
              <Link
                href={getDashboardLink()}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 relative ${
                  pathname === getDashboardLink()
                    ? 'text-white bg-white/10'
                    : 'text-gray-300 hover:text-white hover:bg-white/10'
                }`}
              >
                Dashboard
                {pathname === getDashboardLink() && (
                  <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1/2 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
                )}
              </Link>
              {session.user.role === 'admin' && (
                <>
                  <Link
                    href="/admin/users"
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 relative ${
                      pathname === '/admin/users'
                        ? 'text-white bg-white/10'
                        : 'text-gray-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    Users
                    {pathname === '/admin/users' && (
                      <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1/2 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
                    )}
                  </Link>
                  <Link
                    href="/admin/classes"
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 relative ${
                      pathname === '/admin/classes'
                        ? 'text-white bg-white/10'
                        : 'text-gray-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    Classes
                    {pathname === '/admin/classes' && (
                      <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1/2 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
                    )}
                  </Link>
                  <Link
                    href="/admin/audit"
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 relative ${
                      pathname === '/admin/audit'
                        ? 'text-white bg-white/10'
                        : 'text-gray-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    Audit Logs
                    {pathname === '/admin/audit' && (
                      <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1/2 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
                    )}
                  </Link>
                </>
              )}
              {session.user.role === 'student' && (
                <>
                  <Link
                    href="/student/fees"
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 relative ${
                      pathname === '/student/fees'
                        ? 'text-white bg-white/10'
                        : 'text-gray-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    Fees
                    {pathname === '/student/fees' && (
                      <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1/2 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
                    )}
                  </Link>
                  <Link
                    href="/student/timetable"
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 relative ${
                      pathname === '/student/timetable'
                        ? 'text-white bg-white/10'
                        : 'text-gray-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    Classes
                    {pathname === '/student/timetable' && (
                      <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1/2 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
                    )}
                  </Link>
                  <Link
                    href="/student/attendance"
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 relative ${
                      pathname === '/student/attendance'
                        ? 'text-white bg-white/10'
                        : 'text-gray-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    Attendance
                    {pathname === '/student/attendance' && (
                      <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1/2 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
                    )}
                  </Link>
                  <Link
                    href="/student/exams"
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 relative ${
                      pathname === '/student/exams'
                        ? 'text-white bg-white/10'
                        : 'text-gray-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    Exams
                    {pathname === '/student/exams' && (
                      <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1/2 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
                    )}
                  </Link>
                </>
              )}
              {session.user.role === 'staff' && (
                <>
                  <Link
                    href="/staff/classes"
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 relative ${
                      pathname === '/staff/classes' || pathname?.startsWith('/staff/classes/')
                        ? 'text-white bg-white/10'
                        : 'text-gray-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    Classes
                    {(pathname === '/staff/classes' || pathname?.startsWith('/staff/classes/')) && (
                      <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1/2 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
                    )}
                  </Link>
                  <Link
                    href="/staff/timetable"
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 relative ${
                      pathname === '/staff/timetable'
                        ? 'text-white bg-white/10'
                        : 'text-gray-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    Timetable
                    {pathname === '/staff/timetable' && (
                      <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1/2 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
                    )}
                  </Link>
                  <Link
                    href="/staff/attendance"
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 relative ${
                      pathname === '/staff/attendance' || pathname?.startsWith('/staff/classes/') || pathname === '/staff/my-attendance'
                        ? 'text-white bg-white/10'
                        : 'text-gray-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    Attendance
                    {(pathname === '/staff/attendance' || pathname?.startsWith('/staff/classes/') || pathname === '/staff/my-attendance') && (
                      <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1/2 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
                    )}
                  </Link>
                  <Link
                    href="/staff/notifications"
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 relative ${
                      pathname === '/staff/notifications'
                        ? 'text-white bg-white/10'
                        : 'text-gray-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    Notifications
                    {pathname === '/staff/notifications' && (
                      <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1/2 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
                    )}
                  </Link>
                </>
              )}
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            {/* Notifications bell */}
            <button className="relative p-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-all duration-200">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            </button>

            {/* User menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="flex items-center space-x-3 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all duration-200 group"
              >
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getRoleColor(session.user.role)} flex items-center justify-center text-white font-bold text-sm shadow-lg`}>
                  {session.user.name?.charAt(0).toUpperCase() || session.user.email?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-white">{session.user.name || 'User'}</p>
                  <p className="text-xs text-gray-400">{session.user.email}</p>
                </div>
                <div className={`hidden md:block px-2 py-1 rounded-lg bg-gradient-to-r ${getRoleColor(session.user.role)} text-white text-xs font-semibold`}>
                  {session.user.role.toUpperCase()}
                </div>
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${showMenu ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {showMenu && (
                <div className="absolute right-0 mt-2 w-64 backdrop-blur-xl bg-white/10 border border-white/20 rounded-xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="px-4 py-3 border-b border-white/10">
                    <p className="text-sm font-medium text-white">{session.user.name || 'User'}</p>
                    <p className="text-xs text-gray-400 mt-1">{session.user.email}</p>
                  </div>
                  <Link
                    href="/profile"
                    className="block px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-colors duration-200"
                    onClick={() => setShowMenu(false)}
                  >
                    <div className="flex items-center space-x-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span>Profile Settings</span>
                    </div>
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="w-full text-left px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors duration-200"
                  >
                    <div className="flex items-center space-x-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span>Sign Out</span>
                    </div>
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
