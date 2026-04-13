import { afterEach, describe, expect, it } from 'vitest';
import {
  buildOcrRuntimeSummary,
  buildUploadRuntimeSummary,
} from '@/lib/admin/operationalDiagnostics';

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe('operational diagnostics helpers', () => {
  it('flags upload runtime as critical when Cloudinary env is missing', () => {
    delete process.env.CLOUDINARY_CLOUD_NAME;
    delete process.env.CLOUDINARY_API_KEY;
    delete process.env.CLOUDINARY_API_SECRET;

    const summary = buildUploadRuntimeSummary();

    expect(summary.status).toBe('critical');
    expect(summary.signals[0]?.value).toContain('not ready');
  });

  it('flags OCR runtime as critical when remote fallback is enabled without a provider', () => {
    process.env.NEXT_PUBLIC_EPAPER_LOCAL_OCR_ONLY = 'false';
    process.env.NEXT_PUBLIC_EPAPER_REMOTE_OCR_FALLBACK = 'true';
    delete process.env.OCR_CUSTOM_API_URL;
    delete process.env.OCR_CUSTOM_API_KEY;
    delete process.env.OCR_SPACE_API_KEY;

    const summary = buildOcrRuntimeSummary();

    expect(summary.status).toBe('critical');
    expect(summary.signals.some((signal) => signal.label === 'Remote OCR' && signal.tone === 'critical')).toBe(true);
  });
});
