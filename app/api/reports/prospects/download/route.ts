
import { NextRequest, NextResponse } from 'next/server';
import * as ExcelJS from 'exceljs';
import { verifySession } from '@/lib/auth';
import { getLeads } from '@/app/(app)/leads-list/actions';
import { getDroppedLeads } from '@/app/(app)/dropped-leads-list/actions';
import { getActiveClients, getInactiveClients } from '@/app/(app)/clients-list/actions';
import { format, parseISO } from 'date-fns';

type DataType = 'leads' | 'clients';
type SubType = 'active' | 'dropped' | 'inactive';

const leadHeaders = [
    { header: 'ID', key: 'id', width: 30 },
    { header: 'Name', key: 'name', width: 30 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Phone', key: 'phone', width: 20 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Source', key: 'source', width: 20 },
    { header: 'Assigned To', key: 'assignedTo', width: 20 },
    { header: 'Created By', key: 'createdBy', width: 20 },
    { header: 'Created At', key: 'createdAt', width: 20 },
    { header: 'Last Comment', key: 'lastCommentText', width: 40 },
    { header: 'Last Comment Date', key: 'lastCommentDate', width: 20 },
    { header: 'Next Follow-up', key: 'nextFollowUp', width: 25 },
    { header: 'Kilowatt (kW)', key: 'kilowatt', width: 15 },
    { header: 'Address', key: 'address', width: 40 },
    { header: 'Notes', key: 'notes', width: 40 },
    { header: 'Priority', key: 'priority', width: 15 },
    { header: 'Customer Type', key: 'clientType', width: 20 },
];

const clientHeaders = [
    ...leadHeaders.filter(h => h.key !== 'source'), // Remove source for clients
    { header: 'Total Deal Value (₹)', key: 'totalDealValue', width: 20, numFmt: '"₹"#,##0.00' }
];

const droppedLeadHeaders = [
    ...leadHeaders,
    { header: 'Drop Reason', key: 'dropReason', width: 25 },
    { header: 'Drop Comment', key: 'dropComment', width: 40 },
    { header: 'Dropped At', key: 'droppedAt', width: 20 },
];

export async function POST(request: NextRequest) {
    const session = await verifySession();
    if (!session?.userId) {
        return new Response('Unauthorized', { status: 401 });
    }

    try {
        const { dataType, subType } = await request.json();

        if (!dataType || !subType) {
            return NextResponse.json({ error: 'Data type and sub-type are required.' }, { status: 400 });
        }

        let data: any[] = [];
        let headers: any[] = [];
        let worksheetName = 'Report';

        if (dataType === 'leads') {
            if (subType === 'active') {
                data = await getLeads();
                headers = leadHeaders;
                worksheetName = 'Active_Leads';
            } else if (subType === 'dropped') {
                data = await getDroppedLeads();
                headers = droppedLeadHeaders;
                worksheetName = 'Dropped_Leads';
            }
        } else if (dataType === 'clients') {
            if (subType === 'active') {
                data = await getActiveClients();
                headers = clientHeaders;
                worksheetName = 'Active_Clients';
            } else if (subType === 'inactive') {
                data = await getInactiveClients();
                headers = clientHeaders;
                worksheetName = 'Inactive_Clients';
            }
        }

        if (data.length === 0) {
            return NextResponse.json({ error: 'No data found for the selected criteria.' }, { status: 404 });
        }
        
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(worksheetName);
        
        worksheet.columns = headers;
        worksheet.getRow(1).font = { bold: true };
        
        data.forEach((item) => {
            const rowData: any = { ...item };
            
            // Format dates and specific fields
            if (rowData.createdAt) rowData.createdAt = format(parseISO(rowData.createdAt), 'dd-MM-yyyy HH:mm');
            if (rowData.nextFollowUpDate) {
                rowData.nextFollowUp = `${rowData.nextFollowUpDate} ${rowData.nextFollowUpTime || ''}`.trim();
            }
            if (rowData.droppedAt) rowData.droppedAt = format(parseISO(rowData.droppedAt), 'dd-MM-yyyy HH:mm');
            
            worksheet.addRow(rowData);
        });

        // Apply number formatting to currency columns
        headers.forEach(header => {
            if (header.numFmt) {
                worksheet.getColumn(header.key).numFmt = header.numFmt;
            }
        });

        const buffer = await workbook.xlsx.writeBuffer();
        
        return new Response(buffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="${worksheetName}_Report_${format(new Date(), 'yyyy-MM-dd')}.xlsx"`,
            },
        });

    } catch (error) {
        console.error('Failed to generate prospects report:', error);
        return NextResponse.json({ error: 'Failed to generate report.' }, { status: 500 });
    }
}
