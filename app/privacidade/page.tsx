import type { Metadata } from 'next'
import Link from 'next/link'
import { ShieldCheck, ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Política de Privacidade | Portal Dr. Guilherme',
  description: 'Política de Privacidade e Termos de Uso do Portal Dr. Guilherme',
}

export default function PrivacidadePage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao Portal
          </Link>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Política de Privacidade</h1>
          </div>
          <p className="text-sm text-gray-500">
            Portal Dr. Guilherme · Última atualização: 01 de junho de 2025
          </p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 space-y-8 text-sm text-gray-700 leading-relaxed">

          <p>
            O presente documento reúne os Termos de Uso e a Política de Privacidade do Portal Dr. Guilherme,
            plataforma digital de apoio ao atendimento médico, destinada à comunicação entre o consultório
            e seus pacientes.
          </p>
          <p>
            Ao acessar e utilizar o Portal, o paciente declara estar ciente das condições abaixo,
            especialmente quanto ao tratamento de seus dados pessoais e dados pessoais sensíveis de saúde,
            nos termos da Lei Geral de Proteção de Dados Pessoais — LGPD (Lei nº 13.709/2018).
          </p>

          <hr className="border-gray-100" />

          <section className="space-y-3">
            <h2 className="font-semibold text-gray-900 text-base">1. Responsável pelo Tratamento</h2>
            <p>
              O Portal Dr. Guilherme é operado pelo <strong>Dr. Guilherme Parise Santa Catharina</strong>,
              médico nefrologista responsável pelo consultório, que atua como controlador dos dados
              pessoais dos pacientes nos termos da LGPD.
            </p>
            <p>
              A infraestrutura tecnológica do Portal é fornecida pela{' '}
              <strong>FIRM COLLECTIVE TECNOLOGIA LTDA</strong> (CNPJ: 47.276.333/0001-01),
              empresa desenvolvedora da plataforma MedEn, com sede em Campinas, São Paulo,
              que atua como operadora dos dados.
            </p>
          </section>

          <hr className="border-gray-100" />

          <section className="space-y-3">
            <h2 className="font-semibold text-gray-900 text-base">2. Dados Coletados</h2>
            <p>Para viabilizar o atendimento e a comunicação, poderão ser tratados os seguintes dados:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Nome completo, e-mail, telefone e CPF</li>
              <li>Data de nascimento e dados de identificação</li>
              <li>Dados de saúde: diagnósticos, evolução clínica, exames laboratoriais, exames de imagem, laudos, prescrições e documentos médicos</li>
              <li>Registros de acesso e uso do Portal</li>
              <li>Registros de consentimento (data e versão aceita)</li>
            </ul>
            <p>
              Dados de saúde são classificados como dados pessoais sensíveis pela LGPD e recebem
              proteção reforçada.
            </p>
          </section>

          <hr className="border-gray-100" />

          <section className="space-y-3">
            <h2 className="font-semibold text-gray-900 text-base">3. Finalidades do Tratamento</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Prestação de cuidados de saúde e comunicação com o consultório</li>
              <li>Envio e disponibilização de documentos e orientações médicas</li>
              <li>Manutenção do prontuário eletrônico conforme exigências do CFM</li>
              <li>Cumprimento de obrigações legais, regulatórias e éticas</li>
              <li>Segurança da informação e controle de acesso</li>
              <li>Apoio à interpretação clínica com inteligência artificial (mediante consentimento específico)</li>
            </ul>
          </section>

          <hr className="border-gray-100" />

          <section className="space-y-3">
            <h2 className="font-semibold text-gray-900 text-base">4. Bases Legais</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Tutela da saúde por profissional habilitado (Art. 11, II, f da LGPD)</li>
              <li>Cumprimento de obrigação legal — guarda do prontuário por 20 anos (CFM Res. 1.821/2007)</li>
              <li>Consentimento do titular para finalidades específicas (comunicações, uso de IA)</li>
              <li>Exercício regular de direitos</li>
            </ul>
          </section>

          <hr className="border-gray-100" />

          <section className="space-y-3">
            <h2 className="font-semibold text-gray-900 text-base">5. Compartilhamento com Terceiros</h2>
            <p>
              Os dados <strong>não são vendidos</strong> a terceiros. Poderão ser compartilhados com
              os seguintes fornecedores de tecnologia que operam o Portal:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left p-2 border border-gray-200 font-semibold">Fornecedor</th>
                    <th className="text-left p-2 border border-gray-200 font-semibold">Finalidade</th>
                    <th className="text-left p-2 border border-gray-200 font-semibold">País</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Supabase Inc.', 'Banco de dados e armazenamento', 'EUA'],
                    ['Vercel Inc.', 'Hospedagem da aplicação', 'EUA'],
                    ['Anthropic PBC', 'Inteligência artificial clínica (opcional)', 'EUA'],
                    ['Memed', 'Prescrições eletrônicas', 'Brasil'],
                    ['Google LLC', 'Sincronização de agenda', 'EUA'],
                    ['Meta / WhatsApp', 'Comunicação via WhatsApp Business', 'EUA'],
                  ].map(([nome, fin, pais]) => (
                    <tr key={nome}>
                      <td className="p-2 border border-gray-200 font-medium">{nome}</td>
                      <td className="p-2 border border-gray-200">{fin}</td>
                      <td className="p-2 border border-gray-200">{pais}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-500">
              Fornecedores sediados nos EUA recebem dados com base em cláusulas contratuais de proteção,
              conforme Art. 33 da LGPD.
            </p>
          </section>

          <hr className="border-gray-100" />

          <section className="space-y-3">
            <h2 className="font-semibold text-gray-900 text-base">6. Retenção de Dados</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Prontuários médicos: mínimo de 20 anos (CFM Res. 1.821/2007)</li>
              <li>Dados de cadastro: enquanto o acesso estiver ativo</li>
              <li>Registros de consentimento: 10 anos</li>
              <li>Logs de acesso: 6 meses</li>
            </ul>
          </section>

          <hr className="border-gray-100" />

          <section className="space-y-3">
            <h2 className="font-semibold text-gray-900 text-base">7. Segurança</h2>
            <p>
              Adotamos criptografia em trânsito (HTTPS/TLS), controle de acesso por perfil,
              armazenamento em ambiente seguro e assinatura digital ICP-Brasil para prontuários finalizados.
            </p>
            <p>
              Em caso de incidente de segurança, notificaremos a ANPD e os titulares afetados
              conforme Resolução CD/ANPD nº 15/2024.
            </p>
          </section>

          <hr className="border-gray-100" />

          <section className="space-y-3">
            <h2 className="font-semibold text-gray-900 text-base">8. Seus Direitos</h2>
            <p>Você tem direito a, a qualquer momento:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Confirmar a existência e acessar seus dados</li>
              <li>Corrigir dados incompletos ou desatualizados</li>
              <li>Solicitar anonimização ou eliminação de dados desnecessários</li>
              <li>Portabilidade dos dados</li>
              <li>Revogar o consentimento</li>
              <li>Obter informações sobre compartilhamento</li>
            </ul>
          </section>

          <hr className="border-gray-100" />

          <section className="space-y-3">
            <h2 className="font-semibold text-gray-900 text-base">9. Contato</h2>
            <p>Para exercer seus direitos ou esclarecer dúvidas sobre o tratamento dos seus dados:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>E-mail: <a href="mailto:guilherme@santacatharina.com.br" className="text-primary underline">guilherme@santacatharina.com.br</a></li>
              <li>Responsável: Dr. Guilherme Parise Santa Catharina</li>
              <li>Plataforma: MedEn — desenvolvida por Firm Collective Tecnologia Ltda (CNPJ: 47.276.333/0001-01)</li>
            </ul>
          </section>

        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Versão 2025-06-01 · Portal Dr. Guilherme
        </p>

      </div>
    </div>
  )
}
