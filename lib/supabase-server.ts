import { createClient } from '@supabase/supabase-js'

// Server-side Supabase client using anon key + SECURITY DEFINER functions
// No service_role key needed - all privileged operations use RPC calls
export function getSupabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new Error('Missing Supabase environment variables')
  }
  return createClient(url, key)
}

// Keep backward compatibility alias
export const getSupabaseAdmin = getSupabaseServer
