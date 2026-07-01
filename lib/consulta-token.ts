import { createHmac } from 'crypto'

function secret() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'fallback-dev-secret'
}

export function gerarToken(consultaId: string, acao: 'confirmar' | 'cancelar'): string {
  return createHmac('sha256', secret())
    .update(`${consultaId}:${acao}`)
    .digest('hex')
    .slice(0, 32)
}

export function validarToken(consultaId: string, acao: 'confirmar' | 'cancelar', token: string): boolean {
  if (!token || token.length !== 32) return false
  return gerarToken(consultaId, acao) === token
}

export function gerarLinksLembrete(consultaId: string, baseUrl?: string): { confirmar: string; cancelar: string } {
  const base = baseUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.meden.health'
  return {
    confirmar: `${base}/consulta/resposta?id=${consultaId}&acao=confirmar&token=${gerarToken(consultaId, 'confirmar')}`,
    cancelar:  `${base}/consulta/resposta?id=${consultaId}&acao=cancelar&token=${gerarToken(consultaId, 'cancelar')}`,
  }
}
