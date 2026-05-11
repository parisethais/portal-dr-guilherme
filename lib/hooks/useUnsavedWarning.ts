import { useEffect } from 'react'

/**
 * Exibe aviso do browser ao fechar/recarregar a página quando há alterações não salvas.
 * Para proteção na navegação interna (troca de aba/consulta), use a prop onDirtyChange
 * no componente pai para interceptar a mudança com window.confirm.
 */
export function useUnsavedWarning(isDirty: boolean) {
  useEffect(() => {
    if (!isDirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''   // necessário para Chrome/Safari mostrarem o diálogo
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])
}
