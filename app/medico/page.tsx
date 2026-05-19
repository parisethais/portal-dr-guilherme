import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin-client'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Settings } from 'lucide-react'
import MedicoDashboard from '@/components/medico/MedicoDashboard'

export default async function MedicoPage() {
  // Auth via cookie client (sempre)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const currentRole = currentProfile?.role ?? 'medico'

  // Superadmin usa adminClient para ver todos os dados (bypassa RLS)
  // Médico/secretaria usa client normal (RLS filtra pela clínica deles)
  const db = currentRole === 'superadmin' ? createAdminClient() : supabase

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
    { data: financialEntries },
  ] = await Promise.all([
    db.from('profiles').select('*').eq('role', 'paciente').order('full_name', { ascending: true }),
    db.from('documents').select('*, patient:profiles!patient_id(*)').order('created_at', { ascending: false }),
    db.from('patient_exams').select('*').order('created_at', { ascending: false }),
    db.from('care_plans').select('*'),
    db.from('care_plan_attachments').select('*').order('created_at', { ascending: false }),
    db.from('invoices').select('*').order('issue_date', { ascending: false }),
    db.from('consultas').select('*, patient:profiles!patient_id(*)').order('data_hora', { ascending: true }),
    db.from('lab_results').select('*').order('collected_at', { ascending: false }),
    db.from('imaging_results').select('*').order('data_realizado', { ascending: false }),
    db.from('financial_entries').select('*').order('date', { ascending: false }),
  ])

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Hero */}
      <div className="mb-8 pb-7 border-b border-black/[0.06]">
        <p className="text-[10px] font-semibold tracking-[0.18em] uppercase mb-2.5" style={{ color: '#7EB8D4' }}>
          Clinical Intelligence OS
        </p>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Painel Médico</h1>
            <p className="text-gray-400 mt-1.5 text-sm font-normal">
              Gerencie pacientes, documentos e agenda.
            </p>
          </div>
          {currentRole === 'medico' && (
            <Link
              href="/medico/configuracoes"
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-100"
            >
              <Settings className="w-4 h-4" />
              Configurações
            </Link>
          )}
        </div>
      </div>

      <Suspense fallback={<div className="h-96 flex items-center justify-center text-gray-400 text-sm">Carregando...</div>}>
        <MedicoDashboard
          currentRole={currentRole}
          doctorId={user.id}
          patients={patients ?? []}
          documents={documents ?? []}
          patientExams={patientExams ?? []}
          carePlans={carePlans ?? []}
          carePlanAttachments={carePlanAttachments ?? []}
          invoices={invoices ?? []}
          consultas={consultas ?? []}
          labResults={labResults ?? []}
          imagingResults={imagingResults ?? []}
          financialEntries={(financialEntries ?? []) as any}
        />
      </Suspense>
    </div>
  )
}
