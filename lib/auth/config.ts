import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { verifyPassword } from '@/lib/utils/password'
import { SessionUser, UserRole } from '@/types'
import { getAuthSecret } from '@/lib/auth/env'

// Lazy load Prisma to avoid Edge runtime issues
const getPrisma = async () => {
  // Dynamic import to prevent bundling in Edge runtime
  const { prisma } = await import('@/lib/db/prisma')
  return prisma
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Required on Vercel / reverse proxies so cookies and callbacks use the real host
  trustHost: true,
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required')
        }

        const prisma = await getPrisma()
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        })

        if (!user || !user.password) {
          throw new Error('Invalid email or password')
        }

        if (!user.approved) {
          throw new Error('Your account is pending approval. Please contact the administrator.')
        }

        const isValid = await verifyPassword(credentials.password as string, user.password)

        if (!isValid) {
          throw new Error('Invalid email or password')
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role as UserRole,
          approved: user.approved,
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as SessionUser).role as UserRole
        token.approved = (user as SessionUser).approved
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        ;(session.user as SessionUser).id = token.id as string
        ;(session.user as SessionUser).role = token.role as UserRole
        ;(session.user as SessionUser).approved = token.approved as boolean
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  secret: getAuthSecret(),
})
