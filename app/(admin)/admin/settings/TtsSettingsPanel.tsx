'use client';

import { useCallback, useEffect, useState } from 'react';

type SurfaceKey = 'breaking' | 'article' | 'epaper';

type SurfaceConfig = {
  enabled: boolean;
  autoGenerate: boolean;
  defaultLanguageCode: string;
  defaultVoice: string;
};

type SettingsPayload = {
  config: {
    regenerateMissingFiles: boolean;
    retentionDays: number;
    forceStorage: boolean;
    surfaces: Record<SurfaceKey, SurfaceConfig>;
    prewarm: {
      latestBreakingLimit: number;
      latestArticleLimit: number;
      latestEpaperStoryLimit: number;
    };
  };
  runtime: {
    configured: boolean;
    provider: string;
    model: string;
    defaultVoice: string;
    maxCharacters: number;
    supportedLanguages: Array<{ code: string; label: string }>;
    voices: Array<{ id: string; label: string }>;
    env: {
      geminiApiKeyConfigured: boolean;
      forceStorageEnv: boolean;
      storageUploadsBaseDir: string;
    };
  };
};

type SettingsResponse = {
  success?: boolean;
  data?: SettingsPayload;
  error?: string;
};

const SURFACE_LABELS: Record<SurfaceKey, string> = {
  breaking: 'Breaking ticker',
  article: 'Article listen',
  epaper: 'E-paper story',
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message.trim() ? error.message : fallback;
}

export default function TtsSettingsPanel() {
  const [payload, setPayload] = useState<SettingsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/tts/settings', { cache: 'no-store' });
      const data = (await response.json().catch(() => ({}))) as SettingsResponse;
      if (!response.ok || !data.success || !data.data) {
        throw new Error(data.error || 'Failed to load TTS settings.');
      }
      setPayload(data.data);
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Failed to load TTS settings.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const updateSurface = useCallback(
    (surface: SurfaceKey, patch: Partial<SurfaceConfig>) => {
      setPayload((current) =>
        current
          ? {
              ...current,
              config: {
                ...current.config,
                surfaces: {
                  ...current.config.surfaces,
                  [surface]: {
                    ...current.config.surfaces[surface],
                    ...patch,
                  },
                },
              },
            }
          : current
      );
    },
    []
  );

  const updatePrewarm = useCallback(
    (key: 'latestBreakingLimit' | 'latestArticleLimit' | 'latestEpaperStoryLimit', value: string) => {
      setPayload((current) =>
        current
          ? {
              ...current,
              config: {
                ...current.config,
                prewarm: {
                  ...current.config.prewarm,
                  [key]: Number.parseInt(value || '0', 10) || 0,
                },
              },
            }
          : current
      );
    },
    []
  );

  const handleSave = useCallback(async () => {
    if (!payload) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/admin/tts/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload.config),
      });
      const data = (await response.json().catch(() => ({}))) as SettingsResponse;
      if (!response.ok || !data.success || !data.data) {
        throw new Error(data.error || 'Failed to update TTS settings.');
      }
      setPayload(data.data);
      setSuccess('TTS settings updated.');
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Failed to update TTS settings.'));
    } finally {
      setSaving(false);
    }
  }, [payload]);

  if (loading && !payload) {
    return (
      <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading TTS settings...</p>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <p className="text-sm text-red-600 dark:text-red-400">
          {error || 'Unable to load TTS settings.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-red-600 dark:text-red-400">
          Global TTS
        </p>
        <h1 className="mt-2 text-3xl font-black text-zinc-900 dark:text-zinc-100">
          TTS Settings
        </h1>
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          Control default behavior for breaking news, articles, and e-paper story audio.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Runtime
            </p>
            <p className="mt-2 text-lg font-bold text-zinc-900 dark:text-zinc-100">
              {payload.runtime.configured ? 'Configured' : 'Missing Gemini'}
            </p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {payload.runtime.provider} | {payload.runtime.model}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Storage
            </p>
            <p className="mt-2 text-lg font-bold text-zinc-900 dark:text-zinc-100">
              {payload.config.forceStorage ? 'Durable storage' : 'Public allowed'}
            </p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {payload.runtime.env.storageUploadsBaseDir}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Limits
            </p>
            <p className="mt-2 text-lg font-bold text-zinc-900 dark:text-zinc-100">
              {payload.runtime.maxCharacters} chars
            </p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Default voice: {payload.runtime.defaultVoice}
            </p>
          </div>
        </div>

        {error ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </p>
        ) : null}

        {success ? (
          <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
            {success}
          </p>
        ) : null}
      </div>

      <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Retention days
            </span>
            <input
              type="number"
              min={1}
              max={3650}
              value={payload.config.retentionDays}
              onChange={(event) =>
                setPayload((current) =>
                  current
                    ? {
                        ...current,
                        config: {
                          ...current.config,
                          retentionDays: Number.parseInt(event.target.value || '1', 10) || 1,
                        },
                      }
                    : current
                )
              }
              className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </label>

          <label className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Breaking prewarm
            </span>
            <input
              type="number"
              min={0}
              max={1000}
              value={payload.config.prewarm.latestBreakingLimit}
              onChange={(event) => updatePrewarm('latestBreakingLimit', event.target.value)}
              className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </label>

          <label className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Article prewarm
            </span>
            <input
              type="number"
              min={0}
              max={1000}
              value={payload.config.prewarm.latestArticleLimit}
              onChange={(event) => updatePrewarm('latestArticleLimit', event.target.value)}
              className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </label>

          <label className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              E-paper prewarm
            </span>
            <input
              type="number"
              min={0}
              max={5000}
              value={payload.config.prewarm.latestEpaperStoryLimit}
              onChange={(event) => updatePrewarm('latestEpaperStoryLimit', event.target.value)}
              className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </label>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="flex items-start gap-3 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
            <input
              type="checkbox"
              checked={payload.config.regenerateMissingFiles}
              onChange={(event) =>
                setPayload((current) =>
                  current
                    ? {
                        ...current,
                        config: {
                          ...current.config,
                          regenerateMissingFiles: event.target.checked,
                        },
                      }
                    : current
                )
              }
              className="mt-1 h-4 w-4 rounded border-zinc-300 text-red-600 focus:ring-red-500"
            />
            <span className="text-sm text-zinc-700 dark:text-zinc-300">
              Re-generate missing assets when they are detected.
            </span>
          </label>

          <label className="flex items-start gap-3 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
            <input
              type="checkbox"
              checked={payload.config.forceStorage}
              onChange={(event) =>
                setPayload((current) =>
                  current
                    ? {
                        ...current,
                        config: {
                          ...current.config,
                          forceStorage: event.target.checked,
                        },
                      }
                    : current
                )
              }
              className="mt-1 h-4 w-4 rounded border-zinc-300 text-red-600 focus:ring-red-500"
            />
            <span className="text-sm text-zinc-700 dark:text-zinc-300">
              Force durable storage for generated audio.
            </span>
          </label>
        </div>
      </div>

      <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-100">Surface defaults</h2>
        <div className="mt-6 grid gap-4 xl:grid-cols-3">
          {(['breaking', 'article', 'epaper'] as SurfaceKey[]).map((surface) => (
            <div
              key={surface}
              className="rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800"
            >
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                {SURFACE_LABELS[surface]}
              </h3>

              <div className="mt-4 space-y-4">
                <label className="flex items-center gap-3 text-sm text-zinc-700 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={payload.config.surfaces[surface].enabled}
                    onChange={(event) =>
                      updateSurface(surface, { enabled: event.target.checked })
                    }
                    className="h-4 w-4 rounded border-zinc-300 text-red-600 focus:ring-red-500"
                  />
                  Enable public TTS
                </label>

                <label className="flex items-center gap-3 text-sm text-zinc-700 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={payload.config.surfaces[surface].autoGenerate}
                    onChange={(event) =>
                      updateSurface(surface, { autoGenerate: event.target.checked })
                    }
                    className="h-4 w-4 rounded border-zinc-300 text-red-600 focus:ring-red-500"
                  />
                  Auto-generate by default
                </label>

                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Language
                  </span>
                  <select
                    value={payload.config.surfaces[surface].defaultLanguageCode}
                    onChange={(event) =>
                      updateSurface(surface, { defaultLanguageCode: event.target.value })
                    }
                    className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  >
                    {payload.runtime.supportedLanguages.map((option) => (
                      <option key={option.code} value={option.code}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Voice
                  </span>
                  <select
                    value={payload.config.surfaces[surface].defaultVoice}
                    onChange={(event) =>
                      updateSurface(surface, { defaultVoice: event.target.value })
                    }
                    className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  >
                    {payload.runtime.voices.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => void loadSettings()}
            disabled={loading || saving}
            className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="rounded-xl bg-[linear-gradient(135deg,#e63946,#c1121f)] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-95 disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save TTS settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
