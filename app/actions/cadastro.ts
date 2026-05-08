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
  const aceitouTermos = formData.get('aceita_termos') === 'true'
  const aceitouComms  = formData.get('aceita_comms')  === 'true'

  // Validação
  const required = { email, full_name, cpf, phone, data_nasc, sexo, como_conheceu, cep, endereco, cidade_estado, nome_mae, profissao }
  for (const [, val] of Object.entries(required)) {
    if (!val) return { success: false, error: 'Preencha todos os campos obrigatórios.' }
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
  await admin.from('profiles').upsert({
    id:              data.user!.id,
    full_name,
    email,
    role:            'paciente',
    cpf,
    phone,
    data_nascimento: data_nasc,
    sexo,
    como_conheceu,
    cep,
    endereco,
    cidade_estado,
    nome_mae,
    profissao,
    cns,
    perfil_completo: true,
    lgpd_accepted:   true,
    lgpd_accepted_at: LGPD_ACCEPTED_AT(),
  }, { onConflict: 'id' })

  return { success: true, data: { email, password: tempPassword } }
}
