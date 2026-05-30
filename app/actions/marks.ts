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
  limit?: number,
  programmeName?: string,
  instituteId?: number
) {
  try {
    const where: any = {}
    if (semester) where.semester = semester
    if (subject)
      where.subjectCode = { contains: subject, mode: 'insensitive' } as any

    if (programmeName || typeof instituteId === 'number') {
      const programmeWhere: any = {}
      if (programmeName) programmeWhere.name = { contains: programmeName, mode: 'insensitive' }
      if (typeof instituteId === 'number') programmeWhere.instituteId = instituteId
      where.student = { programme: programmeWhere }
    }
    // Group by student and subject (subjectCode + subjectName) and sum marks
    const groupParams: any = {
      by: ['studentId', 'subjectCode', 'subjectName'],
      _sum: { totalMarks: true },
      where,
      orderBy: { _sum: { totalMarks: 'desc' } },
    }

    if (typeof limit === 'number' && limit > 0) {
      groupParams.take = limit
    }

    const totals = await prisma.mark.groupBy(groupParams)

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
        studentId: t.studentId,
        rank: idx + 1,
        enrollmentNo: student?.enrollmentNo,
        name: student?.name,
        subjectCode: t.subjectCode,
        subjectName: t.subjectName,
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

export async function getClassAverages(semester?: number) {
  try {
    const where: any = {}
    if (semester) where.semester = semester

    const groups = await prisma.mark.groupBy({
      by: ['subjectCode', 'subjectName'],
      _avg: { internalMarks: true, totalMarks: true },
      _count: { _all: true },
      where,
      orderBy: { subjectName: 'asc' },
    })

    const overall = await prisma.mark.aggregate({
      _avg: { totalMarks: true, internalMarks: true },
      where,
    })

    return {
      subjects: groups.map((g) => ({
        subjectCode: g.subjectCode,
        subjectName: g.subjectName,
        avgInternal:
          g._avg.internalMarks === null || g._avg.internalMarks === undefined
            ? 0
            : typeof g._avg.internalMarks === 'object' && typeof (g._avg.internalMarks as any).toNumber === 'function'
            ? (g._avg.internalMarks as any).toNumber()
            : Number(g._avg.internalMarks),
        avgTotal:
          g._avg.totalMarks === null || g._avg.totalMarks === undefined
            ? 0
            : typeof g._avg.totalMarks === 'object' && typeof (g._avg.totalMarks as any).toNumber === 'function'
            ? (g._avg.totalMarks as any).toNumber()
            : Number(g._avg.totalMarks),
        count: g._count._all,
      })),
      overallAvgInternal:
        overall._avg.internalMarks === null || overall._avg.internalMarks === undefined
          ? 0
          : typeof overall._avg.internalMarks === 'object' && typeof (overall._avg.internalMarks as any).toNumber === 'function'
          ? (overall._avg.internalMarks as any).toNumber()
          : Number(overall._avg.internalMarks),
      overallAvgTotal:
        overall._avg.totalMarks === null || overall._avg.totalMarks === undefined
          ? 0
          : typeof overall._avg.totalMarks === 'object' && typeof (overall._avg.totalMarks as any).toNumber === 'function'
          ? (overall._avg.totalMarks as any).toNumber()
          : Number(overall._avg.totalMarks),
    }
  } catch (error) {
    console.error('[v0] getClassAverages error:', error)
    return { subjects: [], overallAvgInternal: 0, overallAvgTotal: 0 }
  }
}

export async function getStudentDetails(studentId: number) {
  try {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { programme: true },
    })
    if (!student) return null

    const marks = await prisma.mark.findMany({
      where: { studentId },
      select: {
        semester: true,
        subjectCode: true,
        subjectName: true,
        internalMarks: true,
        externalMarks: true,
        totalMarks: true,
      },
      orderBy: [{ semester: 'asc' }, { subjectName: 'asc' }],
    })

    return {
      id: student.id,
      enrollmentNo: student.enrollmentNo,
      name: student.name,
      programme: student.programme?.name || null,
      marks: marks.map((mark) => ({
        semester: mark.semester,
        subjectCode: mark.subjectCode,
        subjectName: mark.subjectName,
        internalMarks:
          mark.internalMarks === null
            ? null
            : typeof mark.internalMarks === 'object' && typeof (mark.internalMarks as any).toNumber === 'function'
            ? (mark.internalMarks as any).toNumber()
            : Number(mark.internalMarks),
        externalMarks:
          mark.externalMarks === null
            ? null
            : typeof mark.externalMarks === 'object' && typeof (mark.externalMarks as any).toNumber === 'function'
            ? (mark.externalMarks as any).toNumber()
            : Number(mark.externalMarks),
        totalMarks:
          mark.totalMarks === null
            ? null
            : typeof mark.totalMarks === 'object' && typeof (mark.totalMarks as any).toNumber === 'function'
            ? (mark.totalMarks as any).toNumber()
            : Number(mark.totalMarks),
      })),
    }
  } catch (error) {
    console.error('[v0] getStudentDetails error:', error)
    return null
  }
}

export async function searchStudentByName(name: string, semester?: number) {
  try {
    if (!name) return []
    const students = await prisma.student.findMany({
      where: { name: { contains: name, mode: 'insensitive' } },
      include: { programme: true },
    })

    const results: Array<any> = []

    const studentIds = students.map((student) => student.id)
    if (studentIds.length === 0) return []

    const totals = await prisma.mark.groupBy({
      by: ['studentId', 'subjectCode', 'subjectName'],
      _sum: { totalMarks: true },
      where: { studentId: { in: studentIds }, ...(semester ? { semester } : {}) },
      orderBy: { _sum: { totalMarks: 'desc' } },
    })

    const studentById = new Map(students.map((student) => [student.id, student]))

    let rank = 1
    for (const t of totals) {
      const student = studentById.get(t.studentId)
      if (!student) continue
      const totalMarks = t._sum.totalMarks
      results.push({
        studentId: student.id,
        rank: rank++,
        enrollmentNo: student.enrollmentNo,
        name: student.name,
        subjectCode: t.subjectCode,
        subjectName: t.subjectName,
        totalMarks:
          totalMarks === null
            ? null
            : typeof totalMarks === 'object' && typeof (totalMarks as any).toNumber === 'function'
            ? (totalMarks as any).toNumber()
            : Number(totalMarks),
      })
    }

    return results
  } catch (error) {
    console.error('[v0] searchStudentByName error:', error)
    return []
  }
}

export async function getSubjects(semester?: number) {
  try {
    const where: any = {}
    if (semester) where.semester = semester

    const groups = await prisma.mark.groupBy({
      by: ['subjectCode'],
      _min: { subjectName: true },
      where,
      orderBy: { _min: { subjectName: 'asc' } },
    })

    return groups.map((g) => ({ code: g.subjectCode, name: g._min.subjectName ?? g.subjectCode }))
  } catch (error) {
    console.error('[v0] getSubjects error:', error)
    return []
  }
}

export async function getInstitutes() {
  try {
    const list = await prisma.institute.findMany({ orderBy: { name: 'asc' } })
    return list.map((i) => ({ id: i.id, name: i.name, code: i.code }))
  } catch (error) {
    console.error('[v0] getInstitutes error:', error)
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
