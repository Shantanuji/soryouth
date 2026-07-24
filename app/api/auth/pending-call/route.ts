import { NextResponse } from 'next/server';

// Declare a global object to store pending calls in memory
const globalRef = global as any;
if (!globalRef.pendingCalls) {
  globalRef.pendingCalls = new Map<string, string>();
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'Missing email parameter' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const pendingCalls = globalRef.pendingCalls;

    if (pendingCalls.has(normalizedEmail)) {
      const phoneNumber = pendingCalls.get(normalizedEmail);
      pendingCalls.delete(normalizedEmail); // Clear from queue once retrieved
      return NextResponse.json({ phoneNumber });
    }

    return NextResponse.json({ phoneNumber: null });
  } catch (error: any) {
    console.error('Error in pending-call API:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
