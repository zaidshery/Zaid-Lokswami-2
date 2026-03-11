import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { isAdminRole } from '@/lib/auth/roles';
import AuthSessionProvider from '@/components/providers/SessionProvider';

export default async function AdminRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const user = session?.user;

  if (!user?.email) {
    redirect('/signin?redirect=/admin');
  }

  if (user.isActive === false) {
    redirect('/signin?error=inactive');
  }

  if (!isAdminRole(user.role)) {
    redirect('/signin?error=no_admin_access');
  }

  return <AuthSessionProvider session={session}>{children}</AuthSessionProvider>;
}
