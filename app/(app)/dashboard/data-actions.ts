'use server';

import prisma from '@/lib/prisma';
import { verifySession } from '@/lib/auth';

export async function getDashboardAggregates() {
  const session = await verifySession();
  
  if (!session?.userId) {
    return { callsMade: 0, totalFollowUps: 0, pendingTasks: 0, completedTasks: 0, openTickets: 0, pipelineValue: 0 };
  }
  
  // FollowUps (Calls/Meetings) count
  const followUps = await prisma.followUp.count({
    where: {
      type: 'Call'
    }
  });

  const allFollowUps = await prisma.followUp.count();

  // Tasks
  const pendingTasks = await prisma.generalTask.count({
    where: { status: 'Pending' }
  });
  const completedTasks = await prisma.generalTask.count({
    where: { status: 'Completed' }
  });

  // Tickets
  const openTickets = await prisma.ticket.count({
    where: { status: 'Open' }
  });

  // Calculate some pipelines value
  const pipelineDeals = await prisma.deal.findMany({
    where: {
      stage: { notIn: ['Won', 'Lost'] }
    },
    select: { dealValue: true }
  });
  const pipelineValue = pipelineDeals.reduce((sum: number, deal: any) => sum + (deal.dealValue || 0), 0);

  return {
    callsMade: followUps,
    totalFollowUps: allFollowUps,
    pendingTasks,
    completedTasks,
    openTickets,
    pipelineValue,
  };
}
