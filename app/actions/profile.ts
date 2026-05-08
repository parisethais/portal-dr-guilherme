'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import type { ActionResult, StatusPaciente } from '@/lib/types'

// ── Paciente preenche o próprio perfil ────────────────────────
export async function completeProfile(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autorizado.' }

  const fields = {
    full_name:       formData.get('full_name')      as string,
    cpf:             formData.get('cpf')             as string,
    phone:           formData.get('phone')           as string,
    data_nascimento: formData.get('data_nascimento') as string,
    sexo:            formData.get('sexo')            as 'M' | 'F',
    como_conheceu:   formData.get('como_conheceu')   as string,
    cep:             formData.get('cep')             as string,
    endereco:        formData.get('endereco')        as string,
    cidade_estado:   formData.get('cidade_estado')   as string,
    nome_mae:        formData.get('nome_mae')        as string,
    profissao:       formData.get('profissao')       as string,
    cns:             formData.get('cns')             as string | null,
    perfil_completo: true,
  }

  // Validação dos obrigatórios
  const required: (keyof typeof fields)[] = [
    'full_name', 'cpf', 'phone', 'data_nascimento', 'sexo',
    'como_conheceu', 'cep', 'endereco', 'cidade_estado', 'nome_mae', 'profissao',
  ]
  for (const key of required) {
    if (!fields[key]?.toString().trim()) {
      return { success: false, error: 'Preencha todos os campos obrigatórios.' }
    }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ ...fields, cns: fields.cns?.trim() || null })
    .eq('id', user.id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/paciente')
  return { success: true }
}

// ── Secretaria/médico atualiza campos de acompanhamento ───────
export async function updatePatientTracking(
  patientId: string,
  data: {
    clinica?: string
    diagnostico?: string
    status_paciente?: StatusPaciente
    obs_secretaria?: string
  }
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autorizado.' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('profiles')
    .update(data)
    .eq('id', patientId)

  if (error) return { success: false, error: error.message }

  revalidatePath('/medico')
  return { success: true }
}
