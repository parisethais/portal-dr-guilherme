// Constantes do painel admin — separadas do 'use server' para não quebrar o bundle

export interface MemberPermissions {
  prontuario: boolean
  agenda:     boolean
  financeiro: boolean
  pacientes:  boolean
  mensagens:  boolean
  /** Painel de salas (recepcionista) */
  salas?:              boolean
  /** Vê o financeiro da empresa (scope 'clinic') — o dono escolhe quem tem */
  financeiro_clinica?: boolean
  /** Auxiliar administrativo: ids dos médicos cujo financeiro ela administra */
  financeiro_medicos?: string[]
}

export type MemberRole = 'owner' | 'medico' | 'secretaria' | 'recepcionista' | 'administrativo'

export const DEFAULT_PERMISSIONS: Record<string, MemberPermissions> = {
  owner:          { prontuario: true,  agenda: true,  financeiro: true,  pacientes: true,  mensagens: true,  salas: true,  financeiro_clinica: true },
  medico:         { prontuario: true,  agenda: true,  financeiro: true,  pacientes: true,  mensagens: true,  salas: true,  financeiro_clinica: false },
  // Secretária "completa" (modelo Gi): agenda + pacientes + financeiro do médico dela
  secretaria:     { prontuario: false, agenda: true,  financeiro: true,  pacientes: true,  mensagens: true,  salas: true,  financeiro_clinica: true },
  // Recepcionista (modelo Mônica): agenda de todos + salas + contato dos pacientes; nada clínico, nada financeiro
  recepcionista:  { prontuario: false, agenda: true,  financeiro: false, pacientes: true,  mensagens: true,  salas: true,  financeiro_clinica: false },
  // Auxiliar administrativo: só financeiro, com escopo por médico (financeiro_medicos)
  administrativo: { prontuario: false, agenda: false, financeiro: true,  pacientes: false, mensagens: false, salas: false, financeiro_clinica: false, financeiro_medicos: [] },
}

export const ROLE_LABELS: Record<MemberRole, string> = {
  owner:          'Dono da clínica',
  medico:         'Médico',
  secretaria:     'Secretária',
  recepcionista:  'Recepcionista',
  administrativo: 'Auxiliar administrativo',
}

/** Permissões efetivas: preset do papel + overrides gravados no membro */
export function resolvePermissions(
  role: string,
  stored: Partial<MemberPermissions> | null | undefined,
): MemberPermissions {
  const base = DEFAULT_PERMISSIONS[role] ?? DEFAULT_PERMISSIONS.secretaria
  return { ...base, ...(stored ?? {}) }
}
