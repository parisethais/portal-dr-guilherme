import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MedicoDashboard from '@/components/medico/MedicoDashboard'
import { Users, CalendarCheck, Phone, AlertTriangle } from 'lucide-react'

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
      {/* Hero */}
      <div className="mb-8 pb-7 border-b border-black/[0.06]">
        <p className="text-[10px] font-semibold tracking-[0.18em] uppercase mb-2.5" style={{ color: '#7EB8D4' }}>
          Clinical Intelligence OS
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Painel Médico</h1>
        <p className="text-gray-400 mt-1.5 text-sm font-normal">
          Gerencie pacientes, documentos, mensagens e solicitações de contato.
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          { label: 'Pacientes',      value: (patients ?? []).length, accent: 'text-primary',     bg: 'rgba(245,242,236,0.9)',  Icon: Users },
          { label: 'Consultas hoje', value: consultasHoje,           accent: 'text-emerald-600', bg: 'rgba(255,255,255,0.72)', Icon: CalendarCheck },
          { label: 'Solicitações',   value: (requests ?? []).length, accent: 'text-orange-500',  bg: 'rgba(255,255,255,0.72)', Icon: Phone },
          { label: 'Pendentes',      value: pendingRequests,         accent: pendingRequests > 0 ? 'text-red-500' : 'text-emerald-600', bg: pendingRequests > 0 ? 'rgba(254,242,242,0.82)' : 'rgba(255,255,255,0.72)', Icon: AlertTriangle },
        ].map(({ label, value, accent, bg, Icon }) => (
          <div
            key={label}
            className="rounded-2xl p-5 backdrop-blur-md border border-white/70 shadow-sm flex flex-col gap-3"
            style={{ backgroundColor: bg }}
          >
            <div className="flex items-start justify-between">
              <p className={`text-3xl font-bold tracking-tight ${accent}`}>{value}</p>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(26,31,46,0.05)' }}>
                <Icon className="w-4 h-4 text-gray-400" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-500 leading-none">{label}</p>
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
