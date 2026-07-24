
'use server';

import prisma from '@/lib/prisma';
import type { GeneralTask, CreateGeneralTaskData, GeneralTaskStatus } from '@/types';
import { revalidatePath } from 'next/cache';
import { verifySession } from '@/lib/auth';
import type { Prisma } from '@prisma/client';

// Helper to map Prisma GeneralTask to frontend type
function mapPrismaGeneralTask(task: any): GeneralTask {
    return {
        id: task.id,
        comment: task.comment,
        taskDate: task.taskDate,
        priority: task.priority,
        status: task.status,
        reason: task.reason,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        assignedToId: task.assignedToId,
        assignedTo: {
            id: task.assignedTo.id,
            name: task.assignedTo.name,
        },
        createdById: task.createdById,
        createdBy: task.createdBy ? {
            id: task.createdBy.id,
            name: task.createdBy.name,
        } : null,
        amcTaskId: task.amcTaskId,
        dealId: task.dealId,
    };
}


export async function createGeneralTask(data: CreateGeneralTaskData): Promise<GeneralTask | { error: string }> {
    const session = await verifySession();
    if (!session?.userId) {
        return { error: 'Authentication required.' };
    }

    try {
        const newTask = await prisma.generalTask.create({
            data: {
                ...data,
                createdById: session.userId,
                status: 'Pending', // Default status
            },
            include: {
                assignedTo: { select: { id: true, name: true } },
                createdBy: { select: { id: true, name: true } },
            }
        });
        revalidatePath('/tasks');
        return mapPrismaGeneralTask(newTask);
    } catch (error) {
        console.error('Failed to create general task:', error);
        return { error: 'An unexpected error occurred.' };
    }
}

export async function getGroupedGeneralTasks(): Promise<Record<string, { user: { id: string, name: string }, tasks: GeneralTask[] }>> {
    const session = await verifySession();
    if (!session?.userId) return {};

    try {
        const whereClause: Prisma.GeneralTaskWhereInput = {};

        // If the user has ASSIGNED view permission, they can only see tasks they created or are assigned to.
        if (session.viewPermission === 'ASSIGNED') {
            whereClause.OR = [
                { createdById: session.userId },
                { assignedToId: session.userId }
            ];
        }

        const tasks = await prisma.generalTask.findMany({
            where: whereClause,
            include: { 
                assignedTo: { select: { id: true, name: true } },
                createdBy: { select: { id: true, name: true } },
            },
            orderBy: { taskDate: 'asc' },
        });

        const grouped: Record<string, { user: { id: string, name: string }, tasks: GeneralTask[] }> = {};

        for (const task of tasks) {
            if (!grouped[task.assignedToId]) {
                grouped[task.assignedToId] = {
                    user: { id: task.assignedTo.id, name: task.assignedTo.name },
                    tasks: [],
                };
            }
            grouped[task.assignedToId].tasks.push(mapPrismaGeneralTask(task));
        }
        return grouped;
    } catch (error) {
        console.error('Failed to get all general tasks:', error);
        return {};
    }
}

export async function updateGeneralTaskStatus(taskId: string, status: GeneralTaskStatus, reason?: string): Promise<{ success: boolean, error?: string }> {
    const session = await verifySession();
    if (!session?.userId) {
        return { success: false, error: 'Authentication required.' };
    }

    try {
        const dataToUpdate: { status: GeneralTaskStatus, reason?: string | null } = { status, reason: null };
        if (status === 'Failed' && reason) {
            dataToUpdate.reason = reason;
        }

        await prisma.generalTask.update({
            where: { id: taskId },
            data: dataToUpdate,
        });
        revalidatePath('/tasks');
        return { success: true };
    } catch (error) {
        console.error(`Failed to update task ${taskId}:`, error);
        return { success: false, error: 'An unexpected error occurred.' };
    }
}

export async function getOpenGeneralTasksForCurrentUser(): Promise<GeneralTask[]> {
  const session = await verifySession();
  if (!session?.userId) return [];

  try {
    const tasks = await prisma.generalTask.findMany({
      where: {
        assignedToId: session.userId,
        NOT: {
          status: {
            in: ['Completed', 'Failed']
          }
        }
      },
      include: {
        assignedTo: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: {
        taskDate: 'asc',
      },
    });

    return tasks.map(mapPrismaGeneralTask);
  } catch (error) {
    console.error("Failed to fetch general tasks for current user:", error);
    return [];
  }
}

export async function deleteTasksByStatusForUser(userId: string, status: 'Completed' | 'Failed'): Promise<{ success: boolean; count: number; error?: string }> {
    const session = await verifySession();
    if (!session?.userId) {
        return { success: false, count: 0, error: 'Authentication required.' };
    }

    if (status !== 'Completed' && status !== 'Failed') {
        return { success: false, count: 0, error: 'Invalid status provided for deletion.' };
    }

    try {
        const { count } = await prisma.generalTask.deleteMany({
            where: {
                assignedToId: userId,
                status: status,
            },
        });
        revalidatePath('/tasks');
        return { success: true, count };
    } catch (error) {
        console.error(`Failed to delete tasks with status ${status} for user ${userId}:`, error);
        return { success: false, count: 0, error: 'An unexpected error occurred.' };
    }
}
