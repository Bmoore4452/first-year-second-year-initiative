import { createClient } from '@supabase/supabase-js'

// The anon key is designed to be public. RLS (see supabase/migrations) is what
// restricts the dashboard to emails in public.admins.
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseConfigured = Boolean(url && anonKey)

// Invite and password-reset emails land on the dashboard with details in the URL hash
// (e.g. #access_token=…&type=invite, or #error_description=… if the link expired).
// Read it before createClient, which consumes the tokens and clears the hash.
const hashParams = new URLSearchParams(window.location.hash.slice(1))
export const authLink = {
  type: hashParams.get('type'),
  error: hashParams.get('error_description'),
}

export const supabase = createClient(url ?? 'http://localhost', anonKey ?? 'missing-key')

// Where invite and reset links should send people back to (must be in Supabase's Redirect URLs).
export const dashboardUrl = `${window.location.origin}${import.meta.env.BASE_URL}admin/`

export interface ResponseRow {
  id: string
  created_at: string
  name: string
  email: string
  phone: string | null
  class_year: string
  fields_of_interest: string[]
  population_interests: string[]
  academic_topics: string[]
  professional_topics: string[]
}
