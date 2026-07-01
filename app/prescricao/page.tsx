import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MemedPopup from '@/components/medico/prontuario/MemedPopup'

export default async function PrescricaoPage({
  searchParams,
}: {
  searchParams: Promise<{
    patientId?: string
    name?: string
    consultaId?: string
    cpf?: string
    phone?: string
    birthday?: string
    gender?: string
  }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const p = await searchParams

  return (
    <MemedPopup
      patientId={p.patientId ?? ''}
      consultaId={p.consultaId ?? null}
      patientName={p.name ?? 'Paciente'}
      patientCpf={p.cpf ?? null}
      patientPhone={p.phone ?? null}
      patientBirthday={p.birthday ?? null}
      patientGender={(p.gender as 'M' | 'F' | null) ?? null}
    />
  )
}
