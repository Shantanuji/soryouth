
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import os from 'os';
import fs from 'fs/promises';
import { format, parseISO } from 'date-fns';
import type { Proposal } from '@/types';
import { getTemplateById } from '@/app/(app)/manage-templates/actions';
import { uploadFileToS3, getFileFromS3 } from '@/lib/s3';
import { verifySession } from '@/lib/auth';
import prisma from '@/lib/prisma';

function fmt(n: number, decimals = 2) {
  return n.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
function fmtN(n: number) {
  return n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

import { calculateProposalValues } from '@/lib/proposal-calculations';

function getTemplateData(proposal: any) {
  const rawClientType = proposal.clientType || proposal.client_type || proposal.consumerCategory || proposal.clientCategory || (proposal.unitRate <= 12 ? 'Commercial' : 'Other');

  const calc = calculateProposalValues({
    capacity: proposal.capacity || 0,
    ratePerWatt: proposal.ratePerWatt || 0,
    unitRate: proposal.unitRate || 0,
    clientType: rawClientType,
    dcrStatus: proposal.dcrStatus || 'Non-DCR',
    inverterQty: proposal.inverterQty || 1,
    moduleWattage: parseFloat(proposal.moduleWattage) || 550,
    manualGenerationPerYear: proposal.generationPerYear,
    manualSubsidy: proposal.subsidyAmount,
    manualAdditionalSubsidy: proposal.additionalSubsidy,
    manualSpace: proposal.requiredSpace,
  });

    // Always use server-calculated evaluation sheet so calculations strictly reflect current clientType and inputs
    const evaluationSheet = calc.evaluationSheet;

    const invKw = proposal.inverterRating || proposal.capacity || 0;
    const defaultModuleSpec = `Rayzon Solar ${proposal.moduleType || 'Topcon Bifacial'} ${proposal.dcrStatus || 'DCR'} ${proposal.moduleWattage || '600'} Wp`;
    const defaultInverterSpec = `Growatt/Sungrow ${invKw} kW`;

    const moduleSpecText = proposal.moduleSpec || defaultModuleSpec;
    const inverterSpecText = proposal.inverterSpec || defaultInverterSpec;

    const laQty = proposal.laKitQty ?? calc.laKitQty;
    const acdbDcdbQty = proposal.acdbDcdbQty ?? calc.acdbDcdbQty;
    const earthingQty = proposal.earthingKitQty ?? calc.earthingKitQty;

    return {
    // ── Basic Proposal Info ────────────────────────────────────────────
    name: proposal.name,
    contact_person: proposal.contactPerson,
    email: proposal.email || '',
    phone: proposal.phone || '',
    location: proposal.location,
    city_area: proposal.cityArea || '',
    cityArea: proposal.cityArea || '',
    client_type: rawClientType,
    clientType: rawClientType,
    proposal_number: proposal.proposalNumber,
    proposal_date: proposal.proposalDate
      ? (() => { try { return format(parseISO(proposal.proposalDate), 'dd MMM, yyyy'); } catch { return format(new Date(), 'dd MMM, yyyy'); } })()
      : format(new Date(), 'dd MMM, yyyy'),
    date_today: format(new Date(), 'dd MMM, yyyy'),
    created_by: proposal.createdBy || '',

    // ── System Specs ──────────────────────────────────────────────────
    capacity: proposal.capacity,
    module_type: proposal.moduleType,
    module_wattage: proposal.moduleWattage,
    module_qty: calc.moduleQty,
    moduleQty: calc.moduleQty,
    module_spec: moduleSpecText,
    module_details: moduleSpecText,
    module_description: moduleSpecText,
    dcr_status: proposal.dcrStatus,
    inverter_rating: proposal.inverterRating,
    inverter_qty: proposal.inverterQty,
    inverterQty: proposal.inverterQty,
    inverter_spec: inverterSpecText,
    inverter_details: inverterSpecText,
    inverter_description: inverterSpecText,
    inverter_kw: `${invKw} kW`,
    inverter_make: 'Growatt/Sungrow',
    required_space: fmtN(calc.requiredSpace),
    la_kit_qty: laQty,
    la_kit_qty_nos: `${laQty} Nos`,
    acdb_dcdb_qty: acdbDcdbQty,
    acdb_dcdb_qty_nos: `${acdbDcdbQty} Nos`,
    acdb_qty: acdbDcdbQty,
    acdb_qty_nos: `${acdbDcdbQty} No${acdbDcdbQty > 1 ? 's' : ''}`,
    dcdb_qty: acdbDcdbQty,
    dcdb_qty_nos: `${acdbDcdbQty} No${acdbDcdbQty > 1 ? 's' : ''}`,
    earthing_kit_qty: earthingQty,
    earthing_kit_qty_nos: `${earthingQty} Nos`,
    earthing_qty: earthingQty,
    earthing_qty_nos: `${earthingQty} Nos`,

    // ── Project Specification (Capex Sheet) ───────────────────────────
    project_size: proposal.capacity,
    cost_per_kw: fmtN(proposal.ratePerWatt * 1000),
    rate_per_watt: fmt(proposal.ratePerWatt),
    project_cost_ex_gst: fmt(calc.baseAmount),
    gst_amount: fmt(calc.cgstAmount + calc.sgstAmount),
    cgst_amount: fmt(calc.cgstAmount),
    sgst_amount: fmt(calc.sgstAmount),
    total_project_cost_inc_gst: fmt(calc.finalAmount),
    subsidy_amount: fmt(calc.subsidyAmount),
    central_subsidy_amount: fmt(calc.subsidyAmount),
    additional_subsidy_benefits: fmt(calc.additionalSubsidyAmount),
    additional_subsidy: fmt(calc.additionalSubsidyAmount),
    total_subsidy_amount: fmt(calc.totalSubsidyAmount),
    net_amount_after_subsidy: fmt(calc.netAmountAfterSubsidy),
    net_investment: fmt(calc.netInvestment),
    netInvestment: fmt(calc.netInvestment),

    // Aliases matching existing placeholders (formatted strings for docx render)
    subtotal: fmt(calc.baseAmount),
    base_amount: fmt(calc.baseAmount),
    final_amount: fmt(calc.finalAmount),

    // ── Plant Performance (Capex Sheet) ──────────────────────────────
    grid_tariff_per_unit: fmtN(proposal.unitRate),
    unit_rate: proposal.unitRate,
    annual_generation: fmt(calc.generationPerYear),
    generation_per_year: calc.generationPerYear,
    monthly_generation: fmt(calc.generationPerYear / 12),
    generation_per_day: fmt(calc.generationPerDay),
    degradation_rate: '0.70 - 0.80%',
    savings_per_year: fmt(calc.savingsPerYear),

    // ── O&M Cost (Capex Sheet) ────────────────────────────────────────
    om_cost_per_kw: fmtN(calc.omCostPerKw),
    total_om_cost: fmtN(calc.totalOmCost),
    om_escalation: '3%',

    // ── Accelerated Depreciation Benefits (Capex Sheet) ──────────────
    ad_benefit_year1: fmt(calc.adBenefitYear1),
    ad_benefit_year2: fmt(calc.adBenefitYear2),
    ad_benefit_year3: fmt(calc.adBenefitYear3),
    total_ad_benefit: fmt(calc.totalAdBenefit),

    // ── ROI Calculation (Capex Sheet) ────────────────────────────────
    project_cost_ex_gst_roi: fmt(calc.baseAmount),
    cost_via_grid: fmt(calc.savingsPerYear * 25),
    roi_in_years: calc.roiInYears.toFixed(2),
    
    // ── Python Evaluation Sheet Array ────────────────────────────────
    evaluationSheet: evaluationSheet,
  };
}



export async function POST(request: NextRequest) {
  let tempFilePath: string | null = null;
  try {
    const { templateId, data } = await request.json();

    if (!templateId || !data) {
      return NextResponse.json({ error: 'Missing templateId or proposal data' }, { status: 400 });
    }

    const template = await getTemplateById(templateId);

    if (!template || !template.originalDocxPath) {
      return NextResponse.json({ error: 'Template not found or has no associated file.' }, { status: 404 });
    }

    // Use SDK to get the file from S3 instead of a public fetch
    const s3Url = new URL(template.originalDocxPath);
    const templateKey = s3Url.pathname.substring(1); // Remove leading '/'
    const templateBuffer = await getFileFromS3(templateKey);

    const tempDir = os.tmpdir();
    tempFilePath = path.join(tempDir, `template-${Date.now()}.docx`);
    await fs.writeFile(tempFilePath, templateBuffer);

    const session = await verifySession();
    if (!data.createdBy && session?.userId) {
      const user = await prisma.user.findUnique({ where: { id: session.userId } });
      if (user) {
        data.createdBy = user.name;
      }
    }

    const templateData = getTemplateData(data as Proposal);

    const pythonServiceUrl = process.env.PYTHON_MICROSERVICE_URL ? `${process.env.PYTHON_MICROSERVICE_URL}/generate` : 'http://127.0.0.1:5001/generate';
    const response = await fetch(pythonServiceUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        template_path: tempFilePath, // Pass path to temp file
        data: templateData
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      try {
        const errorBody = JSON.parse(errorText);
        throw new Error(errorBody.error || `Python service failed with status ${response.status}`);
      } catch (e) {
        // If it's not JSON, it might be an HTML error page from Flask
        const msg = errorText.substring(0, 300).replace(/<[^>]+>/g, ''); // strip simple HTML
        throw new Error(`Python service failed (Status ${response.status}): ${msg}`);
      }
    }

    const result = await response.json();

    if (!result.success || !result.pdf_b64 || !result.docx_b64) {
      throw new Error("Python service returned an invalid payload.");
    }

    const pdfBuffer = Buffer.from(result.pdf_b64, 'base64');
    const docxBuffer = Buffer.from(result.docx_b64, 'base64');

    const baseKey = `proposals/${data.proposalNumber}_${Date.now()}`;
    const pdfKey = `${baseKey}.pdf`;
    const docxKey = `${baseKey}.docx`;

    const [pdfUrl, docxUrl] = await Promise.all([
      uploadFileToS3(pdfBuffer, pdfKey, 'application/pdf'),
      uploadFileToS3(docxBuffer, docxKey, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    ]);

    return NextResponse.json({
      success: true,
      pdfUrl: pdfUrl,
      docxUrl: docxUrl,
    });

  } catch (error) {
    console.error('Error in proposal generation orchestrator:', error);
    try { require('fs').appendFileSync('error_log.txt', String(error) + '\\n'); } catch (e) {}
    let errorMessage = 'Failed to generate proposal.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  } finally {
    // Clean up the temporary file in all cases
    if (tempFilePath) {
      await fs.unlink(tempFilePath).catch(err => console.error(`Failed to delete temp file: ${tempFilePath}`, err));
    }
  }
}
