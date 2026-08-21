import fs from 'fs/promises';
import path from 'path';
import nodemailer from 'nodemailer';
import { getSystemSetting } from '@/lib/system-settings';
import { createLocalBackup } from '@/lib/local-backup';

// Global variable to persist between hot reloads in dev, and keep state in memory in prod
declare global {
  var lastCrashBackupTime: number | undefined;
}

const COOLDOWN_PERIOD_MS = 60 * 60 * 1000; // 1 hour in milliseconds

export async function sendCrashBackup(errorDetails?: string): Promise<{ sent: boolean; reason?: string }> {
  try {
    const now = Date.now();
    
    // Check Cooldown
    if (global.lastCrashBackupTime && (now - global.lastCrashBackupTime) < COOLDOWN_PERIOD_MS) {
      console.log('Crash backup skipped due to cooldown mechanism.');
      return { sent: false, reason: 'Cooldown active' };
    }

    // Lock the cooldown immediately
    global.lastCrashBackupTime = now;

    // 1. GUARANTEED LOCAL BACKUP
    await createLocalBackup('crash');

    // 2. EMAIL BACKUP
    // Fetch settings from DB with fallback to process.env
    const smtpHost = await getSystemSetting('SMTP_HOST') || process.env.SMTP_HOST;
    const smtpPort = await getSystemSetting('SMTP_PORT') || process.env.SMTP_PORT;
    const smtpSecure = await getSystemSetting('SMTP_SECURE') !== null 
      ? await getSystemSetting('SMTP_SECURE') === 'true' 
      : process.env.SMTP_SECURE === 'true';
    const smtpUser = await getSystemSetting('SMTP_USER') || process.env.SMTP_USER;
    const smtpPass = await getSystemSetting('SMTP_PASS') || process.env.SMTP_PASS;
    const backupEmailTo = await getSystemSetting('BACKUP_EMAIL_TO') || process.env.BACKUP_EMAIL_TO;

    if (!backupEmailTo || !smtpHost || !smtpUser || !smtpPass) {
      console.error('Crash backup failed: Missing SMTP configuration in database or environment variables.');
      return { sent: false, reason: 'Missing email configuration' };
    }

    const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
    const fileBuffer = await fs.readFile(dbPath);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `soryouth-crash-backup-${timestamp}.db`;

    // Configure nodemailer
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: Number(smtpPort) || 587,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const emailBody = `
      A system crash or unhandled error has been detected in the Soryouth CRM application.
      
      Time: ${new Date().toLocaleString()}
      
      Error Details:
      ${errorDetails || 'No specific error details provided.'}
      
      The database backup at the time of the crash is attached.
      Note: Further crash backups will be paused for 1 hour to prevent spam.
    `;

    // Send email with attachment
    await transporter.sendMail({
      from: `"Soryouth CRM - Alert" <${smtpUser}>`,
      to: backupEmailTo,
      subject: `🚨 CRITICAL: System Crash Detected - Database Backup Included`,
      text: emailBody,
      attachments: [
        {
          filename: filename,
          content: fileBuffer,
        },
      ],
    });

    console.log('Crash database backup sent successfully.');
    return { sent: true };
  } catch (error) {
    console.error('Failed to process crash backup:', error);
    return { sent: false, reason: 'Internal error during backup generation' };
  }
}
