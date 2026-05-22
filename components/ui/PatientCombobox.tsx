'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, X, ChevronDown, User } from 'lucide-react'
import type { Profile } from '@/lib/types'

/** Remove acentos para busca insensível a diacríticos */
function normalize(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

interface PatientComboboxProps {
  patients: Profile[]
  name?: string          // nome do hidden input (para forms)
  value?: string         // patient_id controlado externamente
  onChange?: (id: string) => void
  required?: boolean
  placeholder?: string
}

export default function PatientCombobox({
  patients,
  name = 'patient_id',
  value,
  onChange,
  required = false,
  placeholder = 'Digite o nome do paciente...',
}: PatientComboboxProps) {
  const [query,     setQuery]    = useState('')
  const [open,      setOpen]     = useState(false)
  const [selected,  setSelected] = useState<Profile | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef     = useRef<HTMLInputElement>(null)

  // Sincroniza com value externo
  useEffect(() => {
    if (value) {
      const p = patients.find(p => p.id === value) ?? null
      setSelected(p)
      setQuery(p?.full_name ?? '')
    }
  }, [value, patients])

  // Fecha ao clicar fora
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        // Se não selecionou nada, limpa o texto digitado
        if (!selected) setQuery('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [selected])

  const filtered = patients.filter(p =>
    normalize(p.full_name ?? '').includes(normalize(query))
  )

  function handleSelect(p: Profile) {
    setSelected(p)
    setQuery(p.full_name ?? '')
    setOpen(false)
    onChange?.(p.id)
  }

  function handleClear() {
    setSelected(null)
    setQuery('')
    onChange?.('')
    inputRef.current?.focus()
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value)
    setSelected(null)
    onChange?.('')
    setOpen(true)
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Hidden input para o form */}
      <input type="hidden" name={name} value={selected?.id ?? ''} required={required} />

      {/* Campo visível */}
      <div
        className={`flex items-center gap-2 w-full px-3 py-2 border rounded-lg text-sm bg-white transition-shadow ${
          open ? 'border-primary ring-2 ring-primary/20' : 'border-gray-300'
        }`}
      >
        <Search className="w-4 h-4 text-gray-400 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="flex-1 outline-none bg-transparent placeholder:text-gray-400 text-gray-900"
          autoComplete="off"
        />
        {selected ? (
          <button type="button" onClick={handleClear} className="text-gray-400 hover:text-gray-600 shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <ChevronDown className={`w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          {filtered.length === 0 ? (
            <div className="flex items-center gap-2 px-4 py-3 text-sm text-gray-400">
              <User className="w-4 h-4" />
              Nenhum paciente encontrado
            </div>
          ) : (
            <ul className="max-h-56 overflow-y-auto py-1">
              {filtered.map(p => (
                <li key={p.id}>
                  <button
                    type="button"
                    onMouseDown={() => handleSelect(p)}
                    className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left hover:bg-gray-50 transition-colors ${
                      selected?.id === p.id ? 'bg-primary/5 text-primary font-medium' : 'text-gray-800'
                    }`}
                  >
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                      style={{ backgroundColor: 'rgba(45,43,107,0.08)', color: '#2D2B6B' }}>
                      {(p.full_name ?? '?')[0].toUpperCase()}
                    </div>
                    {p.full_name || 'Nome não informado'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
