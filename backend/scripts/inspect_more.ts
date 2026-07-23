import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse';

const csvFilePath = path.join(__dirname, '../data/hts_export.csv');

async function inspectMore() {
  const parser = fs.createReadStream(csvFilePath).pipe(
    parse({
      bom: true,
    })
  );

  let rowCount = 0;
  for await (const record of parser) {
    if (rowCount <= 100) {
      console.log(`Row ${rowCount}:`, JSON.stringify(record));
    } else {
      break;
    }
    rowCount++;
  }
}

inspectMore().catch(console.error);
