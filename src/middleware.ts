import { withAuth } from 'next-auth/middleware';

export const middleware = withAuth({
  pages: {
    signIn: '/auth/signin',
  },
});

export const config = {
  matcher: ['/dashboard/:path*']
};
