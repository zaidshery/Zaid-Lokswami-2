export default function SettingsPlaceholderPage() {
  return (
    <div className="mx-auto w-full max-w-4xl rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-red-600 dark:text-red-400">
        Placeholder
      </p>
      <h1 className="mt-2 text-3xl font-black text-zinc-900 dark:text-zinc-100">
        Settings
      </h1>
      <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
        Global admin settings will be added in a later phase. This page exists so
        the super admin sidebar does not lead to a dead route.
      </p>
    </div>
  );
}
