# GGSIPU Marks - MVP

A full-stack web application for GGSIPU students to search and view their academic marks, with a leaderboard for competitive rankings.

## Features

### Public Interface
- **Search Page** (`/`) - Students can search for their marks by enrollment number
- **Leaderboard** (`/leaderboard`) - View top performers, filterable by semester and subject
- **Result Cards** - Display detailed marks by semester for each student

### Admin Interface
- **Authentication** - Admin login at `/sign-in` and `/sign-up` with email/password
- **Admin Dashboard** (`/admin`) - Upload PDF results and seed database with student marks

## Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes, Server Actions
- **Database**: PostgreSQL (Neon) with Drizzle ORM
- **Authentication**: Better Auth with email/password
- **PDF Processing**: pdf-parse (for future enhancement)

## Database Schema

### Core Tables
- `user` - Admin users (Better Auth)
- `session` - Active sessions (Better Auth)
- `account` - Account data (Better Auth)
- `verification` - Email verification (Better Auth)

### Application Tables
- `institutes` - Educational institutions
- `programmes` - Degree programs
- `students` - Student records with enrollment number
- `marks` - Academic marks by semester and subject
- `pdf_uploads` - Tracking of uploaded PDF files

## Getting Started

### Prerequisites
- Node.js 18+
- Neon PostgreSQL database
- pnpm package manager

### Installation

1. Clone and install dependencies:
```bash
pnpm install
```

2. Set up environment variables in project settings:
   - `DATABASE_URL` - Provided by Neon integration
   - `BETTER_AUTH_SECRET` - Generate with: `openssl rand -base64 32`
   - `NEXT_PUBLIC_APP_URL` - Your app URL (auto-configured)

3. Start the development server:
```bash
pnpm dev
```

4. Open http://localhost:3000

## API Routes & Server Actions

### Search Action
```typescript
searchStudent(enrollmentNo: string)
// Returns student data with all marks by semester
```

### Leaderboard Action
```typescript
getLeaderboard(semester?: number, subject?: string, limit?: number)
// Returns ranked list of students by total marks
```

### Upload & Seed Action
```typescript
uploadPDFAndSeed(data: {
  semester: number
  instituteId: number
  fileName: string
  students: Array<StudentData>
})
// Processes student marks and seeds database
```

## Authentication Flow

### Sign Up
1. User navigates to `/sign-up`
2. Enters name, email, and password
3. Better Auth creates user account and session
4. User redirected to home

### Sign In
1. User navigates to `/sign-in`
2. Enters email and password
3. Session created and user redirected to admin or home

### Admin Access
- Admin dashboard at `/admin` requires authentication
- Unauthenticated users are redirected to `/sign-in`
- Session managed via HTTP-only cookies

## Pages

### Public Pages
- `/` - Home with search functionality
- `/leaderboard` - Leaderboard with filters
- `/sign-in` - Admin login
- `/sign-up` - Admin registration

### Protected Pages
- `/admin` - Admin dashboard (requires authentication)

## Data Seeding

To add test data:

1. Sign up for an admin account at `/sign-up`
2. Go to `/admin` dashboard
3. Fill in institute ID and semester
4. Upload a PDF (or use test data)
5. System processes and seeds database

Currently, the MVP seeds sample data. Production implementation would parse actual PDF files.

## Security

- Session-based authentication with Better Auth
- HTTP-only cookies for session storage
- Cross-origin protection with trusted origins
- Per-query user ID scoping (no RLS but similar protection)
- Input validation with Zod

## Future Enhancements

- [ ] Real PDF parsing with pdf-parse library
- [ ] Bulk student data import
- [ ] Email notifications
- [ ] Subject-specific leaderboards
- [ ] Historical marks tracking
- [ ] Advanced search filters
- [ ] Export results as PDF/CSV
- [ ] Mobile app
- [ ] OAuth integration

## Design

- Clean, minimalist interface
- Responsive design (mobile-first)
- Accessible with semantic HTML
- Professional color palette
- Fast load times with server-side rendering

## Development

### Project Structure
```
app/
  ├── page.tsx           # Home search page
  ├── leaderboard/       # Leaderboard page
  ├── sign-in/           # Sign-in page
  ├── sign-up/           # Sign-up page
  ├── admin/             # Admin dashboard
  ├── api/auth/          # Auth endpoints
  └── actions/           # Server actions
components/
  ├── ui/                # shadcn components
  ├── auth-form.tsx      # Shared auth form
  └── search-result-card.tsx
lib/
  ├── auth.ts            # Better Auth config
  ├── auth-client.ts     # Client auth
  ├── db/
  │   ├── index.ts       # Drizzle client
  │   └── schema.ts      # Database schema
```

### Running Tests
```bash
pnpm test
```

### Build for Production
```bash
pnpm build
pnpm start
```

## Deployment

Deploy to Vercel with one click:
1. Connect your GitHub repository
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main

## License

MIT

## Support

For issues or questions, please open a GitHub issue or contact the development team.
