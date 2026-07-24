import { NextResponse } from 'next/server';

declare global {
  var backupCronInterval: NodeJS.Timeout | undefined;
}

export async function POST() {
  if (global.backupCronInterval) {
    clearInterval(global.backupCronInterval);
    global.backupCronInterval = undefined;
    console.log('Internal cron service stopped.');
    return NextResponse.json({ status: 'stopped', message: 'Cron job service stopped successfully' });
  }

  return NextResponse.json({ status: 'not_running', message: 'Cron job is not currently running' });
}
