import prisma from '@/lib/prisma';

export async function getSystemSetting(key: string): Promise<string | null> {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key },
    });
    return setting?.value || null;
  } catch (error) {
    console.error(`Error fetching system setting for key ${key}:`, error);
    return null;
  }
}

export async function setSystemSetting(key: string, value: string): Promise<boolean> {
  try {
    await prisma.systemSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
    return true;
  } catch (error) {
    console.error(`Error setting system setting for key ${key}:`, error);
    return false;
  }
}
