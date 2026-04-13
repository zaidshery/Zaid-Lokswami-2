import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongoose';
import { getAdminSession } from '@/lib/auth/admin';
import { canManageTargetAdminRole, canManageTeam } from '@/lib/auth/permissions';
import { getStaffCredentialStatus } from '@/lib/auth/staffCredentials';
import { isAdminRole, normalizeAdminRole } from '@/lib/auth/roles';
import User from '@/lib/models/User';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type TeamMemberRecord = {
  _id?: unknown;
  name?: string;
  email?: string;
  image?: string;
  role?: string;
  loginId?: string;
  passwordHash?: string;
  passwordSetAt?: Date | string | null;
  setupTokenExpiresAt?: Date | string | null;
  isActive?: boolean;
  lastLoginAt?: Date | string | null;
  createdAt?: Date | string;
};

function toTeamMember(record: TeamMemberRecord) {
  const normalizedRole = normalizeAdminRole(record.role);
  if (!normalizedRole) {
    return null;
  }

  return {
    id: typeof record._id?.toString === 'function' ? record._id.toString() : '',
    name: typeof record.name === 'string' ? record.name.trim() : '',
    email: typeof record.email === 'string' ? record.email.trim() : '',
    image: typeof record.image === 'string' ? record.image.trim() : '',
    role: normalizedRole,
    loginId: typeof record.loginId === 'string' ? record.loginId.trim() : '',
    isActive: record.isActive !== false,
    credentialStatus: getStaffCredentialStatus({
      passwordHash: typeof record.passwordHash === 'string' ? record.passwordHash : '',
      setupTokenExpiresAt: record.setupTokenExpiresAt || null,
    }),
    passwordSetAt: record.passwordSetAt ? new Date(record.passwordSetAt).toISOString() : null,
    setupExpiresAt: record.setupTokenExpiresAt
      ? new Date(record.setupTokenExpiresAt).toISOString()
      : null,
    lastLoginAt: record.lastLoginAt ? new Date(record.lastLoginAt).toISOString() : null,
    createdAt: record.createdAt ? new Date(record.createdAt).toISOString() : null,
  };
}

async function ensureSuperAdminRemovalIsSafe(id: string) {
  const remainingSuperAdmins = await User.countDocuments({
    role: 'super_admin',
    _id: { $ne: id },
  });

  return remainingSuperAdmins > 0;
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const admin = await getAdminSession();
    if (!admin || !canManageTeam(admin.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await req.json();
    const updates: Record<string, unknown> = {};

    if (typeof body.role === 'string') {
      if (!isAdminRole(body.role)) {
        return NextResponse.json(
          { success: false, error: 'Valid admin role is required' },
          { status: 400 }
        );
      }

      updates.role = body.role;
    }

    if (typeof body.isActive === 'boolean') {
      updates.isActive = body.isActive;
    }

    if (typeof body.name === 'string' && body.name.trim()) {
      updates.name = body.name.trim();
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid updates provided' },
        { status: 400 }
      );
    }

    await connectDB();
    const existingUser = await User.findById(id).select('_id role').lean<{
      _id?: unknown;
      role?: unknown;
    } | null>();

    if (!existingUser) {
      return NextResponse.json({ success: false, error: 'Member not found' }, { status: 404 });
    }

    const currentRole = normalizeAdminRole(existingUser.role);
    if (!currentRole) {
      return NextResponse.json(
        { success: false, error: 'Only admin-side members can be managed here' },
        { status: 400 }
      );
    }

    if (!canManageTargetAdminRole(admin.role, currentRole)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const nextRole = typeof updates.role === 'string' ? normalizeAdminRole(updates.role) : currentRole;
    if (!nextRole || !canManageTargetAdminRole(admin.role, nextRole)) {
      return NextResponse.json(
        { success: false, error: 'You cannot assign that role' },
        { status: 403 }
      );
    }

    const deactivatingLastSuperAdmin =
      currentRole === 'super_admin' &&
      ((updates.role && nextRole !== 'super_admin') || updates.isActive === false);

    if (deactivatingLastSuperAdmin && !(await ensureSuperAdminRemovalIsSafe(id))) {
      return NextResponse.json(
        { success: false, error: 'At least one active super admin must remain' },
        { status: 400 }
      );
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true }
    ).lean<TeamMemberRecord | null>();

    if (!updatedUser) {
      return NextResponse.json({ success: false, error: 'Member not found' }, { status: 404 });
    }

    const teamMember = toTeamMember(updatedUser);
    if (!teamMember) {
      return NextResponse.json(
        { success: false, error: 'Managed user no longer has an admin role' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: teamMember,
    });
  } catch (error) {
    console.error('Team PATCH failed:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update team member' },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const admin = await getAdminSession();
    if (!admin || !canManageTeam(admin.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await context.params;
    await connectDB();

    const existingUser = await User.findById(id).select('_id role').lean<{
      _id?: unknown;
      role?: unknown;
    } | null>();

    if (!existingUser) {
      return NextResponse.json({ success: false, error: 'Member not found' }, { status: 404 });
    }

    const currentRole = normalizeAdminRole(existingUser.role);
    if (!currentRole) {
      return NextResponse.json(
        { success: false, error: 'Only admin-side members can be removed here' },
        { status: 400 }
      );
    }

    if (!canManageTargetAdminRole(admin.role, currentRole)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    if (currentRole === 'super_admin' && !(await ensureSuperAdminRemovalIsSafe(id))) {
      return NextResponse.json(
        { success: false, error: 'At least one super admin must remain' },
        { status: 400 }
      );
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      {
        $set: {
          role: 'reader',
          isActive: true,
        },
      },
      { new: true }
    ).lean<TeamMemberRecord | null>();

    return NextResponse.json({
      success: true,
      data: null,
    });
  } catch (error) {
    console.error('Team DELETE failed:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to remove team member' },
      { status: 500 }
    );
  }
}
