import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding placeholder freight rates for India -> US...");

  // Clean out existing placeholder rates for the IN -> US corridor to ensure run-idempotency
  await prisma.freightRate.deleteMany({
    where: {
      origin_country: 'IN',
      destination_country: 'US'
    }
  });

  // Create Air freight rate entry
  await prisma.freightRate.create({
    data: {
      origin_country: 'IN',
      destination_country: 'US',
      mode: 'air',
      // CRITICAL NOTE: These rates are placeholder estimates for FY2026.
      // They do not represent final binding freight pricing and must be replaced 
      // by integration with a live carrier shipping API or user-provided shipping sheets.
      rate_per_kg: 4.50,  
      min_charge: 50.00,  
      source: 'TradeComplyAI India-US Corridor Air Cargo Placeholder (FY2026)'
    }
  });

  // Create Sea freight rate entry
  await prisma.freightRate.create({
    data: {
      origin_country: 'IN',
      destination_country: 'US',
      mode: 'sea',
      // CRITICAL NOTE: These rates are placeholder estimates for FY2026.
      rate_per_kg: 1.20,  
      min_charge: 150.00, 
      source: 'TradeComplyAI India-US Corridor Ocean Cargo Placeholder (FY2026)'
    }
  });

  console.log("Database seeded successfully with placeholder air and sea freight rates.");
}

main()
  .catch((err) => {
    console.error("Failed to seed freight rates:", err);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
