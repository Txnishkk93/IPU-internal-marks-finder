import { Pool } from 'pg'
import { PrismaClient } from '@prisma/client'

export const pool = new Pool({ connectionString: process.env.DATABASE_URL })

// Prisma client for application DB access
export const prisma = new PrismaClient()

// Keep `db` export for compatibility (alias to prisma)
export const db = prisma
