import { notFound } from 'next/navigation'
import { getPatientByCadastroToken } from '@/app/actions/cadastro-link'
import CadastroClient from './CadastroClient'

export default async function CadastroPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const patient = await getPatientByCadastroToken(token)
  if (!patient) notFound()
  return <CadastroClient token={token} patient={patient} />
}
