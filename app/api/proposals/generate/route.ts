
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
import { calculateProposalValues } from '@/lib/proposal-calculations';

function fmt(n: number | null | undefined, decimals = 2): string {
  if (n === null || n === undefined || isNaN(Number(n))) return '0.00';
  return Number(n).toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
function fmtN(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(Number(n))) return '0';
  return Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

const formatISTDate = (dateOrStr: Date | string, pattern: string = 'dd MMM, yyyy') => {
  try {
    const date = typeof dateOrStr === 'string' ? parseISO(dateOrStr) : dateOrStr;
    const kolkataStr = date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
    return format(new Date(kolkataStr), pattern);
  } catch {
    const kolkataStr = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
    return format(new Date(kolkataStr), pattern);
  }
};

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
    Name: proposal.name,
    contact_person: proposal.contactPerson,
    email: proposal.email || '',
    phone: proposal.phone || '',
    location: proposal.location,
    city_area: proposal.cityArea || '',
    cityArea: proposal.cityArea || '',
    client_type: rawClientType,
    clientType: rawClientType,
    proposal_number: proposal.proposalNumber,
    proposal_date: formatISTDate(proposal.proposalDate || new Date()),
    date_today: formatISTDate(new Date()),
    created_by: proposal.createdBy || '',

    // ── System Specs ──────────────────────────────────────────────────
    capacity: proposal.capacity,
    module_type: proposal.moduleType,
    module_wattage: proposal.moduleWattage,
    module_qty: calc.moduleQty,
    moduleQty: calc.moduleQty,
    module_spec: moduleSpecText,
    module_description: moduleSpecText,
    dcr_status: proposal.dcrStatus,
    inverter_rating: proposal.inverterRating,
    inverter_qty: proposal.inverterQty,
    inverterQty: proposal.inverterQty,
    inverter_spec: inverterSpecText,
    inverter_description: inverterSpecText,
    inverter_kw: `${invKw} kW`,
    inverter_make: 'Growatt/Sungrow',
    required_space: fmt(calc.requiredSpace, 2),
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
    validity_days: proposal.validityDays || proposal.validity_days || 15,
    validityDays: proposal.validityDays || proposal.validity_days || 15,
    mounting_structure: proposal.mountingStructure || proposal.mounting_structure || 'RCC Rooftop',
    mountingStructure: proposal.mountingStructure || proposal.mounting_structure || 'RCC Rooftop',
    payment_terms: proposal.paymentTerms || proposal.payment_terms || '',
    paymentTerms: proposal.paymentTerms || proposal.payment_terms || '',

    // ── Project Specification (Capex Sheet) ───────────────────────────
    project_size: proposal.capacity,
    cost_per_kw: fmt(proposal.ratePerWatt * 1000, 2),
    rate_per_watt: fmt(proposal.ratePerWatt, 2),
    project_cost_ex_gst: fmt(calc.baseAmount, 2),
    gst_amount: fmt(calc.cgstAmount + calc.sgstAmount, 2),
    cgst_amount: fmt(calc.cgstAmount, 2),
    sgst_amount: fmt(calc.sgstAmount, 2),
    total_project_cost_inc_gst: fmt(calc.finalAmount, 2),
    subsidy_amount: fmt(calc.subsidyAmount, 2),
    central_subsidy_amount: fmt(calc.subsidyAmount, 2),
    additional_subsidy_benefits: fmt(calc.additionalSubsidyAmount, 2),
    additional_subsidy: fmt(calc.additionalSubsidyAmount, 2),
    total_subsidy_amount: fmt(calc.totalSubsidyAmount, 2),
    net_amount_after_subsidy: fmt(calc.netAmountAfterSubsidy, 2),
    net_investment: fmt(calc.netInvestment, 2),
    netInvestment: fmt(calc.netInvestment, 2),

    // Aliases matching existing placeholders (formatted strings for docx render)
    subtotal: fmt(calc.baseAmount, 2),
    base_amount: fmt(calc.baseAmount, 2),
    final_amount: fmt(calc.finalAmount, 2),

    // ── Plant Performance (Capex Sheet) ──────────────────────────────
    grid_tariff_per_unit: fmt(proposal.unitRate, 2),
    unit_rate: proposal.unitRate,
    annual_generation: fmt(calc.generationPerYear, 2),
    generation_per_year: calc.generationPerYear,
    monthly_generation: fmt(calc.generationPerYear / 12, 2),
    generation_per_day: fmt(calc.generationPerDay, 2),
    degradation_rate: '0.70 - 0.80%',
    savings_per_year: fmt(calc.savingsPerYear, 2),

    // ── O&M Cost (Capex Sheet) ────────────────────────────────────────
    om_cost_per_kw: fmt(calc.omCostPerKw, 2),
    total_om_cost: fmt(calc.totalOmCost, 2),
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

    // ── Balance of System — Individual Component Placeholders ─────────
    // Both bos_* and short-form names work in your Word template

    // Solar Modules
    bos_module_component:    'Solar Modules',
    bos_module_details:      (proposal as any).bosModuleDetails     || 'PV Solar Module',
    bos_module_qty:          (proposal as any).bosModuleQty         || String(calc.moduleQty),
    bos_module_spec:         (proposal as any).bosModuleSpec        || moduleSpecText,
    // short aliases ↓
    module_details:          (proposal as any).bosModuleDetails     || 'PV Solar Module',
    // module_qty & module_spec already defined above (lines 84-87)

    // Inverter
    bos_inverter_component:  'Inverter',
    bos_inverter_details:    (proposal as any).bosInverterDetails   || inverterSpecText,
    bos_inverter_qty:        (proposal as any).bosInverterQty       || `${proposal.inverterQty ?? 1} Nos`,
    bos_inverter_spec:       (proposal as any).bosInverterSpec      || inverterSpecText,
    // short aliases ↓
    inverter_details:        (proposal as any).bosInverterDetails   || inverterSpecText,
    // inverter_qty & inverter_spec already defined above (lines 91-95)

    // Mounting Structure
    bos_mounting_component:  'Mounting Structure',
    bos_mounting_details:    (proposal as any).bosMountingDetails   || proposal.mountingStructure || 'RCC Rooftop',
    bos_mounting_qty:        (proposal as any).bosMountingQty       || '1 Lot',
    bos_mounting_spec:       (proposal as any).bosMountingSpec      || 'GI Square Pipe for Columns & Rafter/Strut Channel for Panel Mounting 15-18ft',
    // short aliases ↓
    mounting_details:        (proposal as any).bosMountingDetails   || proposal.mountingStructure || 'RCC Rooftop',
    mounting_qty:            (proposal as any).bosMountingQty       || '1 Lot',
    mounting_spec:           (proposal as any).bosMountingSpec      || 'GI Square Pipe for Columns & Rafter/Strut Channel for Panel Mounting 15-18ft',
    // mounting_structure already defined above (line 113)

    // DC Cable
    bos_dc_cable_component:  'DC Cable',
    bos_dc_cable_details:    (proposal as any).bosDcCableDetails    || '4 sq.mm',
    bos_dc_cable_qty:        (proposal as any).bosDcCableQty        || 'As per design',
    bos_dc_cable_spec:       (proposal as any).bosDcCableSpec       || 'Polycab 1.1 kV Standard EN 50618 / IEC 62930 UV Resistant - Yes',
    // short aliases ↓
    dc_cable_details:        (proposal as any).bosDcCableDetails    || '4 sq.mm',
    dc_cable_qty:            (proposal as any).bosDcCableQty        || 'As per design',
    dc_cable_spec:           (proposal as any).bosDcCableSpec       || 'Polycab 1.1 kV Standard EN 50618 / IEC 62930 UV Resistant - Yes',

    // AC Cable
    bos_ac_cable_component:  'AC Cable',
    bos_ac_cable_details:    (proposal as any).bosAcCableDetails    || 'As per Design',
    bos_ac_cable_qty:        (proposal as any).bosAcCableQty        || 'As per design',
    bos_ac_cable_spec:       (proposal as any).bosAcCableSpec       || 'XLPE Insulated Armed Polycab Voltage Rating 1.1 kV Standard - IS 7098',
    // short aliases ↓
    ac_cable_details:        (proposal as any).bosAcCableDetails    || 'As per Design',
    ac_cable_qty:            (proposal as any).bosAcCableQty        || 'As per design',
    ac_cable_spec:           (proposal as any).bosAcCableSpec       || 'XLPE Insulated Armed Polycab Voltage Rating 1.1 kV Standard - IS 7098',

    // DCDB
    bos_dcdb_component:      'DCDB',
    bos_dcdb_details:        (proposal as any).bosDcdbDetails       || 'As per design',
    bos_dcdb_qty:            (proposal as any).bosDcdbQty           || `${acdbDcdbQty} No${acdbDcdbQty > 1 ? 's' : ''}`,
    bos_dcdb_spec:           (proposal as any).bosDcdbSpec          || 'DC Isolator, DC SPD Type-II, String Fuses Enclosure - IP65 Weatherproof',
    // short aliases ↓
    dcdb_details:            (proposal as any).bosDcdbDetails       || 'As per design',
    dcdb_spec:               (proposal as any).bosDcdbSpec          || 'DC Isolator, DC SPD Type-II, String Fuses Enclosure - IP65 Weatherproof',
    // dcdb_qty & dcdb_qty_nos already defined above (lines 105-106)

    // ACDB
    bos_acdb_component:      'ACDB',
    bos_acdb_details:        (proposal as any).bosAcdbDetails       || 'As per design',
    bos_acdb_qty:            (proposal as any).bosAcdbQty           || `${acdbDcdbQty} No${acdbDcdbQty > 1 ? 's' : ''}`,
    bos_acdb_spec:           (proposal as any).bosAcdbSpec          || 'MCCB/MCB, AC SPD Type-II Enclosure - IP65 Weatherproof',
    // short aliases ↓
    acdb_details:            (proposal as any).bosAcdbDetails       || 'As per design',
    acdb_spec:               (proposal as any).bosAcdbSpec          || 'MCCB/MCB, AC SPD Type-II Enclosure - IP65 Weatherproof',
    // acdb_qty & acdb_qty_nos already defined above (lines 103-104)

    // Earthing Kit
    bos_earthing_component:  'Earthing Kit',
    bos_earthing_details:    (proposal as any).bosEarthingDetails   || 'Chemical Earthing',
    bos_earthing_qty:        (proposal as any).bosEarthingQty       || `${earthingQty} Nos`,
    bos_earthing_spec:       (proposal as any).bosEarthingSpec      || 'Electrode Size - 17.2 mm Copper Bonded / GI Electrode Earth Resistance less than 5 Ohms Compliance IS 3043',
    // short aliases ↓
    earthing_details:        (proposal as any).bosEarthingDetails   || 'Chemical Earthing',
    earthing_spec:           (proposal as any).bosEarthingSpec      || 'Electrode Size - 17.2 mm Copper Bonded / GI Electrode Earth Resistance less than 5 Ohms Compliance IS 3043',
    // earthing_kit_qty & earthing_kit_qty_nos already defined above (lines 107-110)

    // Lightning Arrester
    bos_la_component:        'Lightning Arrester',
    bos_la_details:          (proposal as any).bosLaDetails         || 'Standard',
    bos_la_qty:              (proposal as any).bosLaQty             || `${laQty} No${laQty > 1 ? 's' : ''}`,
    bos_la_spec:             (proposal as any).bosLaSpec            || 'IS/IEC Standards',
    // short aliases ↓
    la_details:              (proposal as any).bosLaDetails         || 'Standard',
    la_qty:                  (proposal as any).bosLaQty             || `${laQty} No${laQty > 1 ? 's' : ''}`,
    la_spec:                 (proposal as any).bosLaSpec            || 'IS/IEC Standards',
    // la_kit_qty & la_kit_qty_nos already defined above (lines 99-100)

    // Connectors
    bos_connectors_component: 'Connectors',
    bos_connectors_details:   (proposal as any).bosConnectorsDetails || 'MC4 compatible',
    bos_connectors_qty:       (proposal as any).bosConnectorsQty     || 'As required',
    bos_connectors_spec:      (proposal as any).bosConnectorsSpec    || '1500 V DC Protection Class - IP68',
    // short aliases ↓
    connectors_details:       (proposal as any).bosConnectorsDetails || 'MC4 compatible',
    connectors_qty:           (proposal as any).bosConnectorsQty     || 'As required',
    connectors_spec:          (proposal as any).bosConnectorsSpec    || '1500 V DC Protection Class - IP68',

    // Monitoring
    bos_monitoring_component: 'Monitoring',
    bos_monitoring_details:   (proposal as any).bosMonitoringDetails || 'RMS App-based',
    bos_monitoring_qty:       (proposal as any).bosMonitoringQty     || '1 Set',
    bos_monitoring_spec:      (proposal as any).bosMonitoringSpec    || 'Real-Time Generation, Fault Alerts, Historical Data Analysis',
    // short aliases ↓
    monitoring_details:       (proposal as any).bosMonitoringDetails || 'RMS App-based',
    monitoring_qty:           (proposal as any).bosMonitoringQty     || '1 Set',
    monitoring_spec:          (proposal as any).bosMonitoringSpec    || 'Real-Time Generation, Fault Alerts, Historical Data Analysis',

    // Tags
    bos_tags_component:      'Tags',
    bos_tags_details:        (proposal as any).bosTagsDetails       || 'Aluminum Engraved',
    bos_tags_qty:            (proposal as any).bosTagsQty           || '1 Set',
    bos_tags_spec:           (proposal as any).bosTagsSpec          || 'Aluminum Engraved Identification Tags',
    // short aliases ↓
    tags_details:            (proposal as any).bosTagsDetails       || 'Aluminum Engraved',
    tags_qty:                (proposal as any).bosTagsQty           || '1 Set',
    tags_spec:               (proposal as any).bosTagsSpec          || 'Aluminum Engraved Identification Tags',

    // Fire Extinguishers
    bos_fire_ext_component:  'Fire Extinguishers',
    bos_fire_ext_details:    (proposal as any).bosFireExtDetails    || 'As per compliance',
    bos_fire_ext_qty:        (proposal as any).bosFireExtQty        || '1 Set',
    bos_fire_ext_spec:       (proposal as any).bosFireExtSpec       || 'As per MNRE / Electrical Compliance Requirements',
    // short aliases ↓
    fire_ext_details:        (proposal as any).bosFireExtDetails    || 'As per compliance',
    fire_ext_qty:            (proposal as any).bosFireExtQty        || '1 Set',
    fire_ext_spec:           (proposal as any).bosFireExtSpec       || 'As per MNRE / Electrical Compliance Requirements',
  };
}



export async function POST(request: NextRequest) {
  let tempFilePath: string | null = null;
  try {
    let { templateId, data } = await request.json();

    if (!data) {
      return NextResponse.json({ error: 'Missing proposal data' }, { status: 400 });
    }

    let template: any = templateId ? await getTemplateById(templateId) : null;

    if (!template || !template.originalDocxPath) {
      // Find the first active Proposal template in DB
      template = await prisma.template.findFirst({
        where: { type: 'Proposal' },
        orderBy: { updatedAt: 'desc' }
      });
    }

    let templateBuffer: Buffer | null = null;

    if (template?.originalDocxPath) {
      try {
        if (template.originalDocxPath.startsWith('http')) {
          const s3Url = new URL(template.originalDocxPath);
          const templateKey = s3Url.pathname.substring(1); // Remove leading '/'
          templateBuffer = await getFileFromS3(templateKey);
        } else {
          // Local path stored in DB
          const localPath = path.isAbsolute(template.originalDocxPath)
            ? template.originalDocxPath
            : path.join(process.cwd(), template.originalDocxPath.startsWith('/') ? template.originalDocxPath.slice(1) : template.originalDocxPath);
          templateBuffer = await fs.readFile(localPath);
        }
      } catch (s3Err) {
        console.warn('Could not load template from designated path, falling back to local master template:', s3Err);
      }
    }

    // Validate that buffer exists, is at least 50KB, and is a valid ZIP/DOCX archive with document.xml
    let isValidZip = false;
    if (templateBuffer && templateBuffer.length > 50000 && templateBuffer[0] === 0x50 && templateBuffer[1] === 0x4B) {
      try {
        const PizZip = (await import('pizzip')).default;
        const zip = new PizZip(templateBuffer);
        if (zip.file('word/document.xml')) {
          isValidZip = true;
        }
      } catch (zipErr) {
        console.warn('Template buffer ZIP integrity check failed, falling back to local master template:', zipErr);
        isValidZip = false;
      }
    }

    if (!isValidZip) {
      console.log('Template is invalid or truncated, loading local guaranteed master template...');
      const candidatePaths = [
        path.join(process.cwd(), 'dist', 'kapex-fixed-data.docx'),
        path.join(process.cwd(), 'public', 'uploads', 'templates', 'kapex_fixed_data.docx'),
        path.join(process.cwd(), 'public', 'uploads', 'templates', 'kapex-fixed-data-official.docx')
      ];

      for (const cp of candidatePaths) {
        try {
          const fb = await fs.readFile(cp);
          if (fb && fb.length > 50000 && fb[0] === 0x50 && fb[1] === 0x4B) {
            templateBuffer = fb;
            console.log(`Successfully loaded master template from local fallback: ${cp}`);
            break;
          }
        } catch {
          // try next candidate
        }
      }
    }

    if (!templateBuffer || templateBuffer.length === 0) {
      return NextResponse.json({ error: 'Proposal template file could not be located.' }, { status: 404 });
    }

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
    let response: Response;
    try {
      response = await fetch(pythonServiceUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_path: tempFilePath, // Pass path to temp file
          data: templateData
        })
      });
    } catch (fetchErr: any) {
      console.error('Failed to connect to Python proposal generator:', fetchErr);
      throw new Error("Python Proposal Generator service is not reachable on port 5001. Please run 'start-microservice.bat' or 'start-all.bat'.");
    }

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

    const safeProposalNumber = (data.proposalNumber || `PROP-${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '_');
    const baseKey = `proposals/${safeProposalNumber}`;
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
