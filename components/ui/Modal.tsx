'use client'

import { useEffect } from 'react'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

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
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop — fixed so it doesn't scroll with the panel */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={closable ? onClose : undefined}
      />
      {/* Centering wrapper */}
      <div className="flex min-h-full items-center justify-center p-4">
      <div
        className={cn(
          'relative bg-white rounded-2xl shadow-2xl w-full max-w-lg',
          className
        )}
      >
        {title && (
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            {closable && onClose && (
              <button
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
      </div>
    </div>
  )
}
