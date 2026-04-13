import { redirect } from 'next/navigation';
import { BellRing } from 'lucide-react';
import { getAdminSession } from '@/lib/auth/admin';
import { canViewPage } from '@/lib/auth/permissions';
import { formatUserRoleLabel } from '@/lib/auth/roles';
import { getNewsroomControlCenterData } from '@/lib/admin/newsroomControlCenter';
import formatNumber from '@/lib/utils/formatNumber';
import PushAlertDeskClient from './PushAlertDeskClient';

const META_CHIP_CLASS =
  'inline-flex items-center gap-2 rounded-full border border-zinc-200/80 bg-white/85 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-600 dark:border-white/10 dark:bg-white/[0.05] dark:text-zinc-300';

const PANEL_CLASS =
  'rounded-[32px] border border-zinc-200/80 bg-white/92 p-6 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.38)] dark:border-white/10 dark:bg-zinc-950/60';

export default async function PushAlertsPage() {
  const admin = await getAdminSession();
  if (!admin) {
    redirect('/signin?redirect=/admin/push-alerts');
  }

  if (!canViewPage(admin.role, 'push_alerts')) {
    redirect('/admin');
  }

  const control = await getNewsroomControlCenterData();

  return (
    <div className="mx-auto max-w-[1640px] space-y-8">
      <section className="relative overflow-hidden rounded-[36px] border border-zinc-200/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.97),rgba(249,244,246,0.95)_48%,rgba(244,246,252,0.97)_100%)] p-8 shadow-[0_30px_90px_-52px_rgba(15,23,42,0.42)] dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(18,18,22,0.98),rgba(28,16,20,0.98)_48%,rgba(16,22,32,0.96)_100%)] lg:p-10">
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.28em] text-red-600 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-300">
            {formatUserRoleLabel(admin.role)}
          </div>
          <h1 className="mt-5 text-4xl font-black tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl">
            Push Alerts
          </h1>
          <p className="mt-4 max-w-4xl text-sm leading-7 text-zinc-600 dark:text-zinc-300 sm:text-[15px]">
            Prepare newsroom alert copy from the strongest published and fast-moving stories. This
            desk helps the admin team draft clean push lines before sending them to the final channel.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <span className={META_CHIP_CLASS}>Candidates {formatNumber(control.pushAlertCandidates.length)}</span>
            <span className={META_CHIP_CLASS}>Inbox Pressure {formatNumber(control.stats.inboxNew)}</span>
            <span className={META_CHIP_CLASS}>Queue Ready {formatNumber(control.stats.readyForAdmin)}</span>
          </div>
        </div>
      </section>

      <section className={PANEL_CLASS}>
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-red-500/10 p-3 text-red-600 dark:text-red-300">
            <BellRing className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Alert Desk</h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
              Draft alert language here, then deliver it through your external push-notification channel.
            </p>
          </div>
        </div>
      </section>

      <PushAlertDeskClient candidates={control.pushAlertCandidates} />
    </div>
  );
}
