'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { X, GripHorizontal } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose?: () => void
  title?: string
  children: React.ReactNode
  className?: string
  closable?: boolean
}

export default function Modal({
  open,
  onClose,
  title,
  children,
  className,
  closable = true,
}: ModalProps) {
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const drag = useRef({
    active: false,
    moved:  false,
    startX: 0,
    startY: 0,
    fromX:  0,
    fromY:  0,
  })

  useEffect(() => {
    if (open) setOffset({ x: 0, y: 0 })
  }, [open])

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!drag.current.active) return
      drag.current.moved = true
      setOffset({
        x: drag.current.fromX + (e.clientX - drag.current.startX),
        y: drag.current.fromY + (e.clientY - drag.current.startY),
      })
    }
    function onUp() {
      if (drag.current.active) {
        drag.current.active = false
        document.body.style.userSelect = ''
        document.body.style.cursor = ''
      }
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
  }, [])

  function onHeaderMouseDown(e: React.MouseEvent) {
    drag.current = {
      active: true,
      moved:  false,
      startX: e.clientX,
      startY: e.clientY,
      fromX:  offset.x,
      fromY:  offset.y,
    }
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'grabbing'
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop — só visual, pointer-events:none para não interceptar cliques */}
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" style={{ pointerEvents: 'none' }} />

      {/*
        Container clicável + scrollável.
        onClick aqui = clicou fora do painel → fecha.
        onMouseDown aqui = reseta "moved" para cliques genuínos no fundo.
      */}
      <div
        className="fixed inset-0 z-50 overflow-y-auto"
        onMouseDown={() => { drag.current.moved = false }}
        onClick={closable ? () => { if (!drag.current.moved) onClose?.() } : undefined}
      >
        <div className="flex min-h-screen items-center justify-center p-4">
          <div
            className={cn(
              'relative bg-white rounded-2xl shadow-2xl w-full max-w-lg select-none',
              className
            )}
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px)`,
              transition: drag.current.active ? 'none' : 'transform 0.15s ease',
            }}
            // impede que cliques DENTRO do painel cheguem ao container externo
            onMouseDown={e => e.stopPropagation()}
            onClick={e => e.stopPropagation()}
          >
            {/* Drag handle + title bar */}
            <div
              onMouseDown={onHeaderMouseDown}
              className="flex items-center justify-between px-6 py-4 border-b border-gray-100 cursor-grab active:cursor-grabbing rounded-t-2xl select-none"
              style={{ touchAction: 'none' }}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <GripHorizontal className="w-4 h-4 text-gray-300 flex-shrink-0" />
                {title && (
                  <h2 className="text-base font-semibold text-gray-900 truncate">{title}</h2>
                )}
              </div>
              {closable && onClose && (
                <button
                  onMouseDown={e => e.stopPropagation()}
                  onClick={onClose}
                  className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 ml-2"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            <div className="p-6 select-text">{children}</div>
          </div>
        </div>
      </div>
    </>
  )
}
