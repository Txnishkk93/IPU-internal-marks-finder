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

function parseStudentHeader(line: string, nextLine?: string) {
  const combined = (line + (nextLine ? ' ' + nextLine : '')).replace(/\s+/g, ' ')
  const headerRegex = /Enrollment(?:\s*(?:No\.?|Number))?\s*[:\-]?\s*([A-Z0-9-]+)\s+Student Name\s*[:\-]?\s*(.+?)\s+(?:Sem(?:\s*\/\s*Annual)?|Sem\/Annual|Sem Annual)\s*[:\-]?\s*(\d+)/i
  const match = combined.match(headerRegex)
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

function parsePaperMeta(text: string) {
  const codeMatch = text.match(/Paper\s*Code\s*[:\-]?\s*([A-Z0-9]+)/i)
  const nameMatch = text.match(/Paper\s*Name\s*[:\-]?\s*([^\n\r]+)/i)

  return {
    code: codeMatch?.[1]?.trim() ?? 'UNKNOWN',
    name: nameMatch?.[1]?.trim() ?? 'Unknown Subject',
  }
}

function parseProgrammeFromText(text: string) {
  const programmeMatch = text.match(/Programme\s*:\s*(.+)$/im)
  if (programmeMatch) return programmeMatch[1].trim()

  const degreeMatch = text.match(/Bachelor\s+of\s+Technology\s*\(([^)]+)\)/i)
  if (degreeMatch) return `B.Tech ${degreeMatch[1].trim()}`

  if (/Bachelor\s+of\s+Technology/i.test(text)) return 'Bachelor of Technology'

  return null
}

function parseMarksFromLine(line: string) {
  const marks: ParsedMark[] = []
  const regex = /([A-Z0-9]+(?:[\s\-\/][A-Z0-9]+)*)\s*\(?([0-9]+(?:\.[0-9]+)?)\)?/g
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

function parseTableRow(
  line: string,
  subjectCode: string,
  subjectName: string,
  programme: string | null
): ParsedStudent | null {
  const tokens = line.trim().split(/\s+/).filter(Boolean)
  if (tokens.length < 6) return null

  // Expect rows like: BATCH SEM PAPERID ENROLLMENT STUDENT NAME ... MAX MARKS MARKS
  const enrollmentCandidate = tokens[3]
  if (!/^\d{8,}$/.test(enrollmentCandidate)) return null

  const marksText = tokens[tokens.length - 1]
  const marksValue = Number(marksText)
  const studentNameTokens = tokens.slice(4, tokens.length - 2)

  if (studentNameTokens.length === 0) return null

  return {
    enrollmentNo: enrollmentCandidate,
    name: studentNameTokens.join(' '),
    programme: programme ?? 'Unknown Programme',
    marks: !Number.isNaN(marksValue)
      ? [
          {
            subject: subjectName,
            code: subjectCode,
            marks: marksValue,
          },
        ]
      : [],
  }
}

export function parseResultText(text: string): ParsedStudent[] {
  const lines = extractLines(text)
  const students: ParsedStudent[] = []
  let currentStudent: ParsedStudent | null = null
  let currentProgramme = 'Unknown Programme'
  let currentInstitute = ''

  const paperMeta = parsePaperMeta(text)
  const defaultProgramme = parseProgrammeFromText(text)

  const tableHeaderIndex = lines.findIndex(
    (line) => /ENROLLMENT/i.test(line) && /STUDENT\s+NAME/i.test(line)
  )

  if (tableHeaderIndex >= 0) {
    for (let i = tableHeaderIndex + 1; i < lines.length; i += 1) {
      const row = parseTableRow(
        lines[i],
        paperMeta.code,
        paperMeta.name,
        defaultProgramme
      )
      if (row) {
        students.push(row)
      }
    }

    if (students.length > 0) {
      return students
    }
  }

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]
    const nextLine = lines[i + 1]

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

    const header = parseStudentHeader(line, nextLine)
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

export async function parsePdfMarks(input: Uint8Array): Promise<ParsedStudent[]> {
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
