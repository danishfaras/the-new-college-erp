import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { hashPassword } from '@/lib/utils/password'
import { createAuditLog } from '@/lib/utils/audit'
import { parseStaffSheet, parseStudentSheet } from '@/lib/bulk-users-xlsx'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file')
    const kind = String(formData.get('kind') || '')

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 })
    }
    if (kind !== 'student' && kind !== 'staff') {
      return NextResponse.json({ error: 'kind must be student or staff' }, { status: 400 })
    }

    const name = file.name.toLowerCase()
    if (!name.endsWith('.xlsx') && !name.endsWith('.xls') && !name.endsWith('.csv')) {
      return NextResponse.json(
        { error: 'Upload an Excel file (.xlsx or .xls) or .csv' },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    const created: { email: string; excelRow: number }[] = []
    const errors: { excelRow: number; email: string; message: string }[] = []

    if (kind === 'student') {
      const { rows, parseErrors } = parseStudentSheet(buffer)
      errors.push(...parseErrors)

      const seen = new Set<string>()
      for (const { excelRow, data } of rows) {
        const key = data.email.toLowerCase()
        if (seen.has(key)) {
          errors.push({ excelRow, email: data.email, message: 'Duplicate email in this file' })
          continue
        }
        seen.add(key)

        const existing = await prisma.user.findUnique({ where: { email: data.email } })
        if (existing) {
          errors.push({ excelRow, email: data.email, message: 'Email already registered' })
          continue
        }

        try {
          const hashed = await hashPassword(data.password)
          await prisma.user.create({
            data: {
              email: data.email,
              name: data.name,
              password: hashed,
              role: 'student',
              approved: true,
              profile:
                data.rollNo || data.department || data.phone
                  ? {
                      create: {
                        rollNo: data.rollNo || undefined,
                        department: data.department || undefined,
                        phone: data.phone || undefined,
                      },
                    }
                  : undefined,
            },
          })
          created.push({ email: data.email, excelRow })
        } catch (err) {
          console.error('bulk student row', excelRow, err)
          errors.push({ excelRow, email: data.email, message: 'Database error creating user' })
        }
      }
    } else {
      const { rows, parseErrors } = parseStaffSheet(buffer)
      errors.push(...parseErrors)

      const seen = new Set<string>()
      for (const { excelRow, data } of rows) {
        const key = data.email.toLowerCase()
        if (seen.has(key)) {
          errors.push({ excelRow, email: data.email, message: 'Duplicate email in this file' })
          continue
        }
        seen.add(key)

        const existing = await prisma.user.findUnique({ where: { email: data.email } })
        if (existing) {
          errors.push({ excelRow, email: data.email, message: 'Email already registered' })
          continue
        }

        try {
          const hashed = await hashPassword(data.password)
          await prisma.user.create({
            data: {
              email: data.email,
              name: data.name,
              password: hashed,
              role: data.role,
              approved: true,
              profile:
                data.department || data.phone
                  ? {
                      create: {
                        department: data.department || undefined,
                        phone: data.phone || undefined,
                      },
                    }
                  : undefined,
            },
          })
          created.push({ email: data.email, excelRow })
        } catch (err) {
          console.error('bulk staff row', excelRow, err)
          errors.push({ excelRow, email: data.email, message: 'Database error creating user' })
        }
      }
    }

    await createAuditLog('BULK_USER_IMPORT', session.user.id, null, {
      kind,
      created: created.length,
      errorCount: errors.length,
      fileName: file.name,
    })

    return NextResponse.json(
      {
        message: `Created ${created.length} user(s). ${errors.length} row issue(s).`,
        createdCount: created.length,
        created,
        errors,
      },
      { status: 200 }
    )
  } catch (e) {
    console.error('bulk upload error:', e)
    return NextResponse.json({ error: 'Failed to process upload' }, { status: 500 })
  }
}
