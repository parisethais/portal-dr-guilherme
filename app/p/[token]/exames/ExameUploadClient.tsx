'use client'

import { useState, useTransition, useRef } from 'react'
import { acceptLgpdByToken, uploadExameByToken, classifyAndSaveExame } from '@/app/actions/exame-upload'
import type { ClassificacaoResult } from '@/app/actions/exame-upload'
import { ShieldCheck, Upload, CheckCircle, XCircle, Loader2, FileText, FlaskConical, ScanLine, Microscope, AlertTriangle } from 'lucide-react'

interface Props {
  token:        string
  patientName:  string
  lgpdAccepted: boolean
}

interface FileStatus {
  file:        File
  status:      'pending' | 'uploading' | 'classifying' | 'done' | 'error'
  result?:     ClassificacaoResult
  error?:      string
}

const CATEGORIA_ICON = {
  laboratorial: <FlaskConical className="w-4 h-4 text-blue-500" />,
  imagem:       <ScanLine     className="w-4 h-4 text-purple-500" />,
  biopsia:      <Microscope   className="w-4 h-4 text-orange-500" />,
}

const CATEGORIA_LABEL = {
  laboratorial: 'Laboratorial',
  imagem:       'Imagem',
  biopsia:      'Biópsia',
}

export default function ExameUploadClient({ token, patientName, lgpdAccepted }: Props) {
  const [step, setStep]           = useState<'lgpd' | 'upload'>(lgpdAccepted ? 'upload' : 'lgpd')
  const [check1, setCheck1]       = useState(false)
  const [check2, setCheck2]       = useState(false)
  const [lgpdPending, startLgpd]  = useTransition()
  const [lgpdError, setLgpdError] = useState('')

  const [files, setFiles]     = useState<FileStatus[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // ── LGPD ─────────────────────────────────────────────────────
  function handleAcceptLgpd() {
    if (!check1 || !check2) { setLgpdError('Você precisa marcar as duas caixas para continuar.'); return }
    setLgpdError('')
    startLgpd(async () => {
      const res = await acceptLgpdByToken(token)
      if (!res.success) { setLgpdError(res.error); return }
      setStep('upload')
    })
  }

  // ── Upload ────────────────────────────────────────────────────
  function addFiles(newFiles: File[]) {
    const valid = newFiles.filter(f => f.size <= 30 * 1024 * 1024)
    setFiles(prev => [...prev, ...valid.map(f => ({ file: f, status: 'pending' as const }))])
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setIsDragging(false)
    addFiles(Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf' || f.type.startsWith('image/')))
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) addFiles(Array.from(e.target.files))
    e.target.value = ''
  }

  function removeFile(idx: number) {
    setFiles(prev => prev.filter((_, i) => i !== idx))
  }

  async function handleUpload() {
    const pending = files.filter(f => f.status === 'pending')
    if (pending.length === 0) return
    setIsProcessing(true)

    for (let i = 0; i < files.length; i++) {
      if (files[i].status !== 'pending') continue

      // — uploading —
      setFiles(prev => prev.map((f, j) => j === i ? { ...f, status: 'uploading' } : f))

      const fd = new FormData()
      fd.append('file', files[i].file)
      const uploadRes = await uploadExameByToken(token, fd)

      if (!uploadRes.success) {
        setFiles(prev => prev.map((f, j) => j === i ? { ...f, status: 'error', error: uploadRes.error } : f))
        continue
      }

      // — classifying —
      setFiles(prev => prev.map((f, j) => j === i ? { ...f, status: 'classifying' } : f))

      if (!uploadRes.data) continue
      const classRes = await classifyAndSaveExame(token, uploadRes.data.url, uploadRes.data.fileName)

      if (!classRes.success) {
        setFiles(prev => prev.map((f, j) => j === i ? { ...f, status: 'error', error: classRes.error } : f))
        continue
      }

      setFiles(prev => prev.map((f, j) => j === i ? { ...f, status: 'done', result: classRes.data } : f))
    }

    setIsProcessing(false)
  }

  const allDone    = files.length > 0 && files.every(f => f.status === 'done' || f.status === 'error')
  const hasPending = files.some(f => f.status === 'pending')

  // ── Render LGPD ───────────────────────────────────────────────
  if (step === 'lgpd') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3 flex-shrink-0">
          <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Consultório Dr. Guilherme</p>
            <p className="font-semibold text-gray-900 text-sm">{patientName}</p>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-5 max-w-lg mx-auto w-full space-y-4">
          <div>
            <h1 className="text-base font-semibold text-gray-900">Termos de Uso e Política de Privacidade</h1>
            <p className="text-xs text-gray-500 mt-0.5">Última atualização: 01 de junho de 2025</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4 text-sm text-gray-700 leading-relaxed max-h-[55vh] overflow-y-auto">
            <p>O presente documento reúne os Termos de Uso e a Política de Privacidade do Portal Dr. Guilherme, plataforma digital de apoio ao atendimento médico, destinada exclusivamente à comunicação entre o consultório e seus pacientes.</p>

            <section>
              <h3 className="font-semibold text-gray-900 mb-1">1. Sobre o Portal</h3>
              <p>O Portal é uma plataforma digital de apoio ao atendimento médico. Por meio do Portal, poderão ser disponibilizados documentos médicos, orientações, receitas, laudos, solicitações de contato, mensagens e demais informações relacionadas ao acompanhamento do paciente.</p>
              <p className="mt-2 font-medium text-red-700 text-xs">⚠️ O Portal não substitui consulta médica, atendimento presencial ou serviços de urgência. Em emergências, procure pronto-socorro imediatamente.</p>
            </section>

            <section>
              <h3 className="font-semibold text-gray-900 mb-1">2. Controlador dos Dados</h3>
              <p><strong>Dr. Guilherme Parise Santa Catharina</strong> — guilherme@santacatharina.com.br — +55 11 93454-4550 — Rua Barata Ribeiro, 190 · Cj 32/33 · Cerqueira César · São Paulo, SP.</p>
            </section>

            <section>
              <h3 className="font-semibold text-gray-900 mb-1">3. Dados Tratados</h3>
              <ul className="list-disc pl-4 space-y-0.5 text-xs">
                <li>Nome completo, e-mail, telefone e CPF</li>
                <li>Data de nascimento e dados de identificação</li>
                <li>Documentos médicos compartilhados pelo consultório <strong>ou pelo paciente</strong></li>
                <li>Receitas, laudos, <strong>exames</strong>, relatórios e orientações médicas</li>
                <li>Registros de acesso e uso do Portal</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-gray-900 mb-1">4. Finalidades</h3>
              <ul className="list-disc pl-4 space-y-0.5 text-xs">
                <li>Identificação do paciente e comunicação com o consultório</li>
                <li>Envio e disponibilização de documentos médicos</li>
                <li>Compartilhamento de receitas, laudos, exames e orientações</li>
                <li>Organização administrativa do atendimento e continuidade do cuidado</li>
                <li>Cumprimento de obrigações legais, regulatórias e éticas</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-gray-900 mb-1">5. Bases Legais (LGPD — Lei nº 13.709/2018)</h3>
              <ul className="list-disc pl-4 space-y-0.5 text-xs">
                <li>Consentimento do titular</li>
                <li>Tutela da saúde por profissional de saúde</li>
                <li>Cumprimento de obrigação legal ou regulatória</li>
                <li>Exercício regular de direitos</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-gray-900 mb-1">6. Compartilhamento com Terceiros</h3>
              <ul className="list-disc pl-4 space-y-0.5 text-xs">
                <li><strong>Supabase Inc.</strong> (EUA) — Banco de dados e armazenamento</li>
                <li><strong>Vercel Inc.</strong> (EUA) — Hospedagem do Portal</li>
                <li><strong>Anthropic PBC</strong> (EUA) — IA para interpretação clínica (opcional)</li>
                <li><strong>Google LLC</strong> (EUA) — Agenda e comunicação</li>
              </ul>
              <p className="text-xs mt-1">Nenhum dado é vendido ou compartilhado para fins comerciais.</p>
            </section>

            <section>
              <h3 className="font-semibold text-gray-900 mb-1">7. Retenção e Segurança</h3>
              <p className="text-xs">Os dados são mantidos pelo período necessário ao atendimento médico e cumprimento de obrigações legais, com uso de criptografia, controle de acesso e auditorias periódicas.</p>
            </section>

            <section>
              <h3 className="font-semibold text-gray-900 mb-1">8. Seus Direitos</h3>
              <p className="text-xs">Você pode solicitar acesso, correção, portabilidade, exclusão ou revogação do consentimento a qualquer momento pelo e-mail guilherme@santacatharina.com.br.</p>
            </section>
          </div>

          <div className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={check1}
                onChange={e => setCheck1(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-gray-300 text-primary accent-primary flex-shrink-0"
              />
              <span className="text-xs text-gray-700 leading-relaxed">
                Li integralmente e aceito os Termos de Uso e a Política de Privacidade, em conformidade com a LGPD — Lei nº 13.709/2018. Autorizo o tratamento dos meus dados pessoais de saúde para fins de atendimento médico.
              </span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={check2}
                onChange={e => setCheck2(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-gray-300 text-primary accent-primary flex-shrink-0"
              />
              <span className="text-xs text-gray-700 leading-relaxed">
                Estou ciente de que o Portal não substitui consulta médica e que, em situações de urgência ou emergência, devo procurar atendimento presencial imediato.
              </span>
            </label>
          </div>

          {lgpdError && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />{lgpdError}
            </p>
          )}

          <button
            type="button"
            onClick={handleAcceptLgpd}
            disabled={lgpdPending || !check1 || !check2}
            className="w-full py-3 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-light disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {lgpdPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Registrando aceite...</> : 'Aceitar e continuar'}
          </button>
        </div>
      </div>
    )
  }

  // ── Render Upload ─────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3 flex-shrink-0">
        <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
          <Upload className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-xs text-gray-500">Consultório Dr. Guilherme</p>
          <p className="font-semibold text-gray-900 text-sm">{patientName}</p>
        </div>
      </header>

      <div className="flex-1 px-4 py-5 max-w-lg mx-auto w-full space-y-4">
        <div>
          <h1 className="text-base font-semibold text-gray-900">Envio de exames</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Envie seus exames em PDF antes da consulta. O médico já os verá carregados na sua ficha.
          </p>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
            isDragging ? 'border-primary bg-blue-50' : 'border-gray-200 bg-white hover:border-primary/40 hover:bg-blue-50/30'
          }`}
        >
          <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-700">Toque para selecionar</p>
          <p className="text-xs text-gray-400 mt-1">PDF · até 30 MB por arquivo · vários arquivos</p>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".pdf,image/*"
            onChange={handleInput}
            className="hidden"
          />
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div className="space-y-2">
            {files.map((f, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 px-4 py-3">
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{f.file.name}</p>
                    <p className="text-xs text-gray-400">{(f.file.size / 1024 / 1024).toFixed(1)} MB</p>
                  </div>
                  {f.status === 'pending' && !isProcessing && (
                    <button type="button" onClick={() => removeFile(i)} className="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none">×</button>
                  )}
                  {f.status === 'uploading' && <Loader2 className="w-4 h-4 text-primary animate-spin flex-shrink-0" />}
                  {f.status === 'classifying' && <Loader2 className="w-4 h-4 text-amber-500 animate-spin flex-shrink-0" />}
                  {f.status === 'done' && <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />}
                  {f.status === 'error' && <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}
                </div>

                {f.status === 'uploading' && (
                  <p className="text-xs text-primary mt-1.5 ml-7">Enviando...</p>
                )}
                {f.status === 'classifying' && (
                  <p className="text-xs text-amber-600 mt-1.5 ml-7">Identificando tipo de exame com IA...</p>
                )}
                {f.status === 'done' && f.result && (
                  <div className="mt-2 ml-7 flex items-center gap-2">
                    {CATEGORIA_ICON[f.result.categoria]}
                    <span className="text-xs font-medium text-gray-700">{f.result.tipo}</span>
                    <span className="text-xs text-gray-400">· {CATEGORIA_LABEL[f.result.categoria]}</span>
                  </div>
                )}
                {f.status === 'error' && (
                  <p className="text-xs text-red-500 mt-1.5 ml-7">{f.error ?? 'Erro ao enviar. Tente novamente.'}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Upload button */}
        {hasPending && (
          <button
            type="button"
            onClick={handleUpload}
            disabled={isProcessing}
            className="w-full py-3 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-light disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {isProcessing
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
              : <><Upload className="w-4 h-4" /> Enviar {files.filter(f => f.status === 'pending').length} arquivo{files.filter(f => f.status === 'pending').length !== 1 ? 's' : ''}</>
            }
          </button>
        )}

        {/* Success */}
        {allDone && files.some(f => f.status === 'done') && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center space-y-1">
            <CheckCircle className="w-6 h-6 text-green-500 mx-auto" />
            <p className="text-sm font-semibold text-green-800">Exames recebidos!</p>
            <p className="text-xs text-green-700">O Dr. Guilherme já pode visualizá-los na sua ficha.</p>
          </div>
        )}

        {/* Add more */}
        {allDone && (
          <button
            type="button"
            onClick={() => setFiles(prev => prev.filter(f => f.status !== 'done'))}
            className="w-full py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 transition-colors"
          >
            Enviar mais arquivos
          </button>
        )}
      </div>
    </div>
  )
}
