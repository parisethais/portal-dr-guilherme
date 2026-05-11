import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MedicoDashboard from '@/components/medico/MedicoDashboard'

export default async function MedicoPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/')

  const [
    { data: patients },
    { data: documents },
    { data: patientExams },
    { data: carePlans },
    { data: carePlanAttachments },
    { data: invoices },
    { data: consultas },
    { data: labResults },
    { data: imagingResults },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('*')
      .eq('role', 'paciente')
      .order('full_name', { ascending: true }),
    supabase
      .from('documents')
      .select('*, patient:profiles!patient_id(*)')
      .order('created_at', { ascending: false }),
    supabase
      .from('patient_exams')
      .select('*')
      .order('created_at', { ascending: false }),
    supabase
      .from('care_plans')
      .select('*'),
    supabase
      .from('care_plan_attachments')
      .select('*')
      .order('created_at', { ascending: false }),
    supabase
      .from('invoices')
      .select('*')
      .order('issue_date', { ascending: false }),
    supabase
      .from('consultas')
      .select('*, patient:profiles!patient_id(*)')
      .order('data_hora', { ascending: true }),
    supabase
      .from('lab_results')
      .select('*')
      .order('collected_at', { ascending: false }),
    supabase
      .from('imaging_results')
      .select('*')
      .order('data_realizado', { ascending: false }),
  ])

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Hero */}
      <div className="mb-8 pb-7 border-b border-black/[0.06]">
        <p className="text-[10px] font-semibold tracking-[0.18em] uppercase mb-2.5" style={{ color: '#7EB8D4' }}>
          Clinical Intelligence OS
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Painel Médico</h1>
        <p className="text-gray-400 mt-1.5 text-sm font-normal">
          Gerencie pacientes, documentos e agenda.
        </p>
      </div>

      <Suspense fallback={<div className="h-96 flex items-center justify-center text-gray-400 text-sm">Carregando...</div>}>
        <MedicoDashboard
          patients={patients ?? []}
          documents={documents ?? []}
          patientExams={patientExams ?? []}
          carePlans={carePlans ?? []}
          carePlanAttachments={carePlanAttachments ?? []}
          invoices={invoices ?? []}
          consultas={consultas ?? []}
          labResults={labResults ?? []}
          imagingResults={imagingResults ?? []}
        />
      </Suspense>
    </div>
  )
}
