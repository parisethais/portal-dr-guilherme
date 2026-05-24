'use server'

import { createClient } from '@/lib/supabase/server'

interface DoctorProfileInput {
  crm:             string
  especialidade:   string
  dataNascimento?: string | null  // YYYY-MM-DD
}

export async function saveDoctorProfile(input: DoctorProfileInput): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  const { error } = await supabase
    .from('profiles')
    .update({
      crm:             input.crm.trim()           || null,
      especialidade:   input.especialidade.trim()  || null,
      data_nascimento: input.dataNascimento?.trim() || null,
      // Limpa o token cacheado para forçar reautenticação com dados novos
      memed_token:    null,
      memed_token_at: null,
    })
    .eq('id', user.id)

  if (error) return { error: error.message }
  return {}
}
