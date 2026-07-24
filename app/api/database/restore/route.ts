import { NextResponse } from 'next/server';
import { verifyServerSession } from '@/lib/auth';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(req: Request) {
  try {
    const session = await verifyServerSession();
    if (!session || session.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
    
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Disconnect prisma to try to prevent file lock issues
    const prisma = (await import('@/lib/prisma')).default;
    await prisma.$disconnect();

    // Overwrite the existing database file
    await fs.writeFile(dbPath, buffer);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Restore error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
