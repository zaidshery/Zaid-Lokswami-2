import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongoose';
import { getSuperAdminSession } from '@/lib/auth/admin';
import { isAdminRole } from '@/lib/auth/roles';
import User from '@/lib/models/User';

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

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

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

export async function GET() {
  try {
    const admin = await getSuperAdminSession();
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();
    const members = (await User.find({ role: { $ne: 'reader' } })
      .sort({ createdAt: 1 })
      .lean()) as unknown as TeamMemberRecord[];

    return NextResponse.json({
      success: true,
      data: members.map(toTeamMember),
    });
  } catch (error) {
    console.error('Team GET failed:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load team members' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getSuperAdminSession();
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const email = normalizeEmail(typeof body.email === 'string' ? body.email : '');
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const role = typeof body.role === 'string' ? body.role : '';

    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { success: false, error: 'Valid email is required' },
        { status: 400 }
      );
    }

    if (!isAdminRole(role)) {
      return NextResponse.json(
        { success: false, error: 'Valid admin role is required' },
        { status: 400 }
      );
    }

    await connectDB();

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      existingUser.name = name || existingUser.name || email.split('@')[0] || 'Team Member';
      existingUser.role = role;
      existingUser.isActive = true;
      await existingUser.save();

      return NextResponse.json({
        success: true,
        data: toTeamMember(existingUser.toObject()),
      });
    }

    const createdUser = await User.create({
      email,
      name: name || email.split('@')[0] || 'Team Member',
      image: '',
      role,
      isActive: true,
      savedArticles: [],
      preferredLanguage: 'hi',
      preferredCategories: [],
      notificationsEnabled: false,
    });

    return NextResponse.json(
      {
        success: true,
        data: toTeamMember(createdUser.toObject()),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Team POST failed:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to invite team member' },
      { status: 500 }
    );
  }
}
