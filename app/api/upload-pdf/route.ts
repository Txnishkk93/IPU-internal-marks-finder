import { NextResponse, type NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
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
    const instituteId = Number(formData.get('instituteId'))
    const semester = Number(formData.get('semester'))

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!instituteId || Number.isNaN(instituteId)) {
      return NextResponse.json({ error: 'Institute ID is required' }, { status: 400 })
    }

    if (!semester || Number.isNaN(semester)) {
      return NextResponse.json({ error: 'Semester is required' }, { status: 400 })
    }

    const filename = file.name.toLowerCase()
    let students

    if (filename.endsWith('.pdf')) {
      const buffer = Buffer.from(await file.arrayBuffer())
      students = await parsePdfMarks(buffer)
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
