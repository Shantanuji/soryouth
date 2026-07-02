
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import os from 'os';
import fs from 'fs/promises';
import { format, parseISO } from 'date-fns';
import type { Proposal } from '@/types';
import { getTemplateById } from '@/app/(app)/manage-templates/actions';
import { uploadFileToS3, getFileFromS3 } from '@/lib/s3';

function fmt(n: number, decimals = 2) {
  return n.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
function fmtN(n: number) {
  return n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function getTemplateData(proposal: Proposal) {
  const capacity = proposal.capacity ?? 0;
  const ratePerWatt = proposal.ratePerWatt ?? 0;
  const baseAmount = proposal.baseAmount ?? 0;
  const cgstAmount = proposal.cgstAmount ?? 0;
  const sgstAmount = proposal.sgstAmount ?? 0;
  const finalAmount = proposal.finalAmount ?? 0;
  const subsidyAmount = proposal.subsidyAmount ?? 0;
  const unitRate = proposal.unitRate ?? 0;
  const genPerDay = proposal.generationPerDay ?? 0;
  const genPerYear = proposal.generationPerYear ?? 0;
  const savingsPerYear = proposal.savingsPerYear ?? 0;

  // --- Financials ---
  const costPerKw = ratePerWatt * 1000;
  const totalGstAmount = cgstAmount + sgstAmount;
  const netAmountAfterSubsidy = finalAmount - subsidyAmount;

  // --- Accelerated Depreciation (AD) ---
  // Per Indian IT Act Section 32: 80% AD for solar assets
  // Year 1: Half-year convention → 40% depreciation on cost, 25% tax rate
  // Year 2: 80% on WDV (Written Down Value after Y1), 25% tax rate
  // Year 3: 80% on WDV after Y2, 25% tax rate
  const AD_DEP_RATE = 0.80;
  const TAX_RATE = 0.25;
  const wdv0 = baseAmount;                          // project cost ex-GST is the depreciable base
  const dep1 = wdv0 * (AD_DEP_RATE / 2);           // half-year in Y1
  const adBenY1 = dep1 * TAX_RATE;
  const wdv1 = wdv0 - dep1;
  const dep2 = wdv1 * AD_DEP_RATE;
  const adBenY2 = dep2 * TAX_RATE;
  const wdv2 = wdv1 - dep2;
  const dep3 = wdv2 * AD_DEP_RATE;
  const adBenY3 = dep3 * TAX_RATE;
  const totalAdBenefit = adBenY1 + adBenY2 + adBenY3;

  // --- Plant Performance ---
  const monthlyGeneration = genPerYear / 12;
  const DEGRADATION_RATE = '0.70 - 0.80%';   // standard solar panel degradation

  // --- O&M Cost ---
  const OM_COST_PER_KW = 750;                 // ₹750 per kW per year (industry standard)
  const totalOmCost = capacity * OM_COST_PER_KW;
  const OM_ESCALATION = '3%';               // annual O&M cost escalation

  // --- ROI ---
  // Simple payback period = net investment / annual savings
  const netInvestment = netAmountAfterSubsidy - totalAdBenefit;
  const roiInYears = savingsPerYear > 0 ? (netInvestment / savingsPerYear) : 0;

  return {
    // ── Basic Proposal Info ────────────────────────────────────────────
    name: proposal.name,
    contact_person: proposal.contactPerson,
    email: proposal.email || '',
    phone: proposal.phone || '',
    location: proposal.location,
    client_type: proposal.clientType,
    proposal_number: proposal.proposalNumber,
    proposal_date: proposal.proposalDate
      ? (() => { try { return format(parseISO(proposal.proposalDate), 'dd MMM, yyyy'); } catch { return format(new Date(), 'dd MMM, yyyy'); } })()
      : format(new Date(), 'dd MMM, yyyy'),
    date_today: format(new Date(), 'dd MMM, yyyy'),

    // ── System Specs ──────────────────────────────────────────────────
    capacity: capacity,                   // raw number — e.g. 8.40
    module_type: proposal.moduleType,
    module_wattage: proposal.moduleWattage,
    dcr_status: proposal.dcrStatus,
    inverter_rating: proposal.inverterRating,
    inverter_qty: proposal.inverterQty,
    required_space: fmtN(proposal.requiredSpace ?? 0),
    la_kit_qty: proposal.laKitQty ?? 0,
    acdb_dcdb_qty: proposal.acdbDcdbQty ?? 0,
    earthing_kit_qty: proposal.earthingKitQty ?? 0,

    // ── Project Specification (Capex Sheet) ───────────────────────────
    project_size: capacity,                    // same as capacity (raw)
    cost_per_kw: fmtN(costPerKw),             // formatted
    rate_per_watt: fmt(ratePerWatt),           // formatted
    project_cost_ex_gst: fmt(baseAmount),      // formatted
    gst_amount: fmt(totalGstAmount),           // formatted
    cgst_amount: fmt(cgstAmount),              // formatted
    sgst_amount: fmt(sgstAmount),              // formatted
    total_project_cost_inc_gst: fmt(finalAmount), // formatted
    subsidy_amount: fmt(subsidyAmount),        // formatted
    net_amount_after_subsidy: fmt(netAmountAfterSubsidy), // formatted

    // Aliases matching existing placeholders (formatted strings for docx render)
    base_amount: fmt(baseAmount),
    final_amount: fmt(finalAmount),

    // ── Plant Performance (Capex Sheet) ──────────────────────────────
    grid_tariff_per_unit: fmtN(unitRate),           // formatted string for docx
    unit_rate: unitRate,                            // RAW number for Python calculations
    annual_generation: fmt(genPerYear),             // formatted
    generation_per_year: genPerYear,                // RAW number for Python calculations
    monthly_generation: fmt(monthlyGeneration),     // formatted
    generation_per_day: fmt(genPerDay),             // formatted
    degradation_rate: DEGRADATION_RATE,             // "0.70 - 0.80%"
    savings_per_year: savingsPerYear,               // RAW number for Python calculations

    // ── O&M Cost (Capex Sheet) ────────────────────────────────────────
    om_cost_per_kw: fmtN(OM_COST_PER_KW),    // ₹750
    total_om_cost: fmtN(totalOmCost),        // capacity × 750
    om_escalation: OM_ESCALATION,            // "3%"

    // ── Accelerated Depreciation Benefits (Capex Sheet) ──────────────
    ad_benefit_year1: fmt(adBenY1),
    ad_benefit_year2: fmt(adBenY2),
    ad_benefit_year3: fmt(adBenY3),
    total_ad_benefit: fmt(totalAdBenefit),

    // ── ROI Calculation (Capex Sheet) ────────────────────────────────
    project_cost_ex_gst_roi: fmt(baseAmount),           // for ROI table row
    additional_subsidy_benefits: fmt(subsidyAmount),
    cost_via_grid: fmt(savingsPerYear * 25),           // 25-year grid cost estimate
    roi_in_years: roiInYears.toFixed(2),             // simple payback period
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
      const errorBody = await response.json();
      throw new Error(errorBody.error || `Python service failed with status ${response.status}`);
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
