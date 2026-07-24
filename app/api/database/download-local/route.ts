import { NextResponse } from 'next/server';
import { verifyServerSession } from '@/lib/auth';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET(request: Request) {
  try {
    const session = await verifyServerSession();
    if (!session || session.role !== 'Admin') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');

    if (!filename || !filename.endsWith('.db') || filename.includes('..') || filename.includes('/')) {
      return new NextResponse('Invalid filename', { status: 400 });
    }

    const filePath = path.join(process.cwd(), 'backups', filename);

    // Ensure the file exists
    try {
        await fs.access(filePath);
    } catch {
        return new NextResponse('File not found', { status: 404 });
    }

    const fileBuffer = await fs.readFile(filePath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Local backup download error:', error);
    return new NextResponse('Failed to download local backup', { status: 500 });
  }
}
