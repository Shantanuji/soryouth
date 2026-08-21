
'use server';

import prisma from '@/lib/prisma';
import type { SiteSurvey, CreateSiteSurveyData } from '@/types';
import { revalidatePath } from 'next/cache';
import { verifySession } from '@/lib/auth';
import { format, parseISO } from 'date-fns';
import { deleteFileFromS3 } from '@/lib/s3';

function mapPrismaSurvey(survey: any): SiteSurvey {
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

export async function createSiteSurvey(data: CreateSiteSurveyData): Promise<SiteSurvey | { error: string }> {
  const session = await verifySession();
  if (!session?.userId) {
    return { error: 'Authentication required.' };
  }

  try {
    const surveyor = await prisma.user.findUnique({
      where: { id: data.surveyorId },
    });
    if (!surveyor) {
      return { error: 'Selected surveyor not found.' };
    }

    // Ensure leadId and clientId are null if not provided or empty
    const leadId = data.leadId || null;
    const clientId = data.clientId || null;

    const dataToSave = {
      surveyNumber: `SRV-${Date.now()}`,
      consumerName: data.consumerName,
      date: parseISO(data.date),
      consumerCategory: data.consumerCategoryOther || data.consumerCategory,
      location: data.location,
      numberOfMeters: data.numberOfMeters,
      meterRating: data.meterRating,
      meterPhase: data.meterPhase,
      electricityAmount: data.electricityAmount,
      consumerLoadType: data.consumerLoadType,
      roofType: data.roofTypeOther || data.roofType,
      buildingHeight: data.buildingHeight,
      shadowFreeArea: data.shadowFreeArea,
      discom: data.discomOther || data.discom,
      sanctionedLoad: data.sanctionedLoad,
      remark: data.remark,
      electricityBillFiles: data.electricityBillFiles,
      leadId: data.leadId,
      clientId: data.clientId,
      surveyorId: surveyor.id,
    };

    const newSurvey = await prisma.$transaction(async (tx) => {
        const createdSurvey = await tx.siteSurvey.create({
          data: dataToSave,
          include: {
            surveyor: true,
          },
        });

        if (data.electricityBillFiles.length > 0) {
          if (leadId) {
            const lead = await tx.lead.findUnique({ where: { id: leadId }, select: { electricityBillUrls: true } });
            if (lead) {
              const existingUrls = lead.electricityBillUrls as string[];
              await tx.lead.update({
                where: { id: leadId },
                data: { electricityBillUrls: [...existingUrls, ...data.electricityBillFiles] },
              });
            }
          } else if (clientId) {
            const client = await tx.client.findUnique({ where: { id: clientId }, select: { electricityBillUrls: true } });
            if (client) {
              const existingUrls = client.electricityBillUrls as string[];
              await tx.client.update({
                where: { id: clientId },
                data: { electricityBillUrls: [...existingUrls, ...data.electricityBillFiles] },
              });
            }
          }
        }
        
        return createdSurvey;
    });
      
    

  


    revalidatePath('/site-survey');
    revalidatePath('/survey-list');
    if (data.leadId) revalidatePath(`/leads/${data.leadId}`);
    if (data.clientId) revalidatePath(`/clients/${data.clientId}`);

    return mapPrismaSurvey(newSurvey);
  } catch (error) {
    console.error('Failed to create site survey:', error);
    return { error: 'An unexpected error occurred while saving the survey.' };
  }
}

export async function getSiteSurveys(): Promise<SiteSurvey[]> {
  const session = await verifySession();
  if (!session?.userId) return [];
  try {
    const whereClause: any = {};
    if (session.viewPermission === 'ASSIGNED') {
      whereClause.OR = [
        { surveyorId: session.userId },
        { lead: { assignedToId: session.userId } },
        { client: { assignedToId: session.userId } },
        { droppedLead: { assignedToId: session.userId } },
      ];
    }
    const surveys = await prisma.siteSurvey.findMany({
      where: whereClause,
      orderBy: { date: 'desc' },
      include: { surveyor: true },
    });
    return surveys.map(mapPrismaSurvey);
  } catch (error) {
    console.error('Failed to fetch site surveys:', error);
    return [];
  }
}

export async function getSurveysForLead(leadId: string): Promise<SiteSurvey[]> {
  const session = await verifySession();
  if (!session?.userId) return [];
  try {
    const whereClause: any = { leadId };
    if (session.viewPermission === 'ASSIGNED') {
      whereClause.OR = [
        { surveyorId: session.userId },
        { lead: { assignedToId: session.userId } }
      ];
    }
    const surveys = await prisma.siteSurvey.findMany({
      where: whereClause,
      orderBy: { date: 'desc' },
      include: { surveyor: true },
    });
    return surveys.map(mapPrismaSurvey);
  } catch (error) {
    console.error(`Failed to fetch surveys for lead ${leadId}:`, error);
    return [];
  }
}

export async function getSurveysForClient(clientId: string): Promise<SiteSurvey[]> {
  const session = await verifySession();
  if (!session?.userId) return [];
  try {
    const whereClause: any = { clientId };
    if (session.viewPermission === 'ASSIGNED') {
      whereClause.OR = [
        { surveyorId: session.userId },
        { client: { assignedToId: session.userId } }
      ];
    }
    const surveys = await prisma.siteSurvey.findMany({
      where: whereClause,
      orderBy: { date: 'desc' },
      include: { surveyor: true },
    });
    return surveys.map(mapPrismaSurvey);
  } catch (error) {
    console.error(`Failed to fetch surveys for client ${clientId}:`, error);
    return [];
  }
}

export async function getSurveysForDroppedLead(droppedLeadId: string): Promise<SiteSurvey[]> {
  const session = await verifySession();
  if (!session?.userId) return [];
  try {
    const whereClause: any = { droppedLeadId };
    if (session.viewPermission === 'ASSIGNED') {
      whereClause.OR = [
        { surveyorId: session.userId },
        { droppedLead: { assignedToId: session.userId } }
      ];
    }
    const surveys = await prisma.siteSurvey.findMany({
      where: whereClause,
      orderBy: { date: 'desc' },
      include: { surveyor: true },
    });
    return surveys.map(mapPrismaSurvey);
  } catch (error) {
    console.error(`Failed to fetch surveys for dropped lead ${droppedLeadId}:`, error);
    return [];
  }
}

export async function deleteSurveys(surveyIds: string[]): Promise<{ success: boolean; error?: string }> {
  try {
    const surveysToDelete = await prisma.siteSurvey.findMany({
      where: { id: { in: surveyIds } },
      select: { electricityBillFiles: true },
    });

    // Flatten all file URLs into a single array
    const filesToDelete = surveysToDelete.flatMap(survey => survey.electricityBillFiles as string[]);

    // Delete files from S3
    if (filesToDelete.length > 0) {
      const deletePromises = filesToDelete.map(url => {
        const key = new URL(url as string).pathname.substring(1);
        return deleteFileFromS3(key);
      });
      await Promise.all(deletePromises);
    }
    
    // Delete survey records from the database
    await prisma.siteSurvey.deleteMany({
      where: { id: { in: surveyIds } },
    });

    revalidatePath('/survey-list');
    return { success: true };
  } catch (error) {
    console.error('Failed to delete surveys:', error);
    return { success: false, error: 'An unexpected error occurred during bulk deletion.' };
  }
}
