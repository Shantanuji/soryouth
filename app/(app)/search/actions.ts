
'use server';

import prisma from '@/lib/prisma';
import { verifySession } from '@/lib/auth';
import type { Prisma } from '@prisma/client';

export interface SearchResult {
  id: string;
  name: string;
  type: 'Lead' | 'Client' | 'Dropped' | 'Inactive';
  identifier?: string | null;
  link: string;
}

export async function universalSearch(query: string): Promise<SearchResult[]> {
  const session = await verifySession();
  if (!query || !session?.userId) {
    return [];
  }

  const trimmedQuery = query.trim();
  if (trimmedQuery.length < 2) {
    return [];
  }

  const searchCondition = {
    OR: [
      { name: { contains: trimmedQuery, mode: 'insensitive' as const} },
      { email: { contains: trimmedQuery, mode: 'insensitive' as const} },
      { phone: { contains: trimmedQuery, mode: 'insensitive' as const} },
    ],
  };

  try {
    const [leads, clients, inactiveClients, droppedLeads] = await prisma.$transaction([
      prisma.lead.findMany({
        where: searchCondition,
        select: { id: true, name: true, phone: true },
        take: 5,
      }),
      prisma.client.findMany({
        where: { ...searchCondition, status: { not: 'Inactive' } },
        select: { id: true, name: true, phone: true },
        take: 5,
      }),
       prisma.client.findMany({
        where: { ...searchCondition, status: 'Inactive' },
        select: { id: true, name: true, phone: true },
        take: 5,
      }),
      prisma.droppedLead.findMany({
        where: searchCondition,
        select: { id: true, name: true, phone: true },
        take: 5,
      }),
    ]);

    const results: SearchResult[] = [
      ...leads.map(item => ({
        id: item.id,
        name: item.name,
        type: 'Lead' as const,
        identifier: item.phone,
        link: `/leads/${item.id}`,
      })),
      ...clients.map(item => ({
        id: item.id,
        name: item.name,
        type: 'Client' as const,
        identifier: item.phone,
        link: `/clients/${item.id}`,
      })),
       ...inactiveClients.map(item => ({
        id: item.id,
        name: item.name,
        type: 'Inactive' as const,
        identifier: item.phone,
        link: `/clients/${item.id}`,
      })),
      ...droppedLeads.map(item => ({
        id: item.id,
        name: item.name,
        type: 'Dropped' as const,
        identifier: item.phone,
        link: `/dropped-leads/${item.id}`,
      })),
    ];
    
    // Simple sort to bring more relevant name matches to top
    return results.sort((a, b) => {
        const aNameMatch = a.name.toLowerCase().startsWith(trimmedQuery.toLowerCase());
        const bNameMatch = b.name.toLowerCase().startsWith(trimmedQuery.toLowerCase());
        if (aNameMatch && !bNameMatch) return -1;
        if (!aNameMatch && bNameMatch) return 1;
        return 0;
    });

  } catch (error) {
    console.error('Universal search failed:', error);
    return [];
  }
}
