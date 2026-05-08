'use client'

import type { Profile } from '@/lib/types'
import { User, Phone, MapPin, Heart, FileText } from 'lucide-react'

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex flex-col gap-0.5 py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{label}</span>
      <span className="text-sm text-gray-800">{value || <span className="text-gray-300 italic">Não informado</span>}</span>
    </div>
  )
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100">
        <span className="text-primary">{icon}</span>
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
      </div>
      <div className="px-4 divide-y divide-gray-50">
        {children}
      </div>
    </div>
  )
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return null
  const d = new Date(dateStr + 'T12:00:00') // evita offset de timezone
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function calcIdade(dataNasc: string | null | undefined): string {
  if (!dataNasc) return ''
  const diff = Date.now() - new Date(dataNasc + 'T12:00:00').getTime()
  const anos = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))
  return ` (${anos} anos)`
}

interface Props {
  profile: Profile
}

export default function MeuCadastroTab({ profile }: Props) {
  return (
    <div className="space-y-4">

      <p className="text-xs text-gray-400 leading-relaxed">
        Seus dados de cadastro registrados no consultório. Em caso de atualização, entre em contato pela aba <strong>Solicitar Contato</strong>.
      </p>

      <Section icon={<User className="w-4 h-4" />} title="Identificação">
        <Row label="Nome completo"         value={profile.full_name} />
        <Row label="E-mail"                value={profile.email} />
        <Row label="CPF"                   value={profile.cpf} />
        <Row label="Data de nascimento"    value={profile.data_nascimento
          ? `${formatDate(profile.data_nascimento)}${calcIdade(profile.data_nascimento)}`
          : null}
        />
        <Row label="Sexo"                  value={profile.sexo === 'F' ? 'Feminino' : profile.sexo === 'M' ? 'Masculino' : null} />
        <Row label="Nome da mãe"           value={profile.nome_mae} />
        <Row label="Profissão"             value={profile.profissao} />
        <Row label="CNS"                   value={profile.cns} />
      </Section>

      <Section icon={<Phone className="w-4 h-4" />} title="Contato">
        <Row label="Telefone / WhatsApp"   value={profile.phone} />
        <Row label="Como conheceu o Dr."   value={profile.como_conheceu} />
      </Section>

      <Section icon={<MapPin className="w-4 h-4" />} title="Endereço">
        <Row label="CEP"                   value={profile.cep} />
        <Row label="Endereço"              value={profile.endereco} />
        <Row label="Cidade e Estado"       value={profile.cidade_estado} />
      </Section>

      {(profile.clinica || profile.diagnostico) && (
        <Section icon={<Heart className="w-4 h-4" />} title="Acompanhamento médico">
          <Row label="Clínica"             value={profile.clinica} />
          <Row label="Diagnóstico"         value={profile.diagnostico} />
        </Section>
      )}

      <Section icon={<FileText className="w-4 h-4" />} title="Cadastro">
        <Row label="Status"                value={
          profile.status_paciente === 'ativo'   ? 'Ativo' :
          profile.status_paciente === 'inativo' ? 'Inativo' : 'Óbito'
        } />
        <Row label="Cadastro completo"     value={profile.perfil_completo ? 'Sim' : 'Pendente'} />
        <Row label="LGPD aceita em"        value={
          profile.lgpd_accepted_at
            ? new Date(profile.lgpd_accepted_at).toLocaleDateString('pt-BR')
            : null
        } />
      </Section>
    </div>
  )
}
