import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type SetAllCookies } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Rotas públicas: nunca redirecionar
  if (pathname === '/auth/callback') {
    return supabaseResponse
  }

  // Não autenticado tentando acessar rota protegida
  if (!user && (pathname.startsWith('/paciente') || pathname.startsWith('/medico'))) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Usuário autenticado: consulta o perfil uma única vez
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profile?.role

    // Sem perfil: deixa passar para a página tratar (evita loop entre /paciente ↔ /medico)
    if (!role) {
      return supabaseResponse
    }

    const isStaff = ['medico', 'secretaria', 'recepcionista', 'administrativo', 'superadmin'].includes(role)

    // Helper: cria resposta com user headers injetados + cookies do Supabase preservados
    // Os headers são injetados no REQUEST (não no response) para que o Server Component possa lê-los via headers()
    // Como fazemos h.set() APÓS copiar os headers do request, sobrescrevemos qualquer valor enviado pelo cliente
    const withUserHeaders = (): NextResponse => {
      const h = new Headers(request.headers)
      h.set('x-user-id', user.id)           // sobrescreve qualquer header enviado pelo browser
      h.set('x-user-role', role!)

      const res = NextResponse.next({ request: { headers: h } })

      // Copia os Set-Cookie do supabaseResponse preservando todos os atributos (httpOnly, sameSite, etc.)
      // getSetCookie() retorna array de strings raw, cada uma com todos os atributos
      const rawSetCookies: string[] =
        typeof (supabaseResponse.headers as any).getSetCookie === 'function'
          ? (supabaseResponse.headers as any).getSetCookie()
          : []

      rawSetCookies.forEach(c => res.headers.append('set-cookie', c))

      return res
    }

    // Superadmin tentando acessar /admin → injeta headers e deixa passar
    if (pathname.startsWith('/admin')) {
      if (role !== 'superadmin') return NextResponse.redirect(new URL('/medico', request.url))
      return withUserHeaders()
    }

    // Usuário autenticado na raiz → redireciona para o dashboard correto
    if (pathname === '/') {
      if (role === 'paciente')   return NextResponse.redirect(new URL('/paciente', request.url))
      if (role === 'superadmin') return NextResponse.redirect(new URL('/admin', request.url))
      if (isStaff)               return NextResponse.redirect(new URL('/medico', request.url))
      return supabaseResponse
    }

    // Superadmin em /medico: permite via ?tenant= explícito OU via domínio customizado
    // (ex: santa-catharina.meden.health/medico/configuracoes)
    // Sem tenant E sem domínio customizado → painel admin
    if (role === 'superadmin' && pathname.startsWith('/medico')) {
      const tenant      = request.nextUrl.searchParams.get('tenant')
      const host        = request.headers.get('host') ?? ''
      const isCustomDomain = host
        && !host.includes('localhost')
        && !host.includes('127.0.0.1')
        && !host.includes('.vercel.app')
      if (!tenant && !isCustomDomain) return NextResponse.redirect(new URL('/admin', request.url))
      return withUserHeaders()
    }

    // Superadmin pode visitar /paciente livremente (para suporte)
    if (role === 'superadmin' && pathname.startsWith('/paciente')) {
      return withUserHeaders()
    }

    // Role errado em /paciente → manda para /medico
    if (pathname.startsWith('/paciente') && isStaff) {
      return NextResponse.redirect(new URL('/medico', request.url))
    }

    // Role errado em /medico → manda para /paciente
    if (pathname.startsWith('/medico') && role === 'paciente') {
      return NextResponse.redirect(new URL('/paciente', request.url))
    }

    // Médico/secretaria em /medico e paciente em /paciente: injeta headers também
    if (pathname.startsWith('/medico') || pathname.startsWith('/paciente')) {
      return withUserHeaders()
    }
  }

  return supabaseResponse
}

export const config = {
  // '/admin' precisa estar explícito — '/admin/:path*' pode não capturar o path bare em server action POSTs
  matcher: ['/', '/paciente/:path*', '/medico/:path*', '/admin', '/admin/:path*', '/auth/callback'],
}
