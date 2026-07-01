import { createClient } from '@/lib/supabase/server'
import { ShieldCheck, ShieldX, FileText, User, Calendar, Building2 } from 'lucide-react'

interface Props {
  params: Promise<{ id: string }>
}

export default async function VerificarDocumentoPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  // Busca pública — só documentos assinados são acessíveis via RLS
  const { data: doc } = await supabase
    .from('patient_documents')
    .select('id, title, created_at, assinado, assinado_at, medico_id, patient_id, clinic_id')
    .eq('id', id)
    .eq('assinado', true)
    .single()

  if (!doc) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full text-center">
          <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldX className="w-7 h-7 text-red-500" />
          </div>
          <h1 className="text-lg font-bold text-gray-900 mb-2">Documento não encontrado</h1>
          <p className="text-sm text-gray-500">
            Este documento não existe, não está assinado ou foi removido.
          </p>
        </div>
      </div>
    )
  }

  const [medicoRes, patientRes, clinicRes] = await Promise.all([
    supabase.from('profiles').select('full_name, crm, especialidade').eq('id', doc.medico_id).single(),
    supabase.from('profiles').select('full_name, cpf').eq('id', doc.patient_id).single(),
    supabase.from('clinics').select('name').eq('id', doc.clinic_id).single(),
  ])

  const medico  = medicoRes.data
  const patient = patientRes.data
  const clinic  = clinicRes.data

  const assinadoEm = doc.assinado_at
    ? new Date(doc.assinado_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : new Date(doc.created_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full">
        {/* Status */}
        <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-100">
          <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-green-600 uppercase tracking-wide">Documento verificado</p>
            <p className="text-sm text-gray-500 mt-0.5">Assinatura digital válida</p>
          </div>
        </div>

        {/* Document info */}
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <FileText className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-400">Documento</p>
              <p className="text-sm font-medium text-gray-900">{doc.title}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <User className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-400">Paciente</p>
              <p className="text-sm font-medium text-gray-900">{patient?.full_name ?? '—'}</p>
              {patient?.cpf && <p className="text-xs text-gray-400">CPF: {patient.cpf}</p>}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <User className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-400">Médico responsável</p>
              <p className="text-sm font-medium text-gray-900">
                {medico?.full_name ? `Dr(a). ${medico.full_name}` : '—'}
              </p>
              {medico?.crm && <p className="text-xs text-gray-400">CRM: {medico.crm}</p>}
              {medico?.especialidade && <p className="text-xs text-gray-400">{medico.especialidade}</p>}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Building2 className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-400">Estabelecimento</p>
              <p className="text-sm font-medium text-gray-900">{clinic?.name ?? '—'}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Calendar className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-400">Assinado em</p>
              <p className="text-sm font-medium text-gray-900">{assinadoEm}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-gray-100">
          <p className="text-[11px] text-gray-400 text-center">
            Verificação fornecida por <span className="font-semibold">MedEn</span> · ID: {id.slice(0, 8).toUpperCase()}
          </p>
        </div>
      </div>
    </div>
  )
}
