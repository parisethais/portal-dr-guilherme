// Constantes do painel admin — separadas do 'use server' para não quebrar o bundle

export interface MemberPermissions {
  prontuario: boolean
  agenda:     boolean
  financeiro: boolean
  pacientes:  boolean
  mensagens:  boolean
}

export const DEFAULT_PERMISSIONS: Record<string, MemberPermissions> = {
  owner:      { prontuario: true,  agenda: true, financeiro: true,  pacientes: true, mensagens: true },
  medico:     { prontuario: true,  agenda: true, financeiro: true,  pacientes: true, mensagens: true },
  secretaria: { prontuario: false, agenda: true, financeiro: false, pacientes: true, mensagens: true },
}
