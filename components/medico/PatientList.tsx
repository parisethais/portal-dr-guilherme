'use client'

import { useState } from 'react'
import type { Profile, PatientExam, CarePlan, CarePlanAttachment, Invoice, Consulta, LabResult, ImagingResult } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import Card from '@/components/ui/Card'
import PatientDetail from './PatientDetail'
import InvitePatientModal from './InvitePatientModal'
import { Search, UserRound, Users, ChevronRight, UserPlus, AlertTriangle, AlertCircle } from 'lucide-react'
import { parseDiagnosticos } from './prontuario/DiagnosticosPanel'
import { countLabAlerts } from '@/lib/lab-alerts'

interface PatientListProps {
  patients: Profile[]
  patientExams: PatientExam[]
  carePlans: CarePlan[]
  carePlanAttachments: CarePlanAttachment[]
  invoices: Invoice[]
  consultas: Consulta[]
  labResults: LabResult[]
  imagingResults: ImagingResult[]
}

export default function PatientList({ patients, patientExams, carePlans, carePlanAttachments, invoices, consultas, labResults, imagingResults }: PatientListProps) {
  const [search, setSearch] = useState('')
  const [selectedPatient, setSelectedPatient] = useState<Profile | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)

  const filtered = patients.filter((p) => {
    const q = search.toLowerCase()
    if (!q) return true
    if (p.full_name?.toLowerCase().includes(q)) return true
    if (p.diagnostico?.toLowerCase().includes(q)) return true
    // Busca dentro dos diagnósticos JSON de cada consulta (nome + nota de evolução)
    const hasDx = consultas
      .filter(c => c.patient_id === p.id)
      .some(c => {
        const entries = parseDiagnosticos(c.diagnosticos ?? null)
        return entries.some(
          e => e.nome.toLowerCase().includes(q) || e.evolucao.toLowerCase().includes(q)
        )
      })
    return hasDx
  })

  if (selectedPatient) {
    const exames = patientExams.filter((e) => e.patient_id === selectedPatient.id)
    const carePlan = carePlans.find((c) => c.patient_id === selectedPatient.id) ?? null
    const attachments = carePlanAttachments.filter((a) => a.patient_id === selectedPatient.id)
    const patientInvoices = invoices.filter((i) => i.patient_id === selectedPatient.id)
    const patientConsultas = consultas
      .filter(c => c.patient_id === selectedPatient.id)
      .sort((a, b) => b.data_hora.localeCompare(a.data_hora))
    const patientLabs = labResults.filter(r => r.patient_id === selectedPatient.id)
    const patientImaging = imagingResults.filter(r => r.patient_id === selectedPatient.id)
    return (
      <PatientDetail
        patient={selectedPatient}
        exames={exames}
        carePlan={carePlan}
        attachments={attachments}
        invoices={patientInvoices}
        consultas={patientConsultas}
        labResults={patientLabs}
        imagingResults={patientImaging}
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
        <button
          type="button"
          onClick={() => setInviteOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-light transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Cadastrar paciente
        </button>
      </div>

      <InvitePatientModal open={inviteOpen} onClose={() => setInviteOpen(false)} />

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
            const examCount   = patientExams.filter((e) => e.patient_id === patient.id).length
            const hasCarePlan = carePlans.some((c) => c.patient_id === patient.id)
            const patientLabs = labResults.filter(r => r.patient_id === patient.id)
            const alertCounts = countLabAlerts(patientLabs)
            const hasCritical = alertCounts.critical > 0
            const hasWarning  = alertCounts.warning > 0
            return (
              <Card
                key={patient.id}
                padding="sm"
                className={`hover:shadow-md transition-shadow cursor-pointer ${
                  hasCritical
                    ? 'border-red-300 hover:border-red-400'
                    : hasWarning
                    ? 'border-amber-200 hover:border-amber-300'
                    : 'hover:border-primary/30'
                }`}
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
                  {hasCritical && (
                    <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold">
                      <AlertCircle className="w-3 h-3" />
                      {alertCounts.critical} crítico{alertCounts.critical > 1 ? 's' : ''}
                    </span>
                  )}
                  {!hasCritical && hasWarning && (
                    <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">
                      <AlertTriangle className="w-3 h-3" />
                      {alertCounts.warning} alerta{alertCounts.warning > 1 ? 's' : ''}
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
