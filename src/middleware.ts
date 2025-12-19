import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const token = await getToken({ 
    req: request,
    secret: process.env.NEXTAUTH_SECRET 
  });

  // Protected routes that require authentication
  const protectedRoutes = ['/dashboard', '/applications', '/settings', '/profile'];
  const isProtectedRoute = protectedRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );

  // Allow access to profile setup even without a complete profile
  const isProfileSetup = request.nextUrl.pathname === '/profile/setup';

  // Auth routes that should redirect to dashboard if already logged in
  const authRoutes = ['/auth/login', '/auth/signup'];
  const isAuthRoute = authRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );

  // Redirect to login if accessing protected route without session
  // But allow profile setup if user is authenticated
  if (isProtectedRoute && !token && !isProfileSetup) {
    const redirectUrl = new URL('/auth/login', request.url);
    redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect to dashboard if accessing auth routes with active session
  if (isAuthRoute && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/applications/:path*',
    '/settings/:path*',
    '/profile/:path*',
    '/auth/login',
    '/auth/signup',
  ],
};
