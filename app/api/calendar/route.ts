'use server'

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin-client'

// Gera feed iCal para o tenant — URL usada para sincronizar com Google Agenda / iOS
// GET /api/calendar?tid=TENANT_ID
export async function GET(req: NextRequest) {
  const tenantId = req.nextUrl.searchParams.get('tid')
  if (!tenantId) return new NextResponse('Missing tid', { status: 400 })

  const admin = createAdminClient()

  // Busca consultas do tenant (não canceladas)
  const { data: consultas, error } = await admin
    .from('consultas')
    .select('id, patient_id, tipo, local, data_hora, duracao_min, status, observacoes, patient:profiles!patient_id(full_name)')
    .eq('tenant_id', tenantId)
    .neq('status', 'cancelada')
    .order('data_hora', { ascending: true })

  if (error) return new NextResponse('Error', { status: 500 })

  const TIPO_LABEL: Record<string, string> = {
    primeira_consulta:          'Primeira Consulta',
    nova_consulta:              'Nova Consulta',
    retorno:                    'Retorno',
    primeira_consulta_desconto: 'Primeira Consulta (Desconto)',
    nova_consulta_desconto:     'Nova Consulta (Desconto)',
  }

  const LOCAL_LABEL: Record<string, string> = {
    consultorio:  'Presencial',
    telemedicina: 'Online',
  }

  function formatDT(iso: string): string {
    // Converte ISO para formato iCal: 20260622T090000
    return iso.replace(/[-:]/g, '').replace(/\.\d{3}Z$/, '').replace('Z', '')
  }

  function escapeICS(s: string): string {
    return s.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n')
  }

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Dr Guilherme Santa Catharina//Portal//PT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Consultório Dr. Guilherme',
    'X-WR-TIMEZONE:America/Sao_Paulo',
  ]

  for (const c of consultas ?? []) {
    const start  = new Date(c.data_hora)
    const end    = new Date(start.getTime() + c.duracao_min * 60_000)
    const patient = (c.patient as any)?.full_name ?? 'Paciente'
    const tipo    = TIPO_LABEL[c.tipo] ?? c.tipo
    const local   = LOCAL_LABEL[c.local] ?? c.local

    lines.push(
      'BEGIN:VEVENT',
      `DTSTART;TZID=America/Sao_Paulo:${formatDT(c.data_hora)}`,
      `DTEND;TZID=America/Sao_Paulo:${formatDT(end.toISOString())}`,
      `SUMMARY:${escapeICS(`${patient} — ${local}`)}`,
      `DESCRIPTION:${escapeICS(`${tipo}${c.observacoes ? `\n${c.observacoes}` : ''}`)}`,
      `UID:consulta-${c.id}@portal`,
      `STATUS:${c.status === 'confirmada' ? 'CONFIRMED' : 'TENTATIVE'}`,
      'END:VEVENT',
    )
  }

  lines.push('END:VCALENDAR')

  return new NextResponse(lines.join('\r\n'), {
    headers: {
      'Content-Type':        'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="agenda.ics"',
      'Cache-Control':       'no-cache',
    },
  })
}
