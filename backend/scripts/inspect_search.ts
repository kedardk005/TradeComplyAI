import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse';

const csvFilePath = path.join(__dirname, '../data/hts_export.csv');

async function searchKeywords() {
  const parser = fs.createReadStream(csvFilePath).pipe(parse());

  let found = 0;
  for await (const record of parser) {
    const htsCode = record[0] || '';
    const desc = record[2] || '';
    
    // Check if the record description contains structure markers
    if (
      desc.toLowerCase().startsWith('chapter') || 
      desc.toLowerCase().startsWith('section') ||
      htsCode.toLowerCase().startsWith('chapter') ||
      htsCode.toLowerCase().startsWith('section')
    ) {
      console.log(`Row:`, JSON.stringify(record));
      found++;
      if (found > 20) break;
    }
  }
  
  if (found === 0) {
    console.log('No direct "Chapter" or "Section" rows found in the CSV data.');
  }
}

searchKeywords().catch(console.error);
