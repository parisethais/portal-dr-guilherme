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
  // Modal é fixed, não precisa travar o scroll do body

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={closable ? onClose : undefined}
      />

      {/* Scroll container */}
      <div className="fixed inset-0 z-50 overflow-y-auto pointer-events-none">
        <div className="flex min-h-screen items-center justify-center p-4">
          <div
            className={cn(
              'relative bg-white rounded-2xl shadow-2xl w-full max-w-lg pointer-events-auto',
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
    </>
  )
}
