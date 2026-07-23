/**
 * Merchandise Processing Fee (MPF) Constants for Fiscal Year 2026
 * 
 * Source: CBP General Notice, 90 FR 34665 (effective October 1, 2025).
 * Note: These fees are adjusted annually by CBP to reflect inflation.
 */

// Thresholds
export const FORMAL_ENTRY_THRESHOLD_USD = 2500;
export const DE_MINIMIS_THRESHOLD_USD = 800;

// Formal Entry MPF Rates & Limits
export const FORMAL_MPF_RATE = 0.003464; // 0.3464% of declared value
export const FORMAL_MPF_MIN = 33.58;     // Minimum fee for formal entry
export const FORMAL_MPF_MAX = 651.50;    // Maximum fee for formal entry

// Filing surcharge
export const MANUAL_FILING_SURCHARGE = 4.03; // Surcharge for manual (paper) filings

// Informal Entry MPF Tiers
export const INFORMAL_MPF_TIERS = {
  automated: 2.69, // Automated informal entry (CBP prep)
  tier2: 8.06,     // Automated informal entry (other prep)
  manual: 12.09    // Manual informal entry
};
