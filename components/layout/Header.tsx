'use client'

import { useTransition } from 'react'
import { logout } from '@/app/actions/auth'
import { LogOut, UserRound, Stethoscope } from 'lucide-react'
import type { Profile } from '@/lib/types'

interface HeaderProps {
  profile: Profile
}

export default function Header({ profile }: HeaderProps) {
  const [isPending, startTransition] = useTransition()

  function handleLogout() {
    startTransition(async () => {
      await logout()
    })
  }

  const isPaciente = profile.role === 'paciente'

  return (
    <header className="bg-primary text-white h-[4.35rem] sm:h-16 flex items-center px-5 sm:px-6 shadow-lg sticky top-0 z-40">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="shrink-0 flex items-center justify-center w-9 h-9 bg-white rounded-full shadow">
          <img src="/logogui.svg" alt="Logo Dr. Guilherme" className="w-7 h-7 object-contain" />
        </div>
        <div className="min-w-0">
          <span className="block font-semibold text-[0.95rem] leading-tight truncate sm:inline sm:text-sm">
            Portal Dr. Guilherme
          </span>
          <span className="block text-blue-200 text-[0.78rem] leading-tight mt-0.5 sm:inline sm:ml-2 sm:mt-0 sm:text-xs sm:text-blue-300">
            <span className="hidden sm:inline">— </span>
            {isPaciente ? 'Área do Paciente' : 'Área Médica'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <div className="flex items-center gap-2 text-sm">
          <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
            {isPaciente ? (
              <UserRound className="w-4 h-4 text-blue-200" />
            ) : (
              <Stethoscope className="w-4 h-4 text-blue-200" />
            )}
          </div>
          <span className="text-blue-100 hidden sm:inline">
            {profile.full_name || 'Usuário'}
          </span>
        </div>

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
