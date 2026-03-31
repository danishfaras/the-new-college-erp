import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { buildStaffTemplateBuffer, buildStudentTemplateBuffer } from '@/lib/bulk-users-xlsx'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 })
    }

    const kind = new URL(request.url).searchParams.get('kind')
    if (kind === 'student') {
      const buf = buildStudentTemplateBuffer()
      return new NextResponse(new Uint8Array(buf), {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename="student-import-template.xlsx"',
        },
      })
    }
    if (kind === 'staff') {
      const buf = buildStaffTemplateBuffer()
      return new NextResponse(new Uint8Array(buf), {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename="staff-import-template.xlsx"',
        },
      })
    }

    return NextResponse.json(
      { error: 'Invalid kind. Use ?kind=student or ?kind=staff' },
      { status: 400 }
    )
  } catch (e) {
    console.error('bulk template error:', e)
    return NextResponse.json({ error: 'Failed to build template' }, { status: 500 })
  }
}
