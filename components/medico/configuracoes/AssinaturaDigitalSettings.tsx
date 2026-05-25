'use client'

import { ShieldCheck, Clock, ExternalLink } from 'lucide-react'

interface Props {
  cpf: string | null
  crm: string | null
}

export default function AssinaturaDigitalSettings({ cpf, crm }: Props) {
  const pronto = !!(cpf && crm && process.env.NEXT_PUBLIC_BIRDID_CONFIGURADO === 'true')

  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Assinatura Digital ICP-Brasil</h2>
          <p className="text-xs text-gray-400">
            Exigida pelo CFM (Res. 2.299/2021) para prontuários eletrônicos.
          </p>
        </div>
      </div>

      {pronto ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-xl px-4 py-2.5">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            BirdID configurado — prontuários podem ser assinados digitalmente.
          </div>
          <div className="text-xs text-gray-500 space-y-1 pl-1">
            <p>CPF: <span className="font-mono">{cpf}</span></p>
            <p>CRM: <span className="font-mono">{crm}</span></p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 rounded-xl px-4 py-2.5">
            <Clock className="w-4 h-4 shrink-0" />
            Aguardando credenciais do BirdID/Soluti.
          </div>
          <div className="text-xs text-gray-500 space-y-1.5 pl-1">
            {!cpf && <p className="text-red-500">⚠ CPF não cadastrado no perfil — obrigatório para a assinatura.</p>}
            {!crm && <p className="text-red-500">⚠ CRM não cadastrado no perfil — obrigatório para a assinatura.</p>}
            <p>
              Após receber as credenciais da Soluti (client_id e client_secret),
              adicione-as nas variáveis de ambiente do servidor.
            </p>
          </div>
          <a
            href="https://doc.birdid.com.br"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-primary underline"
          >
            <ExternalLink className="w-3 h-3" />
            Documentação BirdID
          </a>
        </div>
      )}
    </section>
  )
}
