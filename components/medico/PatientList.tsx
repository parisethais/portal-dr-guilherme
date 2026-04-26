'use client'

import { useState } from 'react'
import type { Profile } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import Card from '@/components/ui/Card'
import { Search, UserRound, Users } from 'lucide-react'

interface PatientListProps {
  patients: Profile[]
}

export default function PatientList({ patients }: PatientListProps) {
  const [search, setSearch] = useState('')

  const filtered = patients.filter(
    (p) =>
      p.full_name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Users className="w-4 h-4" />
          <span>{patients.length} {patients.length === 1 ? 'paciente' : 'pacientes'} cadastrado{patients.length === 1 ? '' : 's'}</span>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar paciente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <UserRound className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">
            {search ? 'Nenhum paciente encontrado.' : 'Nenhum paciente cadastrado ainda.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((patient) => (
            <Card key={patient.id} padding="sm" className="hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <UserRound className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">
                    {patient.full_name || 'Nome não informado'}
                  </p>
                  {patient.cpf && (
                    <p className="text-xs text-gray-500 truncate">CPF: {patient.cpf}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">
                    Desde {formatDate(patient.created_at)}
                  </p>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    patient.lgpd_accepted
                      ? 'bg-green-100 text-green-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}
                >
                  {patient.lgpd_accepted ? 'LGPD aceita' : 'LGPD pendente'}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
