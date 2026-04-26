import LoginForm from '@/components/auth/LoginForm'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-primary to-primary-light flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo / Cabeçalho */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full shadow-lg mb-4">
            <svg
              className="w-8 h-8 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Portal Dr. Guilherme</h1>
          <p className="text-blue-200 text-sm mt-1">Acesse sua área com segurança</p>
        </div>

        {/* Formulário de login */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <LoginForm />
        </div>

        <p className="text-center text-blue-200 text-xs mt-6">
          © {new Date().getFullYear()} Portal Dr. Guilherme. Todos os direitos reservados.
        </p>
      </div>
    </main>
  )
}
