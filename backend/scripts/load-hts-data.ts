import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse';
import prisma from '../src/config/db';

const csvFilePath = path.join(__dirname, '../data/hts_export.csv');

// Roman numerals mapping for Chapters 1-99 matching standard Harmonized System Section nomenclature
function getSectionForChapter(chapterNum: number): string {
  if (chapterNum >= 1 && chapterNum <= 5) return 'I';
  if (chapterNum >= 6 && chapterNum <= 14) return 'II';
  if (chapterNum === 15) return 'III';
  if (chapterNum >= 16 && chapterNum <= 24) return 'IV';
  if (chapterNum >= 25 && chapterNum <= 27) return 'V';
  if (chapterNum >= 28 && chapterNum <= 38) return 'VI';
  if (chapterNum >= 39 && chapterNum <= 40) return 'VII';
  if (chapterNum >= 41 && chapterNum <= 43) return 'VIII';
  if (chapterNum >= 44 && chapterNum <= 46) return 'IX';
  if (chapterNum >= 47 && chapterNum <= 49) return 'X';
  if (chapterNum >= 50 && chapterNum <= 63) return 'XI';
  if (chapterNum >= 64 && chapterNum <= 67) return 'XII';
  if (chapterNum >= 68 && chapterNum <= 70) return 'XIII';
  if (chapterNum === 71) return 'XIV';
  if (chapterNum >= 72 && chapterNum <= 83) return 'XV';
  if (chapterNum >= 84 && chapterNum <= 85) return 'XVI';
  if (chapterNum >= 86 && chapterNum <= 89) return 'XVII';
  if (chapterNum >= 90 && chapterNum <= 92) return 'XVIII';
  if (chapterNum === 93) return 'XIX';
  if (chapterNum >= 94 && chapterNum <= 96) return 'XX';
  if (chapterNum >= 97 && chapterNum <= 99) return 'XXI';
  return 'UNKNOWN';
}

async function loadHTSData() {
  console.log(`Starting HTS loader. Reading file: ${csvFilePath}`);
  if (!fs.existsSync(csvFilePath)) {
    console.error(`ERROR: CSV file not found at: ${csvFilePath}`);
    process.exit(1);
  }

  const parser = fs.createReadStream(csvFilePath).pipe(
    parse({
      bom: true,
    })
  );

  let skippedCount = 0;
  let loadedCount = 0;
  let rowIdx = 0;

  const descriptionStack: string[] = [];
  const dutyRateStack: string[] = [];

  // Batch accumulation lists
  let batchCodes: any[] = [];
  let batchDutyRates: any[] = [];
  const BATCH_SIZE = 1000;

  // Track uniquely inserted HS codes in current execution to prevent batch duplicate primary keys
  const uniqueCodeSet = new Set<string>();

  for await (const record of parser) {
    rowIdx++;
    // Skip the header row
    if (rowIdx === 1) continue;

    const rawHts = (record[0] || '').trim();
    const indentVal = (record[1] || '').trim();
    const description = (record[2] || '').trim();
    const generalDuty = (record[4] || '').trim();

    if (!indentVal) {
      skippedCount++;
      continue;
    }

    const indent = parseInt(indentVal, 10);
    if (isNaN(indent)) {
      skippedCount++;
      continue;
    }

    // Keep description and duty on hierarchy stacks
    descriptionStack[indent] = description;
    descriptionStack.length = indent + 1;

    if (generalDuty) {
      dutyRateStack[indent] = generalDuty;
      dutyRateStack.length = indent + 1;
    }

    // If HTS number is empty, this is a grouping header - skip direct DB write
    if (!rawHts) {
      skippedCount++;
      continue;
    }

    const hsCode = rawHts.replace(/\s+/g, '');
    
    // Assemble hierarchical description
    const fullDescription = descriptionStack
      .filter(Boolean)
      .map(d => d.replace(/:$/, '').trim())
      .join(' > ');

    // Determine parent inherited duty rate
    let resolvedDuty = generalDuty;
    if (!resolvedDuty) {
      for (let k = indent - 1; k >= 0; k--) {
        if (dutyRateStack[k]) {
          resolvedDuty = dutyRateStack[k];
          break;
        }
      }
    }
    // Fallback if no duty rate found in stack
    resolvedDuty = resolvedDuty || 'Free';

    // Parse Chapter and Section
    const cleanDigits = hsCode.replace(/\./g, '');
    const chapter = cleanDigits.substring(0, 2);
    const chapterNum = parseInt(chapter, 10);
    const section = isNaN(chapterNum) ? 'UNKNOWN' : getSectionForChapter(chapterNum);

    // Filter duplicates within the current CSV run
    if (uniqueCodeSet.has(hsCode)) {
      skippedCount++;
      continue;
    }
    uniqueCodeSet.add(hsCode);

    // Accumulate batch
    batchCodes.push({
      hs_code: hsCode,
      description: fullDescription,
      chapter,
      section,
      notes: null,
    });

    batchDutyRates.push({
      hs_code: hsCode,
      destination_country: 'US',
      duty_rate: resolvedDuty,
      tax_rate: null,
      source: 'USITC HTS 2026',
    });

    loadedCount++;

    // Write batch if size threshold reached
    if (batchCodes.length >= BATCH_SIZE) {
      await writeBatches(batchCodes, batchDutyRates);
      batchCodes = [];
      batchDutyRates = [];
      console.log(`Indexed ${loadedCount} codes...`);
    }
  }

  // Write remaining records
  if (batchCodes.length > 0) {
    await writeBatches(batchCodes, batchDutyRates);
  }

  console.log('\n--- HTS LOADING COMPLETED ---');
  console.log(`Total HTS Codes Loaded: ${loadedCount}`);
  console.log(`Total Grouping/Header Rows Skipped: ${skippedCount}`);
}

async function writeBatches(codes: any[], dutyRates: any[]) {
  // Use createMany to insert rapidly
  await prisma.hSCodeReference.createMany({
    data: codes,
    skipDuplicates: true,
  });

  await prisma.dutyRate.createMany({
    data: dutyRates,
  });
}

loadHTSData()
  .catch((err) => {
    console.error('Loader failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
