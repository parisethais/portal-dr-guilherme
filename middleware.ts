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

    // Usuário autenticado na raiz → redireciona para o dashboard correto
    if (pathname === '/') {
      if (role === 'paciente') return NextResponse.redirect(new URL('/paciente', request.url))
      if (role === 'medico') return NextResponse.redirect(new URL('/medico', request.url))
      return supabaseResponse
    }

    // Role errado em /paciente → manda para /medico (só se role for medico, evita loop)
    if (pathname.startsWith('/paciente') && role === 'medico') {
      return NextResponse.redirect(new URL('/medico', request.url))
    }

    // Role errado em /medico → manda para /paciente (só se role for paciente, evita loop)
    if (pathname.startsWith('/medico') && role === 'paciente') {
      return NextResponse.redirect(new URL('/paciente', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/', '/paciente/:path*', '/medico/:path*', '/auth/callback'],
}
