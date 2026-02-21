import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // In a real app, we would use supabase-js helper for server-side auth check
  // and check the 'role' field in our custom 'users' table.
  
  const path = request.nextUrl.pathname;

  // Protect dashboard routes
  if (path.startsWith('/dashboard')) {
    // If no token/session, redirect to login
    // const session = await getSession(request);
    // if (!session) return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  // Protect admin routes
  if (path.startsWith('/admin')) {
    // Check if user has platform_admin role
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*'],
};