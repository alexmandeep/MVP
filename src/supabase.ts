import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || ''
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Disable URL session detection
    debug: false
  }
})

export interface Profile {
  id: string
  email: string
  first_name: string
  last_name: string
  role: string
  company_id: string | null
  department_id: string | null
  location_id: string | null
  team_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}