/**
 * Cliente para a API BirdID/VIDaaS (VaultID)
 *
 * Env vars necessárias:
 *   BIRDID_CLIENT_ID     — client_id da aplicação (obtido com a Soluti)
 *   BIRDID_CLIENT_SECRET — client_secret da aplicação
 *   BIRDID_API_URL       — BirdID: https://api.birdid.com.br (prod)
 *                                  https://apihom.birdid.com.br (homo)
 *   VAULTID_API_URL      — VaultID: https://apicloudid.vaultid.com.br (prod)
 *                                   https://apicloudid.hom.vaultid.com.br (homo)
 */

const BIRDID_URL    = process.env.BIRDID_API_URL   ?? 'https://apihom.birdid.com.br'
const VAULTID_URL   = process.env.VAULTID_API_URL  ?? 'https://apicloudid.hom.vaultid.com.br'
const CLIENT_ID     = process.env.BIRDID_CLIENT_ID     ?? ''
const CLIENT_SECRET = process.env.BIRDID_CLIENT_SECRET ?? ''

// mantém retrocompat
const API_URL = BIRDID_URL

// SHA256 OID (hash_algorithm padrão ICP-Brasil)
const SHA256_OID = '2.16.840.1.101.3.4.2.1'

export type CloudPlatform = 'birdid' | 'vaultid'

export interface CloudDiscoveryResult {
  platform: CloudPlatform
  apiUrl:   string
}

export interface BirdIdAuthResult {
  access_token:      string
  expires_in:        number
  certificate_alias: string   // ex: "NOME DO MEDICO:12345678901"
  platform:          CloudPlatform
  apiUrl:            string
}

export interface BirdIdSignResult {
  id:            string
  raw_signature: string   // CMS detached em base64
}

/**
 * Descobre em qual nuvem (BirdID ou VaultID) o usuário tem certificado.
 * BirdID é preferencial conforme documentação Soluti.
 */
export async function userDiscovery(cpf: string): Promise<CloudDiscoveryResult | null> {
  const cpfDigits = cpf.replace(/\D/g, '').padStart(11, '0')
  const creds = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')

  const platforms: Array<{ platform: CloudPlatform; apiUrl: string }> = [
    { platform: 'birdid',  apiUrl: BIRDID_URL  },
    { platform: 'vaultid', apiUrl: VAULTID_URL },
  ]

  for (const { platform, apiUrl } of platforms) {
    try {
      const res = await fetch(
        `${apiUrl}/v0/oauth/user-discovery?cpf=${cpfDigits}`,
        {
          headers: {
            'Authorization': `Basic ${creds}`,
            'Accept': 'application/json',
          },
        }
      )
      if (!res.ok) continue
      const data = await res.json()
      // Resposta positiva: tem accounts ou has_account true
      const hasAccount =
        (Array.isArray(data.accounts) && data.accounts.length > 0) ||
        data.has_account === true ||
        data.account_exists === true
      if (hasAccount) return { platform, apiUrl }
    } catch {
      // tenta próxima plataforma
    }
  }
  return null
}

/**
 * Autentica o médico via CPF + OTP.
 * Tenta BirdID primeiro; se não encontrar, tenta VaultID.
 */
export async function birdIdAuth(params: {
  cpf:      string
  otp:      string
  apiUrl?:  string  // se já descoberto via userDiscovery
  platform?: CloudPlatform
}): Promise<BirdIdAuthResult> {
  const cpfDigits = params.cpf.replace(/\D/g, '').padStart(11, '0')
  const apiUrl    = params.apiUrl ?? BIRDID_URL
  const platform  = params.platform ?? 'birdid'

  const res = await fetch(`${apiUrl}/v0/oauth/pwd_authorize`, {
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
    platform,
    apiUrl,
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
  apiUrl?:           string   // plataforma descoberta; default BirdID
}): Promise<string> {
  const apiUrl = params.apiUrl ?? BIRDID_URL
  const res = await fetch(`${apiUrl}/v0/oauth/signature`, {
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
