'use client'

import { useState, useTransition, useEffect } from 'react'
import { GraduationCap, Plus, Trash2, Loader2, Check, X, Save } from 'lucide-react'
import {
  getHonorarios, createHonorario, updateHonorario, deleteHonorario,
  type Honorario,
} from '@/app/actions/honorarios'

function fmtDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function fmtValor(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

interface NewRow {
  data:           string
  descricao:      string
  fonte_pagadora: string
  valor:          string
  valor_pago:     string
  obs:            string
}

const EMPTY: NewRow = { data: '', descricao: '', fonte_pagadora: '', valor: '', valor_pago: '', obs: '' }

export default function HonorariosPanel() {
  const [rows, setRows]              = useState<Honorario[]>([])
  const [loading, setLoading]        = useState(true)

  useEffect(() => {
    getHonorarios().then(res => {
      if (res.success) setRows(res.data ?? [])
      setLoading(false)
    })
  }, [])
  const [adding, setAdding]          = useState(false)
  const [newRow, setNewRow]          = useState<NewRow>(EMPTY)
  const [formError, setFormError]    = useState('')
  const [isPending, startTransition] = useTransition()
  const [deletingId, setDeletingId]  = useState<string | null>(null)

  function set(k: keyof NewRow) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setNewRow(r => ({ ...r, [k]: e.target.value }))
  }

  function handleAdd() {
    if (!newRow.data)           { setFormError('Informe a data.'); return }
    if (!newRow.descricao)      { setFormError('Informe a descrição.'); return }
    if (!newRow.fonte_pagadora) { setFormError('Informe a fonte pagadora.'); return }
    if (!newRow.valor)          { setFormError('Informe o valor.'); return }
    const valor = parseFloat(newRow.valor.replace(',', '.'))
    if (isNaN(valor))           { setFormError('Valor inválido.'); return }
    setFormError('')
    startTransition(async () => {
      const valorPago = newRow.valor_pago ? parseFloat(newRow.valor_pago.replace(',', '.')) : null
      const res = await createHonorario({
        data:           newRow.data,
        descricao:      newRow.descricao,
        fonte_pagadora: newRow.fonte_pagadora,
        valor,
        valor_pago:     (!valorPago || isNaN(valorPago)) ? null : valorPago,
        obs:            newRow.obs || null,
      })
      if (!res.success) { setFormError(res.error); return }
      if (res.data) setRows(prev => [res.data!, ...prev])
      setNewRow(EMPTY); setAdding(false)
    })
  }

  function toggleField(id: string, field: 'nota_emitida' | 'pago', current: boolean) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: !current } : r))
    startTransition(async () => {
      await updateHonorario(id, { [field]: !current })
    })
  }

  function handleDelete(id: string) {
    if (!confirm('Remover este honorário?')) return
    setDeletingId(id)
    startTransition(async () => {
      await deleteHonorario(id)
      setRows(prev => prev.filter(r => r.id !== id))
      setDeletingId(null)
    })
  }

  const totalPendente = rows.filter(r => !r.pago).reduce((s, r) => s + r.valor, 0)
  const totalRecebido = rows.filter(r => r.pago).reduce((s, r) => s + (r.valor_pago ?? r.valor), 0)

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 text-gray-400 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Carregando honorários…</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">

      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-gray-800">Honorários Externos / Aulas</h3>
        </div>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary-light transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Registrar
          </button>
        )}
      </div>

      {/* Totais */}
      {rows.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide mb-0.5">A receber</p>
            <p className="text-lg font-bold text-amber-800">{fmtValor(totalPendente)}</p>
          </div>
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3">
            <p className="text-[10px] font-semibold text-green-600 uppercase tracking-wide mb-0.5">Recebido</p>
            <p className="text-lg font-bold text-green-800">{fmtValor(totalRecebido)}</p>
          </div>
        </div>
      )}

      {/* Formulário de novo honorário */}
      {adding && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Novo honorário</p>
            <button type="button" onClick={() => { setAdding(false); setNewRow(EMPTY); setFormError('') }} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Data</label>
              <input type="date" value={newRow.data} onChange={set('data')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Valor bruto (R$)</label>
              <input type="text" inputMode="decimal" value={newRow.valor} onChange={set('valor')} placeholder="1500,00"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Valor pago líquido <span className="text-gray-400 font-normal">(opcional)</span></label>
              <input type="text" inputMode="decimal" value={newRow.valor_pago} onChange={set('valor_pago')} placeholder="1200,00"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Descrição</label>
            <input type="text" value={newRow.descricao} onChange={set('descricao')} placeholder="Ex: Aula de Nefrologia — residência"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Fonte pagadora</label>
            <input type="text" value={newRow.fonte_pagadora} onChange={set('fonte_pagadora')} placeholder="Ex: AstraZeneca, Fresenius, Einstein..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Observações <span className="text-gray-400 font-normal">(opcional)</span></label>
            <input type="text" value={newRow.obs} onChange={set('obs')} placeholder="Ex: Solicitar NF em agosto"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          {formError && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</p>
          )}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => { setAdding(false); setNewRow(EMPTY); setFormError('') }}
              className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 rounded-lg transition-colors">
              Cancelar
            </button>
            <button type="button" onClick={handleAdd} disabled={isPending}
              className="flex items-center gap-2 px-4 py-1.5 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary-light disabled:opacity-50 transition-colors">
              {isPending ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Salvando...</> : <><Save className="w-3.5 h-3.5" /> Salvar</>}
            </button>
          </div>
        </div>
      )}

      {/* Tabela */}
      {rows.length === 0 && !adding ? (
        <div className="text-center py-12 text-gray-400 text-sm bg-gray-50 rounded-xl border border-gray-200">
          Nenhum honorário registrado ainda.
        </div>
      ) : rows.length > 0 && (
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="hidden sm:grid text-[10px] font-bold text-gray-400 uppercase tracking-widest px-4 py-2 bg-gray-50 border-b border-gray-100"
            style={{ gridTemplateColumns: '80px 1fr 180px 90px 100px 90px 36px' }}>
            <span>Data</span>
            <span>Descrição / Fonte</span>
            <span>Valor</span>
            <span className="text-center">NF emitida</span>
            <span className="text-center">Pago</span>
            <span>Obs</span>
            <span></span>
          </div>

          <div className="divide-y divide-gray-100">
            {rows.map(r => (
              <div key={r.id}
                className="hidden sm:grid items-center px-4 py-2.5 hover:bg-gray-50/60 transition-colors"
                style={{ gridTemplateColumns: '80px 1fr 180px 90px 100px 90px 36px' }}
              >
                <span className="text-xs text-gray-500">{fmtDate(r.data)}</span>
                <div className="min-w-0 pr-3">
                  <p className="text-xs font-semibold text-gray-800 truncate">{r.descricao}</p>
                  <p className="text-[11px] text-gray-400 truncate">{r.fonte_pagadora}</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800">{fmtValor(r.valor)}</p>
                  {r.valor_pago != null && (
                    <p className="text-[11px] text-green-600 font-medium">líq. {fmtValor(r.valor_pago)}</p>
                  )}
                </div>
                {/* NF emitida toggle */}
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => toggleField(r.id, 'nota_emitida', r.nota_emitida)}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                      r.nota_emitida ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-300 hover:bg-gray-200'
                    }`}
                    title={r.nota_emitida ? 'NF emitida — clique para desfazer' : 'Marcar NF como emitida'}
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
                {/* Pago toggle */}
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => toggleField(r.id, 'pago', r.pago)}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                      r.pago ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-300 hover:bg-gray-200'
                    }`}
                    title={r.pago ? 'Pago — clique para desfazer' : 'Marcar como pago'}
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
                <span className="text-[11px] text-gray-400 truncate pr-2">{r.obs ?? ''}</span>
                <button
                  type="button"
                  onClick={() => handleDelete(r.id)}
                  disabled={deletingId === r.id}
                  className="p-1.5 text-gray-300 hover:text-red-400 disabled:opacity-40 transition-colors"
                  title="Remover"
                >
                  {deletingId === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            ))}

            {/* Mobile cards */}
            {rows.map(r => (
              <div key={`m-${r.id}`} className="sm:hidden px-4 py-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-800">{r.descricao}</p>
                    <p className="text-[11px] text-gray-400">{r.fonte_pagadora} · {fmtDate(r.data)}</p>
                  </div>
                  <p className="text-sm font-bold text-gray-800 flex-shrink-0">{fmtValor(r.valor)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => toggleField(r.id, 'nota_emitida', r.nota_emitida)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold transition-colors ${r.nota_emitida ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'}`}>
                    <Check className="w-3 h-3" /> NF emitida
                  </button>
                  <button type="button" onClick={() => toggleField(r.id, 'pago', r.pago)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold transition-colors ${r.pago ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                    <Check className="w-3 h-3" /> Pago
                  </button>
                  <button type="button" onClick={() => handleDelete(r.id)} disabled={deletingId === r.id}
                    className="ml-auto p-1 text-gray-300 hover:text-red-400 disabled:opacity-40">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                {r.obs && <p className="text-[11px] text-gray-400">{r.obs}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
