import { createClient } from '@supabase/supabase-js'

// Server-only client — uses service role key, bypasses RLS.
// Import this in API routes (app/api/**). Never import in client components.
const url        = process.env.NEXT_PUBLIC_SUPABASE_URL        || 'https://placeholder.supabase.co'
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY        || 'placeholder'

export const supabaseAdmin = createClient(url, serviceKey, {
  auth: { persistSession: false },
})

export const IS_ADMIN_CONFIGURED =
  url        !== 'https://placeholder.supabase.co' &&
  serviceKey !== 'placeholder'
