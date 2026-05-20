import LoginSplit from '@/components/auth/LoginSplit'

export default function HomePage() {
  return (
    <main style={{
      minHeight: '100vh',
      background: [
        'radial-gradient(ellipse 58% 44% at 94% 6%,  rgba(122,158,126,0.12) 0%, transparent 60%)',
        'radial-gradient(ellipse 46% 40% at 4%  92%, rgba(122,158,126,0.09) 0%, transparent 55%)',
        '#F5F0E8',
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
        background: 'linear-gradient(90deg, transparent 0%, #7A9E7E 50%, transparent 100%)',
        opacity: 0.6,
      }} />

      <LoginSplit />

      <p style={{
        fontFamily: 'ui-monospace, SFMono-Regular, monospace',
        fontSize: 10,
        color: 'rgba(45,43,107,0.22)',
        marginTop: 24,
        letterSpacing: '0.06em',
      }}>
        © {new Date().getFullYear()} MedEn · by Firm Collective
      </p>
    </main>
  )
}
