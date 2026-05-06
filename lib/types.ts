export type UserRole = 'paciente' | 'medico'

export interface Profile {
  id: string
  role: UserRole
  full_name: string | null
  cpf: string | null
  phone: string | null
  lgpd_accepted: boolean
  lgpd_accepted_at: string | null
  created_at: string
  updated_at: string
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
  downloaded_at: string | null
  created_at: string
}

// ── Agendamento ────────────────────────────────────────────
export type ConsultaTipo   = 'primeira_consulta' | 'retorno' | 'urgencia' | 'telemedicina'
export type ConsultaLocal  = 'consultorio' | 'telemedicina'
export type ConsultaStatus = 'agendada' | 'confirmada' | 'realizada' | 'falta' | 'cancelada'

export interface Consulta {
  id:          string
  patient_id:  string
  tipo:        ConsultaTipo
  local:       ConsultaLocal
  data_hora:   string
  duracao_min: number
  status:      ConsultaStatus
  observacoes: string | null
  created_by:  string | null
  created_at:  string
  updated_at:  string
  patient?:    Profile
}

export type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string }
