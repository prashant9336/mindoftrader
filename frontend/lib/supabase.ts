// Supabase removed — database is now Vercel Postgres (lib/db.ts)
// This file kept only to avoid breaking any existing imports.

export const IS_SUPABASE_CONFIGURED = false

// Demo user UUID — must exist in the users table
export const DEMO_USER_ID =
  process.env.NEXT_PUBLIC_DEMO_USER_ID || '00000000-0000-0000-0000-000000000001'
