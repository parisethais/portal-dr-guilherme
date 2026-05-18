'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ExamDef } from '@/lib/lab-catalog'

// ── Tipo DB ──────────────────────────────────────────────────────────────

interface ExamCatalogRow {
  id:            string
  clinic_id:     string | null
  name:          string
  group_name:    string
  unit:          string
  alt_units:     string[] | null
  qualitative:   boolean
  normal_answer: string | null
  no_ref:        boolean
  ref_min:       number | null
  ref_max:       number | null
  warn_low:      number | null
  warn_high:     number | null
  crit_low:      number | null
  crit_high:     number | null
  higher_better: boolean
  unit_ranges:   Record<string, { refMin?: number; refMax?: number; warnLow?: number; warnHigh?: number; critLow?: number; critHigh?: number }> | null
  sort_order:    number
  active:        boolean
}

// ── Mapper DB → ExamDef ──────────────────────────────────────────────────

function rowToExamDef(row: ExamCatalogRow): ExamDef & { id: string; active: boolean } {
  return {
    id:            row.id,
    active:        row.active,
    name:          row.name,
    group:         row.group_name,
    unit:          row.unit,
    altUnits:      row.alt_units ?? undefined,
    qualitative:   row.qualitative || undefined,
    normalAnswer:  row.normal_answer ?? undefined,
    noRef:         row.no_ref || undefined,
    refMin:        row.ref_min ?? undefined,
    refMax:        row.ref_max ?? undefined,
    warnLow:       row.warn_low ?? undefined,
    warnHigh:      row.warn_high ?? undefined,
    critLow:       row.crit_low ?? undefined,
    critHigh:      row.crit_high ?? undefined,
    higherBetter:  row.higher_better || undefined,
    unitRanges:    row.unit_ranges ?? undefined,
  }
}

// ── Mapper ExamDef → DB ──────────────────────────────────────────────────

function examDefToRow(def: Partial<ExamDef> & { name: string; group: string; unit: string }, sortOrder = 0) {
  return {
    name:          def.name,
    group_name:    def.group,
    unit:          def.unit,
    alt_units:     def.altUnits ?? null,
    qualitative:   def.qualitative ?? false,
    normal_answer: def.normalAnswer ?? null,
    no_ref:        def.noRef ?? false,
    ref_min:       def.refMin ?? null,
    ref_max:       def.refMax ?? null,
    warn_low:      def.warnLow ?? null,
    warn_high:     def.warnHigh ?? null,
    crit_low:      def.critLow ?? null,
    crit_high:     def.critHigh ?? null,
    higher_better: def.higherBetter ?? false,
    unit_ranges:   def.unitRanges ?? null,
    sort_order:    sortOrder,
  }
}

// ── Fetch ─────────────────────────────────────────────────────────────────

export async function getExamCatalog(clinicId?: string | null) {
  const supabase = await createClient()

  // Busca da clínica ou global
  const query = supabase
    .from('exam_catalog')
    .select('*')
    .order('group_name')
    .order('sort_order')

  const { data, error } = clinicId
    ? await query.eq('clinic_id', clinicId)
    : await query.is('clinic_id', null)

  if (error) {
    console.error('[getExamCatalog]', error.message)
    return []
  }

  return (data as ExamCatalogRow[]).map(rowToExamDef)
}

// ── Versão para Server Components (usa catálogo global) ───────────────────

export async function getGlobalExamCatalog() {
  return getExamCatalog(null)
}

// ── Create ────────────────────────────────────────────────────────────────

export async function createExam(
  def: Omit<ExamDef, 'id'> & { name: string; group: string; unit: string },
  clinicId: string | null = null,
  sortOrder = 999,
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('exam_catalog')
    .insert({ ...examDefToRow(def, sortOrder), clinic_id: clinicId })

  if (error) return { error: error.message }
  revalidatePath('/medico/configuracoes')
  return { success: true }
}

// ── Update ────────────────────────────────────────────────────────────────

export async function updateExam(
  id: string,
  def: Partial<ExamDef> & { name: string; group: string; unit: string },
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('exam_catalog')
    .update({ ...examDefToRow(def), updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/medico/configuracoes')
  return { success: true }
}

// ── Toggle ativo ──────────────────────────────────────────────────────────

export async function toggleExamActive(id: string, active: boolean) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('exam_catalog')
    .update({ active, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/medico/configuracoes')
  return { success: true }
}

// ── Delete ────────────────────────────────────────────────────────────────

export async function deleteExam(id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('exam_catalog')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/medico/configuracoes')
  return { success: true }
}

// ── Reorder (drag-and-drop futuro) ────────────────────────────────────────

export async function reorderExams(ids: string[]) {
  const supabase = await createClient()
  const updates = ids.map((id, i) =>
    supabase.from('exam_catalog').update({ sort_order: i }).eq('id', id)
  )
  await Promise.all(updates)
  revalidatePath('/medico/configuracoes')
}
