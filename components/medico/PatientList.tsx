'use client'

import { useState } from 'react'
import type { Profile, PatientExam, CarePlan, CarePlanAttachment, Invoice } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import Card from '@/components/ui/Card'
import PatientDetail from './PatientDetail'
import { Search, UserRound, Users, ChevronRight } from 'lucide-react'

interface PatientListProps {
  patients: Profile[]
  patientExams: PatientExam[]
  carePlans: CarePlan[]
  carePlanAttachments: CarePlanAttachment[]
  invoices: Invoice[]
}

export default function PatientList({ patients, patientExams, carePlans, carePlanAttachments, invoices }: PatientListProps) {
  const [search, setSearch] = useState('')
  const [selectedPatient, setSelectedPatient] = useState<Profile | null>(null)

  const filtered = patients.filter(
    (p) => p.full_name?.toLowerCase().includes(search.toLowerCase())
  )

  if (selectedPatient) {
    const exames = patientExams.filter((e) => e.patient_id === selectedPatient.id)
    const carePlan = carePlans.find((c) => c.patient_id === selectedPatient.id) ?? null
    const attachments = carePlanAttachments.filter((a) => a.patient_id === selectedPatient.id)
    const patientInvoices = invoices.filter((i) => i.patient_id === selectedPatient.id)
    return (
      <PatientDetail
        patient={selectedPatient}
        exames={exames}
        carePlan={carePlan}
        attachments={attachments}
        invoices={patientInvoices}
        onBack={() => setSelectedPatient(null)}
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Users className="w-4 h-4" />
          <span>
            {patients.length} {patients.length === 1 ? 'paciente' : 'pacientes'} cadastrado
            {patients.length === 1 ? '' : 's'}
          </span>
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
          {filtered.map((patient) => {
            const examCount = patientExams.filter((e) => e.patient_id === patient.id).length
            const hasCarePlan = carePlans.some((c) => c.patient_id === patient.id)
            return (
              <Card
                key={patient.id}
                padding="sm"
                className="hover:shadow-md transition-shadow cursor-pointer hover:border-primary/30"
                onClick={() => setSelectedPatient(patient)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <UserRound className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
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
                  <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                </div>

                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      patient.lgpd_accepted
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {patient.lgpd_accepted ? 'LGPD aceita' : 'LGPD pendente'}
                  </span>
                  {examCount > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-primary font-medium">
                      {examCount} exame{examCount > 1 ? 's' : ''}
                    </span>
                  )}
                  {hasCarePlan && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium">
                      Plano ativo
                    </span>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
