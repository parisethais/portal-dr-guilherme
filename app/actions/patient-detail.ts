'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin-client'
import type { Consulta, LabResult, ImagingResult, Invoice, PatientExam, CarePlan, CarePlanAttachment, Prescricao } from '@/lib/types'

export interface PatientDetailData {
  consultas:            Consulta[]
  labResults:           LabResult[]
  imagingResults:       ImagingResult[]
  invoices:             Invoice[]
  patientExams:         PatientExam[]
  carePlans:            CarePlan[]
  carePlanAttachments:  CarePlanAttachment[]
  prescricoes:          { ativas: Prescricao[]; inativas: Prescricao[] }
}

export async function getPatientDetailData(patientId: string): Promise<PatientDetailData> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Usa adminClient se for superadmin, senão client normal (RLS)
  let db = supabase
  if (user) {
    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role === 'superadmin') db = createAdminClient()
  }

  const adminClient = createAdminClient()

  const [
    { data: consultas },
    { data: labResults },
    { data: imagingResults },
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
    db.from('lab_results')
      .select('*')
      .eq('patient_id', patientId)
      .order('collected_at', { ascending: false }),
    db.from('imaging_results')
      .select('*')
      .eq('patient_id', patientId)
      .order('data_realizado', { ascending: false }),
    db.from('invoices')
      .select('*')
      .eq('patient_id', patientId)
      .order('issue_date', { ascending: false }),
    db.from('patient_exams')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false }),
    db.from('care_plans')
      .select('*')
      .eq('patient_id', patientId),
    db.from('care_plan_attachments')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false }),
    adminClient.from('prescricoes')
      .select('*')
      .eq('patient_id', patientId)
      .order('data_inicio', { ascending: false }),
  ])

  const allPrescricoes = (prescricoesRaw ?? []) as Prescricao[]

  return {
    consultas:           consultas           ?? [],
    labResults:          labResults          ?? [],
    imagingResults:      imagingResults      ?? [],
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
