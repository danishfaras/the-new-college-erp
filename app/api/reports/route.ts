import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/db/prisma'
import { createAuditLog } from '@/lib/utils/audit'
import { rowsToCsv, withUtf8Bom } from '@/lib/report-csv'

type SessionUser = { id: string; role: string }

async function getAccessibleClasses(session: SessionUser, classIdFilter: string | null) {
  if (classIdFilter) {
    const one = await prisma.class.findUnique({ where: { id: classIdFilter } })
    if (!one) {
      return { error: 'Class not found', status: 404 as const }
    }
    if (session.role !== 'admin' && !one.staffIds.includes(session.id)) {
      return { error: 'You do not have access to this class', status: 403 as const }
    }
    return { classes: [one] }
  }
  const classes = await prisma.class.findMany({
    where:
      session.role === 'admin'
        ? {}
        : {
            staffIds: { has: session.id },
          },
    orderBy: { code: 'asc' },
  })
  return { classes }
}

async function studentsForClass(classData: { studentIds: string[]; department: string }) {
  const all = await prisma.user.findMany({
    where: { role: 'student', approved: true },
    include: { profile: { select: { rollNo: true, department: true, phone: true } } },
    orderBy: { name: 'asc' },
  })
  if (classData.studentIds.length > 0) {
    const set = new Set(classData.studentIds)
    return all.filter((u) => set.has(u.id))
  }
  return all.filter((u) => u.profile?.department === classData.department)
}

function parseDateRange(searchParams: URLSearchParams) {
  const start = searchParams.get('start')
  const end = searchParams.get('end')
  let dateFilter: { gte?: Date; lte?: Date } | undefined
  if (start || end) {
    dateFilter = {}
    if (start) dateFilter.gte = new Date(start + 'T00:00:00.000Z')
    if (end) dateFilter.lte = new Date(end + 'T23:59:59.999Z')
  }
  return dateFilter
}

function filename(prefix: string) {
  const d = new Date().toISOString().slice(0, 10)
  return `${prefix}-${d}.csv`
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (session.user.role !== 'admin' && session.user.role !== 'staff') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const classId = searchParams.get('classId')
    const dateFilter = parseDateRange(searchParams)

    const acc = await getAccessibleClasses(
      { id: session.user.id, role: session.user.role },
      classId
    )
    if ('error' in acc) {
      return NextResponse.json({ error: acc.error }, { status: acc.status as number })
    }
    const { classes } = acc

    await createAuditLog('REPORT_EXPORT', session.user.id, null, {
      type,
      classId: classId || 'all_accessible',
      start: searchParams.get('start'),
      end: searchParams.get('end'),
    })

    if (type === 'classes-overview') {
      const rows: (string | number | null)[][] = []
      for (const c of classes) {
        const staffN = c.staffIds.length
        const studN = c.studentIds.length
        rows.push([c.code, c.name, c.department, staffN, studN])
      }
      const csv = withUtf8Bom(
        rowsToCsv(['Class code', 'Class name', 'Department', 'Staff count', 'Enrolled IDs count'], rows)
      )
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename('classes-overview')}"`,
        },
      })
    }

    if (type === 'student-roster') {
      const rows: (string | number | null)[][] = []
      for (const c of classes) {
        const studs = await studentsForClass(c)
        for (const u of studs) {
          rows.push([
            c.code,
            c.name,
            u.name || '',
            u.email,
            u.profile?.rollNo || '',
            u.profile?.department || '',
            u.profile?.phone || '',
            u.approved ? 'yes' : 'no',
          ])
        }
      }
      const csv = withUtf8Bom(
        rowsToCsv(
          [
            'Class code',
            'Class name',
            'Student name',
            'Email',
            'Roll no',
            'Department',
            'Phone',
            'Approved',
          ],
          rows
        )
      )
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename('student-roster')}"`,
        },
      })
    }

    if (type === 'attendance-detail') {
      const rows: (string | number | null)[][] = []
      for (const c of classes) {
        const studs = await studentsForClass(c)
        const studMap = new Map(studs.map((u) => [u.id, u]))
        const where: any = { classId: c.id }
        if (dateFilter) where.date = dateFilter
        const records = await prisma.attendance.findMany({
          where,
          include: {
            takenByUser: { select: { name: true, email: true } },
          },
          orderBy: [{ date: 'desc' }, { startTime: 'asc' }],
        })
        for (const att of records) {
          const recs = (att.records as { studentId: string; status: string; note?: string }[]) || []
          const dateStr = att.date.toISOString().slice(0, 10)
          for (const r of recs) {
            const u = studMap.get(r.studentId)
            rows.push([
              c.code,
              c.name,
              dateStr,
              att.day || '',
              att.subject || '',
              att.startTime || '',
              att.endTime || '',
              u?.name || r.studentId,
              u?.profile?.rollNo || '',
              u?.email || '',
              r.status,
              r.note || '',
              att.takenByUser?.name || att.takenByUser?.email || '',
              att.createdAt.toISOString(),
            ])
          }
        }
      }
      const csv = withUtf8Bom(
        rowsToCsv(
          [
            'Class code',
            'Class name',
            'Date',
            'Day',
            'Subject',
            'Start',
            'End',
            'Student name',
            'Roll no',
            'Email',
            'Status',
            'Note',
            'Recorded by',
            'Recorded at (UTC)',
          ],
          rows
        )
      )
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename('attendance-detail')}"`,
        },
      })
    }

    if (type === 'attendance-summary') {
      const rows: (string | number | null)[][] = []
      for (const c of classes) {
        const studs = await studentsForClass(c)
        const where: any = { classId: c.id }
        if (dateFilter) where.date = dateFilter
        const records = await prisma.attendance.findMany({ where })

        for (const u of studs) {
          let total = 0
          let present = 0
          let late = 0
          let absent = 0
          for (const att of records) {
            const recs = (att.records as { studentId: string; status: string }[]) || []
            const mine = recs.find((r) => r.studentId === u.id)
            if (!mine) continue
            total += 1
            if (mine.status === 'present') present += 1
            else if (mine.status === 'late') late += 1
            else absent += 1
          }
          const countedPresent = present + late
          const pct = total > 0 ? Math.round((countedPresent / total) * 10000) / 100 : 0
          rows.push([
            c.code,
            c.name,
            u.name || '',
            u.email,
            u.profile?.rollNo || '',
            u.profile?.department || '',
            total,
            present,
            late,
            absent,
            pct,
          ])
        }
      }
      const csv = withUtf8Bom(
        rowsToCsv(
          [
            'Class code',
            'Class name',
            'Student name',
            'Email',
            'Roll no',
            'Department',
            'Periods recorded',
            'Present',
            'Late',
            'Absent',
            'Attendance %',
          ],
          rows
        )
      )
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename('attendance-summary')}"`,
        },
      })
    }

    if (type === 'fees-summary') {
      const rows: (string | number | null)[][] = []
      for (const c of classes) {
        const studs = await studentsForClass(c)
        const studentIds = studs.map((s) => s.id)
        if (studentIds.length === 0) continue
        const fees = await prisma.fee.findMany({
          where: { studentId: { in: studentIds } },
        })
        const byStudent = new Map<string, typeof fees>()
        for (const f of fees) {
          const list = byStudent.get(f.studentId) || []
          list.push(f)
          byStudent.set(f.studentId, list)
        }
        for (const u of studs) {
          const list = byStudent.get(u.id) || []
          const totalDue = list.reduce((s, f) => s + f.amount, 0)
          const paid = list.filter((f) => f.paid).length
          const unpaid = list.length - paid
          const unpaidAmount = list.filter((f) => !f.paid).reduce((s, f) => s + f.amount, 0)
          rows.push([
            c.code,
            c.name,
            u.name || '',
            u.email,
            u.profile?.rollNo || '',
            list.length,
            paid,
            unpaid,
            totalDue,
            unpaidAmount,
          ])
        }
      }
      const csv = withUtf8Bom(
        rowsToCsv(
          [
            'Class code',
            'Class name',
            'Student name',
            'Email',
            'Roll no',
            'Fee records',
            'Paid count',
            'Unpaid count',
            'Total amount (all records)',
            'Unpaid amount',
          ],
          rows
        )
      )
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename('fees-summary')}"`,
        },
      })
    }

    return NextResponse.json(
      {
        error: 'Invalid type',
        valid: [
          'attendance-detail',
          'attendance-summary',
          'student-roster',
          'classes-overview',
          'fees-summary',
        ],
      },
      { status: 400 }
    )
  } catch (error) {
    console.error('GET /api/reports error:', error)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}
