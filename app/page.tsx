'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { SearchResultCard } from '@/components/search-result-card'
import { searchStudent, getSubjects, getInstitutes } from '@/app/actions/marks'
import { useRouter } from 'next/navigation'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import Link from 'next/link'

interface SearchResult {
  id: number
  enrollmentNo: string
  name: string
  programme: string
  marks: Array<{
    semester: number
    subject: string
    code: string
    totalMarks: string | number
  }>
}

export default function Home() {
  const [enrollment, setEnrollment] = useState('')
  const [result, setResult] = useState<SearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [branch, setBranch] = useState('')
  const [batch, setBatch] = useState('')
  const [semesterSel, setSemesterSel] = useState('')
  const [subjects, setSubjects] = useState<Array<{ code: string; name: string }>>([])
  const [subjectSel, setSubjectSel] = useState('')
  const [institutes, setInstitutes] = useState<Array<{ id: number; name: string }>>([])
  const [instituteSel, setInstituteSel] = useState<string>('')
  const router = useRouter()

  useEffect(() => {
    ;(async () => {
      try {
        const subs = await getSubjects(undefined)
        setSubjects(subs)
        const inst = await getInstitutes()
        setInstitutes(inst.map((i: any) => ({ id: i.id, name: i.name })))
      } catch (e) {
        console.error('home load error', e)
      }
    })()
  }, [])

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const data = await searchStudent(enrollment)
      if (!data) {
        setError('Student not found')
        setResult(null)
      } else {
        setResult(data)
      }
    } catch (err) {
      setError('Failed to search. Please try again.')
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="max-w-6xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">GGSIPU Marks</h1>
            <p className="text-muted-foreground">Check your academic results</p>
          </div>
          <nav className="flex gap-4">
            <Link href="/leaderboard">
              <Button variant="outline">Leaderboard</Button>
            </Link>
            <Link href="/admin">
              <Button variant="outline">Admin</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Search Section */}
      {/* Ranklist Quick Load Section */}
      <section className="max-w-6xl mx-auto px-4 py-8">
          <Card className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Branch</label>
                <Select value={branch || 'all'} onValueChange={(v) => setBranch(v === 'all' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Branches" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Branches</SelectItem>
                    {['CSE', 'CSE-DS', 'CSE-AIML', 'IT', 'ECE'].map((b) => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Batch</label>
                <Select value={batch || 'all'} onValueChange={(v) => setBatch(v === 'all' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Batches" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Batches</SelectItem>
                    {['2019-2023','2020-2024','2021-2025','2022-2026'].map((b) => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Semester</label>
                <Select value={semesterSel || 'all'} onValueChange={(v) => setSemesterSel(v === 'all' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Semesters" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Semesters</SelectItem>
                    {[1,2,3,4,5,6,7,8].map((s) => (
                      <SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">College</label>
                <Select value={instituteSel || 'all'} onValueChange={(v) => setInstituteSel(v === 'all' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Colleges" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Colleges</SelectItem>
                    {institutes.map((i) => (
                      <SelectItem key={i.id} value={String(i.id)}>{i.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium mb-2">Subject (optional)</label>
                <Select value={subjectSel || 'all'} onValueChange={(v) => setSubjectSel(v === 'all' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Subjects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subjects</SelectItem>
                    {subjects.map((s) => (
                      <SelectItem key={`${s.code}-${s.name}`} value={s.code}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2">
                <Button onClick={() => {
                  const params = new URLSearchParams()
                  if (branch) params.set('branch', branch)
                  if (batch) params.set('batch', batch)
                  if (semesterSel) params.set('semester', semesterSel)
                  if (subjectSel) params.set('subject', subjectSel)
                  if (instituteSel) params.set('instituteId', instituteSel)
                  router.push('/leaderboard?' + params.toString())
                }}>Load Ranklist</Button>
                <Button variant="ghost" onClick={() => {
                  setBranch('')
                  setBatch('')
                  setSemesterSel('')
                  setInstituteSel('')
                  setSubjectSel('')
                }}>Clear</Button>
              </div>
            </div>
          </Card>
      </section>
      <section className="max-w-6xl mx-auto px-4 py-12">
        <Card className="p-8">
          <form onSubmit={handleSearch} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Enrollment Number
              </label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="e.g., 12345678"
                  value={enrollment}
                  onChange={(e) => setEnrollment(e.target.value.toUpperCase())}
                  className="flex-1"
                />
                <Button type="submit" disabled={loading} className="px-8">
                  {loading ? 'Searching...' : 'Search'}
                </Button>
              </div>
            </div>
          </form>
        </Card>

        {/* Results */}
        <div className="mt-8">
          {error && (
            <Card className="p-4 bg-red-50 border-red-200">
              <p className="text-red-800">{error}</p>
            </Card>
          )}

          {result && (
            <div>
              <SearchResultCard result={result} />
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
