import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongoose';
import { getSuperAdminSession } from '@/lib/auth/admin';
import { isAdminRole } from '@/lib/auth/roles';
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
  isActive?: boolean;
  lastLoginAt?: Date | string | null;
  createdAt?: Date | string;
};

function toTeamMember(record: TeamMemberRecord) {
  return {
    id: typeof record._id?.toString === 'function' ? record._id.toString() : '',
    name: typeof record.name === 'string' ? record.name.trim() : '',
    email: typeof record.email === 'string' ? record.email.trim() : '',
    image: typeof record.image === 'string' ? record.image.trim() : '',
    role: typeof record.role === 'string' ? record.role : 'reader',
    isActive: record.isActive !== false,
    lastLoginAt: record.lastLoginAt ? new Date(record.lastLoginAt).toISOString() : null,
    createdAt: record.createdAt ? new Date(record.createdAt).toISOString() : null,
  };
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const admin = await getSuperAdminSession();
    if (!admin) {
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
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true }
    ).lean<TeamMemberRecord | null>();

    if (!updatedUser) {
      return NextResponse.json({ success: false, error: 'Member not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: toTeamMember(updatedUser),
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
    const admin = await getSuperAdminSession();
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await context.params;
    await connectDB();

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

    if (!updatedUser) {
      return NextResponse.json({ success: false, error: 'Member not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: toTeamMember(updatedUser),
    });
  } catch (error) {
    console.error('Team DELETE failed:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to remove team member' },
      { status: 500 }
    );
  }
}
