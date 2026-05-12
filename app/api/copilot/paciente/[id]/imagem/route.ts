import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const SECRET = process.env.COPILOT_SECRET ?? 'copilot2026guilherme'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (req.headers.get('x-copilot-secret') !== SECRET) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const { id } = await params
  const admin = createAdminClient()

  // Verifica que o paciente existe
  const { data: paciente, error: pErr } = await admin
    .from('profiles')
    .select('id, full_name')
    .eq('id', id)
    .eq('role', 'paciente')
    .single()

  if (pErr || !paciente) {
    return NextResponse.json({ error: 'Paciente não encontrado.' }, { status: 404 })
  }

  // Busca todos os exames de imagem
  const { data: imaging, error: iErr } = await admin
    .from('imaging_results')
    .select('id, tipo, data_realizado, laudo_resumido, file_name, file_url, created_at')
    .eq('patient_id', id)
    .order('data_realizado', { ascending: false })

  if (iErr) {
    return NextResponse.json({ error: iErr.message }, { status: 500 })
  }

  return NextResponse.json({
    paciente: { id: paciente.id, nome: paciente.full_name },
    total: (imaging ?? []).length,
    exames: (imaging ?? []).map(e => ({
      id:             e.id,
      tipo:           e.tipo,
      data_realizado: e.data_realizado,
      laudo_resumido: e.laudo_resumido,
      arquivo:        e.file_name,
      url:            e.file_url,
    })),
  })
}
