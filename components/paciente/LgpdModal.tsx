'use client'

import { useState, useTransition } from 'react'
import { acceptLgpd } from '@/app/actions/lgpd'
import Button from '@/components/ui/Button'
import { ShieldCheck, AlertTriangle } from 'lucide-react'

const LGPD_UPDATED_AT = '01 de junho de 2025'
const LGPD_VERSION    = '2025-06-01'

export default function LgpdModal() {
  const [acceptedTerms, setAcceptedTerms]  = useState(false)
  const [acceptedComms, setAcceptedComms]  = useState(false)
  const [acceptedAI,    setAcceptedAI]     = useState(false)
  const [error, setError]                  = useState('')
  const [isPending, startTransition]       = useTransition()

  const allAccepted = acceptedTerms && acceptedComms

  function handleAccept() {
    if (!allAccepted) {
      setError('Você precisa marcar as duas primeiras caixas para continuar.')
      return
    }
    startTransition(async () => {
      const result = await acceptLgpd({ aiConsent: acceptedAI })
      if (!result.success) setError(result.error)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Termos de Uso e Política de Privacidade</h2>
              <p className="text-xs text-gray-500">Portal Dr. Guilherme · Última atualização: {LGPD_UPDATED_AT}</p>
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-sm text-gray-700 leading-relaxed">

          <p>
            O presente documento reúne os Termos de Uso e a Política de Privacidade do Portal Dr. Guilherme,
            plataforma digital de apoio ao atendimento médico, destinada exclusivamente à comunicação entre
            o consultório e seus pacientes.
          </p>
          <p>
            Ao acessar e utilizar o Portal, o paciente declara estar ciente das condições abaixo, especialmente
            quanto ao tratamento de seus dados pessoais e dados pessoais sensíveis de saúde, nos termos da
            Lei Geral de Proteção de Dados Pessoais — LGPD.
          </p>

          <hr className="border-gray-100" />

          <section>
            <h3 className="font-semibold text-gray-900 mb-2">1. Sobre o Portal</h3>
            <p>
              O Portal Dr. Guilherme é uma plataforma digital de apoio ao atendimento médico, criada para
              facilitar a comunicação entre o consultório e seus pacientes.
            </p>
            <p className="mt-2">
              Por meio do Portal, poderão ser disponibilizados documentos médicos, orientações, receitas,
              laudos, solicitações de contato, mensagens e demais informações relacionadas ao acompanhamento
              do paciente.
            </p>
            <p className="mt-2">
              O Portal <strong>não substitui</strong> consulta médica, atendimento presencial, avaliação
              clínica, serviços de urgência ou emergência, nem deve ser utilizado para situações que exijam
              atendimento médico imediato.
            </p>
            <p className="mt-2">
              Em caso de urgência ou emergência, o paciente deverá procurar atendimento presencial imediato,
              pronto-socorro, hospital ou serviço de emergência adequado.
            </p>
          </section>

          <hr className="border-gray-100" />

          <section>
            <h3 className="font-semibold text-gray-900 mb-2">2. Controlador dos Dados</h3>
            <p>Para fins da LGPD, o controlador dos dados pessoais tratados no Portal é:</p>
            <ul className="mt-2 space-y-0.5 not-prose">
              <li><strong>Dr. Guilherme Parise Santa Catharina</strong> / Consultório Dr. Guilherme</li>
              <li>E-mail: <a href="mailto:guilherme@santacatharina.com.br" className="text-primary underline">guilherme@santacatharina.com.br</a></li>
              <li>Telefone/WhatsApp: <a href="tel:+5511934544550" className="text-primary underline">+55 11 93454-4550</a></li>
              <li>Rua Barata Ribeiro, 190 · Cj 32/33 · Cerqueira César · São Paulo, SP</li>
            </ul>
          </section>

          <hr className="border-gray-100" />

          <section>
            <h3 className="font-semibold text-gray-900 mb-2">3. Dados Pessoais Tratados</h3>
            <p>Para viabilizar o atendimento e a comunicação, poderão ser tratados os seguintes dados:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Nome completo, e-mail, telefone e CPF (quando fornecido)</li>
              <li>Data de nascimento e dados de identificação do paciente</li>
              <li>Mensagens enviadas pelo paciente à equipe médica</li>
              <li>Solicitações de contato, retorno ou envio de documentos</li>
              <li>Documentos médicos compartilhados pelo consultório ou pelo paciente</li>
              <li>Receitas, laudos, exames, relatórios, orientações médicas e outros documentos do atendimento</li>
              <li>Registros de acesso e uso do Portal, quando necessários para segurança e funcionamento</li>
            </ul>
            <p className="mt-2">
              Alguns desses dados podem ser classificados como dados pessoais sensíveis, especialmente
              aqueles relacionados à saúde do paciente.
            </p>
          </section>

          <hr className="border-gray-100" />

          <section>
            <h3 className="font-semibold text-gray-900 mb-2">4. Finalidades do Tratamento</h3>
            <p>Os dados serão tratados exclusivamente para:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Identificação do paciente e comunicação com o consultório</li>
              <li>Envio e disponibilização de documentos médicos</li>
              <li>Compartilhamento de receitas, laudos, exames e orientações</li>
              <li>Registro de solicitações de contato e retorno</li>
              <li>Organização administrativa do atendimento e continuidade do cuidado</li>
              <li>Cumprimento de obrigações legais, regulatórias, éticas e profissionais</li>
              <li>Segurança da informação, controle de acesso e prevenção a acessos indevidos</li>
              <li>Exercício regular de direitos em processos administrativos, judiciais ou arbitrais</li>
            </ul>
          </section>

          <hr className="border-gray-100" />

          <section>
            <h3 className="font-semibold text-gray-900 mb-2">5. Bases Legais para Tratamento</h3>
            <p>O tratamento poderá ocorrer com base nas hipóteses previstas na LGPD, incluindo:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Consentimento do titular</li>
              <li>Cumprimento de obrigação legal ou regulatória</li>
              <li>Execução de contrato ou procedimentos preliminares relacionados ao serviço</li>
              <li>Exercício regular de direitos</li>
              <li>Tutela da saúde, em procedimento realizado por profissional de saúde</li>
              <li>Proteção da vida ou da incolumidade física</li>
              <li>Legítimo interesse, quando aplicável</li>
            </ul>
          </section>

          <hr className="border-gray-100" />

          <section>
            <h3 className="font-semibold text-gray-900 mb-2">6. Compartilhamento de Dados</h3>
            <p>
              O Portal Dr. Guilherme <strong>não comercializa</strong> dados pessoais dos pacientes.
              Os dados poderão ser compartilhados com os seguintes fornecedores de tecnologia, que atuam como suboperadores e estão sujeitos a obrigações de confidencialidade e proteção de dados:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Supabase Inc.</strong> (EUA) — banco de dados e armazenamento de arquivos</li>
              <li><strong>Vercel Inc.</strong> (EUA) — hospedagem e infraestrutura da aplicação</li>
              <li><strong>Anthropic PBC</strong> (EUA) — inteligência artificial para interpretação de exames e laudos, mediante consentimento específico do paciente</li>
              <li><strong>Memed</strong> (Brasil) — emissão de prescrições eletrônicas</li>
              <li><strong>Google LLC</strong> (EUA) — sincronização de agenda, quando habilitado pelo consultório</li>
              <li><strong>Meta Platforms / WhatsApp</strong> (EUA) — comunicação via WhatsApp Business, quando habilitado</li>
            </ul>
            <p className="mt-2">
              Os dados também poderão ser compartilhados para cumprimento de obrigações legais ou determinações de autoridades competentes.
            </p>
          </section>

          <hr className="border-gray-100" />

          <section>
            <h3 className="font-semibold text-gray-900 mb-2">7. Segurança da Informação</h3>
            <p>
              O Portal adota medidas técnicas e organizacionais para proteger os dados contra acessos não
              autorizados, perda, alteração ou divulgação indevida, incluindo controle de acesso por usuário
              e senha, restrição de acesso por perfil, criptografia, registro de acessos e armazenamento
              em ambientes protegidos.
            </p>
            <p className="mt-2">
              O paciente também deve manter suas credenciais em sigilo e não compartilhar sua senha com terceiros.
            </p>
          </section>

          <hr className="border-gray-100" />

          <section>
            <h3 className="font-semibold text-gray-900 mb-2">8. Guarda e Retenção dos Dados</h3>
            <p>
              Os dados serão mantidos pelo período necessário para cumprir as finalidades descritas,
              incluindo obrigações legais, regulatórias, éticas e profissionais. Documentos médicos e
              registros do atendimento poderão ser mantidos conforme prazos exigidos pela legislação
              aplicável e normas dos órgãos profissionais competentes.
            </p>
          </section>

          <hr className="border-gray-100" />

          <section>
            <h3 className="font-semibold text-gray-900 mb-2">9. Direitos do Titular dos Dados</h3>
            <p>Nos termos da LGPD, o paciente poderá solicitar:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Confirmação da existência de tratamento e acesso aos dados</li>
              <li>Correção de dados incompletos, inexatos ou desatualizados</li>
              <li>Anonimização, bloqueio ou eliminação de dados desnecessários</li>
              <li>Portabilidade dos dados, quando aplicável</li>
              <li>Revogação do consentimento</li>
              <li>Informação sobre compartilhamento de dados</li>
            </ul>
            <p className="mt-2">
              Para exercer seus direitos, entre em contato pelo canal indicado nesta Política.
            </p>
          </section>

          <hr className="border-gray-100" />

          <section>
            <h3 className="font-semibold text-gray-900 mb-2">10. Responsabilidades do Paciente</h3>
            <p>Ao utilizar o Portal, o paciente se compromete a:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Fornecer informações verdadeiras, completas e atualizadas</li>
              <li>Manter seus dados de acesso em sigilo e não compartilhar sua senha</li>
              <li>Utilizar o Portal apenas para finalidades relacionadas ao seu atendimento</li>
              <li>Comunicar ao consultório caso identifique acesso indevido ou uso não autorizado da conta</li>
            </ul>
          </section>

          <hr className="border-gray-100" />

          <section>
            <h3 className="font-semibold text-gray-900 mb-2">11. Limitações do Portal</h3>
            <p>O Portal <strong>não se destina</strong> a atendimento de urgência ou emergência,
            substituição de consulta médica, emissão automática de diagnóstico ou comunicação de sintomas
            que exijam avaliação médica urgente.</p>
            <p className="mt-2">
              O uso do Portal não garante disponibilidade ininterrupta, podendo haver indisponibilidades
              temporárias por manutenção, falhas técnicas ou motivos de força maior.
            </p>
          </section>

          <hr className="border-gray-100" />

          <section>
            <h3 className="font-semibold text-gray-900 mb-2">12. Alterações nesta Política</h3>
            <p>
              Esta Política poderá ser atualizada periodicamente. A versão vigente estará sempre disponível
              no Portal com a data da última atualização. O uso contínuo do Portal após alterações representa
              ciência em relação à versão vigente.
            </p>
          </section>

          <hr className="border-gray-100" />

          <section>
            <h3 className="font-semibold text-gray-900 mb-2">13. Canal de Contato</h3>
            <p>Em caso de dúvidas sobre esta Política ou para exercício dos direitos previstos na LGPD:</p>
            <ul className="mt-2 space-y-0.5">
              <li>E-mail: <a href="mailto:guilherme@santacatharina.com.br" className="text-primary underline">guilherme@santacatharina.com.br</a></li>
              <li>Telefone/WhatsApp: <a href="tel:+5511934544550" className="text-primary underline">+55 11 93454-4550</a></li>
              <li>Responsável: Consultório Dr. Guilherme</li>
            </ul>
          </section>

        </div>

        {/* Footer com checkboxes e aceite */}
        <div className="p-6 border-t border-gray-100 space-y-4 flex-shrink-0">

          {/* Aviso de emergência */}
          <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 leading-relaxed">
              O Portal Dr. Guilherme é destinado exclusivamente ao apoio à comunicação entre consultório
              e paciente. <strong>Este canal não deve ser utilizado para urgências ou emergências médicas.</strong>{' '}
              Em caso de emergência, procure atendimento presencial imediato ou serviço de emergência.
            </p>
          </div>

          {/* Checkbox 1 — obrigatório */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => { setAcceptedTerms(e.target.checked); setError('') }}
              className="mt-0.5 w-4 h-4 accent-primary flex-shrink-0"
            />
            <span className="text-xs text-gray-700 leading-relaxed">
              Li integralmente e aceito os Termos de Uso e a Política de Privacidade do Portal Dr. Guilherme.
              Declaro estar ciente de que meus dados pessoais, incluindo dados pessoais sensíveis de saúde,
              poderão ser tratados para fins de atendimento médico, comunicação com o consultório,
              compartilhamento de documentos médicos, cumprimento de obrigações legais, guarda de registros
              e gestão do relacionamento paciente-médico, conforme descrito na Política de Privacidade.
              Quando aplicável, autorizo o tratamento desses dados nos termos informados.
            </span>
          </label>

          {/* Checkbox 2 — obrigatório */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={acceptedComms}
              onChange={(e) => { setAcceptedComms(e.target.checked); setError('') }}
              className="mt-0.5 w-4 h-4 accent-primary flex-shrink-0"
            />
            <span className="text-xs text-gray-700 leading-relaxed">
              Autorizo o recebimento de comunicações do consultório por Portal, e-mail, telefone ou
              WhatsApp, exclusivamente para assuntos relacionados ao meu atendimento, envio de documentos,
              orientações médicas, solicitações de contato e comunicações administrativas do consultório.
            </span>
          </label>

          {/* Checkbox 3 — opcional: consentimento para IA */}
          <label className="flex items-start gap-3 cursor-pointer p-3 bg-blue-50/60 border border-primary/15 rounded-xl">
            <input
              type="checkbox"
              checked={acceptedAI}
              onChange={(e) => { setAcceptedAI(e.target.checked); setError('') }}
              className="mt-0.5 w-4 h-4 accent-primary flex-shrink-0"
            />
            <span className="text-xs text-gray-700 leading-relaxed">
              <strong>(Opcional)</strong> Autorizo o uso de inteligência artificial (Anthropic Claude) para auxiliar na interpretação dos meus dados clínicos, como resultados de exames e laudos, com o objetivo de apoiar o meu atendimento médico. Estou ciente de que esses dados poderão ser processados em servidores nos Estados Unidos e que posso revogar este consentimento a qualquer momento.
            </span>
          </label>

          {error && (
            <p className="text-xs text-red-600">{error}</p>
          )}

          <Button
            onClick={handleAccept}
            loading={isPending}
            disabled={!allAccepted}
            className="w-full"
            size="lg"
          >
            <ShieldCheck className="w-4 h-4" />
            Aceitar e Acessar o Portal
          </Button>
        </div>

      </div>
    </div>
  )
}
