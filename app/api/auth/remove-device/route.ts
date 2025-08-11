import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ message: 'Email is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    await prisma.user.update({
      where: { email },
      data: { deviceId: null },
    });

    return NextResponse.json({ message: 'Device ID removed successfully' });
  } catch (error) {
    console.error('Logout Error:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
