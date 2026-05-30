'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getLeaderboard, searchStudentByName, getSubjects, getInstitutes, getStudentDetails } from '@/app/actions/marks'
import Link from 'next/link'

interface LeaderboardEntry {
  studentId?: number
  rank: number
  enrollmentNo?: string
  name?: string
  subjectCode?: string
  subjectName?: string
  totalMarks: number | null
}

interface StudentMark {
  semester: number
  subjectCode: string
  subjectName: string
  internalMarks: number | null
  externalMarks: number | null
  totalMarks: number | null
}

interface StudentDetails {
  id: number
  enrollmentNo: string
  name: string
  programme: string | null
  marks: StudentMark[]
}


export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [semester, setSemester] = useState<string>('')
  const [subject, setSubject] = useState<string>('')
  const [searchName, setSearchName] = useState<string>('')
  const [isSearching, setIsSearching] = useState(false)
  const [subjects, setSubjects] = useState<Array<{ code: string; name: string }>>([])
  const [selectedSubject, setSelectedSubject] = useState<string>('')
  const [showAll, setShowAll] = useState<boolean>(false)
  const [branch, setBranch] = useState<string>('')
  const [batch, setBatch] = useState<string>('')
  const [institutes, setInstitutes] = useState<Array<{ id: number; name: string; code?: string }>>([])
  const [selectedInstitute, setSelectedInstitute] = useState<number | undefined>(undefined)
  const [selectedStudent, setSelectedStudent] = useState<StudentDetails | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    // initialize from URL query params (if any)
    try {
      const params =
        typeof window !== 'undefined'
          ? new URLSearchParams(window.location.search)
          : new URLSearchParams('')
      const sem = params.get('semester') || ''
      const subj = params.get('subject') || ''
      const br = params.get('branch') || ''
      const bt = params.get('batch') || ''
      const inst = params.get('instituteId') || ''
      if (sem) setSemester(sem)
      if (subj) setSubject(subj)
      if (br) setBranch(br)
      if (bt) setBatch(bt)
      if (inst) setSelectedInstitute(inst ? parseInt(inst) : undefined)
    } catch (e) {
      // ignore
    }

    async function loadLeaderboard() {
      try {
        setLoading(true)
        const semNum = semester ? parseInt(semester) : undefined
        const data = await getLeaderboard(
          semNum,
          subject || undefined,
          showAll ? undefined : 100,
          branch || undefined,
          selectedInstitute
        )
        // apply batch filter client-side if selected
        let filtered = data
        if (batch) {
          const prefix = batch.split('-')[0].trim()
          filtered = data.filter((e: any) => e.enrollmentNo?.startsWith(prefix))
        }
        setEntries(filtered)
      } catch (error) {
        console.error('[v0] Leaderboard load error:', error)
      } finally {
        setLoading(false)
      }
    }

    loadLeaderboard()
    // load subjects and institutes
    ;(async () => {
      try {
        const semNum = semester ? parseInt(semester) : undefined
        const subs = await getSubjects(semNum)
        setSubjects(subs)
        const inst = await getInstitutes()
        setInstitutes(inst.map((i: any) => ({ id: i.id, name: i.name, code: i.code ?? undefined })))
      } catch (e) {
        console.error('[v0] load subjects error', e)
      }
    })()
  }, [semester, subject, branch, selectedInstitute, showAll, batch])

  async function handleSearchByName(e?: React.FormEvent) {
    if (e) e.preventDefault()
    if (!searchName) return
    try {
      setIsSearching(true)
      const semNum = semester ? parseInt(semester) : undefined
      const data = await searchStudentByName(searchName, semNum)
      setEntries(data)
    } catch (err) {
      console.error('[v0] search error', err)
    } finally {
      setIsSearching(false)
    }
  }

  async function handleSelectStudent(studentId?: number) {
    if (!studentId) return
    setDetailLoading(true)
    try {
      const detail = await getStudentDetails(studentId)
      setSelectedStudent(detail)
    } catch (error) {
      console.error('[v0] getStudentDetails error', error)
      setSelectedStudent(null)
    } finally {
      setDetailLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="max-w-6xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Leaderboard</h1>
            <p className="text-muted-foreground">Top performers</p>
          </div>
          <nav className="flex gap-4">
            <Link href="/">
              <Button variant="outline">Search Marks</Button>
            </Link>
            <Link href="/admin">
              <Button variant="outline">Admin</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Search controls (simplified) */}
      <section className="max-w-6xl mx-auto px-4 py-8">
        <Card className="p-6">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">Search student by name</label>
              <Input
                type="text"
                placeholder="Enter student name"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => handleSearchByName()}>Search</Button>
              <Button variant="ghost" onClick={() => {
                setSearchName('')
                setEntries([])
              }}>Clear</Button>
              <Button variant="outline" onClick={() => {
                const newShowAll = !showAll
                setShowAll(newShowAll)
              }}>{showAll ? 'Show Top 100' : 'Show All'}</Button>
            </div>
          </div>
        </Card>
      </section>

      {/* Student detail */}
      {selectedStudent && (
        <section className="max-w-6xl mx-auto px-4 py-4">
          <Card className="p-6 mb-6">
            <CardHeader>
              <CardTitle className="text-xl">{selectedStudent.name}</CardTitle>
              <p className="text-sm text-muted-foreground">
                Enrollment: {selectedStudent.enrollmentNo}
              </p>
              <p className="text-sm text-muted-foreground">
                Programme: {selectedStudent.programme}
              </p>
            </CardHeader>
            <CardContent>
              {detailLoading ? (
                <div className="p-4 text-sm text-muted-foreground">Loading student details...</div>
              ) : (
                <div className="grid gap-4">
                  {selectedStudent.marks.map((mark, idx) => (
                    <div key={`${mark.subjectCode}-${idx}`} className="rounded-lg border p-4">
                      <div className="flex justify-between items-center gap-4">
                        <div>
                          <p className="font-semibold">{mark.subjectName}</p>
                          <p className="text-xs text-muted-foreground">{mark.subjectCode}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Internal / External</p>
                          <p className="font-semibold">
                            {mark.internalMarks ?? '-'} / {mark.externalMarks ?? '-'}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex justify-between text-sm text-muted-foreground">
                        <span>Semester {mark.semester}</span>
                        <span>Total: {mark.totalMarks ?? '-'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      )}

      {/* Results */}
      <section className="max-w-6xl mx-auto px-4 py-8">
        {loading ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">Loading leaderboard...</p>
          </Card>
        ) : entries.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No entries found</p>
          </Card>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-semibold">Rank</th>
                  <th className="px-4 py-3 text-left font-semibold">
                    Enrollment
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">Name</th>
                  <th className="px-4 py-3 text-left font-semibold">Subject</th>
                  <th className="px-4 py-3 text-right font-semibold">Marks</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, idx) => (
                  <tr
                    key={idx}
                    className={`border-b transition-colors ${entry.studentId ? 'cursor-pointer hover:bg-muted/50' : 'hover:bg-muted/50'}`}
                    onClick={() => handleSelectStudent(entry.studentId)}
                  >
                    <td className="px-4 py-3 font-semibold text-blue-600">
                      {entry.rank}
                    </td>
                    <td className="px-4 py-3 font-mono text-sm">
                      {entry.enrollmentNo}
                    </td>
                    <td className="px-4 py-3">
                      {entry.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {entry.subjectName ?? entry.subjectCode ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {entry.totalMarks === null || typeof entry.totalMarks === 'undefined'
                        ? '-'
                        : entry.totalMarks.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}
