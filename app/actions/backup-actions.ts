'use server';

import { getLocalBackups } from '@/lib/local-backup';
import { verifyServerSession } from '@/lib/auth';
import { getSystemSetting, setSystemSetting } from '@/lib/system-settings';

export async function fetchLocalBackups() {
  const session = await verifyServerSession();
  if (!session || session.role !== 'Admin') {
    throw new Error('Unauthorized');
  }

  const backups = await getLocalBackups();
  // Return serializable data
  return backups.map(b => ({
    name: b.name,
    size: b.size,
    createdAt: b.createdAt.toISOString()
  }));
}

export async function getBackupSchedule() {
  const session = await verifyServerSession();
  if (!session || session.role !== 'Admin') {
    throw new Error('Unauthorized');
  }
  return await getSystemSetting('BACKUP_TIME') || '00:00';
}

export async function saveBackupSchedule(time: string) {
  const session = await verifyServerSession();
  if (!session || session.role !== 'Admin') {
    throw new Error('Unauthorized');
  }
  await setSystemSetting('BACKUP_TIME', time);
  return { success: true };
}
