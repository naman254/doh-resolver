import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone()

  // Protect all /dashboard routes
  if (url.pathname.startsWith('/dashboard')) {
    const sessionCookie = req.cookies.get('iron-session')
    if (!sessionCookie) {
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*']
}
