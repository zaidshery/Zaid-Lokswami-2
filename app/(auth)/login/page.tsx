import { Suspense } from 'react';
import AdminLoginPage from '@/components/auth/AdminLoginPage';
import { isAdminGoogleAuthConfigured } from '@/lib/auth';

function LoginPageFallback() {
  return <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950" />;
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <AdminLoginPage isGoogleAuthConfigured={isAdminGoogleAuthConfigured} />
    </Suspense>
  );
}
