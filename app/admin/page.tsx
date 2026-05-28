'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import Link from 'next/link'

interface UploadState {
  loading: boolean
  error: string
  success: string
  processed: number
}

export default function AdminPage() {
  const router = useRouter()
  const [session, setSession] = useState(null as any)
  const [institute, setInstitute] = useState('')
  const [semester, setSemester] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [state, setState] = useState<UploadState>({
    loading: false,
    error: '',
    success: '',
    processed: 0,
  })

  // Check authentication on mount
  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await fetch('/api/auth/session')
        const sessionData = await response.json()
        if (!sessionData?.user) {
          router.push('/sign-in')
        } else {
          setSession(sessionData.user)
        }
      } catch (error) {
        router.push('/sign-in')
      }
    }
    checkAuth()
  }, [router])

  async function handleFileUpload(e: React.FormEvent) {
    e.preventDefault()

    if (!file || !institute || !semester) {
      setState((s) => ({
        ...s,
        error: 'Please fill all fields',
      }))
      return
    }

    setState((s) => ({
      ...s,
      loading: true,
      error: '',
      success: '',
    }))

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('instituteId', institute)
      formData.append('semester', semester)

      const response = await fetch('/api/upload-pdf', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result?.error || 'Failed to process PDF')
      }

      setState((s) => ({
        ...s,
        success: `Successfully processed ${result.processed} students`,
        processed: result.processed,
      }))

      setFile(null)
      setInstitute('')
      setSemester('')
    } catch (error: any) {
      setState((s) => ({
        ...s,
        error: error.message || 'Failed to process PDF',
      }))
    } finally {
      setState((s) => ({
        ...s,
        loading: false,
      }))
    }
  }

  if (!session) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Checking authentication...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="max-w-6xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage marks and data</p>
          </div>
          <nav className="flex gap-4 items-center">
            <p className="text-sm">{session.email}</p>
            <Link href="/">
              <Button variant="outline">Search Marks</Button>
            </Link>
            <Button
              variant="outline"
              onClick={async () => {
                await fetch('/api/auth/sign-out', { method: 'POST' })
                router.push('/')
              }}
            >
              Sign Out
            </Button>
          </nav>
        </div>
      </header>

      {/* Content */}
      <section className="max-w-2xl mx-auto px-4 py-12">
        <Card>
          <CardHeader>
            <CardTitle>Upload Marks PDF</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleFileUpload} className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Institute
                </label>
                <Input
                  type="number"
                  placeholder="Institute ID"
                  value={institute}
                  onChange={(e) => setInstitute(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Semester
                </label>
                <Select value={semester} onValueChange={setSemester}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select semester" />
                  </SelectTrigger>
                  <SelectContent>
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
                  Result File (.pdf, .csv, .txt)
                </label>
                <Input
                  type="file"
                  accept=".pdf,.csv,.txt"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  required
                />
              </div>

              {state.error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
                  {state.error}
                </div>
              )}

              {state.success && (
                <div className="p-3 bg-green-50 border border-green-200 rounded text-green-800 text-sm">
                  {state.success}
                </div>
              )}

              <Button
                type="submit"
                disabled={state.loading}
                className="w-full"
              >
                {state.loading
                  ? `Processing (${state.processed})...`
                  : 'Upload & Process'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </main>
  )
}
