import { promises as fs } from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';
import { getSystemSetting } from '@/lib/system-settings';

export async function sendDatabaseBackupEmail(): Promise<{ success: boolean; error?: string }> {
  try {
    const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
    const fileBuffer = await fs.readFile(dbPath);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `soryouth-backup-${timestamp}.db`;

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
      return { success: false, error: 'Mailer configuration is incomplete. Please configure SMTP in Mailer Settings.' };
    }

    // Process multiple emails (comma separated)
    const emailList = backupEmailTo.split(',').map(e => e.trim()).filter(e => e);

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

    // Send email with attachment to multiple recipients
    await transporter.sendMail({
      from: `"Soryouth CRM" <${smtpUser}>`,
      to: emailList.join(', '),
      subject: `Database Backup - ${new Date().toLocaleDateString()}`,
      text: 'Please find the attached database backup for Soryouth CRM.',
      attachments: [
        {
          filename: filename,
          content: fileBuffer,
        },
      ],
    });

    return { success: true };
  } catch (error) {
    console.error('Email backup error:', error);
    return { success: false, error: 'Failed to send backup via email.' };
  }
}
