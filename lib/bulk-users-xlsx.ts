import * as XLSX from 'xlsx'
import { z } from 'zod'

const STUDENT_SHEET = 'Students'
const STAFF_SHEET = 'Staff'

export function buildStudentTemplateBuffer(): Buffer {
  const wb = XLSX.utils.book_new()

  const instructions: (string | string[])[][] = [
    ['Student bulk upload — read me'],
    [''],
    ['1. Use the "' + STUDENT_SHEET + '" sheet only for your data.'],
    ['2. Keep the header row exactly as provided (column names).'],
    ['3. Add one row per student. Password: minimum 6 characters.'],
    ['4. You may delete the sample row before uploading.'],
    ['5. Save as .xlsx and upload on the Users page (Bulk import).'],
    [''],
    ['Columns: name, email, password, roll_no, department, phone'],
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(instructions), 'Instructions')

  const data: (string | string[])[][] = [
    ['name', 'email', 'password', 'roll_no', 'department', 'phone'],
    [
      'Sample Student',
      'sample.student@college.edu',
      'ChangeMe123',
      'CS-2024-001',
      'Computer Science',
      '',
    ],
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), STUDENT_SHEET)

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

export function buildStaffTemplateBuffer(): Buffer {
  const wb = XLSX.utils.book_new()

  const instructions: (string | string[])[][] = [
    ['Staff bulk upload — read me'],
    [''],
    ['1. Use the "' + STAFF_SHEET + '" sheet only for your data.'],
    ['2. Keep the header row exactly as provided.'],
    ['3. role must be "staff" or "accounts" (default: staff).'],
    ['4. Password: minimum 6 characters. Accounts are auto-approved.'],
    ['5. Save as .xlsx and upload on the Users page (Bulk import).'],
    [''],
    ['Columns: name, email, password, role, department, phone'],
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(instructions), 'Instructions')

  const data: (string | string[])[][] = [
    ['name', 'email', 'password', 'role', 'department', 'phone'],
    [
      'Sample Staff',
      'sample.staff@college.edu',
      'ChangeMe123',
      'staff',
      'Computer Science',
      '',
    ],
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), STAFF_SHEET)

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

function normalizeKeys(row: Record<string, unknown>): Record<string, string> {
  const o: Record<string, string> = {}
  for (const [k, v] of Object.entries(row)) {
    const key = String(k).trim().toLowerCase().replace(/\s+/g, '_')
    o[key] = String(v ?? '').trim()
  }
  return o
}

const studentRowSchema = z.object({
  name: z.string().min(2, 'name min 2 chars'),
  email: z.string().email('invalid email'),
  password: z.string().min(6, 'password min 6 chars'),
  rollNo: z.string().optional(),
  department: z.string().optional(),
  phone: z.string().optional(),
})

const staffRowSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['staff', 'accounts']),
  department: z.string().optional(),
  phone: z.string().optional(),
})

export type ParsedStudentRow = z.infer<typeof studentRowSchema>
export type ParsedStaffRow = z.infer<typeof staffRowSchema>

export function parseStudentSheet(buffer: Buffer): {
  rows: { excelRow: number; data: ParsedStudentRow }[]
  parseErrors: { excelRow: number; email: string; message: string }[]
} {
  const wb = XLSX.read(buffer, { type: 'buffer' })
  const ws = wb.Sheets[STUDENT_SHEET] || wb.Sheets[wb.SheetNames[0]]
  if (!ws) {
    return { rows: [], parseErrors: [{ excelRow: 0, email: '', message: 'No worksheet found' }] }
  }

  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })
  const rows: { excelRow: number; data: ParsedStudentRow }[] = []
  const parseErrors: { excelRow: number; email: string; message: string }[] = []

  json.forEach((raw, i) => {
    const o = normalizeKeys(raw)
    const email = o.email || o['e-mail'] || ''
    const name = o.name || ''
    if (!email && !name) return

    const rollNo = o.roll_no || o.rollno || o.roll_number || ''
    const parsed = studentRowSchema.safeParse({
      name: o.name,
      email: o.email || o['e-mail'],
      password: o.password,
      rollNo: rollNo || undefined,
      department: o.department || undefined,
      phone: o.phone || undefined,
    })
    const excelRow = i + 2
    if (!parsed.success) {
      const msg = parsed.error.issues.map((e) => e.message).join('; ')
      parseErrors.push({ excelRow, email: email || '—', message: msg })
      return
    }
    rows.push({ excelRow, data: parsed.data })
  })

  return { rows, parseErrors }
}

export function parseStaffSheet(buffer: Buffer): {
  rows: { excelRow: number; data: ParsedStaffRow }[]
  parseErrors: { excelRow: number; email: string; message: string }[]
} {
  const wb = XLSX.read(buffer, { type: 'buffer' })
  const ws = wb.Sheets[STAFF_SHEET] || wb.Sheets[wb.SheetNames[0]]
  if (!ws) {
    return { rows: [], parseErrors: [{ excelRow: 0, email: '', message: 'No worksheet found' }] }
  }

  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })
  const rows: { excelRow: number; data: ParsedStaffRow }[] = []
  const parseErrors: { excelRow: number; email: string; message: string }[] = []

  json.forEach((raw, i) => {
    const o = normalizeKeys(raw)
    const email = o.email || o['e-mail'] || ''
    const name = o.name || ''
    if (!email && !name) return

    let role: 'staff' | 'accounts' = 'staff'
    const r = (o.role || 'staff').toLowerCase().trim()
    if (r === 'accounts' || r === 'account') role = 'accounts'
    else if (r === 'staff' || r === '') role = 'staff'
    else {
      parseErrors.push({
        excelRow: i + 2,
        email: email || '—',
        message: `role must be "staff" or "accounts", got "${o.role}"`,
      })
      return
    }

    const parsed = staffRowSchema.safeParse({
      name: o.name,
      email: o.email || o['e-mail'],
      password: o.password,
      role,
      department: o.department || undefined,
      phone: o.phone || undefined,
    })
    const excelRow = i + 2
    if (!parsed.success) {
      const msg = parsed.error.issues.map((e) => e.message).join('; ')
      parseErrors.push({ excelRow, email: email || '—', message: msg })
      return
    }
    rows.push({ excelRow, data: parsed.data })
  })

  return { rows, parseErrors }
}
