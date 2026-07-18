import { createHmac } from 'crypto'

// Chave secreta por tenant para o feed iCal, derivada da service key.
// Sem env var extra: quem tem a service key consegue gerar; ninguém mais.
export function calendarFeedKey(tenantId: string): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  return createHmac('sha256', secret).update(`calendar-feed:${tenantId}`).digest('hex').slice(0, 32)
}
