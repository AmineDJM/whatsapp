import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anon) {
  // Visible, non-crashing hint during setup.
  // eslint-disable-next-line no-console
  console.warn('[WhatsApp Clone] Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Set them in .env')
}

export const supabase = createClient(url ?? 'http://localhost', anon ?? 'anon', {
  auth: { persistSession: true, autoRefreshToken: true },
  realtime: { params: { eventsPerSecond: 20 } },
})

export const isConfigured = Boolean(url && anon)
