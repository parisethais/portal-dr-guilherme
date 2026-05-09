import LoginSplit from '@/components/auth/LoginSplit'

export default function HomePage() {
  return (
    <main style={{
      minHeight: '100vh',
      background: [
        /* canto superior-direito — fonte de luz principal */
        'radial-gradient(ellipse 72% 58% at 88% 6%,  rgba(126,184,212,0.18) 0%, transparent 65%)',
        /* canto inferior-esquerdo — luz secundária mais fria */
        'radial-gradient(ellipse 52% 46% at 6%  90%, rgba(90,155,188,0.14)  0%, transparent 60%)',
        /* canto superior-esquerdo — toque sutil */
        'radial-gradient(ellipse 38% 32% at 10% 10%, rgba(126,184,212,0.08) 0%, transparent 52%)',
        /* base inferior — vinheta escura profunda */
        'radial-gradient(ellipse 60% 40% at 55% 100%,rgba(12,16,26,0.55)    0%, transparent 60%)',
        /* direção geral: topo levemente azulado → base grafite */
        'linear-gradient(158deg, #1E2638 0%, #1A1F2E 50%, #12161F 100%)',
      ].join(','),
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
