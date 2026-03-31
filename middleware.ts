import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

function dashboardPathForRole(role: string | undefined): string {
  switch (role) {
    case 'admin':
      return '/admin'
    case 'staff':
      return '/staff'
    case 'student':
      return '/student'
    case 'accounts':
      return '/accounts'
    default:
      return '/login'
  }
}

function json(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  const isApi = path.startsWith('/api/')

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  })

  if (path === '/login' || path === '/') {
    return NextResponse.next()
  }

  if (!token) {
    if (isApi) {
      return json('Unauthorized', 401)
    }
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', path)
    return NextResponse.redirect(loginUrl)
  }

  const approved = token.approved as boolean
  if (!approved && !path.startsWith('/pending') && path !== '/api/auth/signout') {
    if (isApi) {
      return json('Account pending approval', 403)
    }
    return NextResponse.redirect(new URL('/pending', request.url))
  }

  const role = token.role as string

  if (path.startsWith('/admin') && role !== 'admin') {
    if (isApi) {
      return json('Forbidden', 403)
    }
    return NextResponse.redirect(new URL(dashboardPathForRole(role), request.url))
  }

  if (path.startsWith('/staff') && role !== 'staff' && role !== 'admin') {
    if (isApi) {
      return json('Forbidden', 403)
    }
    return NextResponse.redirect(new URL(dashboardPathForRole(role), request.url))
  }

  if (path.startsWith('/student') && role !== 'student' && role !== 'admin') {
    if (isApi) {
      return json('Forbidden', 403)
    }
    return NextResponse.redirect(new URL(dashboardPathForRole(role), request.url))
  }

  if (path.startsWith('/accounts') && role !== 'accounts' && role !== 'admin') {
    if (isApi) {
      return json('Forbidden', 403)
    }
    return NextResponse.redirect(new URL(dashboardPathForRole(role), request.url))
  }

  return NextResponse.next()
}

/** Run on all routes except NextAuth, static assets, and files with extensions */
export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
