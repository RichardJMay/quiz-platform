// lib/supabase.js
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables')
}

// helper: do NOT apply timeouts to auth endpoints
const isAuthUrl = (url) => {
  try {
    const u = typeof url === 'string' ? url : url?.toString?.()
    return u?.includes('/auth/v1/')
  } catch { return false }
}

// singletons (avoid duplicate clients in the same runtime)
let _supabase
let _supabasePublic

// AUThed client — no timeout on /auth/v1/*; multiTab off to avoid token races
export const supabase = _supabase ??= createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'sb-optibl-auth-token',  // keep your existing key
    flowType: 'pkce',
    multiTab: false,
  },
  db: { schema: 'public' },
  realtime: { params: { eventsPerSecond: 2 } },
  global: {
    fetch: (resource, init = {}) =>
      isAuthUrl(resource)
        ? fetch(resource, init) // ← no timeout for auth refresh
        : fetch(resource, { ...init, signal: AbortSignal.timeout(15000) }),
  },
})

// PUBLIC client — keep a short timeout (safe, no auth involved)
export const supabasePublic = _supabasePublic ??= createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    storageKey: 'sb-optibl-public-token',
  },
  db: { schema: 'public' },
  global: {
    fetch: (resource, init = {}) =>
      fetch(resource, { ...init, signal: AbortSignal.timeout(8000) }),
  },
})
