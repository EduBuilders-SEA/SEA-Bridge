import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export async function middleware(_request: NextRequest) {
  // With Firebase Auth as third-party provider, we can't check auth in middleware
  // because Supabase doesn't manage the sessions - Firebase does.
  // Let client-side components handle auth redirects using useAuth() + useProfile()
  return NextResponse.next();
}

export const config = {
  matcher: ['/teacher/:path*', '/parent/:path*'],
};
