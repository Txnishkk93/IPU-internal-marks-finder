import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs'

export type ParsedMark = {
  subject: string
  code: string
  marks: number
}

export type ParsedStudent = {
  enrollmentNo: string
  name: string
  programme: string
  marks: ParsedMark[]
}

function normalizeText(text: string) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/ +/g, ' ')
    .trim()
}

function extractLines(text: string) {
  return normalizeText(text)
    .split(/\n+/)
    .map((line) => line.trim().replace(/^"+|"+$/g, ''))
    .filter(Boolean)
}

function parseStudentHeader(line: string) {
  const headerRegex = /Enrollment\s*:\s*([A-Z0-9]+)\s+Student Name\s*:\s*(.+?)\s+Sem\/Annual\s*:\s*(\d+)/i
  const match = line.match(headerRegex)
  if (!match) return null

  return {
    enrollmentNo: match[1].toUpperCase(),
    name: match[2].trim(),
    semester: Number(match[3]),
  }
}

function parseProgrammeLine(line: string) {
  const programmeRegex = /Programme\s*:\s*(.+)$/i
  const match = line.match(programmeRegex)
  return match ? match[1].trim() : null
}

function parseInstituteLine(line: string) {
  const instituteRegex = /Institute\s*:\s*(.+)$/i
  const match = line.match(instituteRegex)
  return match ? match[1].trim() : null
}

function parseMarksFromLine(line: string) {
  const marks: ParsedMark[] = []
  const regex = /([A-Z0-9]+(?:\s+[A-Z0-9]+)?)\s*\((\d+)\)/g
  let match: RegExpExecArray | null

  while ((match = regex.exec(line))) {
    const code = match[1].trim()
    const value = Number(match[2])
    if (!Number.isNaN(value)) {
      marks.push({
        code,
        subject: code,
        marks: value,
      })
    }
  }

  return marks
}

export function parseResultText(text: string): ParsedStudent[] {
  const lines = extractLines(text)
  const students: ParsedStudent[] = []
  let currentStudent: ParsedStudent | null = null
  let currentProgramme = 'Unknown Programme'
  let currentInstitute = ''

  for (const line of lines) {
    const institute = parseInstituteLine(line)
    if (institute) {
      currentInstitute = institute
      continue
    }

    const programme = parseProgrammeLine(line)
    if (programme) {
      currentProgramme = programme
      continue
    }

    const header = parseStudentHeader(line)
    if (header) {
      if (currentStudent) {
        students.push(currentStudent)
      }
      currentStudent = {
        enrollmentNo: header.enrollmentNo,
        name: header.name,
        programme: currentProgramme,
        marks: [],
      }
      continue
    }

    if (currentStudent) {
      const marks = parseMarksFromLine(line)
      if (marks.length > 0) {
        currentStudent.marks.push(...marks)
      }
    }
  }

  if (currentStudent) {
    students.push(currentStudent)
  }

  if (students.length === 0) {
    throw new Error(
      'Unable to parse any student rows from the result file. Please ensure it contains Enrollment, Student Name, and subject marks.'
    )
  }

  return students
}

export async function parsePdfMarks(input: Buffer): Promise<ParsedStudent[]> {
  GlobalWorkerOptions.workerSrc = ''
  GlobalWorkerOptions.disableWorker = true

  const loadingTask = getDocument({ data: input })
  const pdf = await loadingTask.promise
  const pageCount = pdf.numPages

  const pageTexts: string[] = []
  for (let pageIndex = 1; pageIndex <= pageCount; pageIndex += 1) {
    const page = await pdf.getPage(pageIndex)
    const content = await page.getTextContent()
    const pageText = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
    pageTexts.push(pageText)
  }

  const rawText = pageTexts.join('\n')
  return parseResultText(rawText)
}
