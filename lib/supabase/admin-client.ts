import { createClient } from '@supabase/supabase-js'

// Cliente com service role — bypassa RLS completamente.
// Usar APENAS em server actions protegidas por assertSuperAdmin().
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurada nas variáveis de ambiente.')
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
