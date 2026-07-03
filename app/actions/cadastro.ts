'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import type { ActionResult } from '@/lib/types'

const LGPD_ACCEPTED_AT = () => new Date().toISOString()

export async function submitCadastro(
  formData: FormData
): Promise<ActionResult<{ email: string; password: string }>> {
  const admin = createAdminClient()

  const email         = (formData.get('email')          as string)?.trim()
  const full_name     = (formData.get('full_name')       as string)?.trim()
  const cpf           = (formData.get('cpf')             as string)?.trim()
  const phone         = (formData.get('phone')           as string)?.trim()
  const data_nasc     = (formData.get('data_nascimento') as string)?.trim()
  const sexo          = (formData.get('sexo')            as string)?.trim()
  const como_conheceu = (formData.get('como_conheceu')   as string)?.trim()
  const cep           = (formData.get('cep')             as string)?.trim()
  const endereco      = (formData.get('endereco')        as string)?.trim()
  const cidade_estado = (formData.get('cidade_estado')   as string)?.trim()
  const nome_mae      = (formData.get('nome_mae')        as string)?.trim()
  const profissao     = (formData.get('profissao')       as string)?.trim()
  const cns           = (formData.get('cns')             as string)?.trim() || null
  const tenant_id     = (formData.get('tenant_id')       as string)?.trim() || 'dr_guilherme'
  const aceitouTermos = formData.get('aceita_termos') === 'true'
  const aceitouComms  = formData.get('aceita_comms')  === 'true'

  // Validação
  const required = { email, full_name, cpf, phone, data_nasc, sexo, como_conheceu, cep, endereco, cidade_estado, nome_mae, profissao }
  for (const [campo, val] of Object.entries(required)) {
    if (!val) return { success: false, error: `Preencha todos os campos obrigatórios. (faltou: ${campo})` }
  }

  // Valida formato da data: deve ser YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data_nasc)) {
    return { success: false, error: 'Selecione dia, mês e ano de nascimento.' }
  }
  if (!aceitouTermos || !aceitouComms) {
    return { success: false, error: 'Você precisa aceitar os termos para continuar.' }
  }

  // Gera senha temporária
  const digits      = Math.floor(1000 + Math.random() * 9000)
  const tempPassword = `Portal${digits}`

  // Cria o usuário no Supabase Auth
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password:      tempPassword,
    email_confirm: true,
    user_metadata: { full_name, role: 'paciente' },
  })

  if (error) {
    if (error.message.includes('already registered') || error.message.includes('already been registered')) {
      return { success: false, error: 'Este e-mail já possui cadastro no portal.' }
    }
    return { success: false, error: error.message }
  }

  // Salva todos os dados no profile
  const { error: profileError } = await admin.from('profiles').upsert({
    id:               data.user!.id,
    full_name,
    email,
    role:             'paciente',
    cpf,
    phone,
    data_nascimento:  data_nasc,
    sexo,
    como_conheceu,
    cep,
    endereco,
    cidade_estado,
    nome_mae,
    profissao,
    cns,
    perfil_completo:  true,
    lgpd_accepted:    true,
    lgpd_accepted_at: LGPD_ACCEPTED_AT(),
    tenant_id,
  }, { onConflict: 'id' })

  if (profileError) {
    console.error('[cadastro] upsert profile error:', profileError.message)
    return { success: false, error: `Usuário criado mas erro ao salvar dados: ${profileError.message}` }
  }

  // Mescla automaticamente qualquer perfil placeholder com o mesmo nome
  // (criado quando Gi agendou o paciente antes do cadastro)
  const newId = data.user!.id
  const { data: placeholders } = await admin
    .from('profiles')
    .select('id')
    .ilike('full_name', full_name)
    .eq('status_paciente', 'lead')
    .eq('tenant_id', tenant_id)
    .neq('id', newId)

  if (placeholders && placeholders.length > 0) {
    const TABELAS = [
      'consultas', 'patient_exams', 'care_plans', 'care_plan_attachments',
      'invoices', 'lab_results', 'imaging_results', 'financial_entries',
      'patient_goals', 'patient_checkins', 'patient_mrpa_sessions',
      'patient_mrpa_readings', 'patient_documents', 'prescricoes',
    ] as const

    for (const placeholder of placeholders) {
      const oldId = placeholder.id
      for (const tabela of TABELAS) {
        await admin.from(tabela).update({ patient_id: newId } as never).eq('patient_id', oldId)
      }
      await admin.from('profiles').delete().eq('id', oldId)
      await admin.auth.admin.deleteUser(oldId)
      console.log(`[cadastro] placeholder ${oldId} mesclado em ${newId} (${full_name})`)
    }
  }

  return { success: true, data: { email, password: tempPassword } }
}
