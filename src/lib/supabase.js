import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

// Authenticated client for user operations
export const supabase = createClient(supabaseUrl, supabaseKey)

// Public client for categories (bypasses auth entirely)
export const supabasePublic = createClient(supabaseUrl, supabaseKey, {
  auth: { 
    persistSession: false, 
    autoRefreshToken: false, 
    detectSessionInUrl: false 
  }
})