import LoginForm from '@/components/auth/LoginForm'

export default function HomePage() {
  return (
    <main
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: '#1A1F2E' }}
    >
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        {/* ── Identidade ── */}
        <div className="text-center mb-8 select-none">
          <p style={{
            fontFamily: 'monospace',
            fontSize: 10,
            letterSpacing: '0.18em',
            color: 'rgba(255,255,255,0.38)',
            marginBottom: 10,
          }}>
            Clinical Intelligence{' '}
            <span style={{ color: '#7EB8D4' }}>OS</span>
          </p>
          <h1 style={{
            color: '#F5F2EC',
            fontWeight: 500,
            fontSize: 20,
            lineHeight: 1.3,
          }}>
            Consultório Dr. Guilherme Santa Catharina
          </h1>
        </div>

        {/* ── Card de login ── */}
        <div
          className="w-full max-w-md overflow-hidden"
          style={{
            backgroundColor: '#21273A',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 20,
          }}
        >
          <LoginForm />
        </div>
      </div>

      {/* ── Rodapé ── */}
      <p
        className="shrink-0 text-center text-xs pb-5 px-4"
        style={{ color: 'rgba(255,255,255,0.2)' }}
      >
        © {new Date().getFullYear()} Clinical Intelligence OS · Todos os direitos reservados.
      </p>
    </main>
  )
}
