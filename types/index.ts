export type UserRole = 'admin' | 'staff' | 'student' | 'accounts'

export interface SessionUser {
  id: string
  email: string
  name?: string | null
  role: UserRole
  approved: boolean
}

export interface TimetableEntry {
  day: string // Monday, Tuesday, etc.
  start: string // HH:mm format
  end: string // HH:mm format
  subject: string
  staffId: string
  location?: string
}

export interface ExamSubject {
  subject: string
  code: string
  duration: string // e.g., "2 hours"
}

export interface AttendanceRecord {
  studentId: string
  status: 'present' | 'absent' | 'late'
  note?: string
}
