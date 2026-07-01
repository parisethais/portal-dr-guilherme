'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin-client'

export interface ConsultationTypeDB {
  id: string
  slug: string
  name: string
  duration_min: number
  default_value: number
  color: string
  active: boolean
  sort_order: number
}

/**
 * Mapeia o nome do tipo de consulta para o slug usado em consultas.tipo.
 * Usado enquanto a coluna `slug` não existe no banco (migration 012 pendente).
 */
const NAME_TO_SLUG: Record<string, string> = {
  'Primeira Consulta':            'primeira_consulta',
  'Nova Consulta':                'nova_consulta',
  'Retorno':                      'retorno',
  'Primeira Consulta (Desconto)': 'primeira_consulta_desconto',
  'Primeira Consulta Desconto':   'primeira_consulta_desconto',
  'Nova Consulta (Desconto)':     'nova_consulta_desconto',
  'Nova Consulta Desconto':       'nova_consulta_desconto',
  'Reunião':                      'reuniao',
  'Reuniao':                      'reuniao',
}

/**
 * Busca os tipos de consulta ativos da clínica do usuário atual.
 * - Superadmin: usa adminClient (bypassa RLS) — retorna tipos de todas as clínicas
 * - Médico / secretária: usa client normal (RLS filtra pela clínica via clinic_members)
 *
 * Nota: a coluna `slug` é adicionada pela migration 012. Enquanto não existir,
 * o slug é derivado do campo `name` via NAME_TO_SLUG.
 */
export async function getConsultationTypes(): Promise<ConsultationTypeDB[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const db = profile?.role === 'superadmin' ? createAdminClient() : supabase

  const { data, error } = await db
    .from('clinic_consultation_types')
    .select('id, name, duration_min, default_value, color, active, sort_order')
    .eq('active', true)
    .order('sort_order')

  if (error) {
    console.error('[getConsultationTypes]', error)
    return []
  }

  // Deriva slug do nome (futuramente virá direto do DB após migration 012)
  const types: ConsultationTypeDB[] = (data ?? [])
    .map((row: any) => ({
      ...row,
      slug: row.slug ?? NAME_TO_SLUG[row.name] ?? null,
    }))
    .filter((row: any) => !!row.slug)  // ignora tipos sem slug mapeado (ex: Urgência antiga)

  return types
}
