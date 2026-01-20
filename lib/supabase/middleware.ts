import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/signup')
  const isDashboardPage = pathname.startsWith('/dashboard')

  // If user is not authenticated and trying to access protected route
  if (!user && !isAuthPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    const redirectResponse = NextResponse.redirect(url)
    // Copy cookies from supabaseResponse
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
    })
    return redirectResponse
  }

  // If user is authenticated
  if (user) {
    // If on auth pages, redirect to dashboard
    if (isAuthPage) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      // Only redirect if not already going to the target
      if (url.pathname !== pathname) {
        const redirectResponse = NextResponse.redirect(url)
        // Copy cookies from supabaseResponse
        supabaseResponse.cookies.getAll().forEach((cookie) => {
          redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
        })
        return redirectResponse
      }
    }
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you might be causing the browser and server to go out
  // of sync and terminate the user's session prematurely.

  return supabaseResponse
}
