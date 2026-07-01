export type UserRole = 'paciente' | 'medico'

export type StatusPaciente = 'ativo' | 'inativo' | 'obito' | 'dialise' | 'alta'

export interface Profile {
  id: string
  role: UserRole
  full_name: string | null
  email: string | null
  cpf: string | null
  phone: string | null
  lgpd_accepted: boolean
  lgpd_accepted_at: string | null
  created_at: string
  updated_at: string
  // Campos preenchidos pelo paciente
  data_nascimento: string | null
  sexo: 'M' | 'F' | null
  como_conheceu: string | null
  cep: string | null
  endereco: string | null
  cidade_estado: string | null
  nome_mae: string | null
  profissao: string | null
  cns: string | null
  perfil_completo: boolean
  // Campos preenchidos pela secretaria
  clinica: string | null
  diagnostico: string | null
  status_paciente: StatusPaciente
  obs_secretaria: string | null
  form_token: string | null
  retorno_previsto: string | null   // date YYYY-MM-DD
  obs_pessoal:      string | null   // nota do médico sobre o paciente (fora de consulta)
  // Campos do médico
  crm:              string | null
  especialidade:    string | null
}

export interface Document {
  id: string
  patient_id: string
  uploaded_by: string
  title: string
  description: string | null
  file_url: string
  file_name: string
  file_type: string | null
  created_at: string
  patient?: Profile
  uploader?: Profile
}

export interface Message {
  id: string
  sender_id: string
  recipient_id: string
  content: string
  read: boolean
  created_at: string
  sender?: Profile
  recipient?: Profile
}

export interface ContactRequest {
  id: string
  patient_id: string
  subject: string
  message: string
  status: 'pendente' | 'em_andamento' | 'resolvido'
  response: string | null
  responded_at: string | null
  created_at: string
  updated_at: string
  patient?: Profile
}

export interface PatientExam {
  id: string
  patient_id: string
  title: string
  file_url: string
  file_name: string
  file_type: string | null
  file_size: number | null
  created_at: string
}

export interface CarePlanAttachment {
  id: string
  patient_id: string
  title: string
  file_url: string
  file_name: string
  file_type: string | null
  file_size: number | null
  uploaded_by: string
  created_at: string
}

export interface CarePlan {
  id: string
  patient_id: string
  content: string
  updated_at: string
  updated_by: string
}

export interface Invoice {
  id: string
  patient_id: string
  file_path: string
  amount: number
  issue_date: string
  consulta_date: string | null
  numero_nota: string | null
  downloaded_at: string | null
  created_at: string
}

// ── Agendamento ────────────────────────────────────────────
export type ConsultaTipo   =
  | 'primeira_consulta'
  | 'nova_consulta'
  | 'retorno'
  | 'primeira_consulta_desconto'
  | 'nova_consulta_desconto'
  | 'reuniao'
export type ConsultaLocal  = 'consultorio' | 'telemedicina'
export type ConsultaStatus = 'agendada' | 'confirmada' | 'em_atendimento' | 'realizada' | 'falta' | 'cancelada'

export interface Consulta {
  id:           string
  patient_id:   string
  tipo:         ConsultaTipo
  local:        ConsultaLocal
  data_hora:    string
  duracao_min:  number
  status:       ConsultaStatus
  observacoes:  string | null
  // Prontuário
  obs_consulta:              string | null
  diagnosticos:              string | null
  evolucao:                  string | null
  exame_fisico:              string | null
  pas:                       number | null
  pad:                       number | null
  fc:                        number | null
  impressao:                 string | null
  conduta:                   string | null
  prontuario_finalizado:     boolean
  prontuario_finalizado_at:  string | null
  prontuario_assinado:       boolean
  prontuario_assinado_at:    string | null
  prontuario_pdf_url:        string | null
  prontuario_assinatura_url: string | null
  created_by:                string | null
  created_at:   string
  updated_at:   string
  patient?:     Profile
}

// ── Prontuário ─────────────────────────────────────────────
export interface LabResult {
  id:           string
  patient_id:   string
  consulta_id:  string | null
  exam_name:    string
  value:        string
  unit:         string | null
  collected_at: string   // YYYY-MM-DD
  created_at:   string
}

export type ImagingTipo = string  // ex: 'usg_rins', 'eco', ou nome livre personalizado

export interface ImagingResult {
  id:             string
  patient_id:     string
  tipo:           ImagingTipo
  data_realizado: string   // YYYY-MM-DD
  laudo_resumido: string | null
  file_url:       string | null
  file_name:      string | null
  extra_files:    { url: string; name: string }[] | null
  created_at:     string
}

export interface Prescricao {
  id:          string
  patient_id:  string
  tenant_id:   string
  created_by:  string | null
  medicamento: string
  dose:        string | null
  posologia:   string | null
  ativo:       boolean
  data_inicio: string  // YYYY-MM-DD
  data_fim:    string | null
  obs:         string | null
  created_at:  string
  updated_at:  string
}

export type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string }
