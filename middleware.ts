import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  const token = await getToken({ 
    req: request, 
    secret: process.env.NEXTAUTH_SECRET 
  })

  // Allow login page and home page
  if (path === '/login' || path === '/') {
    return NextResponse.next()
  }

  // If no token, redirect to login
  if (!token) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  // If user is not approved, redirect to pending page
  if (!token.approved && !path.startsWith('/pending') && path !== '/api/auth/signout') {
    return NextResponse.redirect(new URL('/pending', request.url))
  }

  // Role-based route protection
  const role = token.role as string

  // Admin-only routes
  if (path.startsWith('/admin') && role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Staff-only routes
  if (path.startsWith('/staff') && role !== 'staff' && role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Student-only routes
  if (path.startsWith('/student') && role !== 'student' && role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Accounts-only routes
  if (path.startsWith('/accounts') && role !== 'accounts' && role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/',
    '/dashboard/:path*',
    '/admin/:path*',
    '/staff/:path*',
    '/student/:path*',
    '/accounts/:path*',
    '/api/users/:path*',
    '/api/classes/:path*',
    '/api/timetable/:path*',
    '/api/exams/:path*',
    '/api/attendance/:path*',
    '/api/fees/:path*',
    '/api/notifications/:path*',
    '/api/audit/:path*',
    '/api/coverage',
    '/api/coverage/:path*',
  ],
}
