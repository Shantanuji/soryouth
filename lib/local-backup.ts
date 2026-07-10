import fs from 'fs/promises';
import path from 'path';

const BACKUP_DIR = path.join(process.cwd(), 'backups');
const MAX_BACKUPS = 30;

export async function createLocalBackup(prefix: string = 'backup'): Promise<{ success: boolean; filePath?: string; error?: string }> {
  try {
    // 1. Ensure the backups directory exists
    try {
      await fs.access(BACKUP_DIR);
    } catch {
      await fs.mkdir(BACKUP_DIR, { recursive: true });
    }

    // 2. Generate timestamp and file paths
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `soryouth-${prefix}-${timestamp}.db`;
    const destinationPath = path.join(BACKUP_DIR, filename);
    const sourcePath = path.join(process.cwd(), 'dev.db'); // Note: if you use a different DB name in production, update this

    // 3. Check if source DB exists
    try {
      await fs.access(sourcePath);
    } catch {
      return { success: false, error: 'Database file not found.' };
    }

    // 4. Copy the file securely
    await fs.copyFile(sourcePath, destinationPath);

    // 5. Cleanup old backups (keep only the latest MAX_BACKUPS)
    await cleanupOldBackups();

    return { success: true, filePath: destinationPath };
  } catch (error: any) {
    console.error('Failed to create local backup:', error);
    return { success: false, error: error.message };
  }
}

async function cleanupOldBackups() {
  try {
    const files = await fs.readdir(BACKUP_DIR);
    
    // Only process .db files
    const backupFiles = files.filter(f => f.endsWith('.db'));
    
    if (backupFiles.length <= MAX_BACKUPS) {
      return; // No cleanup needed
    }

    // Get file stats to sort by modification time
    const filesWithStats = await Promise.all(
      backupFiles.map(async (file) => {
        const filePath = path.join(BACKUP_DIR, file);
        const stats = await fs.stat(filePath);
        return { file, filePath, mtime: stats.mtime.getTime() };
      })
    );

    // Sort descending (newest first)
    filesWithStats.sort((a, b) => b.mtime - a.mtime);

    // Delete files beyond the MAX_BACKUPS limit
    const filesToDelete = filesWithStats.slice(MAX_BACKUPS);
    
    for (const fileObj of filesToDelete) {
      try {
        await fs.unlink(fileObj.filePath);
        console.log(`Deleted old backup: ${fileObj.file}`);
      } catch (err) {
        console.error(`Failed to delete old backup ${fileObj.file}:`, err);
      }
    }
  } catch (error) {
    console.error('Error during backup cleanup:', error);
  }
}

export async function getLocalBackups(): Promise<Array<{ name: string; size: number; createdAt: Date }>> {
  try {
    try {
      await fs.access(BACKUP_DIR);
    } catch {
      return []; // Directory doesn't exist yet
    }

    const files = await fs.readdir(BACKUP_DIR);
    const backupFiles = files.filter(f => f.endsWith('.db'));

    const fileDetails = await Promise.all(
      backupFiles.map(async (file) => {
        const filePath = path.join(BACKUP_DIR, file);
        const stats = await fs.stat(filePath);
        return {
          name: file,
          size: stats.size,
          createdAt: stats.mtime,
        };
      })
    );

    // Sort newest first
    return fileDetails.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  } catch (error) {
    console.error('Failed to get local backups:', error);
    return [];
  }
}
