
'use server';

import prisma from '@/lib/prisma';
import type { Proposal } from '@/types';
import { revalidatePath } from 'next/cache';
import { parseISO } from 'date-fns';
import { deleteFileFromS3 } from '@/lib/s3';
import { verifySession } from '@/lib/auth';
import type { Prisma } from '@prisma/client';

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
    additionalSubsidy: prismaProposal.additionalSubsidy ? Number(prismaProposal.additionalSubsidy) : undefined,
    unitRate: prismaProposal.unitRate ? Number(prismaProposal.unitRate) : undefined,
    requiredSpace: prismaProposal.requiredSpace ? Number(prismaProposal.requiredSpace) : undefined,
    generationPerDay: prismaProposal.generationPerDay ? Number(prismaProposal.generationPerDay) : undefined,
    generationPerYear: prismaProposal.generationPerYear ? Number(prismaProposal.generationPerYear) : undefined,
    savingsPerYear: prismaProposal.savingsPerYear ? Number(prismaProposal.savingsPerYear) : undefined,
    laKitQty: prismaProposal.laKitQty,
    acdbDcdbQty: prismaProposal.acdbDcdbQty,
    earthingKitQty: prismaProposal.earthingKitQty,
    droppedLeadId: prismaProposal.droppedLeadId ?? undefined,
    cityArea: prismaProposal.cityArea,
    createdBy: prismaProposal.createdBy?.name,
  };
}

export async function createOrUpdateProposal(data: Partial<Proposal>): Promise<Proposal | null> {
    const session = await verifySession();
    if (!session?.userId) {
        console.error("Authentication error: No user session found.");
        return null;
    }
    const { id, createdAt, updatedAt, createdBy, email, phone, ...proposalData } = data as any;
    const allowedFields = new Set([
      'proposalNumber', 'name', 'clientType', 'contactPerson', 'location', 'cityArea',
      'capacity', 'moduleType', 'moduleWattage', 'dcrStatus', 'inverterRating', 'inverterQty',
      'ratePerWatt', 'proposalDate', 'baseAmount', 'cgstAmount', 'sgstAmount', 'subtotalAmount',
      'finalAmount', 'subsidyAmount', 'pdfUrl', 'docxUrl', 'requiredSpace',
      'generationPerDay', 'generationPerYear', 'unitRate', 'savingsPerYear',
      'laKitQty', 'acdbDcdbQty', 'earthingKitQty'
    ]);

    const cleanData: any = {};
    for (const key of Object.keys(proposalData)) {
      if (allowedFields.has(key) && proposalData[key] !== undefined) {
        cleanData[key] = proposalData[key];
      }
    }
    cleanData.proposalDate = proposalData.proposalDate ? parseISO(proposalData.proposalDate) : new Date();

    try {
        let savedProposal;
        const { leadId, clientId, templateId, droppedLeadId } = data as any;

        const relationConnects: any = {};
        if (leadId) relationConnects.lead = { connect: { id: leadId } };
        if (clientId) relationConnects.client = { connect: { id: clientId } };
        if (templateId) relationConnects.template = { connect: { id: templateId } };
        if (droppedLeadId) relationConnects.droppedLead = { connect: { id: droppedLeadId } };

        if (id) {
            // Fetch the old proposal to get the old file URLs
            const oldProposal = await prisma.proposal.findUnique({
                where: { id },
                select: { pdfUrl: true, docxUrl: true }
            });

            // Update existing proposal
            savedProposal = await prisma.proposal.update({
                where: { id },
                data: {
                    ...cleanData,
                    ...relationConnects
                },
                include: { createdBy: true },
            });

            // After successful update, delete old files if they exist and are different
            if (oldProposal) {
                if (oldProposal.pdfUrl && oldProposal.pdfUrl !== savedProposal.pdfUrl) {
                    try {
                        const pdfKey = new URL(oldProposal.pdfUrl).pathname.substring(1);
                        await deleteFileFromS3(pdfKey);
                    } catch (e) {
                        console.error(`Failed to delete old PDF file: ${oldProposal.pdfUrl}`, e);
                    }
                }
                if (oldProposal.docxUrl && oldProposal.docxUrl !== savedProposal.docxUrl) {
                    try {
                        const docxKey = new URL(oldProposal.docxUrl).pathname.substring(1);
                        await deleteFileFromS3(docxKey);
                    } catch (e) {
                        console.error(`Failed to delete old DOCX file: ${oldProposal.docxUrl}`, e);
                    }
                }
            }
        } else {
            // Create new proposal
            savedProposal = await prisma.proposal.create({
                data: {
                    ...cleanData,
                    ...relationConnects,
                    createdBy: { connect: { id: session.userId } }
                },
                include: { createdBy: true },
            });
        }

        if (data.leadId) revalidatePath(`/leads/${data.leadId}`);
        if (data.clientId) revalidatePath(`/clients/${data.clientId}`);
        revalidatePath('/proposals');
        revalidatePath(`/proposals/${data.clientId || data.leadId}`);
        
        return mapPrismaProposalToProposalType(savedProposal);

    } catch (error: any) {
        console.error("Failed to create or update proposal:", error);
        import('fs').then(fs => fs.appendFileSync('prisma-error.log', new Date().toISOString() + '\\n' + String(error.message || error) + '\\n' + JSON.stringify(error) + '\\n\\n'));
        return null;
    }
}

export async function deleteProposal(proposalId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId },
    });

    if (!proposal) {
      return { success: false, error: 'Proposal not found.' };
    }

    // Delete files from S3 if they exist
    if (proposal.pdfUrl) {
      try {
        const pdfKey = new URL(proposal.pdfUrl).pathname.substring(1);
        await deleteFileFromS3(pdfKey);
      } catch (e) {
        console.error(`Failed to delete PDF from S3: ${proposal.pdfUrl}`, e);
      }
    }
    if (proposal.docxUrl) {
      try {
        const docxKey = new URL(proposal.docxUrl).pathname.substring(1);
        await deleteFileFromS3(docxKey);
      } catch(e) {
        console.error(`Failed to delete DOCX from S3: ${proposal.docxUrl}`, e);
      }
    }

    // Delete from DB
    await prisma.proposal.delete({
      where: { id: proposalId },
    });

    revalidatePath('/proposals');
    if (proposal.clientId) revalidatePath(`/proposals/${proposal.clientId}`);
    if (proposal.leadId) revalidatePath(`/proposals/${proposal.leadId}`);
    if (proposal.droppedLeadId) revalidatePath(`/proposals/${proposal.droppedLeadId}`);
    
    return { success: true };

  } catch (error) {
    console.error('Failed to delete proposal:', error);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

export async function bulkCreateProposals(proposalsData: Partial<Proposal>[]): Promise<{ success: boolean; createdProposals: Proposal[]; message?: string }> {
    const session = await verifySession();
    if (!session?.userId) {
        return { success: false, createdProposals: [], message: 'Unauthorized' };
    }
    const createdProposals: Proposal[] = [];
    try {
      await prisma.$transaction(async (tx) => {
        for (const p of proposalsData) {
            const dataToSave: any = {
                // All fields from your schema that are in Partial<Proposal>
                proposalNumber: p.proposalNumber!,
                name: p.name!,
                clientType: p.clientType!,
                contactPerson: p.contactPerson!,
                location: p.location!,
                cityArea: p.cityArea,
                capacity: p.capacity!,
                moduleType: p.moduleType!,
                moduleWattage: p.moduleWattage!,
                dcrStatus: p.dcrStatus!,
                inverterRating: p.inverterRating!,
                inverterQty: p.inverterQty!,
                ratePerWatt: p.ratePerWatt!,
                proposalDate: p.proposalDate ? parseISO(p.proposalDate) : new Date(),
                baseAmount: p.baseAmount!,
                cgstAmount: p.cgstAmount!,
                sgstAmount: p.sgstAmount!,
                subtotalAmount: p.subtotalAmount!,
                finalAmount: p.finalAmount!,
                subsidyAmount: p.subsidyAmount!,
                pdfUrl: p.pdfUrl,
                docxUrl: p.docxUrl,
                templateId: p.templateId,
                createdById: session.userId,
                // Optional fields
                requiredSpace: p.requiredSpace,
                generationPerDay: p.generationPerDay,
                generationPerYear: p.generationPerYear,
                unitRate: p.unitRate,
                savingsPerYear: p.savingsPerYear,
                laKitQty: p.laKitQty,
                acdbDcdbQty: p.acdbDcdbQty,
                earthingKitQty: p.earthingKitQty,
            };

            // Conditionally add leadId or clientId
            if (p.leadId) {
                dataToSave.leadId = p.leadId;
            }
            if (p.clientId) {
                dataToSave.clientId = p.clientId;
            }

            const created = await tx.proposal.create({
                data: dataToSave,
                include: { createdBy: true },
            });
            createdProposals.push(mapPrismaProposalToProposalType(created));
        }

        revalidatePath('/proposals');
        proposalsData.forEach(p => {
            if (p.leadId) revalidatePath(`/leads/${p.leadId}`);
            if (p.clientId) revalidatePath(`/clients/${p.clientId}`);
        });

      });

        return { success: true, createdProposals };
    } catch (error) {
        console.error("Failed to bulk create proposals:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during database save.";
        return { success: false, createdProposals: [], message: errorMessage };
    }
}

export async function getProposalsForLead(leadId: string): Promise<Proposal[]> {
    if (!leadId) return [];
    const session = await verifySession();
    if (!session?.userId) return [];
    try {
        const whereClause: Prisma.ProposalWhereInput = { leadId };
        if (session.viewPermission === 'ASSIGNED') {
            whereClause.OR = [
                { createdById: session.userId },
                { lead: { assignedToId: session.userId } }
            ];
        }
        const proposals = await prisma.proposal.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            include: { createdBy: true },
        });
        return proposals.map(mapPrismaProposalToProposalType);
    } catch (error) {
        console.error(`Failed to fetch proposals for lead ${leadId}:`, error);
        return [];
    }
}

export async function getProposalsForClient(clientId: string): Promise<Proposal[]> {
     if (!clientId) return [];
     const session = await verifySession();
     if (!session?.userId) return [];
    try {
        const whereClause: Prisma.ProposalWhereInput = { clientId };
        if (session.viewPermission === 'ASSIGNED') {
            whereClause.OR = [
                { createdById: session.userId },
                { client: { assignedToId: session.userId } }
            ];
        }
        const proposals = await prisma.proposal.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            include: { createdBy: true },
        });
        return proposals.map(mapPrismaProposalToProposalType);
    } catch (error) {
        console.error(`Failed to fetch proposals for client ${clientId}:`, error);
        return [];
    }
}

export async function getAllProposals({ ignorePermissions = false }: { ignorePermissions?: boolean } = {}): Promise<Proposal[]> {
    const session = await verifySession();
    if (!session?.userId) return [];
    try {
        const whereClause: Prisma.ProposalWhereInput = {};
        if (session.viewPermission === 'ASSIGNED' && !ignorePermissions) {
            whereClause.OR = [
                { createdById: session.userId },
                { client: { assignedToId: session.userId } },
                { lead: { assignedToId: session.userId } },
                { droppedLead: { assignedToId: session.userId } }
            ];
        }
        const proposals = await prisma.proposal.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            include: { createdBy: true },
        });
        return proposals.map(mapPrismaProposalToProposalType);
    } catch (error) {
        console.error("Failed to fetch all proposals:", error);
        return [];
    }
}
