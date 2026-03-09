import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')

  // Clear existing data
  await prisma.notification.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.fee.deleteMany()
  await prisma.attendance.deleteMany()
  await prisma.exam.deleteMany()
  await prisma.timetable.deleteMany()
  await prisma.class.deleteMany()
  await prisma.profile.deleteMany()
  await prisma.user.deleteMany()

  const hashedPassword = await bcrypt.hash('password123', 12)

  // Create 2 admins
  const admin1 = await prisma.user.create({
    data: {
      email: 'admin1@college.edu',
      name: 'Admin One',
      password: hashedPassword,
      role: 'admin',
      approved: true,
      profile: {
        create: {
          department: 'Administration',
          phone: '+91-9876543210',
        },
      },
    },
  })

  const admin2 = await prisma.user.create({
    data: {
      email: 'admin2@college.edu',
      name: 'Admin Two',
      password: hashedPassword,
      role: 'admin',
      approved: true,
      profile: {
        create: {
          department: 'Administration',
          phone: '+91-9876543211',
        },
      },
    },
  })

  console.log('✅ Created 2 admins')

  // Create 4 staff members
  const staff1 = await prisma.user.create({
    data: {
      email: 'staff1@college.edu',
      name: 'Dr. John Smith',
      password: hashedPassword,
      role: 'staff',
      approved: true,
      profile: {
        create: {
          department: 'Computer Science',
          phone: '+91-9876543220',
        },
      },
    },
  })

  const staff2 = await prisma.user.create({
    data: {
      email: 'staff2@college.edu',
      name: 'Dr. Jane Doe',
      password: hashedPassword,
      role: 'staff',
      approved: true,
      profile: {
        create: {
          department: 'Computer Science',
          phone: '+91-9876543221',
        },
      },
    },
  })

  const staff3 = await prisma.user.create({
    data: {
      email: 'staff3@college.edu',
      name: 'Prof. Robert Johnson',
      password: hashedPassword,
      role: 'staff',
      approved: true,
      profile: {
        create: {
          department: 'Commerce',
          phone: '+91-9876543222',
        },
      },
    },
  })

  const staff4 = await prisma.user.create({
    data: {
      email: 'staff4@college.edu',
      name: 'Dr. Sarah Williams',
      password: hashedPassword,
      role: 'staff',
      approved: true,
      profile: {
        create: {
          department: 'Computer Science',
          phone: '+91-9876543223',
        },
      },
    },
  })

  console.log('✅ Created 4 staff members')

  // Create 3 classes
  const class1 = await prisma.class.create({
    data: {
      name: 'BSc CS 2nd Year',
      code: 'BSC-CS-2',
      department: 'Computer Science',
      staffIds: [staff1.id, staff2.id],
    },
  })

  const class2 = await prisma.class.create({
    data: {
      name: 'BSc CS 3rd Year',
      code: 'BSC-CS-3',
      department: 'Computer Science',
      staffIds: [staff2.id, staff4.id],
    },
  })

  const class3 = await prisma.class.create({
    data: {
      name: 'BCom 2nd Year',
      code: 'BCOM-2',
      department: 'Commerce',
      staffIds: [staff3.id],
    },
  })

  console.log('✅ Created 3 classes')

  // Create 40 students (20 for class1, 15 for class2, 5 for class3)
  const students = []
  for (let i = 1; i <= 40; i++) {
    const classId = i <= 20 ? class1.id : i <= 35 ? class2.id : class3.id
    const rollNo = i <= 20 ? `CS2-${String(i).padStart(3, '0')}` : i <= 35 ? `CS3-${String(i - 20).padStart(3, '0')}` : `COM2-${String(i - 35).padStart(3, '0')}`

    const student = await prisma.user.create({
      data: {
        email: `student${i}@college.edu`,
        name: `Student ${i}`,
        password: hashedPassword,
        role: 'student',
        approved: i <= 35, // First 35 approved, last 5 pending
        profile: {
          create: {
            rollNo,
            department: i <= 35 ? 'Computer Science' : 'Commerce',
            phone: `+91-9876543${String(300 + i).padStart(3, '0')}`,
          },
        },
      },
    })
    students.push({ ...student, classId })
  }

  console.log('✅ Created 40 students')

  // Create timetables
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  const subjects = [
    { name: 'Data Structures', code: 'CS201' },
    { name: 'Database Systems', code: 'CS202' },
    { name: 'Operating Systems', code: 'CS203' },
    { name: 'Computer Networks', code: 'CS204' },
    { name: 'Software Engineering', code: 'CS205' },
  ]

  const timetableEntries1 = []
  for (let dayIndex = 0; dayIndex < days.length; dayIndex++) {
    for (let slot = 0; slot < 4; slot++) {
      const subject = subjects[slot % subjects.length]
      timetableEntries1.push({
        day: days[dayIndex],
        start: `${9 + slot * 2}:00`,
        end: `${10 + slot * 2}:00`,
        subject: subject.name,
        staffId: slot % 2 === 0 ? staff1.id : staff2.id,
        location: `Room ${101 + slot}`,
      })
    }
  }

  await prisma.timetable.create({
    data: {
      classId: class1.id,
      entries: timetableEntries1,
      updatedBy: staff1.id,
    },
  })

  await prisma.timetable.create({
    data: {
      classId: class2.id,
      entries: timetableEntries1.map((e) => ({
        ...e,
        subject: subjects[(subjects.indexOf(subjects.find((s) => s.name === e.subject)!) + 1) % subjects.length].name,
      })),
      updatedBy: staff2.id,
    },
  })

  await prisma.timetable.create({
    data: {
      classId: class3.id,
      entries: [
        { day: 'Monday', start: '10:00', end: '11:00', subject: 'Accounting', staffId: staff3.id, location: 'Room 201' },
        { day: 'Tuesday', start: '10:00', end: '11:00', subject: 'Economics', staffId: staff3.id, location: 'Room 201' },
        { day: 'Wednesday', start: '10:00', end: '11:00', subject: 'Business Law', staffId: staff3.id, location: 'Room 201' },
      ],
      updatedBy: staff3.id,
    },
  })

  console.log('✅ Created timetables')

  // Create exams
  const exam1 = await prisma.exam.create({
    data: {
      classId: class1.id,
      name: 'Mid-Term Examination',
      date: new Date('2024-12-20'),
      startTime: '09:00',
      endTime: '12:00',
      subjects: [
        { subject: 'Data Structures', code: 'CS201', duration: '3 hours' },
        { subject: 'Database Systems', code: 'CS202', duration: '3 hours' },
      ],
    },
  })

  const exam2 = await prisma.exam.create({
    data: {
      classId: class2.id,
      name: 'Final Examination',
      date: new Date('2025-01-15'),
      startTime: '09:00',
      endTime: '12:00',
      subjects: [
        { subject: 'Operating Systems', code: 'CS203', duration: '3 hours' },
        { subject: 'Computer Networks', code: 'CS204', duration: '3 hours' },
      ],
    },
  })

  console.log('✅ Created 2 exam schedules')

  // Create attendance records for last 10 days
  const today = new Date()
  for (let dayOffset = 0; dayOffset < 10; dayOffset++) {
    const date = new Date(today)
    date.setDate(date.getDate() - dayOffset)

    // Skip weekends
    if (date.getDay() === 0 || date.getDay() === 6) continue

    const records = students.slice(0, 20).map((student) => ({
      studentId: student.id,
      status: Math.random() > 0.2 ? 'present' : Math.random() > 0.5 ? 'late' : 'absent',
      note: Math.random() > 0.8 ? 'Medical leave' : undefined,
    }))

    await prisma.attendance.create({
      data: {
        classId: class1.id,
        date,
        records,
        takenBy: staff1.id,
      },
    })
  }

  console.log('✅ Created attendance records for last 10 days')

  // Create fee invoices for all students
  for (const student of students) {
    await prisma.fee.create({
      data: {
        studentId: student.id,
        amount: 50000 + Math.random() * 10000,
        dueDate: new Date('2024-12-31'),
        paid: Math.random() > 0.6,
        paidAt: Math.random() > 0.6 ? new Date() : null,
        invoiceId: `INV-${student.id.slice(-6).toUpperCase()}`,
      },
    })
  }

  console.log('✅ Created fee invoices for all students')

  // Create some notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: students[0].id,
        title: 'Welcome to NextGen Edu.ERP',
        message: 'Your account has been approved. Welcome to our ERP system!',
        type: 'success',
      },
      {
        userId: students[0].id,
        title: 'New Fee Invoice',
        message: 'A new fee invoice has been generated. Please check your fees section.',
        type: 'info',
        link: '/student/fees',
      },
    ],
  })

  console.log('✅ Created sample notifications')

  console.log('🎉 Seed completed successfully!')
  console.log('\n📝 Test Credentials:')
  console.log('Admin: admin1@college.edu / password123')
  console.log('Staff: staff1@college.edu / password123')
  console.log('Student: student1@college.edu / password123')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
