import { MapPin, Stethoscope, BadgeCheck, MessageCircle } from 'lucide-react'

interface ClinicCardProps {
  clinicName:     string
  doctorName:     string | null
  especialidade:  string | null
  crm:            string | null
  endereco:       string | null
  telefone:       string | null
  email:          string | null
}

function whatsappUrl(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  const number = digits.startsWith('55') ? digits : `55${digits}`
  return `https://wa.me/${number}`
}

export default function ClinicCard({
  clinicName,
  doctorName,
  especialidade,
  crm,
  endereco,
  telefone,
}: ClinicCardProps) {
  return (
    <div
      className="mb-6 rounded-2xl border border-white/60 overflow-hidden"
      style={{
        backdropFilter: 'blur(14px)',
        backgroundColor: 'rgba(255,255,255,0.65)',
        boxShadow: '0 2px 16px rgba(26,31,46,0.06)',
      }}
    >
      <div className="flex items-start gap-4 px-5 py-4">

        {/* Ícone */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
          style={{ backgroundColor: 'rgba(45,43,107,0.08)' }}
        >
          <Stethoscope className="w-5 h-5" style={{ color: '#2D2B6B' }} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">

          {/* Nome da clínica */}
          <div className="flex items-center gap-1.5 mb-0.5">
            <p className="text-base font-bold tracking-tight truncate" style={{ color: '#2D2B6B' }}>
              {clinicName}
            </p>
            <BadgeCheck className="w-4 h-4 shrink-0" style={{ color: '#7A9E7E' }} />
          </div>

          {/* Médico responsável */}
          {doctorName && (
            <p className="text-sm font-medium mb-0.5" style={{ color: '#2D2B6B', opacity: 0.75 }}>
              {doctorName}
              {crm && (
                <span className="font-normal text-xs text-gray-400 ml-1.5">· {crm}</span>
              )}
            </p>
          )}

          {/* Especialidade (sem CRM se já exibido acima) */}
          {especialidade && (
            <p className="text-xs text-gray-400 mb-2">{especialidade}</p>
          )}

          {/* Endereço + WhatsApp */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2">
            {endereco && (
              <span className="flex items-start gap-1 text-xs text-gray-500">
                <MapPin className="w-3 h-3 shrink-0 text-gray-400 mt-0.5" />
                <span>{endereco}</span>
              </span>
            )}
            {telefone && (
              <a
                href={whatsappUrl(telefone)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{
                  backgroundColor: 'rgba(122,158,126,0.12)',
                  color: '#4a7a50',
                }}
              >
                <MessageCircle className="w-3.5 h-3.5" />
                WhatsApp
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
