import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { password } = await request.json()
  
  // Check password against environment variable
  if (password === process.env.DASHBOARD_PASSWORD) {
    const response = NextResponse.json({ success: true })
    
    // Set HTTP-only cookie for security
    response.cookies.set('dashboard-auth', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    })
    
    return response
  }
  
  return NextResponse.json({ success: false }, { status: 401 })
}
