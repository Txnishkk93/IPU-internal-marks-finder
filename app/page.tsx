'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { SearchResultCard } from '@/components/search-result-card'
import { searchStudent } from '@/app/actions/marks'
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
