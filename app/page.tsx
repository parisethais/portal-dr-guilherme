import LoginSplit from '@/components/auth/LoginSplit'

export default function HomePage() {
  return (
    <main style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 50% 0%, rgba(126,184,212,0.09) 0%, transparent 55%), #0C1017',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px 20px',
    }}>

      {/* Accent bar — top */}
      <div style={{
        position: 'fixed',
        top: 0, left: 0, right: 0,
        height: 2,
        background: 'linear-gradient(90deg, transparent 0%, #7EB8D4 50%, transparent 100%)',
        opacity: 0.7,
      }} />

      {/* Branding */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <p style={{
          fontFamily: 'var(--font-jakarta)',
          fontSize: 12,
          fontWeight: 500,
          letterSpacing: '0.14em',
          color: 'rgba(255,255,255,0.28)',
          textTransform: 'uppercase',
          margin: '0 0 10px',
        }}>
          Clinical Intelligence{' '}
          <span style={{ color: '#7EB8D4', opacity: 1 }}>OS</span>
        </p>

        <div style={{
          width: 24,
          height: 1,
          backgroundColor: 'rgba(126,184,212,0.2)',
          margin: '0 auto 10px',
        }} />

        <p style={{
          fontFamily: 'var(--font-jakarta)',
          fontSize: 13,
          fontWeight: 300,
          color: 'rgba(255,255,255,0.42)',
          margin: 0,
          letterSpacing: '0.01em',
        }}>
          Consultório Dr. Guilherme Santa Catharina
        </p>
      </div>

      {/* Two-column login */}
      <LoginSplit />

      {/* Footer */}
      <p style={{
        fontFamily: 'ui-monospace, SFMono-Regular, monospace',
        fontSize: 10,
        color: 'rgba(255,255,255,0.1)',
        marginTop: 28,
        letterSpacing: '0.06em',
      }}>
        © {new Date().getFullYear()} Clinical Intelligence OS
      </p>

    </main>
  )
}
