'use server';

import prisma from '@/lib/prisma';
import { verifySession } from '@/lib/auth';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { startOfDay, endOfDay, differenceInSeconds } from 'date-fns';

function parseUserAgent(ua: string) {
  let browser = 'Unknown';
  let device = 'Desktop';

  if (/mobile/i.test(ua)) device = 'Mobile';
  else if (/tablet|ipad/i.test(ua)) device = 'Tablet';
  else if (/windows/i.test(ua)) device = 'Windows PC';
  else if (/macintosh/i.test(ua)) device = 'Mac';
  else if (/linux/i.test(ua)) device = 'Linux PC';

  if (/chrome|crios/i.test(ua) && !/edge|edg/i.test(ua)) browser = 'Chrome';
  else if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) browser = 'Safari';
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
  else if (/edge|edg/i.test(ua)) browser = 'Edge';
  else if (/trident/i.test(ua)) browser = 'Internet Explorer';

  return { browser, device };
}

async function getReverseGeocoding(lat: number, lon: number): Promise<{ address: string; city: string }> {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`, {
      headers: {
        'User-Agent': 'Soryouth-CRM/1.0',
      },
      next: { revalidate: 3600 }
    });
    if (res.ok) {
      const data = await res.json();
      const city = data.address?.city || data.address?.town || data.address?.village || data.address?.suburb || data.address?.county || 'Unknown';
      const address = data.display_name || `Lat: ${lat}, Lon: ${lon}`;
      return { address, city };
    }
  } catch (e) {
    console.error('OSM Geocoding failed:', e);
  }
  return { address: `Lat: ${lat}, Lon: ${lon}`, city: 'Unknown' };
}

export async function recordPresenceEvent(
  eventType: 'Login' | 'Logout' | 'LocationChanged' | 'PunchIn' | 'PunchOut',
  location?: { latitude: number; longitude: number }
) {
  try {
    const session = await verifySession();
    if (!session?.userId) {
      return { success: false, error: 'Unauthorized session.' };
    }

    const reqHeaders = await headers();
    const userAgent = reqHeaders.get('user-agent') || '';
    const ip = reqHeaders.get('x-forwarded-for')?.split(',')[0] || reqHeaders.get('x-real-ip') || '127.0.0.1';
    const { browser, device } = parseUserAgent(userAgent);

    let address = '';
    let city = '';

    if (location) {
      const geo = await getReverseGeocoding(location.latitude, location.longitude);
      address = geo.address;
      city = geo.city;
    }

    // Determine presence status to write
    let presenceStatus = 'Online';
    if (eventType === 'Logout') {
      presenceStatus = 'Offline';
    }

    // Determine details string for AuditTimeline
    let eventDetails = `IP: ${ip} | Browser: ${browser} | Device: ${device}`;
    if (location) {
      eventDetails += ` | Location: ${city} (${address})`;
    }

    // Run database writes
    await prisma.$transaction(async (tx) => {
      // 1. Update user presence fields
      const userUpdateData: any = { presenceStatus };
      if (eventType === 'Logout') {
        userUpdateData.lastSeen = new Date();
      }
      if (location) {
        userUpdateData.lastKnownLocation = city ? `${city} (${address})` : address;
      }
      await tx.user.update({
        where: { id: session.userId },
        data: userUpdateData,
      });

      // 2. Add LocationHistory if location coordinates are provided
      if (location) {
        await tx.locationHistory.create({
          data: {
            userId: session.userId,
            latitude: location.latitude,
            longitude: location.longitude,
            address,
            city,
            device,
            browser,
            ip,
          },
        });
      }

      // 3. Add AuditTimeline log entry
      await tx.auditTimeline.create({
        data: {
          userId: session.userId,
          eventType,
          details: eventDetails,
        },
      });
    });

    revalidatePath('/users');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err) {
    console.error('Failed to record presence event:', err);
    return { success: false, error: 'Database transaction failed.' };
  }
}

export async function getUserHRMSDashboard(userId: string) {
  try {
    const session = await verifySession();
    if (!session?.userId) {
      throw new Error('Unauthorized access');
    }

    // Fetch user details, location histories, and timelines
    const [user, locationHistory, timeline] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          presenceStatus: true,
          lastSeen: true,
          lastKnownLocation: true,
        },
      }),
      prisma.locationHistory.findMany({
        where: { userId },
        orderBy: { timestamp: 'desc' },
        take: 30,
      }),
      prisma.auditTimeline.findMany({
        where: { userId },
        orderBy: { timestamp: 'desc' },
        take: 50,
      }),
    ]);

    if (!user) {
      throw new Error('User not found');
    }

    // Fetch today's active or completed attendance record
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    const lastPunch = await prisma.attendance.findFirst({
      where: {
        userId,
        punchInTime: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
      orderBy: { punchInTime: 'desc' },
    });

    let attendanceDetails = null;
    if (lastPunch) {
      const punchInTime = lastPunch.punchInTime;
      const punchOutTime = lastPunch.punchOutTime;
      const hasCompletedToday = !!punchOutTime;
      const isPunchedIn = !punchOutTime;

      attendanceDetails = {
        id: lastPunch.id,
        punchInTime: punchInTime.toISOString(),
        punchInLocation: lastPunch.punchInLocation,
        punchOutTime: punchOutTime ? punchOutTime.toISOString() : null,
        punchOutLocation: lastPunch.punchOutLocation,
        isPunchedIn,
        hasCompletedToday,
        workDuration: lastPunch.workDuration || null,
      };
    }

    // Resolve latest device info
    const latestLog = locationHistory[0] || null;
    const currentDevice = latestLog?.device || 'Unknown';
    const currentBrowser = latestLog?.browser || 'Unknown';

    return {
      success: true,
      data: {
        user,
        locationHistory,
        timeline,
        attendanceDetails,
        currentDevice,
        currentBrowser,
      },
    };
  } catch (err: any) {
    console.error('Failed to get HRMS dashboard:', err);
    return { success: false, error: err.message || 'Server error occurred.' };
  }
}
