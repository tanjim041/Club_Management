import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

let supabase: SupabaseClient<Database> | undefined

export function isSupabaseConfigured(): boolean {
  return Boolean(
    (import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_URL)
    && (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.SUPABASE_PUBLISHABLE_KEY),
  )
}

export function getSupabaseClient() {
  if (supabase) return supabase
  const url = import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to .env.local.')
  supabase = createClient<Database>(url, key, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  })
  return supabase
}
