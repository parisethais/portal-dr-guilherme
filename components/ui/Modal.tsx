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
    moved:  false,   // true se houve movimento real durante o drag
    startX: 0,
    startY: 0,
    fromX:  0,
    fromY:  0,
  })
  // true só quando o mousedown aconteceu diretamente no backdrop
  const backdropDown = useRef(false)

  // Reset position when modal opens
  useEffect(() => {
    if (open) setOffset({ x: 0, y: 0 })
  }, [open])

  // Global mouse events for drag
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
      {/* Backdrop — fecha só se o mousedown veio do backdrop (não do painel) */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        onMouseDown={() => { backdropDown.current = true }}
        onClick={() => {
          if (closable && backdropDown.current && !drag.current.moved) onClose?.()
          backdropDown.current = false
        }}
      />

      {/* Scroll container + centering */}
      <div className="fixed inset-0 z-50 overflow-y-auto pointer-events-none">
        <div className="flex min-h-screen items-center justify-center p-4">
          <div
            className={cn(
              'relative bg-white rounded-2xl shadow-2xl w-full max-w-lg pointer-events-auto select-none',
              className
            )}
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px)`,
              transition: drag.current.active ? 'none' : 'transform 0.15s ease',
            }}
            // cancela a flag do backdrop quando o mousedown é dentro do painel
            onMouseDown={() => { backdropDown.current = false }}
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
                  onMouseDown={e => e.stopPropagation()} // não inicia drag ao clicar no X
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
