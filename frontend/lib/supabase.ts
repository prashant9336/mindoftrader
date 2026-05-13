import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const IS_SUPABASE_CONFIGURED =
  supabaseUrl !== 'https://placeholder.supabase.co' &&
  supabaseAnonKey !== 'placeholder'

// Demo user ID for MVP (replace with auth.user().id in production)
export const DEMO_USER_ID = process.env.NEXT_PUBLIC_DEMO_USER_ID || 'demo-user-123'
