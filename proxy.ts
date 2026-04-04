import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decode } from 'next-auth/jwt';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Never intercept NextAuth API routes or public assets
  if (
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const sessionToken = request.cookies.get('next-auth.session-token')?.value ||
    request.cookies.get('__Secure-next-auth.session-token')?.value;

  if (!sessionToken) {
    if (pathname.startsWith('/admin') || pathname.startsWith('/org')) {
      return NextResponse.redirect(new URL('/admin-login', request.url));
    }
    if (pathname.startsWith('/user')) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }

  try {
    const decoded = await decode({
      token: sessionToken,
      secret: process.env.NEXTAUTH_SECRET as string,
    });

    if (!decoded) {
      if (pathname.startsWith('/admin') || pathname.startsWith('/org')) {
        return NextResponse.redirect(new URL('/admin-login', request.url));
      }
      if (pathname.startsWith('/user')) {
        return NextResponse.redirect(new URL('/login', request.url));
      }
      return NextResponse.next();
    }

    const userRole = decoded.role as string;
    const userOrgs = (decoded.orgs as string[]) || [];

    // Superadmin can access everything
    if (userRole === 'superadmin') {
      return NextResponse.next();
    }

    // Org admin can access /org
    if (pathname.startsWith('/org')) {
      if (userRole === 'org_admin') {
        const orgIdMatch = pathname.match(/\/org\/([^\/]+)/);
        if (orgIdMatch) {
          const orgId = orgIdMatch[1];
          if (userOrgs.includes(orgId)) {
            return NextResponse.next();
          }
        }
        if (userOrgs.length > 0) {
          return NextResponse.redirect(new URL(`/org/${userOrgs[0]}`, request.url));
        }
      }
      return NextResponse.redirect(new URL('/', request.url));
    }

    // Protect /admin routing
    if (pathname.startsWith('/admin') && userRole !== 'superadmin') {
      return NextResponse.redirect(new URL('/', request.url));
    }

  } catch (error) {
    console.error('Proxy: Error decoding token', error);
    if (pathname.startsWith('/admin') || pathname.startsWith('/org')) {
      return NextResponse.redirect(new URL('/admin-login', request.url));
    }
    if (pathname.startsWith('/user')) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - api/auth (NextAuth routes)
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, public assets
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|complete-registration|reset-password|forgot-password|login|admin-login|verify).*)',
  ],
};
