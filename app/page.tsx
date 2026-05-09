import LoginForm from '@/components/auth/LoginForm'

export default function HomePage() {
  return (
    <div className="flex flex-col md:flex-row min-h-screen">

      {/* ══ Coluna esquerda — identidade ══════════════════════════ */}
      <div
        className="flex flex-col md:w-1/2 md:min-h-screen"
        style={{ backgroundColor: '#1A1F2E', padding: '28px 44px' }}
      >
        {/* Label sistema — topo */}
        <p style={{
          fontFamily: 'ui-monospace, SFMono-Regular, monospace',
          fontSize: 10,
          letterSpacing: '0.16em',
          color: 'rgba(255,255,255,0.38)',
          margin: 0,
        }}>
          Clinical Intelligence <span style={{ color: '#7EB8D4' }}>OS</span>
        </p>

        {/* Nome + tagline — centro no desktop, compacto no mobile */}
        <div className="flex flex-col justify-center flex-1 py-8 md:py-0">
          <h1
            className="text-lg md:text-4xl"
            style={{
              color: '#F5F2EC',
              fontWeight: 700,
              lineHeight: 1.18,
              letterSpacing: '-0.02em',
              margin: '0 0 20px 0',
            }}
          >
            Consultório Dr. Guilherme<br className="hidden md:block" /> Santa Catharina
          </h1>

          <div style={{ width: 36, height: 2, backgroundColor: '#7EB8D4', marginBottom: 14, borderRadius: 2 }} />

          <p
            className="hidden md:block"
            style={{ color: 'rgba(255,255,255,0.38)', fontSize: 13, margin: 0, lineHeight: 1.5 }}
          >
            Sistema operacional do seu consultório
          </p>
        </div>

        {/* Rodapé — só desktop */}
        <p className="hidden md:block" style={{
          fontFamily: 'ui-monospace, SFMono-Regular, monospace',
          fontSize: 10,
          color: 'rgba(255,255,255,0.18)',
          letterSpacing: '0.04em',
          margin: 0,
        }}>
          © {new Date().getFullYear()} Clinical Intelligence OS · by MedEn
        </p>
      </div>

      {/* ══ Coluna direita — formulário ═══════════════════════════ */}
      <div
        className="flex-1 flex items-center justify-center"
        style={{ backgroundColor: '#F2F4F8', padding: '48px 24px' }}
      >
        <div style={{ width: '100%', maxWidth: 380 }}>
          <LoginForm />
        </div>
      </div>

    </div>
  )
}
