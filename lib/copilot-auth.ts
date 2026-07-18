import { NextRequest } from 'next/server'

// O copilot (bot de WhatsApp) atende apenas a prática do Dr. Guilherme.
// Todo dado que ele lê/escreve é escopado a este tenant.
export const COPILOT_TENANT = process.env.COPILOT_TENANT_ID ?? 'dr_guilherme'

// Valida o secret M2M. Sem fallback hardcoded: se COPILOT_SECRET não estiver
// configurado no ambiente, nenhuma requisição é aceita.
export function isCopilotAuthorized(req: NextRequest): boolean {
  const secret = process.env.COPILOT_SECRET
  if (!secret) return false
  return req.headers.get('x-copilot-secret') === secret
}
