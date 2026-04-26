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
    <header className="bg-primary text-white h-16 flex items-center px-6 shadow-lg sticky top-0 z-40">
      <div className="flex items-center gap-3 flex-1">
        <div className="flex items-center justify-center w-9 h-9 bg-white/10 rounded-lg">
          <svg
            className="w-5 h-5 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
        </div>
        <div>
          <span className="font-semibold text-sm">Portal Dr. Guilherme</span>
          <span className="text-blue-300 text-xs ml-2">
            {isPaciente ? '— Área do Paciente' : '— Área Médica'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
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
