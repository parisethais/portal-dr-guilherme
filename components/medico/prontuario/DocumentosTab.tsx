'use client'

import { useState, useEffect } from 'react'
import {
  FilePlus2, FileText, Printer, Pencil, Trash2, X,
  Loader2, BookmarkPlus, BookMarked, Bookmark, ArrowLeft, PenLine,
} from 'lucide-react'
import {
  listPatientDocuments, createPatientDocument, updatePatientDocument, deletePatientDocument,
  listClinicDocumentTemplates, createClinicDocumentTemplate,
} from '@/app/actions/documentos-clinicos'
import type { PatientDocument, ClinicDocumentTemplate } from '@/app/actions/documentos-clinicos'
import { formatDate } from '@/lib/utils'

export const SYSTEM_TEMPLATES = [
  {
    key: 'litiase',
    title: 'Orientações para Litíase Renal',
    content: `ORIENTAÇÕES PARA LITÍASE RENAL

Prezado(a) paciente,

Você foi diagnosticado(a) com cálculos renais (pedras nos rins). Seguindo as orientações abaixo, é possível reduzir o risco de novos episódios.

HIDRATAÇÃO
• Ingira no mínimo 2 a 3 litros de água por dia (cerca de 10 a 12 copos).
• Prefira água pura; evite bebidas açucaradas e refrigerantes.
• Mantenha a urina com coloração clara (amarelo-pálido).

ALIMENTAÇÃO
• Reduza o consumo de sal (sódio) — evite alimentos industrializados, embutidos e fast food.
• Consuma cálcio nas refeições (leite, queijo, iogurte) — não elimine o cálcio da dieta sem orientação médica.
• Reduza proteínas animais em excesso: limite a 1 porção por refeição.
• Evite alimentos ricos em oxalato: espinafre, beterraba, amêndoas, amendoim, chocolate e chá-preto em excesso.
• Consuma frutas cítricas (limão, laranja) — o citrato na urina ajuda a prevenir cálculos.

ESTILO DE VIDA
• Pratique atividade física regular.
• Evite o uso excessivo de suplementos de vitamina C (acima de 1 g/dia) sem prescrição.
• Em caso de dor intensa, sangue na urina ou febre, procure pronto-socorro imediatamente.

RETORNO
Agende consulta de retorno conforme indicado para reavaliação laboratorial e de imagem.`,
  },
  {
    key: 'dieta',
    title: 'Orientações Dietéticas Gerais',
    content: `ORIENTAÇÕES DIETÉTICAS GERAIS

Prezado(a) paciente,

Seguem orientações alimentares para promoção da saúde:

PRINCÍPIOS GERAIS
• Prefira alimentos naturais e minimamente processados.
• Evite ultraprocessados: salgadinhos, biscoitos recheados, embutidos, refrigerantes.
• Faça de 4 a 6 refeições por dia, em horários regulares.
• Coma devagar, mastigando bem os alimentos.

CAFÉ DA MANHÃ E LANCHES
• Prefira frutas, iogurte natural, queijo branco, pão integral com ovo.

ALMOÇO E JANTAR
• Monte o prato com: ½ de legumes e verduras, ¼ de proteína e ¼ de carboidratos.
• Use azeite de oliva extravirgem para temperar.
• Reduza frituras.

HIDRATAÇÃO
• Beba ao menos 2 litros de água por dia.

OBSERVAÇÕES ESPECÍFICAS
_[adicione aqui as orientações personalizadas]_`,
  },
  {
    key: 'anti_inflamatorio',
    title: 'Restrição de Anti-inflamatórios',
    content: `ORIENTAÇÃO MÉDICA — RESTRIÇÃO DE ANTI-INFLAMATÓRIOS

Prezado(a) paciente,

Por indicação médica, você deve EVITAR o uso de anti-inflamatórios não esteroidais (AINEs), tais como:

• Ibuprofeno (Advil®, Alivium®, Buscofen®)
• Diclofenaco (Voltaren®, Cataflam®)
• Naproxeno (Naprosyn®, Flanax®)
• Nimesulida (Nisulid®, Scaflan®)
• Indometacina, Celecoxibe, Etoricoxibe e outros COX-2

MOTIVO DA RESTRIÇÃO
_[preencher conforme o caso clínico]_

O QUE USAR EM CASO DE DOR OU FEBRE
• Paracetamol — 500 mg a 1 g a cada 6–8 horas, se necessário.
• Dipirona — conforme orientação médica.

IMPORTANTE
• Informe sempre a outros médicos, dentistas e farmacêuticos sobre esta restrição antes de qualquer prescrição ou automedicação.`,
  },
  {
    key: 'atestado',
    title: 'Atestado de Comparecimento',
    content: `ATESTADO DE COMPARECIMENTO

Atesto, para os devidos fins, que o(a) paciente

Nome: _______________________________________________
CPF:  _______________________________________________

compareceu a esta clínica no dia ____/____/________, no período da ________________ (manhã / tarde / integral), para consulta médica.

O(A) paciente permaneceu sob meus cuidados pelo período de aproximadamente _______ horas.`,
  },
  {
    key: 'relatorio_reembolso',
    title: 'Relatório para Reembolso (Internação)',
    content: `RELATÓRIO MÉDICO PARA FINS DE REEMBOLSO

Paciente: _______________________________________________
Data de nascimento: _______________    CPF: _______________

Declaro, para fins de reembolso junto à operadora de saúde, que o(a) paciente acima identificado(a) necessitou de internação hospitalar conforme descrito:

DIAGNÓSTICO PRINCIPAL (CID-10): _________________________
Diagnóstico complementar: ______________________________

PERÍODO DE INTERNAÇÃO
Entrada: ____/____/________    Saída: ____/____/________
Local de internação: _____________________________________

JUSTIFICATIVA CLÍNICA
O(A) paciente apresentou quadro de ________________________________________
necessitando de internação hospitalar para ____________________________________

PROCEDIMENTOS REALIZADOS
• _______________________________________________________
• _______________________________________________________

CONDIÇÃO DE ALTA
O(A) paciente recebeu alta em ____/____/________ em condições _________.

Este relatório é emitido a pedido do(a) paciente para fins exclusivos de reembolso.`,
  },
]

interface Props {
  patientId:   string
  patientName: string
}

type Step = 'pick' | 'edit'

export default function DocumentosTab({ patientId, patientName }: Props) {
  const [docs,            setDocs]            = useState<PatientDocument[]>([])
  const [customTemplates, setCustomTemplates] = useState<ClinicDocumentTemplate[]>([])
  const [loading,         setLoading]         = useState(true)
  const [modalOpen,       setModalOpen]       = useState(false)
  const [editingDoc,      setEditingDoc]      = useState<PatientDocument | null>(null)
  const [step,            setStep]            = useState<Step>('pick')
  const [title,           setTitle]           = useState('')
  const [content,         setContent]         = useState('')
  const [templateKey,     setTemplateKey]     = useState<string | null>(null)
  const [saving,          setSaving]          = useState(false)
  const [savingTpl,       setSavingTpl]       = useState(false)
  const [error,           setError]           = useState('')
  const [deleting,        setDeleting]        = useState<string | null>(null)

  useEffect(() => {
    Promise.all([listPatientDocuments(patientId), listClinicDocumentTemplates()])
      .then(([d, t]) => { setDocs(d); setCustomTemplates(t); setLoading(false) })
  }, [patientId])

  // ── Open create (step 1: pick template) ──────────────────────
  function openCreate() {
    setEditingDoc(null)
    setStep('pick')
    setTitle('')
    setContent('')
    setTemplateKey(null)
    setError('')
    setModalOpen(true)
  }

  // ── Open edit (skip step 1, go straight to editor) ───────────
  function openEdit(doc: PatientDocument) {
    setEditingDoc(doc)
    setStep('edit')
    setTitle(doc.title)
    setContent(doc.content)
    setTemplateKey(doc.template_key)
    setError('')
    setModalOpen(true)
  }

  function pickTemplate(t: { title: string; content: string; key: string }) {
    setTitle(t.title)
    setContent(t.content)
    setTemplateKey(t.key)
    setStep('edit')
  }

  function pickBlank() {
    setTitle('')
    setContent('')
    setTemplateKey(null)
    setStep('edit')
  }

  async function handleSaveAsTemplate() {
    if (!title.trim()) { setError('Defina um título antes de salvar como modelo.'); return }
    setSavingTpl(true)
    const { data, error: err } = await createClinicDocumentTemplate({ title: title.trim(), content })
    if (err) { setError(err); setSavingTpl(false); return }
    setCustomTemplates(prev => [data!, ...prev])
    setSavingTpl(false)
  }

  async function handleSave() {
    if (!title.trim()) { setError('O título é obrigatório.'); return }
    setSaving(true)
    setError('')

    if (!editingDoc) {
      const { data, error: err } = await createPatientDocument({
        patientId, title: title.trim(), content, templateKey: templateKey ?? undefined,
      })
      if (err) { setError(err); setSaving(false); return }
      setDocs(prev => [data!, ...prev])
    } else {
      const { error: err } = await updatePatientDocument({ id: editingDoc.id, title: title.trim(), content })
      if (err) { setError(err); setSaving(false); return }
      setDocs(prev => prev.map(d => d.id === editingDoc.id
        ? { ...d, title: title.trim(), content, updated_at: new Date().toISOString() } : d))
    }

    setSaving(false)
    setModalOpen(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este documento?')) return
    setDeleting(id)
    await deletePatientDocument(id)
    setDocs(prev => prev.filter(d => d.id !== id))
    setDeleting(null)
  }

  function openPrint(doc: PatientDocument) {
    const sw = window.screen.availWidth
    const sh = window.screen.availHeight
    const w  = Math.min(Math.round(sw * 0.7), 900)
    const h  = Math.min(Math.round(sh * 0.9), 1100)
    window.open(
      `/documentos/${doc.id}`,
      `doc-${doc.id}`,
      `width=${w},height=${h},left=${Math.round((sw-w)/2)},top=${Math.round((sh-h)/2)},resizable=yes,scrollbars=yes,menubar=no,toolbar=no`,
    )
  }

  // ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 text-sm">Documentos clínicos</h3>
          <p className="text-xs text-gray-400 mt-0.5">Documentos, memorandos e orientações para {patientName}</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-white hover:bg-primary/90 transition-colors"
        >
          <FilePlus2 className="w-3.5 h-3.5" />
          Novo documento
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10 gap-2 text-sm text-gray-400">
          <Loader2 className="w-4 h-4 animate-spin" />Carregando…
        </div>
      ) : docs.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">Nenhum documento criado ainda.</p>
          <button onClick={openCreate} className="mt-3 text-xs text-primary hover:underline">
            Criar o primeiro documento
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {docs.map(doc => (
            <div key={doc.id} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 hover:border-gray-200 transition-colors group">
              <div className="w-8 h-8 bg-primary/8 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileText className="w-4 h-4 text-primary/70" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{doc.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">{formatDate(doc.created_at)}</p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openPrint(doc)} title="Imprimir"
                  className="p-1.5 text-gray-400 hover:text-primary transition-colors rounded-md hover:bg-primary/5">
                  <Printer className="w-4 h-4" />
                </button>
                <button onClick={() => openEdit(doc)} title="Editar"
                  className="p-1.5 text-gray-400 hover:text-primary transition-colors rounded-md hover:bg-primary/5">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(doc.id)} disabled={deleting === doc.id}
                  className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded-md hover:bg-red-50 disabled:opacity-50">
                  {deleting === doc.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm p-4 pt-10 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col mb-8">

            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                {step === 'edit' && !editingDoc && (
                  <button onClick={() => setStep('pick')} className="p-1 -ml-1 text-gray-400 hover:text-gray-600 rounded-md">
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                )}
                <h2 className="text-base font-bold text-gray-900">
                  {editingDoc ? 'Editar documento' : step === 'pick' ? 'Escolher modelo' : 'Novo documento'}
                </h2>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* ── Step 1: Template picker ── */}
            {step === 'pick' && (
              <div className="px-6 py-5 space-y-4">
                {/* Em branco */}
                <button
                  onClick={pickBlank}
                  className="w-full flex items-center gap-3 p-3.5 rounded-xl border-2 border-dashed border-gray-200 hover:border-primary/40 hover:bg-primary/3 transition-colors text-left group"
                >
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                    <PenLine className="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-700 group-hover:text-primary transition-colors">Texto livre</p>
                    <p className="text-xs text-gray-400">Começar do zero</p>
                  </div>
                </button>

                {/* Meus modelos */}
                {customTemplates.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-2">Meus modelos</p>
                    <div className="space-y-1.5">
                      {customTemplates.map(t => (
                        <button
                          key={t.id}
                          onClick={() => pickTemplate({ key: `custom_${t.id}`, title: t.title, content: t.content })}
                          className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-primary/30 hover:bg-primary/3 transition-colors text-left"
                        >
                          <BookMarked className="w-4 h-4 text-primary/60 flex-shrink-0" />
                          <span className="text-sm font-medium text-gray-800">{t.title}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Modelos padrão */}
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-2">Modelos padrão</p>
                  <div className="space-y-1.5">
                    {SYSTEM_TEMPLATES.map(t => (
                      <button
                        key={t.key}
                        onClick={() => pickTemplate(t)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-primary/30 hover:bg-primary/3 transition-colors text-left"
                      >
                        <Bookmark className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="text-sm font-medium text-gray-800">{t.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 2: Editor ── */}
            {step === 'edit' && (
              <>
                <div className="px-6 py-5 space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Título</label>
                    <input
                      type="text"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      placeholder="Ex: Orientações pós-consulta"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Conteúdo</label>
                    <textarea
                      value={content}
                      onChange={e => setContent(e.target.value)}
                      rows={16}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 font-mono resize-y"
                      placeholder="Escreva o conteúdo do documento aqui…"
                    />
                  </div>
                  {error && <p className="text-xs text-red-500">{error}</p>}
                </div>

                <div className="flex items-center justify-between px-6 pb-5">
                  <button
                    type="button"
                    onClick={handleSaveAsTemplate}
                    disabled={savingTpl}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-primary transition-colors disabled:opacity-50"
                  >
                    {savingTpl ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BookmarkPlus className="w-3.5 h-3.5" />}
                    Salvar como modelo
                  </button>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">
                      Cancelar
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60"
                    >
                      {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      {editingDoc ? 'Salvar alterações' : 'Criar documento'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
