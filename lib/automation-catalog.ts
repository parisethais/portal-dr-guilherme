// ── Tipos e catálogo de automações ───────────────────────────────────────
// Arquivo sem 'use server' — pode ser importado em client components.

export type AutomationType =
  | 'pre_consulta_lembrete'
  | 'pos_consulta'
  | 'inativo_sem_consulta'
  | 'retorno_previsto'
  | 'lab_critico'
  | 'aniversario'
  | 'sumario_pre_consulta'

export interface AutomationParams {
  horas_antes?: number
  dias?: number
  mensagem?: string
  canal?: 'whatsapp' | 'portal' | 'email'
  ai_model?: string
}

export interface ClinicAutomation {
  id:         string
  clinic_id:  string
  type:       AutomationType
  active:     boolean
  params:     AutomationParams
  created_at: string
  updated_at: string
}

export interface AutomationLog {
  id:            string
  clinic_id:     string
  automation_id: string
  patient_id:    string | null
  triggered_at:  string
  status:        'enviado' | 'erro' | 'ignorado'
  channel:       string | null
  result:        Record<string, unknown>
  patient_name?: string | null
}

export interface AutomationDef {
  type:         AutomationType
  label:        string
  description:  string
  icon:         string
  canal_padrao: 'whatsapp' | 'portal' | 'email' | 'interno'
  params_schema: {
    field:       string
    label:       string
    type:        'number' | 'textarea' | 'select'
    default:     string | number
    options?:    { value: string; label: string }[]
    placeholder?: string
    hint?:       string
  }[]
  message_tags: string[]
  premium?:     boolean
}

export const AUTOMATION_CATALOG: AutomationDef[] = [
  {
    type:        'pre_consulta_lembrete',
    label:       'Lembrete pré-consulta',
    description: 'Envia mensagem automática antes da consulta confirmando data, horário e local.',
    icon:        '📅',
    canal_padrao: 'whatsapp',
    params_schema: [
      {
        field:   'horas_antes',
        label:   'Horas antes da consulta',
        type:    'number',
        default: 24,
        hint:    'Recomendado: 24h. Mínimo: 1h.',
      },
      {
        field:       'mensagem',
        label:       'Mensagem',
        type:        'textarea',
        default:     'Olá {nome}! 👋 Lembrando da sua consulta amanhã ({data_consulta} às {hora_consulta}). Qualquer dúvida, estamos à disposição.',
        placeholder: 'Digite a mensagem...',
        hint:        'Tags disponíveis: {nome}, {data_consulta}, {hora_consulta}, {tipo_consulta}, {local}',
      },
    ],
    message_tags: ['{nome}', '{data_consulta}', '{hora_consulta}', '{tipo_consulta}', '{local}'],
  },
  {
    type:        'pos_consulta',
    label:       'Mensagem pós-consulta',
    description: 'Envia mensagem após a consulta ser marcada como realizada.',
    icon:        '✅',
    canal_padrao: 'whatsapp',
    params_schema: [
      {
        field:       'mensagem',
        label:       'Mensagem',
        type:        'textarea',
        default:     'Olá {nome}! Foi um prazer te atender hoje. Qualquer dúvida sobre o que conversamos, pode me chamar. Até a próxima! 😊',
        placeholder: 'Digite a mensagem...',
        hint:        'Tags disponíveis: {nome}, {data_consulta}',
      },
    ],
    message_tags: ['{nome}', '{data_consulta}'],
  },
  {
    type:        'inativo_sem_consulta',
    label:       'Régua de inativos',
    description: 'Detecta pacientes sem consulta há X dias e envia mensagem de reativação.',
    icon:        '💤',
    canal_padrao: 'whatsapp',
    params_schema: [
      {
        field:   'dias',
        label:   'Dias sem consulta',
        type:    'number',
        default: 180,
        hint:    'Pacientes sem consulta realizada há mais de X dias.',
      },
      {
        field:       'mensagem',
        label:       'Mensagem',
        type:        'textarea',
        default:     'Olá {nome}! Notamos que faz um tempo desde a sua última consulta. Quando quiser agendar seu retorno, estamos à disposição! 🩺',
        placeholder: 'Digite a mensagem...',
        hint:        'Tags disponíveis: {nome}, {ultima_consulta}, {dias_inativo}',
      },
    ],
    message_tags: ['{nome}', '{ultima_consulta}', '{dias_inativo}'],
  },
  {
    type:        'retorno_previsto',
    label:       'Lembrete de retorno',
    description: 'Avisa o paciente quando a data de retorno previsto está se aproximando.',
    icon:        '🔁',
    canal_padrao: 'whatsapp',
    params_schema: [
      {
        field:   'dias',
        label:   'Dias antes do retorno',
        type:    'number',
        default: 7,
        hint:    'Envia X dias antes da data de retorno_previsto cadastrada.',
      },
      {
        field:       'mensagem',
        label:       'Mensagem',
        type:        'textarea',
        default:     'Olá {nome}! Sua consulta de retorno está programada para daqui a {dias_para_retorno} dias ({data_retorno}). Lembre de agendar! 📆',
        placeholder: 'Digite a mensagem...',
        hint:        'Tags disponíveis: {nome}, {data_retorno}, {dias_para_retorno}',
      },
    ],
    message_tags: ['{nome}', '{data_retorno}', '{dias_para_retorno}'],
  },
  {
    type:        'lab_critico',
    label:       'Alerta de lab crítico',
    description: 'Notifica o médico internamente quando um resultado laboratorial crítico é registrado.',
    icon:        '🚨',
    canal_padrao: 'interno',
    params_schema: [
      {
        field:   'canal',
        label:   'Canal de notificação',
        type:    'select',
        default: 'interno',
        options: [
          { value: 'interno',   label: 'Alerta interno (portal)' },
          { value: 'whatsapp',  label: 'WhatsApp do médico'      },
        ],
      },
    ],
    message_tags: ['{nome}', '{exame}', '{valor}', '{referencia}'],
  },
  {
    type:        'aniversario',
    label:       'Mensagem de aniversário',
    description: 'Envia mensagem personalizada no dia do aniversário do paciente.',
    icon:        '🎂',
    canal_padrao: 'whatsapp',
    params_schema: [
      {
        field:       'mensagem',
        label:       'Mensagem',
        type:        'textarea',
        default:     'Olá {nome}! 🎉 Toda a equipe deseja a você um feliz aniversário! Que este novo ano seja de muita saúde e alegria.',
        placeholder: 'Digite a mensagem...',
        hint:        'Tags disponíveis: {nome}',
      },
    ],
    message_tags: ['{nome}'],
  },
  {
    type:        'sumario_pre_consulta',
    label:       'Sumário pré-consulta (IA)',
    description: 'Gera um briefing inteligente antes da consulta: últimos labs, alertas ativos, evolução anterior e o que estava planejado.',
    icon:        '🤖',
    canal_padrao: 'interno',
    params_schema: [],
    message_tags: [],
    premium:     true,
  },
]
