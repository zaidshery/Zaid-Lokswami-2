import connectDB from '@/lib/db/mongoose';
import User from '@/lib/models/User';
import {
  ADMIN_ROLE_QUERY_VALUES,
  type AdminRole,
  normalizeAdminRole,
} from '@/lib/auth/roles';

type TeamMemberSource = {
  _id?: unknown;
  name?: string;
  email?: string;
  role?: string;
  isActive?: boolean;
  lastLoginAt?: Date | string | null;
};

export type TeamHealthMember = {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  isActive: boolean;
  lastLoginAt: string | null;
};

export type TeamHealthSummary = {
  source: 'mongodb' | 'file';
  totals: {
    adminUsers: number;
    active: number;
    inactive: number;
    neverLoggedIn: number;
    recentLogins7d: number;
  };
  roleCounts: Record<AdminRole, number>;
  members: TeamHealthMember[];
  recentMembers: TeamHealthMember[];
  alerts: string[];
};

function createEmptyRoleCounts(): Record<AdminRole, number> {
  return {
    super_admin: 0,
    admin: 0,
    reporter: 0,
    copy_editor: 0,
  };
}

function toIsoDate(value: unknown) {
  const parsed =
    value instanceof Date ? value : value ? new Date(String(value)) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function shouldUseFileStore() {
  return !process.env.MONGODB_URI?.trim();
}

function buildAlerts(summary: TeamHealthSummary): string[] {
  const alerts: string[] = [];

  if (summary.totals.inactive > 0) {
    alerts.push(
      `${summary.totals.inactive} admin account${
        summary.totals.inactive === 1 ? ' is' : 's are'
      } inactive.`
    );
  }

  if (summary.totals.neverLoggedIn > 0) {
    alerts.push(
      `${summary.totals.neverLoggedIn} admin account${
        summary.totals.neverLoggedIn === 1 ? ' has' : 's have'
      } never signed in.`
    );
  }

  if (summary.roleCounts.copy_editor === 0) {
    alerts.push('No copy editor accounts are assigned right now.');
  }

  if (summary.roleCounts.admin === 0) {
    alerts.push('No admin desk account is assigned right now.');
  }

  if (summary.roleCounts.super_admin === 0) {
    alerts.push('No super admin account is available.');
  }

  return alerts;
}

async function loadFromFileStore(): Promise<TeamHealthSummary> {
  const baseSummary: TeamHealthSummary = {
    source: 'file',
    totals: {
      adminUsers: 0,
      active: 0,
      inactive: 0,
      neverLoggedIn: 0,
      recentLogins7d: 0,
    },
    roleCounts: createEmptyRoleCounts(),
    members: [],
    recentMembers: [],
    alerts: [],
  };

  return {
    ...baseSummary,
    alerts: buildAlerts(baseSummary),
  };
}

export async function getTeamHealthSummary(): Promise<TeamHealthSummary> {
  if (shouldUseFileStore()) {
    return loadFromFileStore();
  }

  try {
    await connectDB();
  } catch (error) {
    console.error('MongoDB unavailable for team health, using file fallback.', error);
    return loadFromFileStore();
  }

  const members = (await User.find({ role: { $in: ADMIN_ROLE_QUERY_VALUES } })
    .select('_id name email role isActive lastLoginAt')
    .sort({ lastLoginAt: -1, updatedAt: -1, createdAt: 1 })
    .lean()) as TeamMemberSource[];

  const now = Date.now();
  const recentThresholdMs = 7 * 24 * 60 * 60 * 1000;
  const roleCounts = createEmptyRoleCounts();

  const normalizedMembers = members
    .map((member) => {
      const role = normalizeAdminRole(member.role);
      if (!role) {
        return null;
      }

      roleCounts[role] += 1;

      return {
        id: typeof member._id?.toString === 'function' ? member._id.toString() : '',
        name: String(member.name || '').trim() || String(member.email || '').trim(),
        email: String(member.email || '').trim(),
        role,
        isActive: member.isActive !== false,
        lastLoginAt: toIsoDate(member.lastLoginAt),
      } satisfies TeamHealthMember;
    })
    .filter((member): member is TeamHealthMember => Boolean(member));

  const summary: TeamHealthSummary = {
    source: 'mongodb',
    totals: {
      adminUsers: normalizedMembers.length,
      active: normalizedMembers.filter((member) => member.isActive).length,
      inactive: normalizedMembers.filter((member) => !member.isActive).length,
      neverLoggedIn: normalizedMembers.filter((member) => !member.lastLoginAt).length,
      recentLogins7d: normalizedMembers.filter((member) => {
        if (!member.lastLoginAt) return false;
        return now - new Date(member.lastLoginAt).getTime() <= recentThresholdMs;
      }).length,
    },
    roleCounts,
    members: normalizedMembers,
    recentMembers: normalizedMembers.slice(0, 5),
    alerts: [],
  };

  return {
    ...summary,
    alerts: buildAlerts(summary),
  };
}
