
'use server';

import prisma from '@/lib/prisma';
import type { CustomSetting, SettingType, Template } from '@/types';
import { revalidatePath } from 'next/cache';
import { deleteGeneratedDocument, deleteFinancialDocument } from '@/app/(app)/documents/actions';
import { deleteTemplate as deleteTemplateFile } from '@/app/(app)/manage-templates/actions';

// Helper to map Prisma CustomSetting to frontend CustomSetting type
function mapPrismaCustomSetting(setting: any): CustomSetting {
    return {
        id: setting.id,
        type: setting.type,
        name: setting.name,
        createdAt: setting.createdAt.toISOString(),
    };
}

export async function getSettingsByType(type: SettingType): Promise<CustomSetting[]> {
    try {
        const settings = await prisma.customSetting.findMany({
            where: { type: type as any },
            orderBy: { createdAt: 'asc' },
        });
        return settings.map(mapPrismaCustomSetting);
    } catch (error) {
        console.error(`Failed to fetch settings for type ${type}:`, error);
        return [];
    }
}

export async function getLeadStatuses(): Promise<CustomSetting[]> {
    return getSettingsByType('LEAD_STATUS');
}

export async function getLeadSources(): Promise<CustomSetting[]> {
    return getSettingsByType('LEAD_SOURCE');
}

export async function getClientStatuses(): Promise<CustomSetting[]> {
    return getSettingsByType('CLIENT_STATUS');
}

export async function getDocumentTypes(): Promise<CustomSetting[]> {
    return getSettingsByType('DOCUMENT_TYPE');
}

export async function getFinancialDocumentTypes(): Promise<CustomSetting[]> {
    return getSettingsByType('FINANCIAL_DOCUMENT_TYPE');
}

export async function getModuleWattages(): Promise<CustomSetting[]> {
    const wattages = await getSettingsByType('MODULE_WATTAGE');
    if (wattages.length === 0) {
        const defaults = ["540", "545", "550", "570", "580", "585", "590", "600", "650", "700", "750", "800"];
        const createdRoles: CustomSetting[] = [];
        for (const val of defaults) {
            const result = await addSetting('MODULE_WATTAGE', val);
            if (!('error' in result)) {
                createdRoles.push(result);
            }
        }
        return createdRoles;
    }
    return wattages;
}

export async function getModuleTypes(): Promise<CustomSetting[]> {
    const types = await getSettingsByType('MODULE_TYPE');
    if (types.length === 0) {
        const defaults = ['Mono PERC', 'TOPCon', 'Bifacial TOPCon'];
        const createdRoles: CustomSetting[] = [];
        for (const val of defaults) {
            const result = await addSetting('MODULE_TYPE', val);
            if (!('error' in result)) {
                createdRoles.push(result);
            }
        }
        return createdRoles;
    }
    return types;
}

export async function getMountingStructures(): Promise<CustomSetting[]> {
    const items = await getSettingsByType('MOUNTING_STRUCTURE');
    if (items.length === 0) {
        const defaults = ['RCC Rooftop', 'Metal Sheet Rooftop', 'Ground Mount', 'Tin Shed', 'Terrace Mount'];
        const created: CustomSetting[] = [];
        for (const val of defaults) {
            const result = await addSetting('MOUNTING_STRUCTURE', val);
            if (!('error' in result)) {
                created.push(result);
            }
        }
        return created;
    }
    return items;
}

export async function getUserRoles(): Promise<CustomSetting[]> {
    const roles = await getSettingsByType('USER_ROLE');
    if (roles.length === 0) {
        // Seed default roles if none exist
        const defaultRoles = ['Admin', 'TechnoSales', 'Designing', 'Procurement', 'ProjectManager', 'LiasoningExecutive', 'OperationAndMaintainance'];
        const createdRoles: CustomSetting[] = [];
        for (const roleName of defaultRoles) {
            const result = await addSetting('USER_ROLE', roleName);
            if (!('error' in result)) {
                createdRoles.push(result);
            }
        }
        return createdRoles;
    }
    return roles;
}

export async function addSetting(type: SettingType, name: string): Promise<CustomSetting | { error: string }> {
    if (!name || name.trim().length === 0) {
        return { error: 'Name cannot be empty.' };
    }
    try {
        const newSetting = await prisma.customSetting.create({
            data: {
                type: type as any,
                name: name.trim(),
            },
        });
        
        // Revalidate relevant paths
        if (type === 'LEAD_STATUS' || type === 'LEAD_SOURCE') revalidatePath('/leads-list');
        if (type === 'CLIENT_STATUS') revalidatePath('/clients-list');
        if (type === 'USER_ROLE') revalidatePath('/users');
        if (type === 'MODULE_WATTAGE' || type === 'MODULE_TYPE' || type === 'MOUNTING_STRUCTURE') revalidatePath('/proposals');
        if (type === 'DOCUMENT_TYPE' || type === 'FINANCIAL_DOCUMENT_TYPE') {
            revalidatePath('/documents');
            revalidatePath('/manage-templates');
        }
        
        return mapPrismaCustomSetting(newSetting);
    } catch (error: any) {
        if (error.code === 'P2002') { // Unique constraint violation
            return { error: `The name "${name}" already exists for this setting type.` };
        }
        console.error(`Failed to add setting for type ${type}:`, error);
        return { error: 'An unexpected error occurred.' };
    }
}

export async function deleteSetting(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        const settingToDelete = await prisma.customSetting.findUnique({ where: { id } });
        if (!settingToDelete) {
             return { success: false, error: 'Setting not found.' };
        }

        await prisma.customSetting.delete({
            where: { id },
        });
        
        const sType = settingToDelete.type as string;
        if (sType === 'LEAD_STATUS' || sType === 'LEAD_SOURCE') revalidatePath('/leads-list');
        if (sType === 'CLIENT_STATUS') revalidatePath('/clients-list');
        if (sType === 'USER_ROLE') revalidatePath('/users');
        if (sType === 'MODULE_WATTAGE' || sType === 'MODULE_TYPE' || sType === 'MOUNTING_STRUCTURE') revalidatePath('/proposals');
        if (sType === 'DOCUMENT_TYPE' || sType === 'FINANCIAL_DOCUMENT_TYPE') {
            revalidatePath('/documents');
            revalidatePath('/manage-templates');
        }

        return { success: true };
    } catch (error) {
        console.error('Failed to delete setting:', error);
        return { success: false, error: 'An unexpected error occurred.' };
    }
}

export async function getDeletionImpactForDocumentType(typeName: string): Promise<{ templateCount: number, documentCount: number }> {
    const templateCount = await prisma.template.count({
        where: { type: typeName }
    });
    const documentCount = await prisma.generatedDocument.count({
        where: { documentType: typeName }
    });
    return { templateCount, documentCount };
}

export async function getDeletionImpactForFinancialDocumentType(typeName: string): Promise<{ templateCount: number, documentCount: number }> {
    const templateCount = await prisma.template.count({
        where: { type: typeName }
    });
    const documentCount = await prisma.financialDocument.count({
        where: { documentType: typeName }
    });
    return { templateCount, documentCount };
}


export async function deleteDocumentTypeAndContents(settingId: string): Promise<{ success: boolean, error?: string }> {
    try {
        const settingToDelete = await prisma.customSetting.findUnique({ where: { id: settingId } });
        if (!settingToDelete || settingToDelete.type !== 'DOCUMENT_TYPE') {
            return { success: false, error: 'Document type setting not found.' };
        }
        
        const typeName = settingToDelete.name;

        // Find all generated documents of this type
        const documentsToDelete = await prisma.generatedDocument.findMany({
            where: { documentType: typeName },
        });

        // Delete all associated files from S3 and records from DB
        for (const doc of documentsToDelete) {
            await deleteGeneratedDocument(doc.id);
        }
        
        // Find all templates of this type
        const templatesToDelete = await prisma.template.findMany({
            where: { type: typeName },
        });

        // Delete all associated template files from S3 and records from DB
        for (const template of templatesToDelete) {
            await deleteTemplateFile(template.id);
        }

        // Finally, delete the setting itself
        await prisma.customSetting.delete({ where: { id: settingId } });
        
        revalidatePath('/documents');
        revalidatePath('/manage-templates');

        return { success: true };

    } catch (error) {
        console.error('Failed to delete document type and its contents:', error);
        return { success: false, error: 'An unexpected error occurred during deletion.' };
    }
}

export async function deleteFinancialDocumentTypeAndContents(settingId: string): Promise<{ success: boolean, error?: string }> {
    try {
        const settingToDelete = await prisma.customSetting.findUnique({ where: { id: settingId } });
        if (!settingToDelete || settingToDelete.type !== 'FINANCIAL_DOCUMENT_TYPE') {
            return { success: false, error: 'Financial Document type setting not found.' };
        }
        
        const typeName = settingToDelete.name;

        // Find all generated documents of this type
        const documentsToDelete = await prisma.financialDocument.findMany({
            where: { documentType: typeName },
        });

        // Delete all associated files from S3 and records from DB
        for (const doc of documentsToDelete) {
            await deleteFinancialDocument(doc.id);
        }
        
        // Find all templates of this type
        const templatesToDelete = await prisma.template.findMany({
            where: { type: typeName },
        });

        // Delete all associated template files from S3 and records from DB
        for (const template of templatesToDelete) {
            await deleteTemplateFile(template.id);
        }

        // Finally, delete the setting itself
        await prisma.customSetting.delete({ where: { id: settingId } });
        
        revalidatePath('/documents');
        revalidatePath('/manage-templates');

        return { success: true };

    } catch (error) {
        console.error('Failed to delete financial document type and its contents:', error);
        return { success: false, error: 'An unexpected error occurred during deletion.' };
    }
}
