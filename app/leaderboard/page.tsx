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
import { getLeaderboard } from '@/app/actions/marks'
import Link from 'next/link'

interface LeaderboardEntry {
  rank: number
  enrollmentNo: string
  name: string
  programme: string
  totalMarks: string
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [semester, setSemester] = useState<string>('')
  const [subject, setSubject] = useState<string>('')

  useEffect(() => {
    async function loadLeaderboard() {
      try {
        setLoading(true)
        const semNum = semester ? parseInt(semester) : undefined
        const data = await getLeaderboard(semNum, subject || undefined, 100)
        setEntries(data)
      } catch (error) {
        console.error('[v0] Leaderboard load error:', error)
      } finally {
        setLoading(false)
      }
    }

    loadLeaderboard()
  }, [semester, subject])

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

      {/* Filters */}
      <section className="max-w-6xl mx-auto px-4 py-8">
        <Card className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Semester</label>
              <Select value={semester || 'all'} onValueChange={(val) => setSemester(val === 'all' ? '' : val)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Semesters" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Semesters</SelectItem>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                    <SelectItem key={sem} value={sem.toString()}>
                      Semester {sem}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Subject Code (optional)
              </label>
              <Input
                type="text"
                placeholder="Filter by subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
          </div>
        </Card>
      </section>

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
                  <th className="px-4 py-3 text-left font-semibold">Programme</th>
                  <th className="px-4 py-3 text-right font-semibold">Marks</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, idx) => (
                  <tr
                    key={idx}
                    className="border-b hover:bg-muted/50 transition-colors"
                  >
                    <td className="px-4 py-3 font-semibold text-blue-600">
                      {entry.rank}
                    </td>
                    <td className="px-4 py-3 font-mono text-sm">
                      {entry.enrollmentNo}
                    </td>
                    <td className="px-4 py-3">{entry.name}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {entry.programme}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {parseFloat(entry.totalMarks).toFixed(2)}
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
