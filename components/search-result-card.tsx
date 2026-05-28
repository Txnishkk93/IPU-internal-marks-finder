import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Mark {
  semester: number
  subject: string
  code: string
  totalMarks: string | number
}

interface StudentResult {
  id: number
  enrollmentNo: string
  name: string
  programme: string
  marks: Mark[]
}

interface SearchResultCardProps {
  result: StudentResult
}

export function SearchResultCard({ result }: SearchResultCardProps) {
  if (!result) return null

  // Group marks by semester
  const marksBySemester = result.marks.reduce(
    (acc, mark) => {
      if (!acc[mark.semester]) acc[mark.semester] = []
      acc[mark.semester].push(mark)
      return acc
    },
    {} as Record<number, Mark[]>
  )

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg">{result.name}</CardTitle>
        <p className="text-sm text-muted-foreground">
          Enrollment: {result.enrollmentNo}
        </p>
        <p className="text-sm text-muted-foreground">{result.programme}</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Object.entries(marksBySemester).map(([semester, semMarks]) => (
            <div key={semester} className="border-t pt-3">
              <h3 className="font-semibold text-sm mb-2">Semester {semester}</h3>
              <div className="space-y-2">
                {semMarks.map((mark, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center text-sm"
                  >
                    <div>
                      <p className="font-medium">{mark.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        {mark.code}
                      </p>
                    </div>
                    <p className="font-semibold text-blue-600">
                      {mark.totalMarks}
                    </p>
                  </div>
                ))}
              </div>
              <p className="text-sm font-semibold mt-2 pt-2 border-t">
                Total:{' '}
                {semMarks
                  .reduce(
                    (sum, m) => sum + (parseFloat(m.totalMarks.toString()) || 0),
                    0
                  )
                  .toFixed(2)}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
