import type { NextRequest } from 'next/server'

/** Auth.js v5 prefers AUTH_SECRET; keep NEXTAUTH_SECRET for older docs / Vercel templates. */
export function getAuthSecret(): string | undefined {
  return process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET
}

/**
 * Session cookie name uses the `__Secure-` prefix only when this is true.
 * Must match how Auth.js sets cookies (HTTPS / secure), or middleware never sees the JWT.
 */
export function sessionUsesSecureCookie(req: NextRequest): boolean {
  const forwarded = req.headers.get('x-forwarded-proto')
  if (forwarded === 'https') return true
  if (forwarded === 'http') return false
  if (process.env.VERCEL === '1') return true
  return req.nextUrl.protocol === 'https:'
}
