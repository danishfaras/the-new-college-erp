import 'next-auth'
import { UserRole } from './index'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      role: UserRole
      approved: boolean
    }
  }

  interface User {
    id: string
    email: string
    name?: string | null
    role: UserRole
    approved: boolean
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: UserRole
    approved: boolean
  }
}
