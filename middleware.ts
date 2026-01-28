import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Check if user is authenticated
  const isAuthenticated = request.cookies.get('dashboard-auth')?.value === 'true'
  
  // If trying to access main page without auth, redirect to login
  if (request.nextUrl.pathname === '/' && !isAuthenticated) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  // If authenticated and trying to access login, redirect to dashboard
  if (request.nextUrl.pathname === '/login' && isAuthenticated) {
    return NextResponse.redirect(new URL('/', request.url))
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/login']
}
