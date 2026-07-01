import CadastroForm from './CadastroForm'

export const metadata = {
  title: 'Cadastro de Paciente — Portal Dr. Guilherme',
}

export default async function CadastroPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>
}) {
  const { t } = await searchParams
  return <CadastroForm tenantId={t ?? 'dr_guilherme'} />
}
