'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin-client'
import { revalidatePath } from 'next/cache'
import { getCallerTenantId } from '@/lib/get-caller-tenant'
import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const NF_FROM = 'notas@santacatharina.com'
const NF_TO   = ['notas@sejamedeasy.com.br', 'leonardo@sejamedeasy.com.br', 'Emanuelle@sejamedeasy.com.br']

export type NotaFiscalStatus = 'nao_se_aplica' | 'a_solicitar' | 'solicitada' | 'emitida'

export interface FinancialEntry {
  id:                  string
  clinic_id:           string | null
  doctor_id:           string
  patient_id:          string | null
  scope:               'clinic' | 'personal'
  type:                'receita' | 'despesa'
  category:            string
  amount:              number
  date:                string   // YYYY-MM-DD
  description:         string | null
  payment_method:      string | null
  status:              'pago' | 'pendente' | 'cancelado'
  nota_fiscal_status:  NotaFiscalStatus
  nf_file_path:        string | null
  notes:               string | null
  created_at:          string
  updated_at:          string
}

export type EntryInput = Omit<FinancialEntry, 'id' | 'created_at' | 'updated_at'>

// ── Fetch ─────────────────────────────────────────────────────────────────

export async function getFinancialEntries(filters?: {
  from?: string   // YYYY-MM-DD
  to?:   string
  scope?: 'clinic' | 'personal' | 'all'
  type?:  'receita' | 'despesa' | 'all'
}): Promise<FinancialEntry[]> {
  const supabase = await createClient()

  let q = supabase
    .from('financial_entries')
    .select('*')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  if (filters?.from) q = q.gte('date', filters.from)
  if (filters?.to)   q = q.lte('date', filters.to)
  if (filters?.scope && filters.scope !== 'all') q = q.eq('scope', filters.scope)
  if (filters?.type  && filters.type  !== 'all') q = q.eq('type',  filters.type)

  const { data, error } = await q
  if (error) { console.error('[getFinancialEntries]', error.message); return [] }
  return data as FinancialEntry[]
}

// ── Create ────────────────────────────────────────────────────────────────

export async function createFinancialEntry(input: EntryInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  const tenantId = await getCallerTenantId(user.id)
  const db = createAdminClient()
  const { error } = await db.from('financial_entries').insert({ ...input, tenant_id: tenantId })
  if (error) return { error: error.message }
  revalidatePath('/medico')
  return { success: true }
}

// ── Update ────────────────────────────────────────────────────────────────

export async function updateFinancialEntry(id: string, input: Partial<EntryInput>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  const db = createAdminClient()
  const { error } = await db
    .from('financial_entries')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/medico')
  return { success: true }
}

// ── Delete ────────────────────────────────────────────────────────────────

export async function deleteFinancialEntry(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  const db = createAdminClient()
  const { error } = await db.from('financial_entries').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/medico')
  return { success: true }
}

// ── Notificar paciente sobre nota fiscal ──────────────────────────────────

export async function notifyPatientNota({
  patientId,
  entryDate,
  description,
  amount,
}: {
  patientId:   string
  entryDate:   string
  description: string | null
  amount:      number
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  const dateFormatted = new Date(entryDate + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
  const amountFormatted = amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const content = [
    `Olá! Sua nota fiscal referente ao atendimento de ${dateFormatted}`,
    description ? `(${description})` : null,
    `no valor de ${amountFormatted} foi solicitada ao contador e será enviada em breve por e-mail.`,
    `\nQualquer dúvida, estamos à disposição.`,
  ].filter(Boolean).join(' ')

  const tenantId = await getCallerTenantId(user.id)
  const { error } = await supabase.from('messages').insert({
    sender_id:    user.id,
    recipient_id: patientId,
    content,
    tenant_id:    tenantId,
  })

  if (error) return { error: error.message }
  revalidatePath('/medico')
  revalidatePath('/paciente')
  return { success: true }
}

// ── Configurações da clínica ──────────────────────────────────────────────

export async function upsertClinicSetting(key: string, value: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  const { data: member } = await supabase
    .from('clinic_members').select('clinic_id').eq('user_id', user.id).maybeSingle()
  if (!member?.clinic_id) return { error: 'Clínica não encontrada.' }

  const { error } = await supabase
    .from('clinic_settings')
    .upsert({ clinic_id: member.clinic_id, key, value }, { onConflict: 'clinic_id,key' })

  if (error) return { error: error.message }
  revalidatePath('/medico')
  return { success: true }
}

// ── Solicitar NF de internação: envia email + atualiza status ─────────────

export async function solicitarNFInternacao(
  internacaoId: string,
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  if (!resend) return { error: 'Serviço de e-mail não configurado.' }

  const admin = createAdminClient()
  const tenantId = await getCallerTenantId(user.id)

  // Busca internação com visitas
  const { data: internacao } = await admin
    .from('internacoes')
    .select('*, visitas_hospitalares(*)')
    .eq('id', internacaoId)
    .single()

  if (!internacao) return { error: 'Internação não encontrada.' }

  // Busca dados do paciente
  const { data: paciente } = await admin
    .from('profiles')
    .select('full_name, cpf, email')
    .eq('id', internacao.patient_id)
    .single()

  // Busca médico
  const { data: medico } = await admin
    .from('clinic_members')
    .select('profiles!user_id(full_name, crm)')
    .eq('role', 'medico')
    .limit(1)
    .maybeSingle()

  const CREDENCIAIS = 'Dr. Guilherme Parise Santa Catharina (CRM-SP 170.281 | Clínica Médica RQE 72444 / Nefrologia RQE 80434)'

  const pacienteNome  = paciente?.full_name ?? internacao.patient_name ?? '—'
  const cpfFmt        = paciente?.cpf?.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') ?? '—'
  const emailFmt      = paciente?.email ?? '—'

  const fmtDate = (d: string | null) =>
    d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '—'

  const visitas      = ((internacao as any).visitas_hospitalares ?? [])
    .sort((a: any, b: any) => a.data_visita.localeCompare(b.data_visita))
  const nVisitas     = visitas.length
  const valorUnit    = internacao.valor_visita ?? 0
  const totalCobrado = valorUnit * nVisitas
  const valorFmt     = totalCobrado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const valorUnitFmt = valorUnit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const datasVisitas = visitas.map((v: any) => fmtDate(v.data_visita)).join(', ')

  const hospitalNome = internacao.hospital_outro ?? internacao.hospital ?? '—'

  const corpo = [
    'Prezados, boa tarde.',
    '',
    'Solicito a emissão da nota fiscal conforme os dados abaixo.',
    '',
    'Obs: Não esquecer de adicionar o e-mail do paciente na hora do envio da nota, por favor.',
    '',
    'Tomador do Serviço:',
    pacienteNome,
    `CPF: ${cpfFmt}`,
    `E-mail: ${emailFmt}`,
    '',
    `Descrição: Honorários médicos referentes a avaliações médicas hospitalares em regime de internação, realizadas no Hospital ${hospitalNome}, entre os dias ${fmtDate(internacao.data_internacao)} e ${fmtDate(internacao.data_alta)}, pelo ${CREDENCIAIS}`,
    '',
    `Paciente: ${pacienteNome}`,
    `CPF: ${cpfFmt}`,
    nVisitas > 0 ? `Datas dos atendimentos: ${datasVisitas}` : null,
    `Número total de avaliações: ${nVisitas}`,
    valorUnit > 0 ? `Valor unitário por avaliação: ${valorUnitFmt}` : null,
    totalCobrado > 0 ? `Valor total: ${valorFmt}` : null,
    '',
    'Fico à disposição para esclarecimentos.',
    'Agradeço a confirmação da emissão.',
    '',
    'Atenciosamente,',
  ].filter(v => v !== null).join('\n')

  const { error: emailErr } = await resend.emails.send({
    from:    NF_FROM,
    to:      NF_TO,
    subject: `Nota Fiscal Internação — ${pacienteNome}`,
    text:    corpo,
  })

  if (emailErr) return { error: (emailErr as any).message ?? 'Erro ao enviar e-mail.' }

  // Atualiza status da internação
  await admin
    .from('internacoes')
    .update({ nf_status: 'solicitada', updated_at: new Date().toISOString() })
    .eq('id', internacaoId)

  return { success: true }
}

// ── Enviar e-mail de solicitação de NF ao contador ────────────────────────

export async function enviarEmailNFContador({
  pacienteNome,
  pacienteCpf,
  pacienteEmail,
  valor,
  dataConsulta,
}: {
  pacienteNome:  string
  pacienteCpf:   string | null
  pacienteEmail: string | null
  valor:         number
  dataConsulta:  string
}): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  if (!resend) return { error: 'Serviço de e-mail não configurado.' }

  const admin = createAdminClient()
  const tenantId = await getCallerTenantId(user.id)

  // Busca o médico da clínica diretamente no servidor (não depende do frontend)
  const { data: medico } = await admin
    .from('clinic_members')
    .select('user_id, profiles!user_id(full_name, crm)')
    .eq('role', 'medico')
    .eq('clinics.tenant_id', tenantId)
    .limit(1)
    .maybeSingle()

  const CREDENCIAIS = 'Dr. Guilherme Parise Santa Catharina (CRM-SP 170.281 | Clínica Médica RQE 72444 / Nefrologia RQE 80434)'

  const cpfFmt   = pacienteCpf?.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') ?? '—'
  const emailFmt = pacienteEmail ?? '—'
  const valorFmt = valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const dataFmt  = new Date(dataConsulta + 'T12:00:00').toLocaleDateString('pt-BR')

  const corpo = [
    'Prezados, boa tarde.',
    '',
    'Solicito a emissão da nota fiscal conforme os dados abaixo.',
    '',
    'Obs: Não esquecer de adicionar o e-mail do paciente na hora do envio da nota, por favor.',
    '',
    'Tomador do Serviço:',
    pacienteNome,
    `CPF: ${cpfFmt}`,
    `E-mail: ${emailFmt}`,
    '',
    `Descrição: Consulta médica ambulatorial realizada pelo ${CREDENCIAIS}`,
    '',
    `Paciente: ${pacienteNome}`,
    `CPF: ${cpfFmt}`,
    `Data da consulta: ${dataFmt}`,
    '',
    'Valor:',
    valorFmt,
    '',
    'Fico à disposição para esclarecimentos.',
    'Agradeço a confirmação da emissão.',
    '',
    'Atenciosamente,',
  ].join('\n')

  const { error } = await resend.emails.send({
    from:    NF_FROM,
    to:      NF_TO,
    subject: `Nota Fiscal — ${pacienteNome}`,
    text:    corpo,
  })

  if (error) return { error: (error as any).message ?? 'Erro ao enviar e-mail.' }
  return { success: true }
}
