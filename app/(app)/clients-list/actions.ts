
'use server';

import prisma from '@/lib/prisma';
import type { Client, FollowUp, AddActivityData, CreateClientData, LeadStatusType, ClientType, ClientStatusType, UserOptionType } from '@/types';
import { revalidatePath } from 'next/cache';
import { format, parseISO } from 'date-fns';
import { verifySession } from '@/lib/auth';
import type { Prisma } from '@prisma/client';

// Helper to map Prisma client to frontend Client type
function mapPrismaClientToClientType(prismaClient: any): Client {
  return {
    id: prismaClient.id,
    name: prismaClient.name,
    email: prismaClient.email ?? undefined,
    phone: prismaClient.phone ?? undefined,
    status: prismaClient.status,
    priority: prismaClient.priority ?? undefined,
    source: prismaClient.source ?? undefined,
    assignedTo: prismaClient.assignedTo?.name ?? undefined,
    createdBy: prismaClient.createdBy?.name ?? undefined,
    createdAt: prismaClient.createdAt.toISOString(),
    updatedAt: prismaClient.updatedAt.toISOString(),
    kilowatt: prismaClient.kilowatt ?? undefined,
    address: prismaClient.address ?? undefined,
    notes: prismaClient.notes ?? undefined,
    clientType: prismaClient.clientType ?? undefined,
    electricityBillUrls: prismaClient.electricityBillUrls ?? [],
    followupCount: prismaClient.followUps?.length ?? 0,
    lastCommentText: prismaClient.followUps?.[0]?.comment ?? undefined,
    lastCommentDate: prismaClient.followUps?.[0]?.createdAt ? format(prismaClient.followUps[0].createdAt, 'dd-MM-yyyy') : undefined,
    nextFollowUpDate: prismaClient.nextFollowUpDate ? format(prismaClient.nextFollowUpDate, 'yyyy-MM-dd') : undefined,
    nextFollowUpTime: prismaClient.nextFollowUpTime ?? undefined,
    totalDealValue: Number(prismaClient.totalDealValue) || 0,
  };
}

// Helper function to map Prisma FollowUp to frontend FollowUp type
function mapPrismaFollowUpToFollowUpType(prismaFollowUp: any): FollowUp {
  return {
    id: prismaFollowUp.id,
    leadId: prismaFollowUp.leadId ?? undefined,
    clientId: prismaFollowUp.clientId ?? undefined,
    type: prismaFollowUp.type,
    date: prismaFollowUp.date.toISOString(),
    time: prismaFollowUp.time ?? undefined,
    status: prismaFollowUp.status,
    leadStageAtTimeOfFollowUp: prismaFollowUp.leadStageAtTimeOfFollowUp ?? undefined,
    comment: prismaFollowUp.comment ?? undefined,
    createdBy: prismaFollowUp.createdBy?.name ?? undefined,
    createdAt: prismaFollowUp.createdAt.toISOString(),
    followupOrTask: prismaFollowUp.followupOrTask,
    taskForUser: prismaFollowUp.taskForUser?.name ?? undefined,
    taskDate: prismaFollowUp.taskDate?.toISOString() ?? undefined,
    taskTime: prismaFollowUp.taskTime ?? undefined,
    taskStatus: prismaFollowUp.taskStatus ?? 'Open',
  } as FollowUp;
}

export async function getActiveClients({ ignorePermissions = false }: { ignorePermissions?: boolean } = {}): Promise<Client[]> {
  const session = await verifySession();
  if (!session?.userId) return [];
  
  try {
    const whereClause: Prisma.ClientWhereInput = {
      status: { not: 'Inactive' },
    };

    if (session.viewPermission === 'ASSIGNED' && !ignorePermissions) {
      whereClause.assignedToId = session.userId;
    }

    const clientsFromDb = await prisma.client.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        followUps: {
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        createdBy: true,
        assignedTo: true,
      }
    });
    return clientsFromDb.map(mapPrismaClientToClientType);
  } catch (error) {
    console.error("Failed to fetch active clients:", error);
    return [];
  }
}

export async function getInactiveClients({ ignorePermissions = false }: { ignorePermissions?: boolean } = {}): Promise<Client[]> {
  const session = await verifySession();
  if (!session?.userId) return [];

  try {
    const whereClause: Prisma.ClientWhereInput = {
      status: 'Inactive',
    };
    if (session.viewPermission === 'ASSIGNED' && !ignorePermissions) {
      whereClause.assignedToId = session.userId;
    }
    const clientsFromDb = await prisma.client.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        followUps: {
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        createdBy: true,
        assignedTo: true,
      }
    });
    return clientsFromDb.map(mapPrismaClientToClientType);
  } catch (error) {
    console.error("Failed to fetch inactive clients:", error);
    return [];
  }
}

export async function getClientById(id: string): Promise<Client | null> {
  if (!id) return null;
  try {
    const clientFromDb = await prisma.client.findUnique({
      where: { id },
      include: { 
        followUps: {
          orderBy: { createdAt: 'desc' }
        },
        createdBy: true,
        assignedTo: true,
      }
    });
    if (!clientFromDb) return null;
    return mapPrismaClientToClientType(clientFromDb);
  } catch (error) {
    console.error(`Failed to fetch client with id ${id}:`, error);
    return null;
  }
}

export async function createClient(data: CreateClientData): Promise<Client | null> {
    const session = await verifySession();
    if (!session?.userId) {
        console.error("Authentication error: No user session found.");
        return null;
    }

    try {
        let assignedToId: string | null = null;
        if (data.assignedTo) {
            const user = await prisma.user.findFirst({ where: { name: data.assignedTo }});
            if (user) assignedToId = user.id;
        }

        const newClient = await prisma.client.create({
            data: {
                name: data.name,
                status: data.status,
                email: data.email || null,
                phone: data.phone || null,
                source: data.source || null,
                kilowatt: data.kilowatt === undefined ? null : Number(data.kilowatt),
                address: data.address || null,
                notes: data.notes || null,
                priority: data.priority || null,
                clientType: data.clientType || null,
                electricityBillUrls: data.electricityBillUrls || [],
                createdById: session.userId,
                assignedToId: assignedToId,
            }
        });
        revalidatePath('/clients-list');
        revalidatePath('/deals'); // Revalidate deals page as new clients can be selected
        const newClientWithRelations = await getClientById(newClient.id);
        return newClientWithRelations;
    } catch (error) {
        console.error("Failed to create client:", error);
        return null;
    }
}

export async function updateClient(id: string, data: Partial<Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'followupCount'>>): Promise<Client | null> {
    try {
        const prismaData: any = {};
        const fieldsToIgnore = ['id', 'createdAt', 'updatedAt', 'followupCount', 'lastCommentText', 'lastCommentDate', 'nextFollowUpDate', 'nextFollowUpTime', 'createdBy', 'assignedTo', 'totalDealValue'];
        
        for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                if (fieldsToIgnore.includes(key)) {
                    continue;
                }

                const typedKey = key as keyof typeof data;
                if (typedKey === 'kilowatt') {
                    prismaData.kilowatt = data.kilowatt === undefined ? null : Number(data.kilowatt);
                } else {
                    prismaData[typedKey] = (data as any)[typedKey] ?? null;
                }
            }
        }

        if (data.assignedTo) {
            const user = await prisma.user.findFirst({ where: { name: data.assignedTo }});
            prismaData.assignedToId = user ? user.id : null;
        }

        const updatedClientFromDb = await prisma.client.update({
            where: { id },
            data: prismaData,
            include: { createdBy: true, assignedTo: true }
        });

        revalidatePath('/clients-list');
        revalidatePath('/inactive-clients');
        revalidatePath(`/clients/${id}`);
        return mapPrismaClientToClientType(updatedClientFromDb);
    } catch (error) {
        console.error("Failed to update client:", error);
        return null;
    }
}


export async function deleteClient(id: string): Promise<{ success: boolean }> {
  try {
    await prisma.client.delete({ where: { id } });
    revalidatePath('/clients-list');
    revalidatePath('/inactive-clients');
    return { success: true };
  } catch (error) {
    console.error("Failed to delete client:", error);
    return { success: false };
  }
}


export async function getActivitiesForClient(clientId: string): Promise<FollowUp[]> {
  if (!clientId) return [];
  try {
    const activities = await prisma.followUp.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
      include: { createdBy: true, taskForUser: true }
    });
    return activities.map(mapPrismaFollowUpToFollowUpType);
  } catch (error) {
    console.error(`Failed to fetch activities for client ${clientId}:`, error);
    return [];
  }
}

export async function addClientActivity(data: AddActivityData): Promise<FollowUp | null> {
  if (!data.clientId) {
    console.error("addClientActivity requires a clientId");
    return null;
  }
  const session = await verifySession();
  if (!session?.userId) {
    console.error("User must be logged in to add activity.");
    return null;
  }

  try {
    let taskForUserId: string | null = null;
    if (data.taskForUser) {
        const user = await prisma.user.findFirst({ where: { name: data.taskForUser }});
        if (user) taskForUserId = user.id;
    }

    const result = await prisma.$transaction(async (tx) => {
      const newActivity = await tx.followUp.create({
        data: {
          clientId: data.clientId,
          type: data.type,
          date: parseISO(data.date),
          time: data.time || null,
          status: data.status,
          leadStageAtTimeOfFollowUp: data.leadStageAtTimeOfFollowUp || null,
          comment: data.comment || null,
          followupOrTask: data.followupOrTask,
          taskDate: data.taskDate ? parseISO(data.taskDate) : null,
          taskTime: data.taskTime || null,
          createdById: session.userId,
          taskForUserId: taskForUserId,
        },
      });

      const clientUpdateData: any = {
        lastCommentText: data.comment,
        lastCommentDate: parseISO(data.date),
      };
      
      if (data.leadStageAtTimeOfFollowUp) {
        clientUpdateData.status = data.leadStageAtTimeOfFollowUp;
      }
      if (data.priority) {
        clientUpdateData.priority = data.priority;
      }

      if (data.taskDate && data.taskTime) {
        const activityDateTime = new Date(`${data.taskDate}T${data.taskTime || '00:00:00'}`);
        if (activityDateTime > new Date()) {
           clientUpdateData.nextFollowUpDate = parseISO(data.taskDate);
           clientUpdateData.nextFollowUpTime = data.taskTime;
        }
      }
      
      await tx.client.update({
        where: { id: data.clientId! },
        data: clientUpdateData,
      });

      return newActivity;
    });

    revalidatePath(`/clients/${data.clientId}`);
    const newActivityWithRelations = await prisma.followUp.findUnique({
        where: { id: result.id },
        include: { createdBy: true, taskForUser: true }
    });
    return newActivityWithRelations ? mapPrismaFollowUpToFollowUpType(newActivityWithRelations) : null;
  } catch (error) {
    console.error('Failed to add client activity:', error);
    return null;
  }
}

export async function convertClientToLead(clientId: string): Promise<{ success: boolean; leadId?: string; message?: string }> {
  try {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: { 
        followUps: { orderBy: { createdAt: 'desc' }}, 
        siteSurveys: true // Include site surveys
      },
    });

    if (!client) {
      return { success: false, message: 'Client not found.' };
    }

    let leadStatus: LeadStatusType = 'Follow-up'; // Default
    if (client.status === 'On Hold') {
        leadStatus = 'On Hold';
    } else if (client.status === 'Fresher') {
        leadStatus = 'Fresher';
    } else if (client.status === 'Inactive') {
        leadStatus = 'Follow-up';
    }

    const newLead = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const createdLead = await tx.lead.create({
        data: {
          name: client.name,
          email: client.email,
          phone: client.phone,
          status: leadStatus,
          priority: 'Average', 
          source: client.source, 
          createdAt: client.createdAt,
          kilowatt: client.kilowatt,
          address: client.address,
          clientType: client.clientType,
          electricityBillUrls: client.electricityBillUrls,
          nextFollowUpDate: client.nextFollowUpDate,
          nextFollowUpTime: client.nextFollowUpTime,
          lastCommentText: client.followUps[0]?.comment ?? `Reactivated from Client (Status: ${client.status})`,
          lastCommentDate: client.followUps[0]?.createdAt ?? new Date(),
          createdById: client.createdById,
          assignedToId: client.assignedToId,
          totalDealValue: client.totalDealValue,
          notes: client.notes,
        },
      });

      if (client.followUps.length > 0) {
        await tx.followUp.updateMany({
          where: { clientId: client.id },
          data: {
            leadId: createdLead.id,
            clientId: null,
          },
        });
      }

      // Re-associate site surveys
      if (client.siteSurveys.length > 0) {
        await tx.siteSurvey.updateMany({
          where: { clientId: client.id },
          data: {
            leadId: createdLead.id,
            clientId: null,
          },
        });
      }

      await tx.proposal.updateMany({
        where: { clientId: client.id },
        data: {
          leadId: createdLead.id,
          clientId: null,
        },
      });
      
      await tx.deal.updateMany({
        where: { clientId: client.id },
        data: {
          clientId: null,
          // You might want to decide if deals should be linked to the new lead.
          // For now, we are just unlinking them from the client.
        },
      });

      await tx.client.delete({
        where: { id: client.id },
      });

      return createdLead;
    });

    revalidatePath('/leads-list');
    revalidatePath('/clients-list');
    revalidatePath('/inactive-clients');
    revalidatePath(`/clients/${clientId}`);

    return { success: true, leadId: newLead.id };
  } catch (error) {
    console.error(`Failed to convert client ${clientId} to lead:`, error);
    return { success: false, message: 'An unexpected error occurred during conversion.' };
  }
}

export async function bulkUpdateClients(
  clientIds: string[],
  data: Partial<Pick<Client, 'status' | 'assignedTo' | 'clientType'>>
): Promise<{ success: boolean; count: number; message?: string }> {
  if (clientIds.length === 0) {
    return { success: false, count: 0, message: 'No clients selected.' };
  }
  
  const updateData: any = {};
  if (data.status) updateData.status = data.status;
  if (data.clientType) updateData.clientType = data.clientType;

  if (data.assignedTo) {
      const user = await prisma.user.findFirst({ where: { name: data.assignedTo }});
      if (user) {
          updateData.assignedToId = user.id;
      } else {
          return { success: false, count: 0, message: `User '${data.assignedTo}' not found.`};
      }
  }

  try {
    const result = await prisma.client.updateMany({
      where: {
        id: { in: clientIds },
      },
      data: updateData,
    });
    revalidatePath('/clients-list');
    revalidatePath('/inactive-clients');
    return { success: true, count: result.count };
  } catch (error) {
    console.error('Failed to bulk update clients:', error);
    return { success: false, count: 0, message: 'An unexpected error occurred during bulk update.' };
  }
}
