
'use server';

import prisma from '@/lib/prisma';
import type { Lead, FollowUp, AddActivityData, CreateLeadData, Client, DropReasonType, LeadSourceOptionType, UserOptionType, LeadStatusType, TaskNotification } from '@/types';
import { revalidatePath } from 'next/cache';
import { format, parse, parseISO, startOfDay, endOfDay, isPast, isValid } from 'date-fns';
import { verifySession } from '@/lib/auth';
import * as ExcelJS from 'exceljs';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';

// Helper function to map Prisma lead to frontend Lead type
function mapPrismaLeadToLeadType(prismaLead: any): Lead {
  return {
    id: prismaLead.id,
    name: prismaLead.name,
    status: prismaLead.status,
    createdAt: prismaLead.createdAt.toISOString(),
    updatedAt: prismaLead.updatedAt.toISOString(),
    email: prismaLead.email ?? undefined,
    phone: prismaLead.phone ?? undefined,
    source: prismaLead.source ?? undefined,
    assignedTo: prismaLead.assignedTo?.name ?? undefined,
    createdBy: prismaLead.createdBy?.name ?? undefined,
    lastCommentText: prismaLead.lastCommentText ?? undefined,
    lastCommentDate: prismaLead.lastCommentDate ? format(prismaLead.lastCommentDate, 'dd-MM-yyyy') : undefined,
    nextFollowUpDate: prismaLead.nextFollowUpDate ? format(prismaLead.nextFollowUpDate, 'yyyy-MM-dd') : undefined,
    nextFollowUpTime: prismaLead.nextFollowUpTime ?? undefined,
    kilowatt: prismaLead.kilowatt === null ? undefined : prismaLead.kilowatt,
    address: prismaLead.address ?? undefined,
    notes: prismaLead.notes ?? undefined,
    priority: prismaLead.priority ?? undefined,
    dropReason: prismaLead.dropReason ?? undefined,
    clientType: prismaLead.clientType ?? undefined,
    electricityBillUrls: prismaLead.electricityBillUrls ?? [],
    followupCount: prismaLead.followUps?.length ?? 0,
  } as Lead;
}

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
    createdById: prismaFollowUp.createdById,
    createdAt: prismaFollowUp.createdAt.toISOString(),
    followupOrTask: prismaFollowUp.followupOrTask,
    taskForUser: prismaFollowUp.taskForUser?.name ?? undefined,
    taskDate: prismaFollowUp.taskDate?.toISOString() ?? undefined,
    taskTime: prismaFollowUp.taskTime ?? undefined,
    taskStatus: prismaFollowUp.taskStatus ?? 'Open',
    lead: prismaFollowUp.lead ? mapPrismaLeadToLeadType(prismaFollowUp.lead) : undefined,
    client: prismaFollowUp.client ? mapPrismaClientToClientType(prismaFollowUp.client) : undefined,
    deal: prismaFollowUp.deal ? { id: prismaFollowUp.deal.id, clientName: prismaFollowUp.deal.clientName, phone: prismaFollowUp.deal.phone } : undefined,
  } as FollowUp;
}


export async function getLeads({ ignorePermissions = false }: { ignorePermissions?: boolean } = {}): Promise<Lead[]> {
  const session = await verifySession();
  if (!session?.userId) return [];

  try {
    const whereClause: Prisma.LeadWhereInput = {};
    if (session.viewPermission === 'ASSIGNED' && !ignorePermissions) {
      whereClause.assignedToId = session.userId;
    } 
    const leadsFromDb = await prisma.lead.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        followUps: {
          select: { id: true } // Only select ID to count them
        },
        createdBy: true,
        assignedTo: true,
      }
    });
    return leadsFromDb.map(mapPrismaLeadToLeadType);
  } catch (error) {
    console.error("Failed to fetch leads:", error);
    return [];
  }
}

export async function getOverdueFollowUpTasksForCurrentUser(): Promise<TaskNotification[]> {
  const session = await verifySession();
  if (!session?.userId) return [];

  try {
    const tasks = await prisma.followUp.findMany({
      where: {
        followupOrTask: 'Task',
        taskForUserId: session.userId,
        taskStatus: 'Open',
        // Combine date and time for a true datetime comparison
        // This is a bit complex with separate date/time fields and requires filtering in code
      },
      include: {
        lead: { select: { name: true, phone: true } },
        client: { select: { name: true, phone: true } },
        droppedLead: { select: { name: true, phone: true } },
        deal: { select: { clientName: true, phone: true, id: true } }
      },
    });
    
    // Filter for overdue tasks in code with robust time parsing
    const overdueTasks = tasks.filter(task => {
        if (!task.taskDate || !task.taskTime) return false;
        // Construct a full date-time string
        const dateString = format(task.taskDate, 'yyyy-MM-dd');
        const dateTimeString = `${dateString} ${task.taskTime}`;

        // Define possible formats. Add more as needed.
        const formats = [
            'yyyy-MM-dd HH:mm:ss',
            'yyyy-MM-dd hh:mm:ss a',
            'yyyy-MM-dd HH:mm',
        ];

        let taskDateTime: Date | null = null;
        for (const fmt of formats) {
            const parsedDate = parse(dateTimeString, fmt, new Date());
            if (isValid(parsedDate)) {
                taskDateTime = parsedDate;
                break;
            }
        }
        
        // Fallback for just time without seconds
        if (!taskDateTime) {
            const fallbackParsed = parse(dateTimeString, 'yyyy-MM-dd hh:mm a', new Date());
             if (isValid(fallbackParsed)) {
                taskDateTime = fallbackParsed;
             }
        }
        
        return taskDateTime ? isPast(taskDateTime) : false;
    });

    return overdueTasks.map(task => {
        const customer = task.lead || task.client || task.droppedLead;
        const customerName = task.deal?.clientName || customer?.name || 'Unknown Customer';
        const customerPhone = task.deal?.phone || customer?.phone || null;

        let link = '#';
        if(task.leadId) link = `/leads/${task.leadId}?from_task=${task.id}`;
        else if(task.clientId) link = `/clients/${task.clientId}?from_task=${task.id}`;
        else if(task.droppedLeadId) link = `/dropped-leads/${task.droppedLeadId}?from_task=${task.id}`;
        else if(task.dealId) link = `/deals/${task.dealId}?from_task=${task.id}`;

        return {
            id: task.id,
            comment: task.comment || 'No comment',
            time: task.taskTime || 'No time set',
            customerName,
            customerPhone,
            status: 'Open',
            link: link,
        };
    });
  } catch (error) {
    console.error("Failed to fetch overdue tasks for user:", error);
    return [];
  }
}

export async function getAllFollowUps(): Promise<FollowUp[]> {
    try {
        const followUps = await prisma.followUp.findMany({
            orderBy: { createdAt: 'desc' },
            include: { 
                createdBy: true, 
                taskForUser: true,
                lead: true,
                client: true,
                deal: true,
            }
        });
        return followUps.map(mapPrismaFollowUpToFollowUpType);
    } catch (error) {
        console.error("Failed to fetch all follow-ups:", error);
        return [];
    }
}

export async function getLeadById(id: string): Promise<Lead | null> {
  if (!id) {
    console.warn("getLeadById called with no ID");
    return null;
  }
  try {
    const leadFromDb = await prisma.lead.findUnique({
      where: { id },
      include: { 
        followUps: true,
        createdBy: true,
        assignedTo: true,
      }
    });

    if (!leadFromDb) {
      return null;
    }
    return mapPrismaLeadToLeadType(leadFromDb);
  } catch (error) {
    console.error(`Failed to fetch lead with id ${id}:`, error);
    return null;
  }
}

export async function createLead(data: CreateLeadData): Promise<Lead | null> {
  const session = await verifySession();
  if (!session?.userId) {
    console.error("Authentication error: No user session found.");
    return null;
  }

  try {
    const newLead = await prisma.$transaction(async (tx) => {
      let assignedToId: string | null = null;
      if (data.assignedTo) {
        const user = await tx.user.findFirst({ where: { name: data.assignedTo }});
        if (user) assignedToId = user.id;
      }
    
      // 1. Create the lead record
      const createdLead = await tx.lead.create({
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
          dropReason: data.dropReason || "Not Dropped" || null,
          clientType: data.clientType || null,
          electricityBillUrls: data.electricityBillUrls || [],
          createdById: session.userId,
          assignedToId: assignedToId,
          // Set fields that will be updated by follow-ups/tasks
          lastCommentText: data.lastCommentText || null,
          lastCommentDate: data.lastCommentDate ? parseISO(data.lastCommentDate.split('-').reverse().join('-')) : null,
          nextFollowUpDate: data.nextFollowUpDate ? parseISO(data.nextFollowUpDate) : null,
          nextFollowUpTime: data.nextFollowUpTime || null,
        },
      });

      // 2. Create a follow-up activity if a comment was added
      if (data.lastCommentText) {
        await tx.followUp.create({
          data: {
            leadId: createdLead.id,
            type: 'Call', // Default type for initial comment
            date: new Date(),
            status: 'Answered',
            comment: data.lastCommentText,
            followupOrTask: 'Followup',
            createdById: session.userId,
          },
        });
      };

      // 3. Create a task if a next follow-up date/time was set
      if (data.nextFollowUpDate && data.nextFollowUpTime && assignedToId) {
        await tx.followUp.create({
          data: {
            leadId: createdLead.id,
            type: 'Call', // Default task type
            date: new Date(),
            status: 'Answered', // Not applicable for tasks, but required
            comment: `Initial follow-up task for ${data.name}`,
            followupOrTask: 'Task',
            taskDate: parseISO(data.nextFollowUpDate),
            taskTime: data.nextFollowUpTime,
            taskStatus: 'Open',
            createdById: session.userId,
            taskForUserId: assignedToId,
          },
        });
      }
      
      return createdLead;
    });

    revalidatePath('/leads-list');
    const newLeadWithRelations = await getLeadById(newLead.id);
    return newLeadWithRelations;

  } catch (error) {
    console.error("Failed to create lead:", error);
    return null;
  }
}

export async function updateLead(id: string, data: Partial<Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'followupCount'>>): Promise<Lead | null> {
  try {
    const prismaData: any = {};
    const fieldsToIgnore = ['id', 'createdAt', 'updatedAt', 'followupCount', 'createdBy', 'assignedTo'];

    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
         if (fieldsToIgnore.includes(key)) continue;

        const typedKey = key as keyof typeof data;
        
        if (typedKey === 'kilowatt') {
            prismaData.kilowatt = data.kilowatt === undefined ? null : Number(data.kilowatt);
        } else if (typedKey === 'nextFollowUpDate' && data.nextFollowUpDate) {
           prismaData[typedKey] = parseISO(data.nextFollowUpDate);
        } else if (typedKey === 'lastCommentDate' && data.lastCommentDate) {
           prismaData[typedKey] = parseISO(data.lastCommentDate.split('-').reverse().join('-'));
        } else if (typedKey === 'notes') {
            prismaData.notes = data.notes ?? null;
        }
        else {
          (prismaData as any)[typedKey] = (data as any)[typedKey] ?? null;
        }
      }
    }

    if (data.assignedTo) {
        const user = await prisma.user.findFirst({ where: { name: data.assignedTo }});
        prismaData.assignedToId = user ? user.id : null;
    }

    const updatedLeadFromDb = await prisma.lead.update({
      where: { id },
      data: prismaData,
      include: { createdBy: true, assignedTo: true, followUps: { select: { id: true } } }
    });
    
    revalidatePath('/leads-list');
    revalidatePath(`/leads/${id}`);
    revalidatePath('/clients-list');
    revalidatePath(`/clients/${id}`);


    return mapPrismaLeadToLeadType(updatedLeadFromDb);
  } catch (error) {
    console.error("Failed to update lead:", error);
    return null;
  }
}

export async function deleteLead(id: string): Promise<{ success: boolean }> {
  try {
    await prisma.lead.delete({
      where: { id },
    });
    revalidatePath('/leads-list');
    return { success: true };
  } catch (error) {
    console.error("Failed to delete lead:", error);
    return { success: false };
  }
}

export async function getActivitiesForLead(leadId: string): Promise<FollowUp[]> {
  if (!leadId) return [];
  try {
    const activities = await prisma.followUp.findMany({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
      include: { createdBy: true, taskForUser: true }
    });
    return activities.map(mapPrismaFollowUpToFollowUpType);
  } catch (error) {
    console.error(`Failed to fetch activities for lead ${leadId}:`, error);
    return [];
  }
}

export async function addActivity(
  data: AddActivityData
): Promise<FollowUp | null> {
  if (!data.leadId) {
    console.error("addActivity requires a leadId");
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
          leadId: data.leadId,
          type: data.type,
          date: parseISO(data.date),
          time: data.time || null,
          status: data.status,
          leadStageAtTimeOfFollowUp: data.leadStageAtTimeOfFollowUp || null,
          comment: data.comment || null,
          followupOrTask: data.followupOrTask,
          taskDate: data.taskDate ? parseISO(data.taskDate) : null,
          taskTime: data.taskTime || null,
          taskStatus: data.followupOrTask === 'Task' ? 'Open' : null,
          createdById: session.userId,
          taskForUserId: taskForUserId,
        },
      });

      const leadUpdateData: any = {
        lastCommentText: data.comment,
        lastCommentDate: parseISO(data.date),
      };

      if (data.leadStageAtTimeOfFollowUp) {
        leadUpdateData.status = data.leadStageAtTimeOfFollowUp;
      }
      
      if (data.priority) {
        leadUpdateData.priority = data.priority;
      }
      
      if (data.taskDate && data.taskTime) {
        const activityDateTime = new Date(`${data.taskDate}T${data.taskTime || '00:00:00'}`);
        if (activityDateTime > new Date()) {
           leadUpdateData.nextFollowUpDate = parseISO(data.taskDate);
           leadUpdateData.nextFollowUpTime = data.taskTime;
        }
      }

      await tx.lead.update({
        where: { id: data.leadId! },
        data: leadUpdateData,
      });

      return newActivity;
    });

    revalidatePath(`/leads/${data.leadId}`);
    
    // Fetch the newly created activity with its relations to return full data
    const newActivityWithRelations = await prisma.followUp.findUnique({
      where: { id: result.id },
      include: { createdBy: true, taskForUser: true }
    });
    
    return newActivityWithRelations ? mapPrismaFollowUpToFollowUpType(newActivityWithRelations) : null;
  } catch (error) {
    console.error('Failed to add activity:', error);
    return null;
  }
}


export async function convertToClient(leadId: string): Promise<{ success: boolean; clientId?: string; message?: string }> {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: { followUps: true , siteSurveys: true},
    });

    if (!lead) {
      return { success: false, message: 'Lead not found.' };
    }

    const newClient = await prisma.$transaction(async (tx) => {
      // 1. Create a new client from the lead data
      const createdClient = await tx.client.create({
        data: {
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          source: lead.source,
          status: 'Fresher',
          priority: 'Average',
          createdAt: lead.createdAt,
          kilowatt: lead.kilowatt,
          address: lead.address,
          clientType: lead.clientType,
          electricityBillUrls: lead.electricityBillUrls,
          createdById: lead.createdById,
          assignedToId: lead.assignedToId,
          lastCommentText: lead.lastCommentText,
          lastCommentDate: lead.lastCommentDate,
          nextFollowUpDate: lead.nextFollowUpDate,
          nextFollowUpTime: lead.nextFollowUpTime,
          notes: lead.notes,
        },
      });

      // 2. Re-associate all follow-ups with the new client
      if (lead.followUps.length > 0) {
        await tx.followUp.updateMany({
          where: { leadId: lead.id },
          data: {
            clientId: createdClient.id,
            leadId: null,
          },
        });
      }

      // Re-associate site surveys
      if (lead.siteSurveys.length > 0) {
        await tx.siteSurvey.updateMany({
          where: { leadId: lead.id },
          data: {
            clientId: createdClient.id,
            leadId: null,
          },
        });
      }

      // 4. Re-associate all proposals with the new client
      await tx.proposal.updateMany({
        where: { leadId: lead.id },
        data: {
          clientId: createdClient.id,
          leadId: null,
        },
      });

      // 5. Delete the original lead
      await tx.lead.delete({
        where: { id: lead.id },
      });

      return createdClient;
    });

    revalidatePath('/leads-list');
    revalidatePath('/clients-list');

    return { success: true, clientId: newClient.id };
  } catch (error) {
    console.error(`Failed to convert lead ${leadId} to client:`, error);
    return { success: false, message: 'An unexpected error occurred during conversion.' };
  }
}

export async function dropLead(leadId: string, dropReason: DropReasonType, dropComment?: string): Promise<{ success: boolean, droppedLeadId?: string, message?: string }> {
    try {
        const leadToDrop = await prisma.lead.findUnique({
            where: { id: leadId },
            include: { followUps: true, proposals: true, siteSurveys: true }
        });

        if (!leadToDrop) {
            return { success: false, message: "Lead not found." };
        }

        const newDroppedLead = await prisma.$transaction(async (tx) => {
            const createdDroppedLead = await tx.droppedLead.create({
                data: {
                    name: leadToDrop.name,
                    email: leadToDrop.email,
                    phone: leadToDrop.phone,
                    status: 'Lost',
                    source: leadToDrop.source,
                    createdAt: leadToDrop.createdAt,
                    updatedAt: leadToDrop.updatedAt,
                    lastCommentText: leadToDrop.lastCommentText,
                    lastCommentDate: leadToDrop.lastCommentDate,
                    nextFollowUpDate: leadToDrop.nextFollowUpDate,
                    nextFollowUpTime: leadToDrop.nextFollowUpTime,
                    kilowatt: leadToDrop.kilowatt,
                    address: leadToDrop.address,
                    priority: leadToDrop.priority,
                    clientType: leadToDrop.clientType,
                    electricityBillUrls: leadToDrop.electricityBillUrls,
                    dropReason: dropReason,
                    dropComment: dropComment,
                    createdById: leadToDrop.createdById,
                    assignedToId: leadToDrop.assignedToId,
                }
            });
            
            await tx.followUp.updateMany({
                where: { leadId: leadToDrop.id },
                data: {
                    droppedLeadId: createdDroppedLead.id,
                    leadId: null,
                }
            });
            
            if (leadToDrop.proposals.length > 0) {
              await tx.proposal.updateMany({
                where: { leadId: leadToDrop.id },
                data: {
                  droppedLeadId: createdDroppedLead.id,
                  leadId: null,
                },
              });
            }
            
            if (leadToDrop.siteSurveys.length > 0) {
              await tx.siteSurvey.updateMany({
                  where: { leadId: leadToDrop.id },
                  data: {
                      droppedLeadId: createdDroppedLead.id,
                      leadId: null,
                  }
              });
            }

            await tx.lead.delete({
                where: { id: leadId }
            });

            return createdDroppedLead;
        });

        revalidatePath('/leads-list');
        revalidatePath('/dropped-leads-list');
        return { success: true, droppedLeadId: newDroppedLead.id };

    } catch (error) {
        console.error(`Failed to drop lead ${leadId}:`, error);
        return { success: false, message: "An unexpected error occurred while dropping the lead." };
    }
}

export async function bulkUpdateLeads(
  leadIds: string[],
  data: Partial<Pick<Lead, 'status' | 'source' | 'assignedTo'>>
): Promise<{ success: boolean; count: number; message?: string }> {
  if (leadIds.length === 0) {
    return { success: false, count: 0, message: 'No leads selected.' };
  }
  
  const updateData: any = {};
  if (data.status) updateData.status = data.status;
  if (data.source) updateData.source = data.source;
  
  if (data.assignedTo) {
      const user = await prisma.user.findFirst({ where: { name: data.assignedTo }});
      if (user) {
          updateData.assignedToId = user.id;
      } else {
          return { success: false, count: 0, message: `User '${data.assignedTo}' not found.`};
      }
  }

  try {
    const result = await prisma.lead.updateMany({
      where: {
        id: { in: leadIds },
      },
      data: updateData,
    });
    revalidatePath('/leads-list');
    return { success: true, count: result.count };
  } catch (error) {
    console.error('Failed to bulk update leads:', error);
    return { success: false, count: 0, message: 'An unexpected error occurred during bulk update.' };
  }
}

export async function bulkDropLeads(leadIds: string[], dropReason: DropReasonType, dropComment?: string): Promise<{ success: boolean, count: number, message?: string }> {
    if (leadIds.length === 0) {
        return { success: false, count: 0, message: 'No leads selected.' };
    }
    
    let droppedCount = 0;
    try {
      for (const leadId of leadIds) {
        const result = await dropLead(leadId, dropReason, dropComment);
        if (result.success) {
          droppedCount++;
        }
      }
      
      revalidatePath('/leads-list');
      revalidatePath('/dropped-leads-list');
      
      return { success: true, count: droppedCount, message: `${droppedCount} leads dropped successfully.` };
    } catch (error) {
        console.error(`Failed to drop leads:`, error);
        return { success: false, count: 0, message: 'An unexpected error occurred while dropping leads.' };
    }
}

const leadImportSchema = z.object({
  Name: z.string().min(2),
  Email: z.string().email().optional().or(z.literal('')),
  Phone: z.string().optional().or(z.literal('')),
  Status: z.string().optional().or(z.literal('')),
  Source: z.string().optional().or(z.literal('')),
  'Assigned To': z.string().optional().or(z.literal('')),
  Kilowatt: z.coerce.number().optional(),
  Address: z.string().optional().or(z.literal('')),
  Priority: z.string().optional().or(z.literal('')),
  'Customer Type': z.string().optional().or(z.literal('')),
  'Last Comment': z.string().optional().or(z.literal('')),
});

export async function importLeads(formData: FormData): Promise<{ success: boolean; message: string; createdCount: number, errorCount: number }> {
    const session = await verifySession();
    if (!session?.userId) {
        return { success: false, message: 'Authentication required.', createdCount: 0, errorCount: 0 };
    }

    const file = formData.get('file') as File;
    if (!file) {
        return { success: false, message: 'No file uploaded.', createdCount: 0, errorCount: 0 };
    }

    try {
        const arrayBuffer = await file.arrayBuffer();

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(arrayBuffer);
        
        const worksheet = workbook.getWorksheet(1);
        if (!worksheet) {
             return { success: false, message: 'No worksheet found in the file.', createdCount: 0, errorCount: 0 };
        }

        const data: any[] = [];
        const headerRow = worksheet.getRow(1);
        
        if (headerRow.actualCellCount === 0) {
            return { success: false, message: 'The Excel file is empty or has an empty header row.', createdCount: 0, errorCount: 0 };
        }

        const headers: string[] = [];
        headerRow.eachCell({ includeEmpty: false }, (cell) => {
            headers.push(cell.text?.toString().trim() ?? '');
        });

        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber > 1) { // Skip header row
                const rowObject: any = {};
                row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                    const header = headers[colNumber - 1];
                    if (header) {
                        rowObject[header] = cell.text;
                    }
                });
                if (Object.values(rowObject).some(val => val !== null && val !== '')) {
                    data.push(rowObject);
                }
            }
        });

        const users = await prisma.user.findMany();
        const userMap = new Map(users.map(u => [u.name.toLowerCase(), u.id]));

        const leadsToCreate = [];
        let createdCount = 0;
        let errorCount = 0;

        for (const row of data) {
            const validation = leadImportSchema.safeParse(row);
            if (!validation.success) {
                errorCount++;
                continue;
            }

            const { data: validRow } = validation;
            
            await prisma.$transaction(async (tx) => {
              let assignedToId: string | undefined = undefined;
              if (validRow['Assigned To']) {
                  assignedToId = userMap.get(validRow['Assigned To'].toLowerCase());
              }

            const newLead = await tx.lead.create({
                  data: {
                      name: validRow.Name,
                      email: validRow.Email || null,
                      phone: String(validRow.Phone || ''),
                      status: validRow.Status || 'Fresher',
                      source: validRow.Source || 'Other',
                      kilowatt: validRow.Kilowatt || null,
                      address: validRow.Address || null,
                      priority: validRow.Priority || 'Average',
                      clientType: validRow['Customer Type'] || 'Other',
                      createdById: session.userId,
                      assignedToId: assignedToId || null,
                      lastCommentText: validRow['Last Comment'] || null,
                      lastCommentDate: validRow['Last Comment'] ? new Date() : null,
                  }
              });

              if(validRow['Last Comment']) {
                await tx.followUp.create({
                  data: {
                    leadId: newLead.id,
                    type: 'Call',
                    date: new Date(),
                    status: 'Answered',
                    comment: validRow['Last Comment'],
                    followupOrTask: 'Followup',
                    createdById: session.userId!,
                  }
                });
              }
              createdCount++;
            });
        }
        
        revalidatePath('/leads-list');
        
        const message = `Import complete. ${createdCount} leads successfully imported. ${errorCount > 0 ? `${errorCount} rows had errors and were skipped.` : ''}`;
        return { success: true, message, createdCount: createdCount, errorCount };

    } catch (error) {
        console.error("Failed to import leads:", error);
        return { success: false, message: 'An unexpected error occurred during import.', createdCount: 0, errorCount: 0 };
    }
}

export async function getTasksForCurrentUser(): Promise<TaskNotification[]> {
  const session = await verifySession();
  if (!session?.userId) return [];

  try {
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());
    const tasks = await prisma.followUp.findMany({
      where: {
        followupOrTask: 'Task',
        taskForUserId: session.userId,
        taskDate: {
            gte: todayStart,
            lte: todayEnd,
        }
      },
      include: {
        lead: { select: { name: true, phone: true } },
        client: { select: { name: true, phone: true } },
        droppedLead: { select: { name: true, phone: true } },
        deal: { select: { clientName: true, phone: true, id: true } }
      },
      orderBy: {
        taskTime: 'asc',
      },
    });

    return tasks.map(task => {
        const customer = task.lead || task.client || task.droppedLead ;
        const customerName = task.deal?.clientName || customer?.name || 'Unknown Customer';
        const customerPhone = task.deal?.phone || customer?.phone || null;

        let link = '#';
        if(task.leadId) link = `/leads/${task.leadId}?from_task=${task.id}`;
        else if(task.clientId) link = `/clients/${task.clientId}?from_task=${task.id}`;
        else if(task.droppedLeadId) link = `/dropped-leads/${task.droppedLeadId}?from_task=${task.id}`;
        else if(task.dealId) link = `/deals/${task.dealId}?from_task=${task.id}`;

        return {
            id: task.id,
            comment: task.comment || 'No comment',
            time: task.taskTime || 'No time set',
            customerName,
            customerPhone,
            status: task.taskStatus === 'Closed' ? 'Closed' : 'Open',
            link: link,
        };
    });
  } catch (error) {
    console.error("Failed to fetch tasks for user:", error);
    return [];
  }
}

export async function updateTaskStatus(taskId: string, status: 'Open' | 'Closed'): Promise<{success: boolean, message?: string}> {
    const session = await verifySession();
    if(!session?.userId) return { success: false, message: 'Unauthorized' };

    try {
        const task = await prisma.followUp.findFirst({
            where: {
                id: taskId,
                taskForUserId: session.userId,
            }
        });
        if (!task) return { success: false, message: 'Task not found or you do not have permission to update it.' };

        await prisma.followUp.update({
            where: { id: taskId },
            data: { taskStatus: status }
        });
        return { success: true };
    } catch (error) {
        console.error("Failed to update task status:", error);
        return { success: false, message: 'An unexpected error occurred.' };
    }
}