
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { comparePassword } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { email, password, device_id } = await request.json();

    if (!email || !password || !device_id) {
      return NextResponse.json({ message: 'Email, password, and device_id are required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    // Update the deviceId (FCM token) for the user
    const updatedUser = await prisma.user.update({
      where: { email },
      data: { deviceId: device_id },
    });

    // Return a simplified user object, excluding the password
    const { password: _, ...userWithoutPassword } = updatedUser;

    return NextResponse.json({ message: 'Login successful', user: userWithoutPassword });

  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ message: 'Device ID already exists. Please log out first !' }, { status: 500 });
    } else {
      console.error('Mobile Login Error:', error);
      return NextResponse.json({ message: 'Server error' }, { status: 500 });
    }
    
  }
}
