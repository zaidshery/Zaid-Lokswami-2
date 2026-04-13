import Link from 'next/link';
import { AlertTriangle, CheckCircle2, ShieldCheck, Terminal } from 'lucide-react';
import { getDeploymentSafeguardsSnapshot } from '@/lib/admin/deploymentSafeguards';
import formatNumber from '@/lib/utils/formatNumber';

function cx(...classes: Array<string | undefined | false>) {
  return classes.filter(Boolean).join(' ');
}

const PANEL_CLASS =
  'rounded-[32px] border border-zinc-200/80 bg-white/92 p-6 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.38)] dark:border-white/10 dark:bg-zinc-950/60';

const ACTION_LINK_CLASS =
  'inline-flex items-center gap-2 rounded-full border border-zinc-200/80 bg-white/85 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-700 transition-colors hover:border-red-400/30 hover:text-red-600 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200 dark:hover:border-red-500/30 dark:hover:text-red-300';

function getStatusToneClass(status: 'healthy' | 'watch' | 'critical') {
  switch (status) {
    case 'healthy':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300';
    case 'watch':
      return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300';
    case 'critical':
    default:
      return 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300';
  }
}

export default async function DeploymentSafeguardsPanel() {
  const safeguards = getDeploymentSafeguardsSnapshot();

  const summaryCards = [
    {
      label: 'Healthy',
      value: safeguards.summary.healthy,
      detail: 'Checks already aligned for production.',
      icon: CheckCircle2,
      tone: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300',
    },
    {
      label: 'Needs Review',
      value: safeguards.summary.watch,
      detail: 'Checks that are usable but still need stronger production setup.',
      icon: ShieldCheck,
      tone: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300',
    },
    {
      label: 'Critical',
      value: safeguards.summary.critical,
      detail: 'Checks that can block safe deploy or live admin runtime.',
      icon: AlertTriangle,
      tone: 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300',
    },
  ];

  return (
    <section className={PANEL_CLASS}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-red-600">
            Phase 5 Hardening
          </p>
          <h2 className="mt-2 text-2xl font-black text-zinc-900 dark:text-zinc-100">
            Deployment Safeguards
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-600 dark:text-zinc-300">
            Production-readiness checks for the runtime assumptions behind admin access, uploads,
            AI, OCR, and leadership automation. Use this before deploys and after environment changes.
          </p>
        </div>
        <div className="rounded-[24px] border border-zinc-200/80 bg-zinc-50/95 px-4 py-3 text-right dark:border-white/10 dark:bg-white/5">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Recommended Flow
          </p>
          <p className="mt-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Env Check {'->'} Build {'->'} Live Verify
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="group relative overflow-hidden rounded-[28px] border border-zinc-200/80 bg-zinc-50/95 p-5 shadow-sm dark:border-white/10 dark:bg-white/5"
          >
            <div className={cx('pointer-events-none absolute -right-5 -top-5 h-24 w-24 rounded-full opacity-20 blur-2xl', card.tone)} />
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
                  {card.label}
                </p>
                <p className="mt-4 text-4xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">
                  {formatNumber(card.value)}
                </p>
              </div>
              <div className={`rounded-2xl p-3 ring-1 ring-black/5 dark:ring-white/10 ${card.tone}`}>
                <card.icon className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-zinc-600 dark:text-zinc-300">{card.detail}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr,1fr]">
        <section className="rounded-[28px] border border-zinc-200/80 bg-zinc-50/95 p-5 dark:border-white/10 dark:bg-white/5">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Runtime Checks</h3>
          <div className="mt-4 space-y-3">
            {safeguards.checks.map((check) => (
              <div
                key={check.id}
                className="rounded-[22px] border border-zinc-200/80 bg-white/92 p-4 dark:border-white/10 dark:bg-zinc-950/55"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {check.label}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{check.summary}</p>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusToneClass(check.status)}`}>
                    {check.status === 'critical'
                      ? 'Critical'
                      : check.status === 'watch'
                        ? 'Needs Review'
                        : 'Healthy'}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-300">{check.detail}</p>
                {check.href ? (
                  <div className="mt-3">
                    <Link href={check.href} className={ACTION_LINK_CLASS}>
                      Open related surface
                    </Link>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <section className="rounded-[28px] border border-zinc-200/80 bg-zinc-50/95 p-5 dark:border-white/10 dark:bg-white/5">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-zinc-200/80 bg-white/92 p-3 text-zinc-700 dark:border-white/10 dark:bg-zinc-950/55 dark:text-zinc-200">
                <Terminal className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Verification Commands</h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-300">
                  Run these before and after production deploys.
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {safeguards.commands.map((command) => (
                <div
                  key={command.id}
                  className="rounded-[22px] border border-zinc-200/80 bg-white/92 p-4 dark:border-white/10 dark:bg-zinc-950/55"
                >
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{command.label}</p>
                  <p className="mt-2 rounded-xl bg-zinc-950 px-3 py-2 font-mono text-xs text-zinc-100 dark:bg-black">
                    {command.command}
                  </p>
                  <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{command.description}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-zinc-200/80 bg-zinc-50/95 p-5 dark:border-white/10 dark:bg-white/5">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Deployment Guides</h3>
            <div className="mt-4 space-y-3">
              {safeguards.docs.map((doc) => (
                <div
                  key={doc.path}
                  className="rounded-[22px] border border-zinc-200/80 bg-white/92 p-4 dark:border-white/10 dark:bg-zinc-950/55"
                >
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{doc.label}</p>
                  <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                    <Link href={doc.path} className="font-semibold text-red-600 hover:text-red-500">
                      {doc.path}
                    </Link>
                  </p>
                </div>
              ))}
            </div>
          </section>
        </section>
      </div>
    </section>
  );
}
