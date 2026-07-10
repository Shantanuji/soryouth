import { NextResponse } from 'next/server';
import { verifyServerSession } from '@/lib/auth';
import { promises as fs } from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';
import { getSystemSetting } from '@/lib/system-settings';
import { createLocalBackup } from '@/lib/local-backup';

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
      subject: `Database Backup - ${new Date().toLocaleDateString()}`,
      text: 'Please find the attached database backup for Soryouth CRM.',
      attachments: [
        {
          filename: filename,
          content: fileBuffer,
        },
      ],
    });

    return NextResponse.json({ success: true, message: 'Backup emailed successfully.' });
  } catch (error) {
    console.error('Email backup error:', error);
    return NextResponse.json(
      { error: 'Failed to send backup via email.' },
      { status: 500 }
    );
  }
}
