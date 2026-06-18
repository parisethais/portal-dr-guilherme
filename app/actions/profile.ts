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

// ── Paciente atualiza campos editáveis do próprio perfil ─────
export async function updatePatientOwnProfile(data: {
  phone?:         string | null
  cep?:           string | null
  endereco?:      string | null
  cidade_estado?: string | null
  nome_mae?:      string | null
  profissao?:     string | null
  cns?:           string | null
  como_conheceu?: string | null
}): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autorizado.' }

  const { error } = await supabase
    .from('profiles')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', user.id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/paciente')
  return { success: true }
}

// ── Médico/secretaria atualiza TODOS os dados do paciente ────
export async function updatePatientFull(
  patientId: string,
  data: {
    full_name?: string
    email?: string
    cpf?: string
    phone?: string
    data_nascimento?: string | null
    sexo?: 'M' | 'F' | null
    como_conheceu?: string
    cep?: string
    endereco?: string
    cidade_estado?: string
    nome_mae?: string
    profissao?: string
    cns?: string | null
    clinica?: string
    diagnostico?: string | null
    status_paciente?: StatusPaciente
    obs_secretaria?: string | null
    perfil_completo?: boolean
  }
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autorizado.' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('profiles')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', patientId)

  if (error) return { success: false, error: error.message }

  if (data.email) {
    await admin.auth.admin.updateUserById(patientId, { email: data.email })
  }

  revalidatePath('/medico')
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

// ── Gera nova senha temporária para o paciente ────────────────
export async function resetPatientPassword(
  patientId: string
): Promise<ActionResult<{ password: string }>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autorizado.' }

  const digits      = Math.floor(1000 + Math.random() * 9000)
  const newPassword = `Portal${digits}`

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.updateUserById(patientId, {
    password: newPassword,
  })

  if (error) return { success: false, error: error.message }

  return { success: true, data: { password: newPassword } }
}

// ── Atualiza retorno previsto (secretaria preenche direto na tabela) ─
export async function updateRetornoPrevisto(
  patientId: string,
  retorno_previsto: string | null,
  opts?: { consultaId?: string; notificar?: boolean }
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autorizado.' }

  const admin = createAdminClient()

  const [{ error }, { data: patient }] = await Promise.all([
    admin
      .from('profiles')
      .update({ retorno_previsto, updated_at: new Date().toISOString() })
      .eq('id', patientId),
    admin
      .from('profiles')
      .select('full_name, tenant_id')
      .eq('id', patientId)
      .single(),
  ])

  if (error) return { success: false, error: error.message }

  // Cria notificação para a secretaria quando o médico define retorno
  if (opts?.notificar && retorno_previsto && patient?.tenant_id && opts.consultaId) {
    const { criarNotificacaoRetorno } = await import('@/app/actions/notificacoes')
    await criarNotificacaoRetorno({
      tenantId:    patient.tenant_id,
      patientId,
      patientName: patient.full_name ?? 'Paciente',
      consultaId:  opts.consultaId,
      retornoData: retorno_previsto,
    }).catch(console.error)
  }

  revalidatePath('/medico')
  return { success: true }
}

// ── Atualiza só o status do paciente (para uso rápido no Panorama) ─
export async function updatePatientStatus(
  patientId: string,
  status: StatusPaciente,
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autorizado.' }

  const { error } = await supabase
    .from('profiles')
    .update({ status_paciente: status, updated_at: new Date().toISOString() })
    .eq('id', patientId)

  if (error) return { success: false, error: error.message }

  revalidatePath('/medico')
  return { success: true }
}
