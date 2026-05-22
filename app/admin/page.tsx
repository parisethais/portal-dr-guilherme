import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin-client'
import { redirect } from 'next/navigation'
import AdminDashboard from '@/components/admin/AdminDashboard'
import { Shield } from 'lucide-react'
import type { Clinic } from '@/app/actions/admin'

export default async function AdminPage() {
  // 1. Verifica sessão com client normal (tem cookies)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('profiles').select('role, full_name').eq('id', user.id).single()

  if (profile?.role !== 'superadmin') redirect('/medico')

  // 2. Busca dados com admin client (service role, bypassa RLS)
  const adminClient = createAdminClient()

  const { data: clinicsData, error: clinicsError } = await adminClient
    .from('clinics')
    .select('*')
    .order('created_at', { ascending: false })

  if (clinicsError) console.error('[AdminPage] clinics error:', clinicsError)

  const { data: membersData } = await adminClient
    .from('clinic_members')
    .select('clinic_id')

  const countByClinic: Record<string, number> = {}
  for (const m of membersData ?? []) {
    countByClinic[m.clinic_id] = (countByClinic[m.clinic_id] ?? 0) + 1
  }

  const clinics: Clinic[] = (clinicsData ?? []).map((c: any) => ({
    ...c,
    member_count: countByClinic[c.id] ?? 0,
  }))

  return (
    <div className="min-h-screen" style={{
      background: [
        'radial-gradient(ellipse 55% 40% at 95% 5%,  rgba(122,158,126,0.1) 0%, transparent 60%)',
        'radial-gradient(ellipse 45% 38% at 3%  95%, rgba(45,43,107,0.06) 0%, transparent 55%)',
        '#F5F0E8',
      ].join(','),
    }}>
      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-8 pb-7 border-b border-black/[0.06]">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(45,43,107,0.1)' }}>
              <Shield className="w-5 h-5" style={{ color: '#2D2B6B' }} />
            </div>
            <div>
              <p className="text-[10px] font-semibold tracking-[0.18em] uppercase" style={{ color: 'rgba(45,43,107,0.4)' }}>
                Super Admin
              </p>
              <h1 className="text-2xl font-bold tracking-tight font-display" style={{ color: '#2D2B6B' }}>Painel de Administração</h1>
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
