const COPILOT_URL = process.env.COPILOT_URL || 'https://dr-copilot.onrender.com'
const COPILOT_SECRET = process.env.COPILOT_SECRET ?? ''

type EventoPortal =
  | { evento: 'consulta_agendada'; paciente: PacientePayload; consulta: { data: string; tipo: string } }
  | { evento: 'consulta_remarcada'; paciente: PacientePayload; consulta: { data_anterior: string; data_nova: string } }
  | { evento: 'exame_enviado'; paciente: PacientePayload; exame: { nome: string; url: string } }
  | { evento: 'contato_solicitado'; paciente: PacientePayload; mensagem: string }
  | { evento: 'mensagem_enviada'; paciente: PacientePayload; mensagem: string }

interface PacientePayload {
  nome: string
  telefone?: string | null
  email?: string | null
}

export async function notificarCopilot(payload: EventoPortal): Promise<void> {
  try {
    await fetch(`${COPILOT_URL}/portal/evento`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-copilot-secret': COPILOT_SECRET,
      },
      body: JSON.stringify(payload),
    })
  } catch {
    // Não bloqueia a action principal se o copilot estiver fora
  }
}
