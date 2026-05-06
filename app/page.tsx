import LoginForm from '@/components/auth/LoginForm'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-primary to-primary-light flex flex-col">
      {/* Área de conteúdo centralizada — rola se o card crescer (signup) */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 pt-6 pb-16 sm:py-6">
        <div className="w-full max-w-md">
          {/* Logo / Cabeçalho */}
          <div className="flex items-center justify-center mb-6 sm:mb-8" style={{ gap: 20 }}>
            <div className="flex items-center justify-center bg-white rounded-full shadow-lg flex-shrink-0" style={{ width: 64, height: 64 }}>
              <img src="/logogui.svg" alt="Logo Dr. Guilherme" className="object-contain" style={{ width: 38, height: 38 }} />
            </div>

            <div className="flex-shrink-0" style={{ width: 1, height: 48, backgroundColor: 'rgba(255,255,255,0.2)' }} />

            <div>
              <p className="uppercase" style={{ fontSize: 10, letterSpacing: '0.16em', color: 'rgba(255,255,255,0.5)' }}>Portal</p>
              <p className="text-white font-medium text-base sm:text-xl">Dr. Guilherme Santa Catharina</p>
            </div>
          </div>

          {/* Formulário de login */}
          <div className="bg-white rounded-2xl shadow-2xl mx-4 sm:mx-0">
            <LoginForm />
          </div>
        </div>
      </div>

      {/* Footer fixo na base, dentro do fundo azul */}
      <p className="shrink-0 text-center text-blue-200 text-xs pb-4 px-4">
        © {new Date().getFullYear()} Portal Dr. Guilherme. Todos os direitos reservados.
      </p>
    </main>
  )
}
