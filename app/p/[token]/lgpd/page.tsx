import { getPatientByToken } from '@/app/actions/exame-upload'
import LgpdConsentClient from './LgpdConsentClient'
import { ShieldX } from 'lucide-react'

interface Props {
  params: Promise<{ token: string }>
}

export default async function LgpdConsentPage({ params }: Props) {
  const { token } = await params
  const patient = await getPatientByToken(token)

  if (!patient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center space-y-3">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <ShieldX className="w-7 h-7 text-red-500" />
          </div>
          <h1 className="text-lg font-semibold text-gray-900">Link inválido</h1>
          <p className="text-sm text-gray-500 max-w-xs">
            Este link não é válido ou expirou. Entre em contato com o consultório.
          </p>
        </div>
      </div>
    )
  }

  return (
    <LgpdConsentClient
      token={token}
      patientName={patient.full_name ?? 'Paciente'}
      alreadyAccepted={patient.lgpd_accepted}
    />
  )
}
