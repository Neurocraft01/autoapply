import { NextResponse } from 'next/server';

// This route is not used with NextAuth.js
// Keeping it for backward compatibility, but it just redirects to dashboard
export async function GET(request: Request) {
  return NextResponse.redirect(new URL('/dashboard', request.url));
}
