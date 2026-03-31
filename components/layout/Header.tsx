'use client'

import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'

type NavItem = { href: string; label: string }

export function Header() {
  const { data: session } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [showMenu, setShowMenu] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
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

  useEffect(() => {
    setMobileNavOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!mobileNavOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [mobileNavOpen])

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

  const dashboardHref = getDashboardLink()

  const baseNav: NavItem[] = [{ href: dashboardHref, label: 'Dashboard' }]
  let navItems: NavItem[] = baseNav
  switch (session.user.role) {
    case 'admin':
      navItems = [
        ...baseNav,
        { href: '/admin/users', label: 'Users' },
        { href: '/admin/classes', label: 'Classes' },
        { href: '/admin/coverage', label: 'Cover requests' },
        { href: '/staff/reports', label: 'Reports' },
        { href: '/admin/audit', label: 'Audit Logs' },
      ]
      break
    case 'student':
      navItems = [
        ...baseNav,
        { href: '/student/fees', label: 'Fees' },
        { href: '/student/timetable', label: 'Classes' },
        { href: '/student/attendance', label: 'Attendance' },
        { href: '/student/exams', label: 'Exams' },
      ]
      break
    case 'staff':
      navItems = [
        ...baseNav,
        { href: '/staff/classes', label: 'Classes' },
        { href: '/staff/coverage', label: 'Cover requests' },
        { href: '/staff/timetable', label: 'Timetable' },
        { href: '/staff/attendance', label: 'Attendance' },
        { href: '/staff/reports', label: 'Reports' },
        { href: '/staff/my-attendance', label: 'My Attendance' },
        { href: '/staff/notifications', label: 'Notifications' },
      ]
      break
    default:
      break
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

  const navLinkClass = (href: string) =>
    pathname === href
      ? 'px-4 py-2 rounded-lg text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200'
      : 'px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100'

  const mobileNavLinkClass = (href: string) =>
    pathname === href
      ? 'block rounded-xl px-4 py-3 text-base font-medium text-blue-700 bg-blue-50 border border-blue-200'
      : 'block rounded-xl px-4 py-3 text-base font-medium text-slate-700 hover:bg-slate-100 active:bg-slate-200'

  const notificationsHref =
    session.user.role === 'staff' ? '/staff/notifications' : null

  return (
    <header className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-50 shadow-sm shadow-slate-900/5 pt-[env(safe-area-inset-top)] supports-[backdrop-filter]:bg-white/75">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16 min-w-0 gap-2">
          <div className="flex items-center min-w-0 gap-2 sm:gap-8 flex-1">
            <Link
              href={dashboardHref}
              className="flex items-center gap-2 min-w-0 group shrink-0"
              onClick={() => setMobileNavOpen(false)}
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm shrink-0">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <span className="text-base sm:text-xl font-bold text-slate-900 truncate min-w-0 max-w-[6.5rem] sm:max-w-none">
                <span className="sm:hidden">Edu.ERP</span>
                <span className="hidden sm:inline">NextGen Edu.ERP</span>
              </span>
            </Link>
            <nav className="hidden md:flex flex-wrap items-center gap-1" aria-label="Main">
              {navItems.map(({ href, label }) => (
                <Link key={href} href={href} className={navLinkClass(href)}>
                  {label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-1 sm:gap-3 shrink-0">
            {notificationsHref ? (
              <Link
                href={notificationsHref}
                className="relative inline-flex items-center justify-center min-h-11 min-w-11 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                aria-label="Notifications"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" aria-hidden />
              </Link>
            ) : null}

            <button
              type="button"
              className="md:hidden inline-flex items-center justify-center min-h-11 min-w-11 rounded-lg text-slate-600 hover:bg-slate-100 border border-transparent hover:border-slate-200"
              aria-expanded={mobileNavOpen}
              aria-controls="mobile-nav"
              onClick={() => setMobileNavOpen((o) => !o)}
            >
              <span className="sr-only">{mobileNavOpen ? 'Close menu' : 'Open menu'}</span>
              {mobileNavOpen ? (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>

            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setShowMenu(!showMenu)}
                className="flex items-center gap-2 sm:gap-3 min-h-11 pl-2 pr-2 sm:px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
                aria-expanded={showMenu}
                aria-haspopup="menu"
              >
                <div className={`w-8 h-8 rounded-lg ${getRoleColor(session.user.role)} flex items-center justify-center font-bold text-sm shrink-0`}>
                  {session.user.name?.charAt(0).toUpperCase() || session.user.email?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="hidden md:block text-left min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate max-w-[10rem] lg:max-w-[14rem]">{session.user.name || 'User'}</p>
                  <p className="text-xs text-slate-500 truncate max-w-[10rem] lg:max-w-[14rem]">{session.user.email}</p>
                </div>
                <div className={`hidden md:block px-2 py-0.5 rounded ${getRoleColor(session.user.role)} text-xs font-medium shrink-0`}>
                  {session.user.role.toUpperCase()}
                </div>
                <svg className={`w-4 h-4 text-slate-400 shrink-0 hidden sm:block ${showMenu ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showMenu && (
                <div className="absolute right-0 mt-2 w-[min(100vw-1.5rem,16rem)] sm:w-64 bg-white border border-slate-200 rounded-lg shadow-lg py-2 z-[60]">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="text-sm font-medium text-slate-900 truncate">{session.user.name || 'User'}</p>
                    <p className="text-xs text-slate-500 mt-1 break-all">{session.user.email}</p>
                  </div>
                  <Link
                    href="/profile"
                    className="block px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 min-h-11 flex items-center"
                    onClick={() => setShowMenu(false)}
                  >
                    <span className="flex items-center gap-2">Profile Settings</span>
                  </Link>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 min-h-11"
                  >
                    <span className="flex items-center gap-2">Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {mobileNavOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 top-14 sm:top-16 bg-slate-900/40 z-[45] md:hidden"
            aria-label="Close menu"
            onClick={() => setMobileNavOpen(false)}
          />
          <nav
            id="mobile-nav"
            className="fixed left-0 right-0 top-14 sm:top-16 max-h-[calc(100dvh-3.5rem)] sm:max-h-[calc(100dvh-4rem)] overflow-y-auto bg-white border-b border-slate-200 shadow-lg z-[55] md:hidden pb-[max(1rem,env(safe-area-inset-bottom))]"
            aria-label="Main navigation"
          >
            <div className="px-3 py-3 space-y-1">
              {navItems.map(({ href, label }) => (
                <Link key={href} href={href} className={mobileNavLinkClass(href)} onClick={() => setMobileNavOpen(false)}>
                  {label}
                </Link>
              ))}
            </div>
          </nav>
        </>
      )}
    </header>
  )
}
