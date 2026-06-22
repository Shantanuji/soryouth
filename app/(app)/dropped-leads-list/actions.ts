
'use server';

import prisma from '@/lib/prisma';
import type { DroppedLead, FollowUp, LeadStatusType, SiteSurvey, Proposal } from '@/types';
import { revalidatePath } from 'next/cache';
import { format, parseISO } from 'date-fns';
import { verifySession } from '@/lib/auth';
import type { Prisma } from '@prisma/client';

function mapPrismaDroppedLeadToDroppedLeadType(prismaLead: any): DroppedLead {
  return {
    id: prismaLead.id,
    name: prismaLead.name,
    status: 'Lost',
    createdAt: prismaLead.createdAt.toISOString(),
    droppedAt: prismaLead.droppedAt.toISOString(),
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
    priority: prismaLead.priority ?? undefined,
    dropReason: prismaLead.dropReason,
    dropComment: prismaLead.dropComment ?? undefined,
    clientType: prismaLead.clientType ?? undefined,
    electricityBillUrls: prismaLead.electricityBillUrls ?? [],
    followupCount: prismaLead.followUps?.length ?? 0,
  };
}

function mapPrismaFollowUpToFollowUpType(prismaFollowUp: any): FollowUp {
  return {
    id: prismaFollowUp.id,
    leadId: prismaFollowUp.leadId ?? undefined,
    clientId: prismaFollowUp.clientId ?? undefined,
    droppedLeadId: prismaFollowUp.droppedLeadId ?? undefined,
    type: prismaFollowUp.type,
    date: prismaFollowUp.date.toISOString(),
    time: prismaFollowUp.time ?? undefined,
    status: prismaFollowUp.status,
    leadStageAtTimeOfFollowUp: prismaFollowUp.leadStageAtTimeOfFollowUp ?? undefined,
    comment: prismaFollowUp.comment ?? undefined,
    createdBy: prismaFollowUp.createdBy?.name ?? undefined,
    createdById: prismaFollowUp.createdById ?? undefined,
    createdAt: prismaFollowUp.createdAt.toISOString(),
    followupOrTask: prismaFollowUp.followupOrTask,
    taskForUser: prismaFollowUp.taskForUser?.name ?? undefined,
    taskDate: prismaFollowUp.taskDate?.toISOString() ?? undefined,
    taskTime: prismaFollowUp.taskTime ?? undefined,
  };
}

// Duplicated from site-survey/actions.ts to avoid circular dependencies
function mapPrismaSurveyToSiteSurvey(survey: any): SiteSurvey {
  return {
    id: survey.id,
    surveyNumber: survey.surveyNumber,
    consumerName: survey.consumerName,
    date: format(survey.date, 'yyyy-MM-dd'),
    consumerCategory: survey.consumerCategory,
    location: survey.location,
    numberOfMeters: survey.numberOfMeters,
    meterRating: survey.meterRating ?? undefined,
    meterPhase: survey.meterPhase ?? undefined,
    electricityAmount: survey.electricityAmount ?? undefined,
    consumerLoadType: survey.consumerLoadType,
    roofType: survey.roofType,
    buildingHeight: survey.buildingHeight,
    shadowFreeArea: survey.shadowFreeArea,
    discom: survey.discom,
    sanctionedLoad: survey.sanctionedLoad ?? undefined,
    remark: survey.remark ?? undefined,
    electricityBillFiles: survey.electricityBillFiles ?? [],
    createdAt: survey.createdAt.toISOString(),
    updatedAt: survey.updatedAt.toISOString(),
    leadId: survey.leadId ?? undefined,
    clientId: survey.clientId ?? undefined,
    droppedLeadId: survey.droppedLeadId ?? undefined,
    surveyorName: survey.surveyor.name,
    surveyorId: survey.surveyorId,
  };
}

// Helper to map Prisma proposal to frontend Proposal type
function mapPrismaProposalToProposalType(prismaProposal: any): Proposal {
  // Ensure all numeric fields are correctly typed as numbers, especially Decimals from Prisma
  return {
    ...prismaProposal,
    proposalDate: prismaProposal.proposalDate.toISOString(),
    createdAt: prismaProposal.createdAt.toISOString(),
    updatedAt: prismaProposal.updatedAt.toISOString(),
    capacity: Number(prismaProposal.capacity),
    ratePerWatt: Number(prismaProposal.ratePerWatt),
    inverterRating: Number(prismaProposal.inverterRating),
    baseAmount: Number(prismaProposal.baseAmount),
    cgstAmount: Number(prismaProposal.cgstAmount),
    sgstAmount: Number(prismaProposal.sgstAmount),
    subtotalAmount: Number(prismaProposal.subtotalAmount),
    finalAmount: Number(prismaProposal.finalAmount),
    subsidyAmount: Number(prismaProposal.subsidyAmount),
    unitRate: prismaProposal.unitRate ? Number(prismaProposal.unitRate) : undefined,
    requiredSpace: prismaProposal.requiredSpace ? Number(prismaProposal.requiredSpace) : undefined,
    generationPerDay: prismaProposal.generationPerDay ? Number(prismaProposal.generationPerDay) : undefined,
    generationPerYear: prismaProposal.generationPerYear ? Number(prismaProposal.generationPerYear) : undefined,
    savingsPerYear: prismaProposal.savingsPerYear ? Number(prismaProposal.savingsPerYear) : undefined,
    droppedLeadId: prismaProposal.droppedLeadId ?? undefined,
  };
}

export async function getDroppedLeads({ ignorePermissions = false }: { ignorePermissions?: boolean } = {}): Promise<DroppedLead[]> {
     const session = await verifySession();
    if (!session?.userId) return [];

    try {
        const whereClause: Prisma.DroppedLeadWhereInput = {};
        if (session.viewPermission === 'ASSIGNED' && !ignorePermissions) {
          whereClause.assignedToId = session.userId;
        }

        const droppedLeads = await prisma.droppedLead.findMany({
            where: whereClause,
            orderBy: { droppedAt: 'desc' },
            include: { 
              followUps: { select: { id: true }},
              createdBy: true,
              assignedTo: true,
            }
        });
        return droppedLeads.map(mapPrismaDroppedLeadToDroppedLeadType);
    } catch (error) {
        console.error("Failed to fetch dropped leads:", error);
        return [];
    }
}

export async function getDroppedLeadById(id: string): Promise<DroppedLead | null> {
    if (!id) return null;
    try {
        const droppedLead = await prisma.droppedLead.findUnique({
            where: { id },
            include: { 
              followUps: true,
              createdBy: true,
              assignedTo: true,
            }
        });
        return droppedLead ? mapPrismaDroppedLeadToDroppedLeadType(droppedLead) : null;
    } catch (error) {
        console.error(`Failed to fetch dropped lead with id ${id}:`, error);
        return null;
    }
}

export async function getActivitiesForDroppedLead(droppedLeadId: string): Promise<FollowUp[]> {
    if (!droppedLeadId) return [];
    try {
      const activities = await prisma.followUp.findMany({
        where: { droppedLeadId },
        orderBy: { createdAt: 'desc' },
        include: { createdBy: true, taskForUser: true }
      });
      return activities.map(mapPrismaFollowUpToFollowUpType);
    } catch (error) {
      console.error(`Failed to fetch activities for dropped lead ${droppedLeadId}:`, error);
      return [];
    }
}

export async function getSurveysForDroppedLead(droppedLeadId: string): Promise<SiteSurvey[]> {
  try {
    const surveys = await prisma.siteSurvey.findMany({
      where: { droppedLeadId },
      orderBy: { date: 'desc' },
      include: { surveyor: true },
    });
    return surveys.map(mapPrismaSurveyToSiteSurvey);
  } catch (error) {
    console.error(`Failed to fetch surveys for dropped lead ${droppedLeadId}:`, error);
    return [];
  }
}

export async function getProposalsForDroppedLead(droppedLeadId: string): Promise<Proposal[]> {
    if (!droppedLeadId) return [];
    try {
        const proposals = await prisma.proposal.findMany({
            where: { droppedLeadId },
            orderBy: { createdAt: 'desc' },
        });
        return proposals.map(mapPrismaProposalToProposalType);
    } catch (error) {
        console.error(`Failed to fetch proposals for dropped lead ${droppedLeadId}:`, error);
        return [];
    }
}


export async function reactivateLead(droppedLeadId: string): Promise<{ success: boolean; newLeadId?: string; message?: string }> {
    try {
        const droppedLead = await prisma.droppedLead.findUnique({
            where: { id: droppedLeadId },
            include: { followUps: true }
        });

        if (!droppedLead) {
            return { success: false, message: 'Dropped lead not found.' };
        }

        const newLead = await prisma.$transaction(async (tx) => {
            const createdLead = await tx.lead.create({
                data: {
                    name: droppedLead.name,
                    email: droppedLead.email,
                    phone: droppedLead.phone,
                    status: 'Follow-up' as LeadStatusType, // Default reactivated status
                    source: droppedLead.source,
                    createdAt: droppedLead.createdAt,
                    lastCommentText: `Reactivated: Lead was dropped with reason - ${droppedLead.dropReason}. ${droppedLead.dropComment || ''}`.trim(),
                    lastCommentDate: new Date(),
                    nextFollowUpDate: droppedLead.nextFollowUpDate,
                    nextFollowUpTime: droppedLead.nextFollowUpTime,
                    kilowatt: droppedLead.kilowatt,
                    address: droppedLead.address,
                    priority: droppedLead.priority,
                    clientType: droppedLead.clientType,
                    electricityBillUrls: droppedLead.electricityBillUrls as Prisma.InputJsonValue,
                    dropReason: droppedLead.dropReason,
                    createdById: droppedLead.createdById,
                    assignedToId: droppedLead.assignedToId,
                }
            });

            // Re-associate follow-ups
            await tx.followUp.updateMany({
                where: { droppedLeadId: droppedLead.id },
                data: {
                    leadId: createdLead.id,
                    droppedLeadId: null
                }
            });
            
            // Re-associate proposals
            await tx.proposal.updateMany({
                where: { droppedLeadId: droppedLead.id },
                data: {
                    leadId: createdLead.id,
                    droppedLeadId: null
                }
            });

            // Re-associate surveys
            await tx.siteSurvey.updateMany({
                where: { droppedLeadId: droppedLead.id },
                data: {
                    leadId: createdLead.id,
                    droppedLeadId: null
                }
            });

            await tx.droppedLead.delete({
                where: { id: droppedLeadId }
            });

            return createdLead;
        });

        revalidatePath('/leads-list');
        revalidatePath('/dropped-leads-list');

        return { success: true, newLeadId: newLead.id };

    } catch (error: any) {
        if (error.code === 'P2002' && error.meta?.target?.includes('phone')) {
        return { success: false, message: 'Reactivation failed: A contact with this phone number already exists in the active leads or clients.' };
        }
        console.error(`Failed to reactivate lead ${droppedLeadId}:`, error);
        return { success: false, message: 'An unexpected error occurred during reactivation.' };
    }
}

export async function updateDroppedLead(id: string, data: Partial<Omit<DroppedLead, 'id' | 'createdAt' | 'droppedAt' | 'followupCount' | 'status'>>): Promise<DroppedLead | null> {
    try {
        const prismaData: any = {};
        const fieldsToIgnore = ['id', 'createdAt', 'droppedAt', 'followupCount', 'status', 'createdBy', 'assignedTo'];

        for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                if (fieldsToIgnore.includes(key)) {
                    continue;
                }

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
                    prismaData[typedKey] = (data as any)[typedKey] ?? null;
                }
            }
        }
        
        if (data.assignedTo) {
            const user = await prisma.user.findFirst({ where: { name: data.assignedTo }});
            prismaData.assignedToId = user ? user.id : null;
        }

        const updatedLead = await prisma.droppedLead.update({
            where: { id },
            data: prismaData,
            include: { createdBy: true, assignedTo: true, followUps: true }
        });
        revalidatePath(`/dropped-leads/${id}`);
        return mapPrismaDroppedLeadToDroppedLeadType(updatedLead);
    } catch (error) {
        console.error(`Failed to update dropped lead ${id}:`, error);
        return null;
    }
}

export async function bulkReactivateLeads(leadIds: string[]): Promise<{ success: boolean, count: number, message?: string }> {
    if (leadIds.length === 0) {
        return { success: false, count: 0, message: 'No leads selected.' };
    }
    
    let reactivatedCount = 0;
    try {
      for (const leadId of leadIds) {
        const result = await reactivateLead(leadId);
        if (result.success) {
          reactivatedCount++;
        }
      }
      
      revalidatePath('/leads-list');
      revalidatePath('/dropped-leads-list');
      
      return { success: true, count: reactivatedCount, message: `${reactivatedCount} leads reactivated successfully.` };
    } catch (error) {
        console.error(`Failed to reactivate leads:`, error);
        return { success: false, count: 0, message: 'An unexpected error occurred while reactivating leads.' };
    }
}