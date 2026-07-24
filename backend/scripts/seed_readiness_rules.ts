import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding hand-verified readiness rules...");

  // Clear existing hand-verified rules to ensure idempotency
  await prisma.readinessRule.deleteMany({
    where: { rule_type: 'hand_verified' }
  });

  const rules = [
    // Textiles
    {
      category: 'Textiles',
      rule_type: 'hand_verified' as const,
      requirement: 'Fiber Content Labeling',
      description: 'Imported textile items must be labeled with fiber content percentage by weight (e.g. 100% Cotton). Labels must list generic fiber names in English and specify the country of origin.',
      source: 'FTC Textile Fiber Products Identification Act (15 U.S.C. § 70) / 16 CFR Part 303'
    },
    {
      category: 'Textiles',
      rule_type: 'hand_verified' as const,
      requirement: 'FTC Care Labeling Compliance',
      description: 'Laundering and care instructions (washing, bleaching, drying, ironing) must be permanently attached to the garment. Exporters must provide accurate care instruction sheets before customs entry.',
      source: 'FTC Care Labeling of Textile Wearing Apparel Rule (16 CFR Part 423)'
    },
    // Spices
    {
      category: 'Spices',
      rule_type: 'hand_verified' as const,
      requirement: 'FDA Prior Notice Filing',
      description: 'Exporters/importers must submit Prior Notice to the FDA for all food shipments (including spices) before the shipment arrives at the US port of entry.',
      source: 'FDA Bioterrorism Act of 2002 (21 CFR Part 1, Subpart I)'
    },
    {
      category: 'Spices',
      rule_type: 'hand_verified' as const,
      requirement: 'FSMA Foreign Supplier Verification Program (FSVP)',
      description: 'Importers must conduct hazard analyses and verification activities (such as audits or lab reports) to ensure that the foreign spice supplier meets US food safety standards.',
      source: 'FDA Food Safety Modernization Act (FSMA) FSVP Rule (21 CFR Part 1, Subpart L)'
    },
    // Handicrafts
    {
      category: 'Handicrafts',
      rule_type: 'hand_verified' as const,
      requirement: 'Lacey Act Plant Product Declaration',
      description: 'If the handicraft contains wood, bamboo, rattan, or other plant-derived fibers, a Lacey Act import declaration (APHIS Form PPQ 505) must be filed detailing the scientific plant species and country of harvest.',
      source: 'USDA Animal and Plant Health Inspection Service (APHIS) Lacey Act (7 U.S.C. 3371 et seq.)'
    },
    {
      category: 'Handicrafts',
      rule_type: 'hand_verified' as const,
      requirement: 'CITES Certification (Species Dependent)',
      description: 'CITES certificates are required for handicrafts utilizing protected timber species (e.g. certain rosewood/Dalbergia listings) or animal components. | NEEDS MANUAL VERIFICATION: Verify active CITES species appendices lists before clearing customs.',
      source: 'NEEDS MANUAL VERIFICATION: Convention on International Trade in Endangered Species (CITES) Appendix I/II'
    },
    // Leather
    {
      category: 'Leather',
      rule_type: 'hand_verified' as const,
      requirement: 'USFWS Wildlife Declaration (Form 3-177)',
      description: 'Leather goods derived from animal hides of wildlife origin (excluding domestic animals like cows, sheep, goats) must be declared to the US Fish and Wildlife Service on Form 3-177 before custom clearance.',
      source: 'US Fish and Wildlife Service Regulations (50 CFR Part 14)'
    },
    {
      category: 'Leather',
      rule_type: 'hand_verified' as const,
      requirement: 'USFWS Designated Port Entry',
      description: 'Wildlife-derived leather goods must enter the US through specific designated ports of entry approved by the US Fish and Wildlife Service, unless a special port exception permit is secured.',
      source: 'US Fish and Wildlife Service Regulations (50 CFR Part 14.12)'
    },
    // Pharma/Cosmetics
    {
      category: 'Pharma/Cosmetics',
      rule_type: 'hand_verified' as const,
      requirement: 'FDA Cosmetic Facility Registration',
      description: 'Under MoCRA (Modernization of Cosmetics Regulation Act), manufacturing and processing facilities for imported cosmetic goods must be registered with the FDA.',
      source: 'FDA MoCRA / Federal Food, Drug, and Cosmetic Act (21 U.S.C. 360)'
    },
    {
      category: 'Pharma/Cosmetics',
      rule_type: 'hand_verified' as const,
      requirement: 'FDA Ingredient Disclosure & Color Certification',
      description: 'Cosmetic labels must list ingredients. All color additives used in cosmetics must be FDA-certified. Coal-tar hair dyes have specific packaging warning requirements.',
      source: 'FDA Fair Packaging and Labeling Act (21 CFR Part 701)'
    },
    // Jewelry
    {
      category: 'Jewelry',
      rule_type: 'hand_verified' as const,
      requirement: 'Kimberley Process Certification',
      description: 'If the jewelry contains rough diamonds, it must be accompanied by a valid Kimberley Process Certificate. Imports without certification are strictly subject to seizure.',
      source: 'US Clean Diamond Trade Act (19 U.S.C. 3901-3913)'
    },
    {
      category: 'Jewelry',
      rule_type: 'hand_verified' as const,
      requirement: 'National Gold and Silver Stamping Compliance',
      description: 'Precious metal jewelry must bear accurate quality fineness stamps (e.g. 14K, 925). The quality mark must be accompanied by a registered trademark of the firm stamping the item.',
      source: 'National Gold and Silver Stamping Act (15 U.S.C. 291-300)'
    }
  ];

  for (const rule of rules) {
    await prisma.readinessRule.create({ data: rule });
  }

  console.log(`Successfully seeded ${rules.length} hand-verified compliance rules!`);
}

main()
  .catch((err) => {
    console.error("Seeding readiness rules failed:", err);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
