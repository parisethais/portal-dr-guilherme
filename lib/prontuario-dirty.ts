/**
 * Módulo singleton (client-side) que rastreia se há alterações não salvas
 * no prontuário. Usado por qualquer componente que precise interceptar
 * navegação (abas, voltar, troca de paciente) sem prop drilling.
 */

let _dirty = false

export function setProntuarioDirty(v: boolean) {
  _dirty = v
}

export function isProntuarioDirty() {
  return _dirty
}

/**
 * Executa `action` somente se não houver alterações pendentes,
 * ou se o usuário confirmar que quer sair sem salvar.
 */
export function guardNavigation(action: () => void) {
  if (
    _dirty &&
    !window.confirm('Você tem alterações não salvas no prontuário.\nDeseja sair sem salvar o rascunho?')
  ) {
    return
  }
  _dirty = false
  action()
}
