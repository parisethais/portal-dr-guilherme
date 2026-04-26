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

export type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string }
