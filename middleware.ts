
import { NextResponse, type NextRequest } from 'next/server';
import { verifySession } from './lib/auth';

export async function middleware(request: NextRequest) {
  const currentUser = await verifySession();
  const { pathname } = request.nextUrl;

  const publicRoutes = ['/', '/login', '/signup', '/app-release.apk'];
  const isPublicRoute = publicRoutes.some(route => pathname === route);
  
  // If trying to access a non-public API route without a session, deny access
  if (pathname.startsWith('/api/') && !pathname.startsWith('/api/auth') && !currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // If user is trying to access auth pages but is already logged in, redirect to dashboard
  if (currentUser && (pathname.startsWith('/login') || pathname.startsWith('/signup'))) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  // If user is trying to access a protected route and is not logged in, redirect to login
  if (!currentUser && !isPublicRoute && !pathname.startsWith('/api/')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // RBAC is now primarily handled in the UI by conditionally rendering links.
  // The middleware focuses on authentication.
  // Direct access attempts to unauthorized pages will result in the app shell loading,
  // but the user won't see any links to get there, and the pages themselves might show an unauthorized message
  // or redirect if they have their own server-side checks.

  return NextResponse.next();
}

export const config = {
  // Match all routes except for static assets, and image optimization files.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
