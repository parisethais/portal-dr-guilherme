import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getClinics } from '@/app/actions/admin'
import AdminDashboard from '@/components/admin/AdminDashboard'
import { Shield } from 'lucide-react'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('profiles').select('role, full_name').eq('id', user.id).single()

  if (profile?.role !== 'superadmin') redirect('/medico')

  const clinics = await getClinics()

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #f0f7fb 0%, #f8f9fc 60%, #f0f4ff 100%)' }}>
      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-8 pb-7 border-b border-black/[0.06]">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-indigo-100">
              <Shield className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-indigo-400">
                Super Admin
              </p>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">Painel de Administração</h1>
            </div>
          </div>
          <p className="text-gray-400 mt-1 text-sm ml-12">
            Gerencie clínicas, membros e configurações do sistema.
          </p>
        </div>

        <AdminDashboard initialClinics={clinics} />
      </div>
    </div>
  )
}
