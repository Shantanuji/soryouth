
'use server';

import prisma from '@/lib/prisma';
import { verifySession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { differenceInMinutes, format, startOfDay, endOfDay } from 'date-fns';
import type { Attendance, User } from '@/types';
import { getUsers } from '../users/actions';
import { recordPresenceEvent } from './hrms-actions';

// Helper to format duration from minutes to "Xh Ym"
function formatDuration(minutes: number | null | undefined): string {
    if (minutes === null || minutes === undefined) return '-';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
}

// Helper to map Prisma attendance to frontend Attendance type
function mapPrismaAttendance(attendance: any): Attendance {
    return {
        id: attendance.id,
        userId: attendance.userId,
        userName: attendance.user.name,
        punchInTime: format(new Date(attendance.punchInTime), 'dd-MM-yyyy hh:mm:ss a'),
        punchOutTime: attendance.punchOutTime ? format(new Date(attendance.punchOutTime), 'dd-MM-yyyy hh:mm:ss a') : null,
        punchInLocation: attendance.punchInLocation,
        punchOutLocation: attendance.punchOutLocation,
        workDuration: formatDuration(attendance.workDuration),
    };
}

export async function getCurrentUserAttendanceStatus(): Promise<{
    isPunchedIn: boolean;
    punchInTime?: string;
    punchInTimeRaw?: string;
    punchOutTime?: string;
    punchOutTimeRaw?: string;
    cumulativeWorkedSeconds: number;
    shiftHours: number;
    hasCompletedToday?: boolean;
}> {
    const session = await verifySession();
    if (!session?.userId) {
        return { isPunchedIn: false, cumulativeWorkedSeconds: 0, shiftHours: 8, hasCompletedToday: false };
    }

    const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { shiftHours: true },
    });
    const shiftHours = user?.shiftHours ?? 8;

    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    const punchesToday = await prisma.attendance.findMany({
        where: {
            userId: session.userId,
            punchInTime: {
                gte: todayStart,
                lte: todayEnd,
            },
        },
        orderBy: {
            punchInTime: 'asc',
        },
    });

    let cumulativeWorkedSeconds = 0;
    for (const punch of punchesToday) {
        if (punch.punchOutTime) {
            const diffMs = punch.punchOutTime.getTime() - punch.punchInTime.getTime();
            cumulativeWorkedSeconds += Math.floor(Math.max(0, diffMs / 1000));
        }
    }

    const lastPunch = punchesToday[punchesToday.length - 1];

    if (lastPunch) {
        const hasCompletedToday = cumulativeWorkedSeconds >= (shiftHours * 3600);
        if (!lastPunch.punchOutTime) {
            return {
                isPunchedIn: true,
                punchInTime: format(lastPunch.punchInTime, "hh:mm:ss a"),
                punchInTimeRaw: lastPunch.punchInTime.toISOString(),
                cumulativeWorkedSeconds,
                shiftHours,
                hasCompletedToday,
            };
        } else {
            return {
                isPunchedIn: false,
                punchInTime: format(lastPunch.punchInTime, "hh:mm:ss a"),
                punchInTimeRaw: lastPunch.punchInTime.toISOString(),
                punchOutTime: format(lastPunch.punchOutTime, "hh:mm:ss a"),
                punchOutTimeRaw: lastPunch.punchOutTime.toISOString(),
                cumulativeWorkedSeconds,
                shiftHours,
                hasCompletedToday,
            };
        }
    }

    return { isPunchedIn: false, cumulativeWorkedSeconds: 0, shiftHours, hasCompletedToday: false };
}

export async function punchIn(location: { latitude: number; longitude: number }): Promise<{ success: boolean; error?: string }> {
    const session = await verifySession();
    if (!session?.userId) {
        return { success: false, error: 'Authentication required.' };
    }

    const { isPunchedIn } = await getCurrentUserAttendanceStatus();
    if (isPunchedIn) {
        return { success: false, error: 'You are already punched in.' };
    }

    try {
        await prisma.attendance.create({
            data: {
                userId: session.userId,
                punchInLocation: `${location.latitude},${location.longitude}`,
            },
        });
        await recordPresenceEvent('PunchIn', location);
        revalidatePath('/dashboard');
        revalidatePath('/attendance');
        return { success: true };
    } catch (error) {
        return { success: false, error: 'Database operation failed.' };
    }
}

export async function punchOut(location: { latitude: number; longitude: number }): Promise<{ success: boolean; error?: string }> {
    const session = await verifySession();
    if (!session?.userId) {
        return { success: false, error: 'Authentication required.' };
    }

    const lastPunch = await prisma.attendance.findFirst({
        where: { userId: session.userId, punchOutTime: null },
        orderBy: { punchInTime: 'desc' },
    });

    if (!lastPunch) {
        return { success: false, error: 'No active punch-in found.' };
    }
    
    const punchOutTime = new Date();
    const duration = differenceInMinutes(punchOutTime, lastPunch.punchInTime);

    try {
        await prisma.attendance.update({
            where: { id: lastPunch.id },
            data: {
                punchOutTime,
                punchOutLocation: `${location.latitude},${location.longitude}`,
                workDuration: duration,
            },
        });
        await recordPresenceEvent('PunchOut', location);
        revalidatePath('/dashboard');
        revalidatePath('/attendance');
        return { success: true };
    } catch (error) {
        return { success: false, error: 'Database operation failed.' };
    }
}

export async function getAttendanceData(): Promise<{ records: Attendance[], users: User[] }> {
    try {
        const [records, users] = await Promise.all([
            prisma.attendance.findMany({
                include: { user: { select: { name: true } } },
                orderBy: { punchInTime: 'desc' },
            }),
            getUsers()
        ]);
        
        return {
            records: records.map(mapPrismaAttendance),
            users: users
        };
    } catch (error) {
        console.error('Failed to get attendance data:', error);
        return { records: [], users: [] };
    }
}
