
import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const secretKey = process.env.JWT_SECRET || 'f4d3b8e0a6c2d1e8f7a9b3c5d6e7f8a9b3c5d6e7f8a9b3c5d6e7f8a9b3c5d6e7';
const key = new TextEncoder().encode(secretKey);

async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ['HS256'] });
    return payload;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Immediately bypass upload endpoints to prevent stream buffering on large files (up to 100MB)
  if (pathname.startsWith('/api/templates/upload')) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get('session')?.value;
  const session = sessionCookie ? await verifyToken(sessionCookie) : null;
  const currentUser = session?.userId ? session : null;

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

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/templates/upload).*)'],
};

