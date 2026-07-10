'use server';

import { getLocalBackups } from '@/lib/local-backup';
import { verifyServerSession } from '@/lib/auth';

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
