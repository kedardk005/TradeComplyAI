import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse';

const csvFilePath = path.join(__dirname, '../data/hts_export.csv');

async function inspectCSV() {
  console.log(`Attempting to read CSV file from: ${csvFilePath}`);
  if (!fs.existsSync(csvFilePath)) {
    console.error(`ERROR: CSV file not found at: ${csvFilePath}. Please place the USITC HTS export file there.`);
    process.exit(1);
  }

  const parser = fs.createReadStream(csvFilePath).pipe(
    parse({
      bom: true, // strips UTF-8 BOM if present
    })
  );

  let rowCount = 0;
  for await (const record of parser) {
    if (rowCount === 0) {
      console.log('\n--- RAW HEADER ROW ---');
      console.log(JSON.stringify(record));
      console.log('\n--- FIRST 3 DATA ROWS ---');
    } else if (rowCount <= 3) {
      console.log(`Row ${rowCount}:`, JSON.stringify(record));
    } else {
      break;
    }
    rowCount++;
  }
  console.log('\n--- END OF INSPECTION ---');
}

inspectCSV().catch((err) => {
  console.error('CSV Inspection error:', err);
});
