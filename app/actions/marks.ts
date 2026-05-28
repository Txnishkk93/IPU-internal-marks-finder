'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { headers } from 'next/headers'

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

export async function searchStudent(enrollmentNo: string) {
  try {
    const student = await prisma.student.findUnique({
      where: { enrollmentNo: enrollmentNo.toUpperCase() },
      include: { programme: true },
    })

    if (!student) return null

    const studentMarks = (
      await prisma.mark.findMany({
        where: { studentId: student.id },
        select: {
          semester: true,
          subjectName: true,
          subjectCode: true,
          totalMarks: true,
        },
        orderBy: { semester: 'asc' },
      })
    ).map((mark) => ({
      ...mark,
      totalMarks:
        mark.totalMarks === null
          ? null
          : typeof mark.totalMarks === 'object' &&
            typeof (mark.totalMarks as any).toNumber === 'function'
          ? (mark.totalMarks as any).toNumber()
          : Number(mark.totalMarks),
    }))

    return {
      id: student.id,
      enrollmentNo: student.enrollmentNo,
      name: student.name,
      programme: student.programme?.name || null,
      marks: studentMarks || [],
    }
  } catch (error) {
    console.error('[v0] Search error:', error)
    throw error
  }
}

export async function getLeaderboard(
  semester?: number,
  subject?: string,
  limit = 50
) {
  try {
    const where: any = {}
    if (semester) where.semester = semester
    if (subject)
      where.subjectCode = { contains: subject, mode: 'insensitive' } as any

    // Group by student and sum marks
    const totals = await prisma.mark.groupBy({
      by: ['studentId'],
      _sum: { totalMarks: true },
      where,
      orderBy: { _sum: { totalMarks: 'desc' } },
      take: limit,
    })

    const studentIds = totals.map((t) => t.studentId)
    const studentsList = await prisma.student.findMany({
      where: { id: { in: studentIds } },
      include: { programme: true },
    })

    // Map totals to student records and compute rank
    const results = totals.map((t, idx) => {
      const student = studentsList.find((s) => s.id === t.studentId)
      const totalMarks = t._sum.totalMarks
      return {
        rank: idx + 1,
        enrollmentNo: student?.enrollmentNo,
        name: student?.name,
        programme: student?.programme?.name,
        totalMarks:
          totalMarks === null
            ? null
            : typeof totalMarks === 'object' &&
              typeof (totalMarks as any).toNumber === 'function'
            ? (totalMarks as any).toNumber()
            : Number(totalMarks),
      }
    })

    return results
  } catch (error) {
    console.error('[v0] Leaderboard error:', error)
    return []
  }
}

export async function uploadPDFAndSeed(data: {
  semester: number
  instituteId: number
  fileName: string
  students: Array<{
    enrollmentNo: string
    name: string
    programme: string
    marks: Array<{
      subject: string
      code: string
      marks: number
    }>
  }>
}) {
  const userId = await getUserId()

  try {
    // Verify institute exists
    const institute = await prisma.institute.findUnique({
      where: { id: data.instituteId },
    })

    if (!institute) throw new Error('Institute not found')

    let processedCount = 0

    for (const stu of data.students) {
      // Get or create programme
      let programme = await prisma.programme.findFirst({
        where: { name: stu.programme, instituteId: data.instituteId },
      })

      if (!programme) {
        programme = await prisma.programme.create({
          data: {
            name: stu.programme,
            code: stu.programme.substring(0, 10),
            instituteId: data.instituteId,
          },
        })
      }

      // Get or create student
      let studentRecord = await prisma.student.findUnique({
        where: { enrollmentNo: stu.enrollmentNo },
      })

      if (!studentRecord) {
        studentRecord = await prisma.student.create({
          data: {
            enrollmentNo: stu.enrollmentNo,
            name: stu.name,
            programmeId: programme.id,
          },
        })
      }

      // Insert marks
      for (const mark of stu.marks) {
        try {
          await prisma.mark.create({
            data: {
              studentId: studentRecord.id,
              semester: data.semester,
              subjectCode: mark.code,
              subjectName: mark.subject,
              totalMarks: mark.marks,
            },
          })
        } catch (error) {
          console.error('[v0] Error inserting mark:', error)
        }
      }

      processedCount++
    }

    return { success: true, processed: processedCount }
  } catch (error) {
    console.error('[v0] PDF seed error:', error)
    throw error
  }
}
