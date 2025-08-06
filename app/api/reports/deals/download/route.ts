
import { NextRequest, NextResponse } from 'next/server';
import * as ExcelJS from 'exceljs';
import { verifySession } from '@/lib/auth';
import type { Deal, DealPipelineType, DealStage, User } from '@/types';
import { getAllDeals } from '@/app/(app)/deals/actions';
import { getUsers } from '@/app/(app)/users/actions';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';

export async function POST(request: NextRequest) {
    const session = await verifySession();
    if (!session?.userId) {
        return new Response('Unauthorized', { status: 401 });
    }
    
    try {
        const { from, to, createdById, assignedToId, pipeline, stage, minValue, maxValue, minKilowatt, maxKilowatt } = await request.json();
        
        if (!from || !to) {
            return NextResponse.json({ error: 'Date range is required.' }, { status: 400 });
        }

        const [allDeals, users] = await Promise.all([
            getAllDeals(),
            getUsers(),
        ]);
        
        const dateInterval = { start: startOfDay(parseISO(from)), end: endOfDay(parseISO(to)) };
        const minVal = parseFloat(minValue);
        const maxVal = parseFloat(maxValue);
        const minKw = parseFloat(minKilowatt);
        const maxKw = parseFloat(maxKilowatt);

        const reportData = allDeals.filter(deal => {
            const dateMatches = isWithinInterval(parseISO(deal.poWoDate), dateInterval);
            const createdByMatches = createdById === 'all' || deal.createdBy === users.find(u => u.id === createdById)?.name;
            const assignedToMatches = assignedToId === 'all' || deal.assignedTo === users.find(u => u.id === assignedToId)?.name;
            const pipelineMatches = pipeline === 'all' || deal.pipeline === pipeline;
            const stageMatches = stage === 'all' || deal.stage === stage;
            const valueMatches = (isNaN(minVal) || deal.dealValue >= minVal) && (isNaN(maxVal) || deal.dealValue <= maxVal);
            const kilowattMatches = (isNaN(minKw) || (deal.kilowatt ?? 0) >= minKw) && (isNaN(maxKw) || (deal.kilowatt ?? 0) <= maxKw);

            return dateMatches && createdByMatches && assignedToMatches && pipelineMatches && stageMatches && valueMatches && kilowattMatches;
        });

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Deals Report');
        
        worksheet.columns = [
            { header: 'Sr. No.', key: 'sr', width: 10 },
            { header: 'Client Name', key: 'clientName', width: 30 },
            { header: 'Pipeline', key: 'pipeline', width: 20 },
            { header: 'Stage', key: 'stage', width: 20 },
            { header: 'PO/WO Date', key: 'poWoDate', width: 20 },
            { header: 'Capacity (kW)', key: 'kilowatt', width: 15 },
            { header: 'Deal Value (₹)', key: 'dealValue', width: 20 },
            { header: 'Created By', key: 'createdBy', width: 20 },
            { header: 'Assigned To', key: 'assignedTo', width: 20 },
            { header: 'Deal For', key: 'dealFor', width: 30 },
            { header: 'Created At', key: 'createdAt', width: 25 },
        ];
        
        worksheet.getRow(1).font = { bold: true };
        
        reportData.forEach((deal, index) => {
            worksheet.addRow({
                sr: index + 1,
                clientName: deal.clientName,
                pipeline: deal.pipeline,
                stage: deal.stage,
                poWoDate: format(parseISO(deal.poWoDate), 'dd-MM-yyyy'),
                kilowatt: deal.kilowatt ?? '-',
                dealFor: deal.dealFor || 'N/A',
                dealValue: deal.dealValue,
                createdBy: deal.createdBy || 'N/A',
                assignedTo: deal.assignedTo || 'N/A',
                createdAt: format(parseISO(deal.createdAt), 'dd-MM-yyyy p'),
            });
        });

        worksheet.getColumn('dealValue').numFmt = '"₹"#,##0.00';

        const buffer = await workbook.xlsx.writeBuffer();
        
        return new Response(buffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="deals_report_${format(new Date(), 'yyyy-MM-dd')}.xlsx"`,
            },
        });

    } catch (error) {
        console.error('Failed to generate deals report:', error);
        return NextResponse.json({ error: 'Failed to generate report.' }, { status: 500 });
    }
}
