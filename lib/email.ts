import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

const FROM = process.env.EMAIL_FROM ?? 'Portal Dr. Guilherme <noreply@portal-dr-guilherme.com.br>'

export async function enviarRespostaAoContato({
  pacienteEmail,
  pacienteNome,
  assunto,
  mensagemOriginal,
  resposta,
}: {
  pacienteEmail: string
  pacienteNome: string
  assunto: string
  mensagemOriginal: string
  resposta: string
}): Promise<void> {
  if (!resend) {
    console.warn('[email] RESEND_API_KEY não configurado — e-mail não enviado.')
    return
  }

  const primeiroNome = pacienteNome.split(' ')[0]

  await resend.emails.send({
    from: FROM,
    to:   pacienteEmail,
    subject: `Re: ${assunto} — Portal Dr. Guilherme`,
    html: `
      <div style="font-family: Inter, system-ui, sans-serif; max-width: 560px; margin: 0 auto; color: #1f2937;">

        <div style="background: #1a3a5c; padding: 24px 32px; border-radius: 12px 12px 0 0;">
          <p style="margin: 0; color: #fff; font-size: 14px; font-weight: 600;">Portal Dr. Guilherme</p>
        </div>

        <div style="background: #f9fafb; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">

          <p style="margin: 0 0 16px; font-size: 15px; color: #374151;">
            Olá, <strong>${primeiroNome}</strong>! 👋
          </p>
          <p style="margin: 0 0 24px; font-size: 14px; color: #6b7280; line-height: 1.6;">
            O Dr. Guilherme respondeu à sua solicitação <em>"${assunto}"</em> no portal.
          </p>

          <div style="background: #fff; border: 1px solid #e5e7eb; border-left: 3px solid #1a3a5c; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px;">
            <p style="margin: 0 0 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af;">Resposta do consultório</p>
            <p style="margin: 0; font-size: 14px; color: #1f2937; line-height: 1.7; white-space: pre-wrap;">${resposta}</p>
          </div>

          <details style="margin-bottom: 24px;">
            <summary style="font-size: 12px; color: #9ca3af; cursor: pointer;">Sua mensagem original</summary>
            <div style="margin-top: 8px; padding: 12px 16px; background: #f3f4f6; border-radius: 6px; font-size: 13px; color: #6b7280; line-height: 1.6; white-space: pre-wrap;">${mensagemOriginal}</div>
          </details>

          <p style="margin: 0; font-size: 13px; color: #9ca3af; line-height: 1.5;">
            Em caso de dúvidas, entre em contato pelo WhatsApp
            <a href="https://wa.me/5511934544550" style="color: #1a3a5c;">+55 11 93454-4550</a>
            ou acesse o portal.
          </p>
        </div>

        <p style="text-align: center; margin: 16px 0 0; font-size: 11px; color: #d1d5db;">
          Portal Dr. Guilherme · Rua Barata Ribeiro, 190 · São Paulo, SP
        </p>
      </div>
    `,
  })
}
