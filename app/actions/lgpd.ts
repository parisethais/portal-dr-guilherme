'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/lib/types'

export async function acceptLgpd(opts?: {
  aiConsent?: boolean
}): Promise<ActionResult> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autorizado.' }

  const now = new Date().toISOString()

  const { error } = await supabase
    .from('profiles')
    .update({
      lgpd_accepted:      true,
      lgpd_accepted_at:   now,
      lgpd_version:       '2025-06-01',
      lgpd_ai_consent:    opts?.aiConsent ?? false,
      lgpd_ai_consent_at: opts?.aiConsent ? now : null,
    })
    .eq('id', user.id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/paciente')
  return { success: true }
}
