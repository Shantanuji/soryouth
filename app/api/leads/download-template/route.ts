
import { NextRequest, NextResponse } from 'next/server';
import * as ExcelJS from 'exceljs';
import { verifySession } from '@/lib/auth';
import { getLeadStatuses, getLeadSources } from '@/app/(app)/settings/actions';
import { getUsers } from '@/app/(app)/users/actions';
import { LEAD_PRIORITY_OPTIONS, CLIENT_TYPES } from '@/lib/constants';

const headers = [
    "Name",
    "Email",
    "Phone",
    "Status",
    "Source",
    "Assigned To",
    "Kilowatt",
    "Address",
    "Priority",
    "Customer Type",
    "Last Comment"
];

export async function GET(request: NextRequest) {
    const session = await verifySession();
    if (!session?.userId) {
        return new Response('Unauthorized', { status: 401 });
    }
    
    // Create a new workbook and worksheets using exceljs
    const workbook = new ExcelJS.Workbook();
    const leadsWorksheet = workbook.addWorksheet('Leads');
    const optionsWorksheet = workbook.addWorksheet('Available Options');
    
    // Set up the main "Leads" sheet
    leadsWorksheet.columns = headers.map(header => ({
        header,
        key: header,
        width: 25
    }));

    leadsWorksheet.getRow(1).font = { bold: true };
    
    // --- Populate the "Available Options" sheet ---

    // Fetch dynamic data
    const [statuses, sources, users] = await Promise.all([
        getLeadStatuses(),
        getLeadSources(),
        getUsers()
    ]);

    // Add headers to the options sheet
    optionsWorksheet.getRow(1).values = ['Status', 'Source', 'Assigned To', 'Priority', 'Customer Type'];
    optionsWorksheet.getRow(1).font = { bold: true };
    optionsWorksheet.columns = [
        { key: 'status', width: 25 },
        { key: 'source', width: 25 },
        { key: 'assignedTo', width: 25 },
        { key: 'priority', width: 25 },
        { key: 'customerType', width: 25 },
    ];
    
    const statusNames = statuses.map(s => s.name);
    const sourceNames = sources.map(s => s.name);
    const userNames = users.map(u => u.name);

    const maxLength = Math.max(statusNames.length, sourceNames.length, userNames.length, LEAD_PRIORITY_OPTIONS.length, CLIENT_TYPES.length);

    for (let i = 0; i < maxLength; i++) {
        const row = optionsWorksheet.getRow(i + 2);
        row.getCell('status').value = statusNames[i] || '';
        row.getCell('source').value = sourceNames[i] || '';
        row.getCell('assignedTo').value = userNames[i] || '';
        row.getCell('priority').value = LEAD_PRIORITY_OPTIONS[i] || '';
        row.getCell('customerType').value = CLIENT_TYPES[i] || '';
    }
    
    // Write the workbook to a buffer
    const buf = await workbook.xlsx.writeBuffer();
    
    // Create a response with the buffer
    return new NextResponse(buf, {
        status: 200,
        headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': 'attachment; filename="lead_import_template.xlsx"',
        },
    });

}
