export const FACT_CHECK_STATUSES = [
  'pending',
  'verified',
  'needs_follow_up',
] as const;

export const HEADLINE_STATUSES = [
  'pending',
  'rewritten',
  'approved',
] as const;

export const IMAGE_OPTIMIZATION_STATUSES = [
  'pending',
  'optimized',
  'not_needed',
] as const;

export type FactCheckStatus = (typeof FACT_CHECK_STATUSES)[number];
export type HeadlineStatus = (typeof HEADLINE_STATUSES)[number];
export type ImageOptimizationStatus = (typeof IMAGE_OPTIMIZATION_STATUSES)[number];

export type ReporterMeta = {
  locationTag: string;
  sourceInfo: string;
  sourceConfidential: boolean;
  reporterNotes: string;
};

export type CopyEditorMeta = {
  proofreadComplete: boolean;
  factCheckStatus: FactCheckStatus;
  headlineStatus: HeadlineStatus;
  imageOptimizationStatus: ImageOptimizationStatus;
  copyEditorNotes: string;
  returnForChangesReason: string;
};

const factCheckStatusSet = new Set<string>(FACT_CHECK_STATUSES);
const headlineStatusSet = new Set<string>(HEADLINE_STATUSES);
const imageOptimizationStatusSet = new Set<string>(IMAGE_OPTIMIZATION_STATUSES);

export function isFactCheckStatus(value: unknown): value is FactCheckStatus {
  return typeof value === 'string' && factCheckStatusSet.has(value);
}

export function isHeadlineStatus(value: unknown): value is HeadlineStatus {
  return typeof value === 'string' && headlineStatusSet.has(value);
}

export function isImageOptimizationStatus(
  value: unknown
): value is ImageOptimizationStatus {
  return typeof value === 'string' && imageOptimizationStatusSet.has(value);
}

export function createEmptyReporterMeta(): ReporterMeta {
  return {
    locationTag: '',
    sourceInfo: '',
    sourceConfidential: false,
    reporterNotes: '',
  };
}

export function createEmptyCopyEditorMeta(): CopyEditorMeta {
  return {
    proofreadComplete: false,
    factCheckStatus: 'pending',
    headlineStatus: 'pending',
    imageOptimizationStatus: 'pending',
    copyEditorNotes: '',
    returnForChangesReason: '',
  };
}

function normalizeTrimmedString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export function normalizeReporterMeta(input: unknown): ReporterMeta {
  const source = typeof input === 'object' && input ? (input as Record<string, unknown>) : {};
  return {
    locationTag: normalizeTrimmedString(source.locationTag),
    sourceInfo: normalizeTrimmedString(source.sourceInfo),
    sourceConfidential: Boolean(source.sourceConfidential),
    reporterNotes: normalizeTrimmedString(source.reporterNotes),
  };
}

export function normalizeReporterMetaPartial(input: unknown): Partial<ReporterMeta> {
  const source = typeof input === 'object' && input ? (input as Record<string, unknown>) : {};
  const partial: Partial<ReporterMeta> = {};

  if (source.locationTag !== undefined) {
    partial.locationTag = normalizeTrimmedString(source.locationTag);
  }
  if (source.sourceInfo !== undefined) {
    partial.sourceInfo = normalizeTrimmedString(source.sourceInfo);
  }
  if (source.sourceConfidential !== undefined) {
    partial.sourceConfidential = Boolean(source.sourceConfidential);
  }
  if (source.reporterNotes !== undefined) {
    partial.reporterNotes = normalizeTrimmedString(source.reporterNotes);
  }

  return partial;
}

export function normalizeCopyEditorMeta(input: unknown): CopyEditorMeta {
  const source = typeof input === 'object' && input ? (input as Record<string, unknown>) : {};
  return {
    proofreadComplete: Boolean(source.proofreadComplete),
    factCheckStatus: isFactCheckStatus(source.factCheckStatus)
      ? source.factCheckStatus
      : 'pending',
    headlineStatus: isHeadlineStatus(source.headlineStatus)
      ? source.headlineStatus
      : 'pending',
    imageOptimizationStatus: isImageOptimizationStatus(source.imageOptimizationStatus)
      ? source.imageOptimizationStatus
      : 'pending',
    copyEditorNotes: normalizeTrimmedString(source.copyEditorNotes),
    returnForChangesReason: normalizeTrimmedString(source.returnForChangesReason),
  };
}

export function normalizeCopyEditorMetaPartial(
  input: unknown
): Partial<CopyEditorMeta> {
  const source = typeof input === 'object' && input ? (input as Record<string, unknown>) : {};
  const partial: Partial<CopyEditorMeta> = {};

  if (source.proofreadComplete !== undefined) {
    partial.proofreadComplete = Boolean(source.proofreadComplete);
  }
  if (source.factCheckStatus !== undefined && isFactCheckStatus(source.factCheckStatus)) {
    partial.factCheckStatus = source.factCheckStatus;
  }
  if (source.headlineStatus !== undefined && isHeadlineStatus(source.headlineStatus)) {
    partial.headlineStatus = source.headlineStatus;
  }
  if (
    source.imageOptimizationStatus !== undefined &&
    isImageOptimizationStatus(source.imageOptimizationStatus)
  ) {
    partial.imageOptimizationStatus = source.imageOptimizationStatus;
  }
  if (source.copyEditorNotes !== undefined) {
    partial.copyEditorNotes = normalizeTrimmedString(source.copyEditorNotes);
  }
  if (source.returnForChangesReason !== undefined) {
    partial.returnForChangesReason = normalizeTrimmedString(source.returnForChangesReason);
  }

  return partial;
}

export function validateReporterMeta(meta: ReporterMeta) {
  if (meta.locationTag.length > 160) {
    return 'Location tag is too long (max 160 characters)';
  }
  if (meta.sourceInfo.length > 2000) {
    return 'Source info is too long (max 2000 characters)';
  }
  if (meta.reporterNotes.length > 2000) {
    return 'Reporter notes are too long (max 2000 characters)';
  }
  return null;
}

export function validateCopyEditorMeta(meta: CopyEditorMeta) {
  if (meta.copyEditorNotes.length > 2000) {
    return 'Copy editor notes are too long (max 2000 characters)';
  }
  if (meta.returnForChangesReason.length > 1000) {
    return 'Return-for-changes reason is too long (max 1000 characters)';
  }
  return null;
}
