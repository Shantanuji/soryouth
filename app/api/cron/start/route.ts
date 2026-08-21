import { NextResponse } from 'next/server';

declare global {
  var backupCronInterval: NodeJS.Timeout | undefined;
}

export async function POST() {
  if (global.backupCronInterval) {
    return NextResponse.json({ status: 'already_running', message: 'Cron job is already running' });
  }

  // Set to run every minute to check if it's the scheduled time
  global.backupCronInterval = setInterval(async () => {
    try {
      const { getSystemSetting } = await import('@/lib/system-settings');
      const scheduledTime = await getSystemSetting('BACKUP_TIME') || '00:00'; // Default midnight
      
      const now = new Date();
      
      // Use Asia/Kolkata timezone to match the user's local time setting
      const formatter = new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      // "14:07"
      const currentTime = formatter.format(now);
      
      if (currentTime === scheduledTime) {
        console.log(`Scheduled time (${scheduledTime}) reached in IST! Running automated backup...`);
        const { createLocalBackup } = await import('@/lib/local-backup');
        await createLocalBackup('scheduled');
        
        // Let's also email it directly
        const { sendDatabaseBackupEmail } = await import('@/lib/backup-mailer');
        const emailResult = await sendDatabaseBackupEmail();
        
        if (emailResult.success) {
           console.log('Internal scheduled backup complete and emailed successfully.');
        } else {
           console.error('Scheduled backup emailed failed:', emailResult.error);
        }
      }
    } catch (e) {
      console.error('Internal cron backup failed', e);
    }
  }, 60 * 1000); // Check every minute

  console.log('Internal cron service started.');
  return NextResponse.json({ status: 'started', message: 'Cron job service started successfully' });
}

export async function GET() {
  return NextResponse.json({ 
    running: !!global.backupCronInterval 
  });
}
