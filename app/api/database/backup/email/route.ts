import { NextResponse } from 'next/server';
import { verifyServerSession } from '@/lib/auth';
import { createLocalBackup } from '@/lib/local-backup';
import { sendDatabaseBackupEmail } from '@/lib/backup-mailer';

export async function POST() {
  try {
    const session = await verifyServerSession();
    if (!session || session.role !== 'Admin') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // 1. GUARANTEED LOCAL BACKUP
    // Save to local disk BEFORE attempting to email
    await createLocalBackup('manual');

    // 2. EMAIL BACKUP
    const result = await sendDatabaseBackupEmail();
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'Backup emailed successfully.' });
  } catch (error) {
    console.error('Email backup error:', error);
    return NextResponse.json(
      { error: 'Failed to send backup via email.' },
      { status: 500 }
    );
  }
}
