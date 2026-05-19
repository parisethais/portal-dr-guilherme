import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type SetAllCookies } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  // Remove headers que o cliente possa ter enviado (evita spoofing)
  const sanitizedHeaders = new Headers(request.headers)
  sanitizedHeaders.delete('x-user-id')
  sanitizedHeaders.delete('x-user-role')
  request = new NextRequest(request.url, { headers: sanitizedHeaders, method: request.method, body: request.body })

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

    const isStaff = role === 'medico' || role === 'secretaria' || role === 'superadmin'

    // Passa user info via headers para Server Components não precisarem chamar getUser() de novo
    // (evita problema de refresh token já consumido pelo middleware)
    const withUserHeaders = () => {
      const h = new Headers(request.headers)
      h.set('x-user-id', user.id)
      h.set('x-user-role', role!)
      const res = NextResponse.next({ request: { headers: h } })
      supabaseResponse.cookies.getAll().forEach(c => res.cookies.set(c.name, c.value))
      return res
    }

    // Superadmin tentando acessar /admin → deixa passar
    if (pathname.startsWith('/admin') && role !== 'superadmin') {
      return NextResponse.redirect(new URL('/medico', request.url))
    }

    // Usuário autenticado na raiz → redireciona para o dashboard correto
    if (pathname === '/') {
      if (role === 'paciente')   return NextResponse.redirect(new URL('/paciente', request.url))
      if (role === 'superadmin') return NextResponse.redirect(new URL('/admin', request.url))
      if (isStaff)               return NextResponse.redirect(new URL('/medico', request.url))
      return supabaseResponse
    }

    // Superadmin pode visitar /medico e /paciente livremente (preview)
    if (role === 'superadmin' && (pathname.startsWith('/medico') || pathname.startsWith('/paciente'))) {
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

    // Para /medico e /paciente com role correto, também passa os headers
    if (pathname.startsWith('/medico') || pathname.startsWith('/paciente')) {
      return withUserHeaders()
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/', '/paciente/:path*', '/medico/:path*', '/admin/:path*', '/auth/callback'],
}
