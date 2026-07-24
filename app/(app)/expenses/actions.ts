
'use server';

import prisma from '@/lib/prisma';
import type { Expense, CreateExpenseData, ExpenseStatus } from '@/types';
import { revalidatePath } from 'next/cache';
import { verifySession } from '@/lib/auth';
import { parseISO, format } from 'date-fns';

function mapPrismaExpense(expense: any): Expense {
    return {
        id: expense.id,
        date: format(expense.date, 'yyyy-MM-dd'),
        endDate: expense.endDate ? format(expense.endDate, 'yyyy-MM-dd') : null,
        category: expense.category,
        amount: Number(expense.amount),
        description: expense.description,
        receiptUrl: expense.receiptUrl,
        status: expense.status,
        submittedAt: expense.submittedAt.toISOString(),
        userId: expense.userId,
        userName: expense.user.name,
        reviewedById: expense.reviewedById,
        reviewedBy: expense.reviewedBy?.name,
        reviewedAt: expense.reviewedAt?.toISOString(),
    };
}


export async function createExpense(data: CreateExpenseData): Promise<Expense | { error: string }> {
    const session = await verifySession();
    if (!session?.userId) {
        return { error: 'Authentication required.' };
    }

    try {
        const newExpense = await prisma.expense.create({
            data: {
                userId: session.userId,
                date: parseISO(data.date),
                endDate: data.endDate ? parseISO(data.endDate) : null,
                category: data.category,
                amount: data.amount,
                description: data.description,
                receiptUrl: data.receiptUrl,
                status: 'Pending',
            },
            include: {
                user: true,
                reviewedBy: true,
            }
        });
        revalidatePath('/expenses');
        revalidatePath('/view-expenses');
        return mapPrismaExpense(newExpense);
    } catch (error) {
        console.error('Failed to create expense:', error);
        return { error: 'An unexpected error occurred.' };
    }
}

export async function getExpensesForCurrentUser(): Promise<Expense[]> {
    const session = await verifySession();
    if (!session?.userId) return [];

    try {
        const expenses = await prisma.expense.findMany({
            where: { userId: session.userId },
            include: { user: true, reviewedBy: true },
            orderBy: { date: 'desc' },
        });
        return expenses.map(mapPrismaExpense);
    } catch (error) {
        console.error('Failed to get expenses for user:', error);
        return [];
    }
}

export async function getAllExpensesGroupedByUser(): Promise<Record<string, { user: { id: string, name: string }, expenses: Expense[] }>> {
    const session = await verifySession();
    if (!session?.userId) return {};
    try {
        const whereClause: any = {};
        if (session.viewPermission === 'ASSIGNED') {
            whereClause.userId = session.userId;
        }
        const expenses = await prisma.expense.findMany({
            where: whereClause,
            include: { user: true, reviewedBy: true },
            orderBy: { submittedAt: 'desc' },
        });

        const grouped: Record<string, { user: { id: string, name: string }, expenses: Expense[] }> = {};

        for (const expense of expenses) {
            if (!grouped[expense.userId]) {
                grouped[expense.userId] = {
                    user: { id: expense.user.id, name: expense.user.name },
                    expenses: [],
                };
            }
            grouped[expense.userId].expenses.push(mapPrismaExpense(expense));
        }
        return grouped;
    } catch (error) {
        console.error('Failed to get all expenses:', error);
        return {};
    }
}

export async function updateExpenseStatus(expenseId: string, status: ExpenseStatus): Promise<{ success: boolean, error?: string }> {
    const session = await verifySession();
    if (!session?.userId) {
        return { success: false, error: 'Authentication required.' };
    }
    
    if (!['Approved', 'Rejected'].includes(status)) {
        return { success: false, error: 'Invalid status provided.' };
    }

    try {
        await prisma.expense.update({
            where: { id: expenseId },
            data: {
                status: status,
                reviewedById: session.userId,
                reviewedAt: new Date(),
            },
        });
        revalidatePath('/expenses');
        revalidatePath('/view-expenses');
        return { success: true };
    } catch (error) {
        console.error(`Failed to update expense ${expenseId}:`, error);
        return { success: false, error: 'An unexpected error occurred.' };
    }
}

export async function deleteExpensesByStatusForUser(userId: string, status: 'Approved' | 'Rejected'): Promise<{ success: boolean; count: number; error?: string }> {
    const session = await verifySession();
    if (!session?.userId || session.role !== 'Admin') {
        return { success: false, count: 0, error: 'Authentication required.' };
    }

    if (status !== 'Approved' && status !== 'Rejected') {
        return { success: false, count: 0, error: 'Invalid status provided for deletion.' };
    }

    try {
        // Note: This does not currently delete associated receipts from S3.
        // To implement that, you would first query for the expenses to get their URLs.
        const { count } = await prisma.expense.deleteMany({
            where: {
                userId: userId,
                status: status,
            },
        });
        revalidatePath('/view-expenses');
        return { success: true, count };
    } catch (error) {
        console.error(`Failed to delete expenses with status ${status} for user ${userId}:`, error);
        return { success: false, count: 0, error: 'An unexpected error occurred.' };
    }
}
