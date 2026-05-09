import LoginSplit from '@/components/auth/LoginSplit'

export default function HomePage() {
  return (
    <main style={{
      minHeight: '100vh',
      background: [
        'radial-gradient(ellipse 58% 44% at 94% 6%,  rgba(126,184,212,0.11) 0%, transparent 60%)',
        'radial-gradient(ellipse 46% 40% at 4%  92%, rgba(126,184,212,0.08) 0%, transparent 55%)',
        '#F5F2EC',
      ].join(','),
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px 48px',
    }}>

      {/* Linha de acento no topo */}
      <div style={{
        position: 'fixed',
        top: 0, left: 0, right: 0,
        height: 3,
        background: 'linear-gradient(90deg, transparent 0%, #7EB8D4 50%, transparent 100%)',
        opacity: 0.6,
      }} />

      <LoginSplit />

      <p style={{
        fontFamily: 'ui-monospace, SFMono-Regular, monospace',
        fontSize: 10,
        color: 'rgba(26,31,46,0.2)',
        marginTop: 24,
        letterSpacing: '0.06em',
      }}>
        © {new Date().getFullYear()} Clinical Intelligence OS · by Firm Collective
      </p>
    </main>
  )
}
