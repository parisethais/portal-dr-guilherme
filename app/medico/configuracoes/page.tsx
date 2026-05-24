import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getGlobalExamCatalog } from '@/app/actions/exam-catalog'
import ExamCatalogSettings from '@/components/medico/configuracoes/ExamCatalogSettings'
import DoctorProfileSettings from '@/components/medico/configuracoes/DoctorProfileSettings'
import { Settings } from 'lucide-react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function ConfiguracoesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, crm, especialidade, cpf, data_nascimento')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'medico') redirect('/medico')

  const exams = await getGlobalExamCatalog()

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 pb-7 border-b border-black/[0.06]">
        <Link
          href="/medico"
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Voltar ao painel
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(45,43,107,0.08)' }}>
            <Settings className="w-5 h-5" style={{ color: '#2D2B6B' }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Configurações</h1>
            <p className="text-gray-400 mt-0.5 text-sm">Personalize o sistema de acordo com sua prática clínica.</p>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        <DoctorProfileSettings
          initialCrm={profile?.crm ?? null}
          initialEspecialidade={profile?.especialidade ?? null}
          initialCpf={profile?.cpf ?? null}
          initialDataNascimento={profile?.data_nascimento ?? null}
        />
        <ExamCatalogSettings initialExams={exams} />
      </div>
    </div>
  )
}
