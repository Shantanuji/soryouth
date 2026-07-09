import { NextResponse } from 'next/server';
import { verifyServerSession } from '@/lib/auth';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET() {
  try {
    const session = await verifyServerSession();
    if (!session || session.role !== 'Admin') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
    const fileBuffer = await fs.readFile(dbPath);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `soryouth-backup-${timestamp}.db`;

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Type': 'application/vnd.sqlite3',
      },
    });
  } catch (error) {
    console.error('Backup error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
