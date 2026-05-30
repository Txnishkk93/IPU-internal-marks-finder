import { NextResponse, type NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { parsePdfMarks, parseResultText } from '@/lib/pdf-parser'
import { uploadPDFAndSeed } from '@/app/actions/marks'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file')
    const instituteInput = String(formData.get('instituteId') ?? '').trim()
    let instituteId = Number(instituteInput)
    const semester = Number(formData.get('semester'))

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!instituteInput) {
      return NextResponse.json({ error: 'Institute ID is required' }, { status: 400 })
    }

    let institute = null
    if (!Number.isNaN(instituteId) && instituteId > 0) {
      institute = await prisma.institute.findUnique({ where: { id: instituteId } })
    }
    if (!institute) {
      institute = await prisma.institute.findFirst({ where: { code: instituteInput } })
      if (institute) {
        instituteId = institute.id
      }
    }
    if (!institute) {
      return NextResponse.json({ error: 'Institute not found' }, { status: 400 })
    }

    if (!semester || Number.isNaN(semester)) {
      return NextResponse.json({ error: 'Semester is required' }, { status: 400 })
    }

    const filename = file.name.toLowerCase()
    let students

    if (filename.endsWith('.pdf')) {
      const fileData = new Uint8Array(await file.arrayBuffer())
      students = await parsePdfMarks(fileData)
    } else {
      const text = await file.text()
      students = parseResultText(text)
    }

    const result = await uploadPDFAndSeed({
      semester,
      instituteId,
      fileName: file.name,
      students,
    })

    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'File upload failed' },
      { status: 500 }
    )
  }
}
