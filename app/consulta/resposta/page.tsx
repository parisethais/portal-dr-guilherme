import { createAdminClient } from '@/lib/supabase/admin'
import { validarToken } from '@/lib/consulta-token'

export default async function RespostaPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; acao?: string; token?: string }>
}) {
  const { id, acao, token } = await searchParams

  const valido =
    id && token && (acao === 'confirmar' || acao === 'cancelar') &&
    validarToken(id, acao, token)

  if (!valido) {
    return <Page title="Link inválido" msg="Este link é inválido ou já foi utilizado." emoji="⚠️" />
  }

  const admin = createAdminClient()
  const novoStatus = acao === 'confirmar' ? 'confirmada' : 'cancelada'

  const { data: consulta } = await admin
    .from('consultas')
    .select('status, data_hora')
    .eq('id', id)
    .single()

  if (!consulta) {
    return <Page title="Consulta não encontrada" msg="Não encontramos esta consulta." emoji="⚠️" />
  }

  if (consulta.status === 'cancelada' || consulta.status === 'realizada') {
    return <Page title="Consulta já encerrada" msg="Esta consulta já foi encerrada ou cancelada." emoji="ℹ️" />
  }

  await admin.from('consultas').update({ status: novoStatus }).eq('id', id)

  if (acao === 'confirmar') {
    const data = new Date(consulta.data_hora).toLocaleDateString('pt-BR', {
      weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo',
    })
    const hora = new Date(consulta.data_hora).toLocaleTimeString('pt-BR', {
      hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
    })
    return <Page title="Consulta confirmada!" msg={`Ótimo! Aguardamos você na ${data} às ${hora}. 😊`} emoji="✅" />
  }

  return <Page title="Consulta cancelada" msg="Consulta cancelada com sucesso. Obrigado por nos avisar!" emoji="✅" />
}

function Page({ title, msg, emoji }: { title: string; msg: string; emoji: string }) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title} — Portal Dr. Guilherme</title>
      </head>
      <body style={{ fontFamily: 'sans-serif', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', margin: 0, background: '#f8fafc' }}>
        <div style={{ textAlign: 'center', padding: '2rem', maxWidth: 400, background: '#fff', borderRadius: 16, boxShadow: '0 2px 16px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>{emoji}</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>{title}</h1>
          <p style={{ color: '#64748b', lineHeight: 1.6 }}>{msg}</p>
        </div>
      </body>
    </html>
  )
}
