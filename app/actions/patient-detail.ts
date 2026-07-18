'use server'

import { createAdminClient } from '@/lib/supabase/admin-client'
import { requireStaff, assertPatientInTenant } from '@/lib/auth-guard'
import type { Consulta, LabResult, ImagingResult, BiopsiaResult, Invoice, PatientExam, CarePlan, CarePlanAttachment, Prescricao } from '@/lib/types'

export interface PatientDetailData {
  consultas:            Consulta[]
  labResults:           LabResult[]
  imagingResults:       ImagingResult[]
  biopsiaResults:       BiopsiaResult[]
  invoices:             Invoice[]
  patientExams:         PatientExam[]
  carePlans:            CarePlan[]
  carePlanAttachments:  CarePlanAttachment[]
  prescricoes:          { ativas: Prescricao[]; inativas: Prescricao[] }
}

const EMPTY: PatientDetailData = {
  consultas: [], labResults: [], imagingResults: [], biopsiaResults: [],
  invoices: [], patientExams: [], carePlans: [], carePlanAttachments: [],
  prescricoes: { ativas: [], inativas: [] },
}

export async function getPatientDetailData(patientId: string): Promise<PatientDetailData> {
  // Somente staff, e o paciente precisa pertencer ao tenant do caller
  const ctx = await requireStaff()
  if (!ctx) return EMPTY
  if (!(await assertPatientInTenant(patientId, ctx))) return EMPTY

  // Dados clínicos só saem do banco para médico/superadmin.
  // Staff não-médico (secretária/recepcionista/administrativo) recebe apenas
  // consultas (agenda), faturas e exames administrativos.
  const clinico = ctx.role === 'medico' || ctx.role === 'superadmin'

  const adminClient = createAdminClient()
  const db = adminClient

  const [
    { data: consultas },
    { data: labResults },
    { data: imagingResults },
    { data: biopsiaResults },
    { data: invoices },
    { data: patientExams },
    { data: carePlans },
    { data: carePlanAttachments },
    { data: prescricoesRaw },
  ] = await Promise.all([
    db.from('consultas')
      .select('*')
      .eq('patient_id', patientId)
      .neq('status', 'cancelada')
      .order('data_hora', { ascending: false }),
    clinico
      ? db.from('lab_results')
          .select('*')
          .eq('patient_id', patientId)
          .order('collected_at', { ascending: false })
      : Promise.resolve({ data: [] }),
    clinico
      ? db.from('imaging_results')
          .select('*')
          .eq('patient_id', patientId)
          .order('data_realizado', { ascending: false })
      : Promise.resolve({ data: [] }),
    clinico
      ? db.from('biopsia_results')
          .select('*')
          .eq('patient_id', patientId)
          .order('data_realizado', { ascending: false })
      : Promise.resolve({ data: [] }),
    db.from('invoices')
      .select('*')
      .eq('patient_id', patientId)
      .order('issue_date', { ascending: false }),
    db.from('patient_exams')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false }),
    clinico
      ? db.from('care_plans')
          .select('*')
          .eq('patient_id', patientId)
      : Promise.resolve({ data: [] }),
    clinico
      ? db.from('care_plan_attachments')
          .select('*')
          .eq('patient_id', patientId)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
    clinico
      ? adminClient.from('prescricoes')
          .select('*')
          .eq('patient_id', patientId)
          .order('data_inicio', { ascending: false })
      : Promise.resolve({ data: [] }),
  ])

  const allPrescricoes = (prescricoesRaw ?? []) as Prescricao[]

  return {
    consultas:           consultas           ?? [],
    labResults:          labResults          ?? [],
    imagingResults:      imagingResults      ?? [],
    biopsiaResults:      biopsiaResults      ?? [],
    invoices:            invoices            ?? [],
    patientExams:        patientExams        ?? [],
    carePlans:           carePlans           ?? [],
    carePlanAttachments: carePlanAttachments ?? [],
    prescricoes: {
      ativas:   allPrescricoes.filter(p => p.ativo),
      inativas: allPrescricoes.filter(p => !p.ativo),
    },
  }
}
