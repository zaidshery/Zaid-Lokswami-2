import 'server-only';

import {
  ADMIN_PAGE_KEYS,
  PAGE_ACCESS,
  PAGE_LABELS,
  type AdminPageKey,
} from '@/lib/auth/permissions';
import { ADMIN_ROLES, type AdminRole } from '@/lib/auth/roles';

export type PermissionReviewRiskTone = 'neutral' | 'watch' | 'critical';

export type PermissionReviewMatrixEntry = {
  key: AdminPageKey;
  label: string;
  roles: AdminRole[];
  accessCount: number;
  classification: 'super_admin_only' | 'restricted' | 'broad';
  riskTone: PermissionReviewRiskTone;
  note: string;
};

export type PermissionReviewData = {
  roleSummaries: Array<{
    role: AdminRole;
    pageCount: number;
    labels: string[];
  }>;
  matrix: PermissionReviewMatrixEntry[];
  superAdminOnlyPages: PermissionReviewMatrixEntry[];
  broadAccessPages: PermissionReviewMatrixEntry[];
  riskHighlights: Array<{
    id: string;
    title: string;
    detail: string;
    tone: PermissionReviewRiskTone;
  }>;
};

function toTitleCase(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function classifyPageAccess(key: AdminPageKey, roles: readonly AdminRole[]) {
  const normalizedRoles = [...roles] as AdminRole[];
  const accessCount = normalizedRoles.length;
  const includesReporter = normalizedRoles.includes('reporter');
  const includesCopyEditor = normalizedRoles.includes('copy_editor');
  const isSuperAdminOnly = accessCount === 1 && normalizedRoles[0] === 'super_admin';

  if (isSuperAdminOnly) {
    return {
      classification: 'super_admin_only' as const,
      riskTone: 'neutral' as const,
      note: 'Restricted to super admin only.',
    };
  }

  if (accessCount >= 4 || (includesReporter && includesCopyEditor && accessCount >= 3)) {
    return {
      classification: 'broad' as const,
      riskTone: 'watch' as const,
      note: 'Broad access across multiple admin roles.',
    };
  }

  return {
    classification: 'restricted' as const,
    riskTone: 'neutral' as const,
    note: 'Restricted to operational roles only.',
  };
}

export async function getPermissionReviewData(): Promise<PermissionReviewData> {
  const matrix = ADMIN_PAGE_KEYS.map((key) => {
    const roles = [...PAGE_ACCESS[key]] as AdminRole[];
    const classification = classifyPageAccess(key, roles);
    return {
      key,
      label: PAGE_LABELS[key] || toTitleCase(key),
      roles,
      accessCount: roles.length,
      classification: classification.classification,
      riskTone: classification.riskTone,
      note: classification.note,
    } satisfies PermissionReviewMatrixEntry;
  });

  const roleSummaries = ADMIN_ROLES.map((role) => {
    const labels = matrix.filter((entry) => entry.roles.includes(role)).map((entry) => entry.label);
    return {
      role,
      pageCount: labels.length,
      labels,
    };
  });

  const superAdminOnlyPages = matrix.filter(
    (entry) => entry.classification === 'super_admin_only'
  );
  const broadAccessPages = matrix.filter((entry) => entry.classification === 'broad');

  const riskHighlights = [
    {
      id: 'broad-access',
      title: 'Broad access pages',
      detail: broadAccessPages.length
        ? `${broadAccessPages.length} page(s) are broadly available across admin roles and may need tighter governance later.`
        : 'No broad-access pages are currently flagged.',
      tone: broadAccessPages.length ? ('watch' as const) : ('neutral' as const),
    },
    {
      id: 'super-admin-only',
      title: 'Leadership-only surfaces',
      detail: `${superAdminOnlyPages.length} page(s) are locked to super admin today.`,
      tone: 'neutral' as const,
    },
  ];

  return {
    roleSummaries,
    matrix,
    superAdminOnlyPages,
    broadAccessPages,
    riskHighlights,
  };
}
