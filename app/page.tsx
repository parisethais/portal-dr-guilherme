import LoginForm from '@/components/auth/LoginForm'

export default function HomePage() {
  return (
    <main style={{
      minHeight: '100vh',
      backgroundColor: '#1A1F2E',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px 16px',
    }}>

      {/* ── Branding ── */}
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <h1 style={{
          fontFamily: 'var(--font-syne)',
          fontSize: 38,
          fontWeight: 800,
          letterSpacing: '-0.03em',
          color: '#F5F2EC',
          margin: '0 0 10px',
          lineHeight: 1,
        }}>
          Clinical Intelligence{' '}
          <span style={{ color: '#7EB8D4' }}>OS</span>
        </h1>
        <p style={{
          fontFamily: 'var(--font-dm-mono)',
          fontSize: 10,
          letterSpacing: '0.22em',
          color: 'rgba(255,255,255,0.28)',
          textTransform: 'uppercase',
          margin: '0 0 14px',
        }}>
          Sistema Operacional Clínico
        </p>
        <p style={{
          fontFamily: 'var(--font-syne)',
          fontSize: 15,
          fontWeight: 700,
          color: 'rgba(255,255,255,0.5)',
          margin: 0,
          letterSpacing: '-0.01em',
        }}>
          Consultório Dr. Guilherme Santa Catharina
        </p>
      </div>

      {/* ── Card ── */}
      <div style={{
        width: '100%',
        maxWidth: 440,
        backgroundColor: '#21273A',
        borderRadius: 18,
        border: '1px solid rgba(255,255,255,0.07)',
        overflow: 'hidden',
      }}>
        <LoginForm />
      </div>

      {/* ── Rodapé ── */}
      <p style={{
        fontFamily: 'ui-monospace, SFMono-Regular, monospace',
        fontSize: 10,
        color: 'rgba(255,255,255,0.14)',
        marginTop: 32,
        letterSpacing: '0.06em',
      }}>
        © {new Date().getFullYear()} Clinical Intelligence OS
      </p>

    </main>
  )
}
