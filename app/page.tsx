import LoginForm from '@/components/auth/LoginForm'

export default function HomePage() {
  return (
    <main style={{
      minHeight: '100vh',
      backgroundColor: '#1A1F2E',
      display: 'flex',
      flexDirection: 'column',
    }}>

      {/* ── Área central ── */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 16px',
      }}>

        {/* Identidade */}
        <div style={{ textAlign: 'center', marginBottom: 32, userSelect: 'none' }}>
          <p style={{
            fontFamily: 'ui-monospace, SFMono-Regular, monospace',
            fontSize: 10,
            letterSpacing: '0.18em',
            color: 'rgba(255,255,255,0.38)',
            marginBottom: 10,
          }}>
            Clinical Intelligence <span style={{ color: '#7EB8D4' }}>OS</span>
          </p>
          <h1 style={{
            color: '#F5F2EC',
            fontWeight: 500,
            fontSize: 18,
            lineHeight: 1.4,
            margin: 0,
          }}>
            Consultório Dr. Guilherme Santa Catharina
          </h1>
        </div>

        {/* Card */}
        <div style={{
          width: '100%',
          maxWidth: 440,
          backgroundColor: '#21273A',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 20,
          overflow: 'hidden',
        }}>
          <LoginForm />
        </div>
      </div>

      {/* Rodapé */}
      <p style={{
        textAlign: 'center',
        fontSize: 11,
        color: 'rgba(255,255,255,0.2)',
        padding: '0 16px 20px',
        flexShrink: 0,
      }}>
        © {new Date().getFullYear()} Clinical Intelligence OS · Todos os direitos reservados.
      </p>
    </main>
  )
}
