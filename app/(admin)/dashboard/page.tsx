import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { isAdminRole } from '@/lib/auth/roles';

export default async function DashboardPage() {
  const session = await auth();

  if (
    !session?.user?.email ||
    !isAdminRole(session.user.role) ||
    session.user.isActive === false
  ) {
    redirect('/signin?redirect=/admin');
  }

  redirect('/admin');
}
