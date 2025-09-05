import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Public routes that don't need auth
  if (pathname === '/' || pathname === '/onboarding') {
    return NextResponse.next();
  }

  // Check Firebase Auth token from the request
  const authToken = request.headers.get('authorization')?.replace('Bearer ', '');
  
  if (!authToken && (pathname.startsWith('/teacher') || pathname.startsWith('/parent'))) {
    // Redirect to onboarding with role parameter
    const role = pathname.startsWith('/teacher') ? 'teacher' : 'parent';
    return NextResponse.redirect(new URL(`/onboarding?role=${role}`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/teacher/:path*', '/parent/:path*']
};