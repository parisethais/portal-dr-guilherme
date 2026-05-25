'use client'

import { useTransition } from 'react'
import { logout } from '@/app/actions/auth'
import { LogOut } from 'lucide-react'
import type { Profile } from '@/lib/types'

interface HeaderProps {
  profile: Profile
  variant?: 'medico' | 'paciente'
  clinicName?: string | null
}

const ROLE_LABEL: Record<string, string> = {
  medico:     'Médico',
  secretaria: 'Secretaria',
  superadmin: 'Dev',
  paciente:   'Paciente',
}

export default function Header({ profile, variant = 'medico', clinicName }: HeaderProps) {
  const [isPending, startTransition] = useTransition()

  function handleLogout() {
    startTransition(async () => {
      await logout()
    })
  }

  const isPacientePortal = variant === 'paciente'

  return (
    <header
      className="bg-primary text-white h-14 flex items-center px-5 sm:px-6 sticky top-0 z-40"
      style={{ boxShadow: '0 1px 0 rgba(255,255,255,0.06), 0 6px 28px rgba(15,18,25,0.38)' }}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* MedEn logotype */}
        <span className="font-display font-extrabold text-[22px] leading-none tracking-tight shrink-0 select-none">
          <span style={{ color: '#FFFFFF' }}>Med</span>
          <span style={{ color: '#7A9E7E' }}>E</span>
          <span style={{ color: '#FFFFFF' }}>n</span>
        </span>

        <div className="w-px h-4 bg-white/20 shrink-0" />

        {isPacientePortal ? (
          /* Portal do paciente: duas linhas — nome do médico + label */
          <div className="flex flex-col justify-center min-w-0 hidden sm:flex">
            <span className="text-xs text-white/50 leading-none mb-0.5">Portal do Paciente</span>
            {clinicName && (
              <span className="text-sm font-medium text-white/85 truncate leading-none">
                {clinicName}
              </span>
            )}
          </div>
        ) : (
          /* Área médica: nome da clínica dinâmico */
          <span className="text-sm text-white/70 truncate hidden sm:block">
            {clinicName ? (
              <>
                {clinicName}
                <span className="text-white/40 mx-1.5">—</span>
              </>
            ) : null}
            Área Médica
          </span>
        )}

        {/* Mobile: só o contexto */}
        <span className="text-xs text-white/60 sm:hidden truncate">
          {isPacientePortal ? 'Portal do Paciente' : 'Área Médica'}
        </span>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <span className="text-white/60 text-sm hidden sm:inline">
          {ROLE_LABEL[profile.role] ?? profile.role}
        </span>

        <button
          onClick={handleLogout}
          disabled={isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-60"
          title="Sair"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sair</span>
        </button>
      </div>
    </header>
  )
}
