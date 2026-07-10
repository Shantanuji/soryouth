'use server';

import { getSystemSetting, setSystemSetting } from '@/lib/system-settings';
import { verifyServerSession } from '@/lib/auth';

export type MailerConfig = {
  host: string;
  port: string;
  secure: boolean;
  user: string;
  pass: string;
  backupEmailTo: string;
};

export async function getMailerSettings(): Promise<MailerConfig> {
  const session = await verifyServerSession();
  if (!session || session.role !== 'Admin') {
    throw new Error('Unauthorized');
  }

  return {
    host: await getSystemSetting('SMTP_HOST') || '',
    port: await getSystemSetting('SMTP_PORT') || '',
    secure: (await getSystemSetting('SMTP_SECURE')) === 'true',
    user: await getSystemSetting('SMTP_USER') || '',
    pass: await getSystemSetting('SMTP_PASS') || '', // Might want to mask this normally, but for admin panel we send it or clear it
    backupEmailTo: await getSystemSetting('BACKUP_EMAIL_TO') || '',
  };
}

export async function saveMailerSettings(config: MailerConfig): Promise<{ success: boolean; error?: string }> {
  const session = await verifyServerSession();
  if (!session || session.role !== 'Admin') {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    await setSystemSetting('SMTP_HOST', config.host);
    await setSystemSetting('SMTP_PORT', config.port);
    await setSystemSetting('SMTP_SECURE', config.secure ? 'true' : 'false');
    await setSystemSetting('SMTP_USER', config.user);
    
    // Only update password if a new one was provided, otherwise keep existing
    if (config.pass && config.pass.trim() !== '') {
        await setSystemSetting('SMTP_PASS', config.pass);
    }
    
    await setSystemSetting('BACKUP_EMAIL_TO', config.backupEmailTo);

    return { success: true };
  } catch (error) {
    console.error('Failed to save mailer settings:', error);
    return { success: false, error: 'Failed to save settings.' };
  }
}
