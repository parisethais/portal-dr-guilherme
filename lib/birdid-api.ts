/**
 * Cliente para a API BirdID/VIDaaS (VaultID)
 *
 * Env vars necessárias:
 *   BIRDID_CLIENT_ID     — client_id da aplicação (obtido com a VaultID)
 *   BIRDID_CLIENT_SECRET — client_secret da aplicação
 *   BIRDID_API_URL       — ex: https://api.birdid.com.br (produção)
 *                              ou https://apihom.birdid.com.br (staging)
 */

const API_URL       = process.env.BIRDID_API_URL       ?? 'https://apihom.birdid.com.br'
const CLIENT_ID     = process.env.BIRDID_CLIENT_ID     ?? ''
const CLIENT_SECRET = process.env.BIRDID_CLIENT_SECRET ?? ''

// SHA256 OID (hash_algorithm padrão ICP-Brasil)
const SHA256_OID = '2.16.840.1.101.3.4.2.1'

export interface BirdIdAuthResult {
  access_token:      string
  expires_in:        number
  certificate_alias: string   // ex: "NOME DO MEDICO:12345678901"
}

export interface BirdIdSignResult {
  id:            string
  raw_signature: string   // CMS detached em base64
}

/**
 * Autentica o médico via CPF + OTP do app BirdID.
 * Retorna access_token e certificate_alias.
 */
export async function birdIdAuth(params: {
  cpf: string
  otp: string
}): Promise<BirdIdAuthResult> {
  const cpfDigits = params.cpf.replace(/\D/g, '').padStart(11, '0')

  const res = await fetch(`${API_URL}/v0/oauth/pwd_authorize`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      username:      cpfDigits,
      password:      params.otp,
      grant_type:    'password',
      scope:         'signature_session',
      lifetime:      300,   // 5 minutos — suficiente para assinar o documento
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`BirdID auth falhou (${res.status}): ${body}`)
  }

  const json = await res.json()
  return {
    access_token:      json.access_token,
    expires_in:        json.expires_in,
    certificate_alias: json.certificate_alias ?? json.provider ?? '',
  }
}

/**
 * Assina um hash SHA256 com o certificado BirdID do médico.
 * Retorna a assinatura CMS detached em base64.
 */
export async function birdIdSign(params: {
  access_token:      string
  certificate_alias: string
  documentId:        string   // identificador único do documento
  hashHex:           string   // SHA256 em hexadecimal
}): Promise<string> {
  const res = await fetch(`${API_URL}/v0/oauth/signature`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${params.access_token}`,
    },
    body: JSON.stringify({
      certificate_alias: params.certificate_alias,
      hashes: [
        {
          id:               params.documentId,
          alias:            'Prontuario Medico',
          hash:             params.hashHex,
          hash_algorithm:   SHA256_OID,
          signature_format: 'CMS',   // CMS detached — CAdES-BES
        },
      ],
      include_chain: true,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`BirdID sign falhou (${res.status}): ${body}`)
  }

  const json = await res.json()
  const sig   = (json.signatures as { id: string; raw_signature: string }[])
    ?.find(s => s.id === params.documentId)

  if (!sig?.raw_signature) throw new Error('BirdID não retornou assinatura.')
  return sig.raw_signature
}
