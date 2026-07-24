export interface ProposalInputs {
  capacity: number;
  ratePerWatt: number;
  unitRate: number;
  clientType: string;
  dcrStatus: string;
  inverterQty: number;
  moduleWattage?: number;
  manualGenerationPerYear?: number;
  manualSubsidy?: number;
  manualAdditionalSubsidy?: number;
  manualSpace?: number;
}

export interface EvaluationRow {
  year: number;
  generation: number;
  gridCost: number;
  omCost: number;
  gscCharges: number;
  adBenefit: number;
  netSavings: number;
}

export interface ProposalCalculatedValues {
  // basic
  baseAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  finalAmount: number;
  subsidyAmount: number;
  additionalSubsidyAmount: number;
  totalSubsidyAmount: number;
  netAmountAfterSubsidy: number;

  // generation
  generationPerDay: number;
  generationPerYear: number;
  requiredSpace: number;

  // quantities
  moduleQty: number;
  laKitQty: number;
  acdbDcdbQty: number;
  earthingKitQty: number;

  // AD
  adBenefitYear1: number;
  adBenefitYear2: number;
  adBenefitYear3: number;
  totalAdBenefit: number;

  // OM
  omCostPerKw: number;
  totalOmCost: number;

  // savings & ROI
  savingsPerYear: number;
  netInvestment: number;
  roiInYears: number;

  // evaluation sheet rows
  evaluationSheet: EvaluationRow[];
}

export function calculateProposalValues(inputs: ProposalInputs): ProposalCalculatedValues {
  const cap = inputs.capacity || 0;
  const rate = inputs.ratePerWatt || 0;
  const uRate = inputs.unitRate || 0;
  const invQty = inputs.inverterQty || 1;
  const clientType = inputs.clientType || 'Other';
  const dcrStatus = inputs.dcrStatus || 'Non-DCR';
  
  const round2 = (num: number) => Math.round(num * 100) / 100;

  // 1. Basic Costs
  const baseAmount = round2(rate * cap * 1000);
  const cgstAmount = round2(baseAmount * 0.0445);
  const sgstAmount = round2(baseAmount * 0.0445);
  const finalAmount = round2(baseAmount + cgstAmount + sgstAmount);

  // 2. Subsidy (Central Govt)
  let subsidyAmount = 0;
  if (inputs.manualSubsidy !== undefined) {
    subsidyAmount = inputs.manualSubsidy;
  } else if (dcrStatus !== 'Non-DCR') {
    if (clientType === 'Housing Society') {
      subsidyAmount = 18000 * cap;
    } else if (clientType === 'Individual/Bungalow' || clientType === 'AMC' || clientType === 'Other') {
      if (cap === 1) subsidyAmount = 30000;
      else if (cap === 2) subsidyAmount = 60000;
      else if (cap >= 3) subsidyAmount = 78000;
    }
  }

  // 2b. Additional Subsidy Benefits
  let additionalSubsidyAmount = 0;
  if (inputs.manualAdditionalSubsidy !== undefined) {
    additionalSubsidyAmount = inputs.manualAdditionalSubsidy;
  }
  const totalSubsidyAmount = round2(subsidyAmount + additionalSubsidyAmount);

  // 3. AD Benefits (ONLY for Commercial / Industrial clients)
  let adBenY1 = 0, adBenY2 = 0, adBenY3 = 0, totalAdBenefit = 0;
  const normClientType = (clientType || '').toLowerCase().trim();
  const isBusiness = normClientType.includes('commercial') || 
                     normClientType.includes('industrial') || 
                     normClientType.includes('industr') || 
                     normClientType.includes('industry') || 
                     normClientType.includes('factory') || 
                     normClientType.includes('business') || 
                     normClientType.includes('corporate') ||
                     (uRate <= 12 && uRate > 0 && !normClientType.includes('housing') && !normClientType.includes('bungalow') && !normClientType.includes('individual'));
  
  if (isBusiness) {
    const AD_DEP_RATE = 0.80;
    const TAX_RATE = 0.25;
    const wdv0 = baseAmount;
    
    // Year 1 (half-year convention)
    const dep1 = wdv0 * (AD_DEP_RATE / 2);
    adBenY1 = round2(dep1 * TAX_RATE);
    const wdv1 = wdv0 - dep1;
    
    // Year 2
    const dep2 = wdv1 * AD_DEP_RATE;
    adBenY2 = round2(dep2 * TAX_RATE);
    const wdv2 = wdv1 - dep2;
    
    // Year 3
    const dep3 = wdv2 * AD_DEP_RATE;
    adBenY3 = round2(dep3 * TAX_RATE);
    
    totalAdBenefit = round2(adBenY1 + adBenY2 + adBenY3);
  }

  // 4. Generation & Space
  const requiredSpace = inputs.manualSpace !== undefined ? round2(inputs.manualSpace) : round2(cap * 80);
  let generationPerYear = 0;
  let generationPerDay = 0;
  
  if (inputs.manualGenerationPerYear !== undefined) {
    generationPerYear = round2(inputs.manualGenerationPerYear);
    generationPerDay = round2(generationPerYear / 365);
  } else {
    generationPerDay = round2(cap * 4);
    generationPerYear = round2(generationPerDay * 365);
  }
  const savingsPerYear = round2(generationPerYear * uRate);

  // 5. O&M
  const omCostPerKw = 750;
  const totalOmCost = round2(cap * omCostPerKw);

  // 6. Kits & Modules
  const modWatt = inputs.moduleWattage || 550;
  const moduleQty = modWatt > 0 ? Math.ceil((cap * 1000) / modWatt) : 0;
  const laKitQty = invQty * 1;
  const acdbDcdbQty = invQty * 1;
  const earthingKitQty = invQty * 3;

  // 7. ROI
  const netAmountAfterSubsidy = Math.max(0, round2(finalAmount - totalSubsidyAmount));
  const netInvestment = Math.max(0, round2(netAmountAfterSubsidy - totalAdBenefit));
  const roiInYears = savingsPerYear > 0 ? round2(netInvestment / savingsPerYear) : 0;

  // 8. Evaluation Sheet (25 years)
  const evaluationSheet: EvaluationRow[] = [];
  for (let y = 1; y <= 25; y++) {
    const gen = round2(generationPerYear * Math.pow(0.994, y - 1));
    const grid = round2(gen * uRate);
    const om = y === 1 ? 0 : round2(totalOmCost * Math.pow(1.03, y - 2));
    const gsc = round2(gen * 1.96);
    let ad = 0;
    if (isBusiness) {
      if (y === 1) ad = adBenY1;
      else if (y === 2) ad = adBenY2;
      else if (y === 3) ad = adBenY3;
    }
    
    const sav = round2(grid + ad - om - gsc);
    
    evaluationSheet.push({
      year: y,
      generation: gen,
      gridCost: grid,
      omCost: om,
      gscCharges: gsc,
      adBenefit: ad,
      netSavings: sav
    });
  }

  return {
    baseAmount,
    cgstAmount,
    sgstAmount,
    finalAmount,
    subsidyAmount,
    additionalSubsidyAmount,
    totalSubsidyAmount,
    netAmountAfterSubsidy,
    requiredSpace,
    generationPerDay,
    generationPerYear,
    moduleQty,
    laKitQty,
    acdbDcdbQty,
    earthingKitQty,
    adBenefitYear1: adBenY1,
    adBenefitYear2: adBenY2,
    adBenefitYear3: adBenY3,
    totalAdBenefit,
    omCostPerKw,
    totalOmCost,
    savingsPerYear,
    netInvestment,
    roiInYears,
    evaluationSheet
  };
}
