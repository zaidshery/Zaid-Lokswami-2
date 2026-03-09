import { redirect } from 'next/navigation';
import { getSuperAdminSession } from '@/lib/auth/admin';
import TeamManagementClient from './TeamManagementClient';

export default async function TeamPage() {
  const admin = await getSuperAdminSession();

  if (!admin) {
    redirect('/admin');
  }

  return <TeamManagementClient />;
}
