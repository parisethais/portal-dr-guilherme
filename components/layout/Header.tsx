'use client'

import { useTransition } from 'react'
import { logout } from '@/app/actions/auth'
import { LogOut } from 'lucide-react'
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
    <header
      className="bg-primary text-white h-14 flex items-center px-5 sm:px-6 sticky top-0 z-40"
      style={{ boxShadow: '0 1px 0 rgba(126,184,212,0.1), 0 6px 28px rgba(15,18,25,0.38)' }}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/1.png"
          alt="Clinical Intelligence OS"
          className="h-8 w-auto shrink-0 object-contain"
        />

        <div className="w-px h-4 bg-white/20 shrink-0" />

        <span className="text-sm text-white/70 truncate hidden sm:block">
          Consultório Dr. Guilherme Santa Catharina
          <span className="text-white/40 mx-1.5">—</span>
          {isPaciente ? 'Área do Paciente' : 'Área Médica'}
        </span>
        <span className="text-xs text-white/60 sm:hidden truncate">
          {isPaciente ? 'Área do Paciente' : 'Área Médica'}
        </span>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <span className="text-white/60 text-sm hidden sm:inline">
          {profile.full_name || 'Usuário'}
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
