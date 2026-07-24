import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';
import { getSystemSetting } from '@/lib/system-settings';
import { createLocalBackup } from '@/lib/local-backup';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
        return new NextResponse('Cron secret is not configured', { status: 500 });
    }

    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // 1. GUARANTEED LOCAL BACKUP
    await createLocalBackup('scheduled');

    // 2. EMAIL BACKUP
    const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
    const fileBuffer = await fs.readFile(dbPath);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `soryouth-scheduled-backup-${timestamp}.db`;

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
      return NextResponse.json(
        { error: 'Mailer configuration is incomplete. Please configure SMTP in Mailer Settings.' },
        { status: 500 }
      );
    }

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

    // Send email with attachment
    await transporter.sendMail({
      from: `"Soryouth CRM" <${smtpUser}>`,
      to: backupEmailTo,
      subject: `Scheduled Database Backup - ${new Date().toLocaleDateString()}`,
      text: 'Please find the attached scheduled database backup for Soryouth CRM.',
      attachments: [
        {
          filename: filename,
          content: fileBuffer,
        },
      ],
    });

    return NextResponse.json({ success: true, message: 'Scheduled backup emailed successfully.' });
  } catch (error) {
    console.error('Scheduled email backup error:', error);
    return NextResponse.json(
      { error: 'Failed to send scheduled backup via email.' },
      { status: 500 }
    );
  }
}
