
'use server';

import prisma from '@/lib/prisma';
import type { Tickets, CreateTicketData, TicketStatus } from '@/types';
import { revalidatePath } from 'next/cache';
import { verifySession } from '@/lib/auth';
import { parseISO } from 'date-fns';

function mapPrismaTicket(ticket: any): Tickets {
    return {
        ...ticket,
        dueDate: ticket.dueDate.toISOString(),
        createdAt: ticket.createdAt.toISOString(),
        updatedAt: ticket.updatedAt.toISOString(),
    };
}

export async function createTicket(data: CreateTicketData): Promise<Tickets | { error: string }> {
    const session = await verifySession();
    if (!session?.userId) {
        return { error: 'Authentication required.' };
    }

    try {
        const newTicket = await prisma.ticket.create({
            data: {
                // Client snapshot fields
                clientName: data.clientName,
                mobileNo: data.mobileNo,
                email: data.email,
                address: data.address,
                
                // Ticket specific fields
                ticketFor: data.ticketFor,
                priority: data.priority,
                status: data.status,
                subject: data.subject,
                description: data.description,
                dueDate: parseISO(data.dueDate),
                
                // Relational fields
                clientId: data.clientId,
                dealId: data.dealId,
                assignedToId: data.assignedToId,
                createdById: session.userId,
            },
            include: {
                client: true,
                deal: true,
                createdBy: true,
                assignedTo: true,
            }
        });
        revalidatePath('/tickets');
        return mapPrismaTicket(newTicket);
    } catch (error) {
        console.error('Failed to create ticket:', error);
        return { error: 'An unexpected error occurred.' };
    }
}

export async function getTickets(): Promise<Tickets[]> {
    try {
        const tickets = await prisma.ticket.findMany({
            include: {
                client: true,
                deal: true,
                createdBy: true,
                assignedTo: true,
            },
            orderBy: {
                dueDate: 'asc',
            },
        });
        return tickets.map(mapPrismaTicket);
    } catch (error) {
        console.error('Failed to get tickets:', error);
        return [];
    }
}

export async function getOpenTicketsForCurrentUser(): Promise<Tickets[]> {
    const session = await verifySession();
    if (!session?.userId) return [];

    try {
        const tickets = await prisma.ticket.findMany({
            where: {
                assignedToId: session.userId,
                status: {
                    not: 'Closed',
                }
            },
            include: {
                client: true,
                deal: true,
                createdBy: true,
                assignedTo: true,
            },
            orderBy: {
                dueDate: 'asc'
            }
        });
        return tickets.map(mapPrismaTicket);
    } catch (error) {
        console.error('Failed to get open tickets for user:', error);
        return [];
    }
}

export async function updateTicketStatus(ticketId: string, status: TicketStatus, remark: string): Promise<{ success: boolean; error?: string }> {
    const session = await verifySession();
    if (!session?.userId) {
        return { success: false, error: 'Authentication required.' };
    }

    try {
        await prisma.ticket.update({
            where: { id: ticketId },
            data: {
                status: status,
                remark: remark,
            },
        });
        revalidatePath('/tickets');
        return { success: true };
    } catch (error) {
        console.error(`Failed to update ticket ${ticketId}:`, error);
        return { success: false, error: 'An unexpected error occurred.' };
    }
}

export async function deleteClosedTickets(ticketIds: string[]): Promise<{ success: boolean; count: number; error?: string }> {
    const session = await verifySession();
    if (!session?.userId) {
        return { success: false, count: 0, error: 'Authentication required.' };
    }

    try {
        const { count } = await prisma.ticket.deleteMany({
            where: {
                id: {
                    in: ticketIds,
                },
                status: 'Closed',
            },
        });
        revalidatePath('/tickets');
        return { success: true, count };
    } catch (error) {
        console.error('Failed to delete closed tickets:', error);
        return { success: false, count: 0, error: 'An unexpected error occurred.' };
    }
}