import { describe, expect, it } from 'vitest';
import {
  normalizeCopyEditorMeta,
  normalizeReporterMeta,
  validateCopyEditorMeta,
  validateReporterMeta,
} from '@/lib/content/newsroomMetadata';

describe('newsroom metadata helpers', () => {
  it('normalizes reporter metadata with safe defaults', () => {
    const meta = normalizeReporterMeta({
      locationTag: '  Indore  ',
      sourceInfo: '  Staff reporter + local bureau  ',
      sourceConfidential: 1,
      reporterNotes: '  Needs district spell-check  ',
    });

    expect(meta).toEqual({
      locationTag: 'Indore',
      sourceInfo: 'Staff reporter + local bureau',
      sourceConfidential: true,
      reporterNotes: 'Needs district spell-check',
    });
  });

  it('normalizes copy-editor metadata and falls back to pending states', () => {
    const meta = normalizeCopyEditorMeta({
      proofreadComplete: true,
      factCheckStatus: 'verified',
      headlineStatus: 'not_real',
      imageOptimizationStatus: 'optimized',
      copyEditorNotes: '  Tightened intro and caption.  ',
      returnForChangesReason: '  Need source confirmation.  ',
    });

    expect(meta).toEqual({
      proofreadComplete: true,
      factCheckStatus: 'verified',
      headlineStatus: 'pending',
      imageOptimizationStatus: 'optimized',
      copyEditorNotes: 'Tightened intro and caption.',
      returnForChangesReason: 'Need source confirmation.',
    });
  });

  it('validates overly long newsroom notes', () => {
    expect(
      validateReporterMeta({
        locationTag: '',
        sourceInfo: 'x'.repeat(2001),
        sourceConfidential: false,
        reporterNotes: '',
      })
    ).toContain('Source info');

    expect(
      validateCopyEditorMeta({
        proofreadComplete: false,
        factCheckStatus: 'pending',
        headlineStatus: 'pending',
        imageOptimizationStatus: 'pending',
        copyEditorNotes: '',
        returnForChangesReason: 'x'.repeat(1001),
      })
    ).toContain('Return-for-changes');
  });
});
