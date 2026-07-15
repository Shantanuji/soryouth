
'use server';

import type { Proposal } from '@/types';
import { format, parseISO } from 'date-fns';
import { getClientById } from '@/app/(app)/clients-list/actions';
import { getLeadById } from '@/app/(app)/leads-list/actions';

// A simple function to get nested properties from an object using a string path like 'client.name'
function getProperty(obj: any, path: string): any {
  return path.split('.').reduce((o, key) => (o && o[key] !== 'undefined' ? o[key] : undefined), obj);
}

export async function generateHtmlFromTemplate(
  templateContent: string,
  proposalData: Proposal
): Promise<string> {
    let finalHtml = templateContent;

    const placeholders = templateContent.match(/\{\{.*?\}\}/g) || [];

    const dataContext: any = {
        proposal: {
            ...proposalData,
            date: format(parseISO(proposalData.proposalDate), 'dd MMM, yyyy'),
            capacity_kw: proposalData.capacity,
            total_amount: proposalData.finalAmount.toLocaleString('en-IN'),
            number: proposalData.proposalNumber,
            name: proposalData.name,
            city_area: proposalData.cityArea || "",
            cityArea: proposalData.cityArea || "",
        },
        client: {
            name: proposalData.name,
            address: proposalData.location,
            phone: '',
        },
        date: {
            today: format(new Date(), 'dd MMM, yyyy')
        }
    };
    
    if (proposalData.clientId) {
        const client = await getClientById(proposalData.clientId);
        if (client) {
            dataContext.client.phone = client.phone || '';
        }
    } else if (proposalData.leadId) {
        const lead = await getLeadById(proposalData.leadId);
        if (lead) {
            dataContext.client.phone = lead.phone || '';
        }
    }

    for (const placeholder of placeholders) {
        const key = placeholder.replace(/[{}]/g, '').trim();
        const value = getProperty(dataContext, key);

        if (value !== undefined && value !== null) {
            finalHtml = finalHtml.replace(new RegExp(placeholder, 'g'), String(value));
        } else {
            console.warn(`Placeholder '{{${key}}}' not found in data context.`);
            finalHtml = finalHtml.replace(new RegExp(placeholder, 'g'), '');
        }
    }

    return finalHtml;
}
