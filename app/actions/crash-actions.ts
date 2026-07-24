'use server';

import { sendCrashBackup } from '@/lib/crash-backup';

export async function reportCrashToServer(errorMessage: string) {
  // This is a secure server action. It can be called from client components
  // like error boundaries.
  
  console.log('Crash reported to server action. Triggering crash backup...');
  
  // Call the backup utility which handles the 1-hour cooldown internally
  const result = await sendCrashBackup(errorMessage);
  
  return result;
}
