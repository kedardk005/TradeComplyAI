import {
  FORMAL_ENTRY_THRESHOLD_USD,
  DE_MINIMIS_THRESHOLD_USD,
  FORMAL_MPF_RATE,
  FORMAL_MPF_MIN,
  FORMAL_MPF_MAX,
  INFORMAL_MPF_TIERS
} from '../config/mpf';

export interface ParsedDutyRate {
  adValorem: number;          // e.g., 0.05 for 5%
  specificRatePerKg: number;  // e.g., 1.035 for $1.035/kg
}

export interface CostEstimationInput {
  declaredValue: number;
  weight: number;
  hsCode: string;
  dutyRate: string;
  freightRatePerKg: number;
  freightMinCharge: number;
  insuranceRate?: number;     // e.g., 0.005 for 0.5%
}

export interface CostEstimationResult {
  dutyAmount: number;
  mpfAmount: number;
  freightCost: number;
  insuranceCost: number;
  totalLandedCost: number;
  breakdown: Array<{ label: string; amount: number }>;
}

/**
 * Parses raw duty rate strings from the USITC HTS database.
 * Supports:
 * - "Free", "No change", "Exempt" -> 0
 * - Pure percentages (e.g. "6%", "4.3%", "12.5%")
 * - Pure specific rates per kg (e.g. "2.8¢/kg", "$1.035/kg", "40.9¢/kg")
 * - Compound rates (e.g. "1.7¢/kg + 3.4%", "$1.035/kg + 13.6%")
 * 
 * Throws a descriptive error for complex/non-supported units (e.g. "each", "gross", "drained weight", "lead content").
 */
export function parseDutyRate(rateStr: string): ParsedDutyRate {
  const normalized = rateStr.trim().toLowerCase();

  if (normalized === 'free' || normalized === 'no change' || normalized === 'exempt') {
    return { adValorem: 0, specificRatePerKg: 0 };
  }

  // Parse a clean percentage sub-string (e.g., "5.3%")
  const parsePercent = (str: string): number | null => {
    const match = str.trim().match(/^(\d+(\.\d+)?)%$/);
    return match ? parseFloat(match[1]) / 100 : null;
  };

  // Parse a specific rate sub-string (e.g., "$1.035/kg" or "2.8¢/kg" or "2.8c/kg")
  const parseSpecific = (str: string): number | null => {
    const s = str.trim();
    // Match Dollar format: "$1.035/kg"
    const dollarMatch = s.match(/^\$(\d+(\.\d+)?)\/kg$/);
    if (dollarMatch) return parseFloat(dollarMatch[1]);
    
    // Match Cents format: "2.8¢/kg" or "2.8c/kg"
    const centsMatch = s.match(/^(\d+(\.\d+)?)(¢|c)\/kg$/);
    if (centsMatch) return parseFloat(centsMatch[1]) / 100;

    return null;
  };

  // 1. Try pure percentage match
  const purePct = parsePercent(normalized);
  if (purePct !== null) {
    return { adValorem: purePct, specificRatePerKg: 0 };
  }

  // 2. Try pure specific rate match
  const pureSpec = parseSpecific(normalized);
  if (pureSpec !== null) {
    return { adValorem: 0, specificRatePerKg: pureSpec };
  }

  // 3. Try compound rate match (e.g. "1.7¢/kg + 3.4%" or "$1.035/kg + 13.6%")
  if (normalized.includes('+')) {
    const parts = normalized.split('+');
    if (parts.length === 2) {
      const part1 = parts[0].trim();
      const part2 = parts[1].trim();

      // Case A: specific rate first, percentage second (e.g. "1.7¢/kg + 3.4%")
      const spec1 = parseSpecific(part1);
      const pct2 = parsePercent(part2);
      if (spec1 !== null && pct2 !== null) {
        return { adValorem: pct2, specificRatePerKg: spec1 };
      }

      // Case B: percentage first, specific rate second (e.g. "3.4% + 1.7¢/kg")
      const pct1 = parsePercent(part1);
      const spec2 = parseSpecific(part2);
      if (pct1 !== null && spec2 !== null) {
        return { adValorem: pct1, specificRatePerKg: spec2 };
      }
    }
  }

  // Unsupported or complex unit rate structure
  throw new Error(
    `Unsupported or unparseable duty rate format: "${rateStr}". ` +
    `Rates containing units like 'each', 'gross', 'drained weight', or 'lead content' cannot be parsed automatically.`
  );
}

/**
 * Pure function to calculate shipment cost elements.
 * Free of database side-effects to maximize unit-testability.
 */
export function calculateShipmentCost(input: CostEstimationInput): CostEstimationResult {
  const {
    declaredValue,
    weight,
    hsCode,
    dutyRate,
    freightRatePerKg,
    freightMinCharge,
    insuranceRate = 0.005 // Default to 0.5% cargo insurance rate if omitted
  } = input;

  // 1. De Minimis check
  // Under Section 321, shipments valued under $800 are exempt from duties and MPF fees.
  const isDeMinimis = declaredValue < DE_MINIMIS_THRESHOLD_USD;

  let dutyAmount = 0;
  let mpfAmount = 0;

  if (!isDeMinimis) {
    // A. Calculate Duties
    const parsed = parseDutyRate(dutyRate);
    dutyAmount = (parsed.adValorem * declaredValue) + (parsed.specificRatePerKg * weight);

    // B. Calculate Merchandise Processing Fee (MPF)
    if (declaredValue >= FORMAL_ENTRY_THRESHOLD_USD) {
      // Formal Entry MPF (0.3464% of declared value, clamped between min and max limits)
      const calculatedMpf = declaredValue * FORMAL_MPF_RATE;
      mpfAmount = Math.max(FORMAL_MPF_MIN, Math.min(FORMAL_MPF_MAX, calculatedMpf));
    } else {
      // Informal Entry MPF (automated informal entry rate)
      mpfAmount = INFORMAL_MPF_TIERS.automated;
    }
  }

  // 2. Calculate Freight Shipping Cost
  // weight * rate_per_kg, clamped to the minimum freight charge
  const calculatedFreight = weight * freightRatePerKg;
  const freightCost = Math.max(freightMinCharge, calculatedFreight);

  // 3. Calculate Cargo Insurance Cost
  const insuranceCost = declaredValue * insuranceRate;

  // 4. Calculate Total Landed Cost (Declared Value + Duty + MPF + Freight + Insurance)
  const totalLandedCost = declaredValue + dutyAmount + mpfAmount + freightCost + insuranceCost;

  // Round helper to standard two-decimal cash precision
  const round = (val: number) => Math.round(val * 100) / 100;

  const rDuty = round(dutyAmount);
  const rMpf = round(mpfAmount);
  const rFreight = round(freightCost);
  const rInsurance = round(insuranceCost);
  const rTotal = round(totalLandedCost);

  const breakdown = [
    { label: 'Product Declared Value', amount: round(declaredValue) },
    { label: 'Import Duties (US Customs)', amount: rDuty },
    { label: 'Merchandise Processing Fee (MPF)', amount: rMpf },
    { label: 'Freight Shipping Cost', amount: rFreight },
    { label: 'Marine Cargo Insurance', amount: rInsurance }
  ];

  return {
    dutyAmount: rDuty,
    mpfAmount: rMpf,
    freightCost: rFreight,
    insuranceCost: rInsurance,
    totalLandedCost: rTotal,
    breakdown
  };
}
