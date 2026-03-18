import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decode } from 'next-auth/jwt';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const sessionToken = request.cookies.get('next-auth.session-token')?.value || 
                       request.cookies.get('__Secure-next-auth.session-token')?.value;

  if (!sessionToken) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const decoded = await decode({
      token: sessionToken,
      secret: process.env.NEXTAUTH_SECRET as string,
    });

    if (!decoded) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const userRole = decoded.role as string;
    const userOrgs = (decoded.orgs as string[]) || [];

    // Superadmin can access /admin and /org
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
        // If they try to access an org they don't admin, redirect to their first org or home
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
    console.error('Error decoding token', error);
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/org/:path*'],
};
