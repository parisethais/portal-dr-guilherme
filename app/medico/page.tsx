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
    { data: requests },
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
      .from('contact_requests')
      .select('*, patient:profiles!patient_id(*)')
      .order('created_at', { ascending: false }),
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

  const pendingRequests = (requests ?? []).filter((r) => r.status === 'pendente').length
  const consultasHoje = (consultas ?? []).filter((c) => {
    const hoje = new Date()
    const dataConsulta = new Date(c.data_hora)
    return (
      dataConsulta.getDate() === hoje.getDate() &&
      dataConsulta.getMonth() === hoje.getMonth() &&
      dataConsulta.getFullYear() === hoje.getFullYear() &&
      c.status !== 'cancelada'
    )
  }).length

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Cabeçalho */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Painel Médico</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Gerencie pacientes, documentos, mensagens e solicitações de contato.
        </p>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Pacientes',    value: (patients ?? []).length,  color: 'bg-blue-50 text-primary' },
          { label: 'Consultas hoje', value: consultasHoje,           color: 'bg-emerald-50 text-emerald-700' },
          { label: 'Solicitações', value: (requests ?? []).length,  color: 'bg-orange-50 text-orange-700' },
          {
            label: 'Pendentes',
            value: pendingRequests,
            color: pendingRequests > 0 ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700',
          },
        ].map((card) => (
          <div key={card.label} className={`rounded-xl p-4 ${card.color}`}>
            <p className="text-2xl font-bold">{card.value}</p>
            <p className="text-sm opacity-80 mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      <MedicoDashboard
        patients={patients ?? []}
        requests={requests ?? []}
        documents={documents ?? []}
        patientExams={patientExams ?? []}
        carePlans={carePlans ?? []}
        carePlanAttachments={carePlanAttachments ?? []}
        invoices={invoices ?? []}
        consultas={consultas ?? []}
        labResults={labResults ?? []}
        imagingResults={imagingResults ?? []}
        pendingCount={pendingRequests}
      />
    </div>
  )
}
