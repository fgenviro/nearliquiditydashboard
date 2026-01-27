// Load environment variables FIRST
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { parse } from 'csv-parse/sync';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface IMCStatRow {
  report_start: string;
  report_end: string;
  exchange: string;
  bps_bucket: string | null;
  kpi: string | null;
  imc_liquidity_usd: number;
  market_liquidity_usd: number;
  kpi_ratio_imc_over_kpi: number;
  liq_provided_vs_kpi_percentage: number;
  kpi_outperform: boolean;
  pct_of_market_liqudity: number;
  exchange_uptime_pct: number;
  avg_bid_ask_spread_bps: number;
  trading_volume_ms: number;
  source_file: string;
}

/**
 * Parse CSV file
 */
function parseCSVFile(filePath: string): IMCStatRow[] {
  console.log(`📄 Reading: ${path.basename(filePath)}`);
  
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  
  // Parse CSV with headers
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    cast: false, // We'll handle casting manually
  });
  
  const mappedRecords: IMCStatRow[] = records.map((row: any) => {
    return {
      report_start: normalizeDate(row.report_start),
      report_end: normalizeDate(row.report_end),
      exchange: String(row.exchange || '').toLowerCase(),
      bps_bucket: row.bps_bucket || null,
      kpi: row.kpi || null,
      imc_liquidity_usd: parseFloat(String(row.imc_liquidity_usd || '0')),
      market_liquidity_usd: parseFloat(String(row.market_liquidity_usd || '0')),
      kpi_ratio_imc_over_kpi: parseFloat(String(row.kpi_ratio_imc_over_kpi || '0')),
      liq_provided_vs_kpi_percentage: parseFloat(String(row.liq_provided_vs_kpi_percentage || '0')),
      kpi_outperform: String(row.kpi_outperform).toLowerCase() === 'true',
      pct_of_market_liqudity: parseFloat(String(row.pct_of_market_liqudity || '0')),
      exchange_uptime_pct: parseFloat(String(row.exchange_uptime_pct || '0')),
      avg_bid_ask_spread_bps: parseFloat(String(row.avg_bid_ask_spread_bps || '0')),
      trading_volume_ms: parseFloat(String(row.trading_volume_ms || '0')),
      source_file: row.source_file || path.basename(filePath),
    };
  }).filter((record: IMCStatRow) => {
    // Only include records with valid data
    return record.exchange && record.report_start && record.report_end;
  });
  
  console.log(`✅ Parsed ${mappedRecords.length} rows from ${path.basename(filePath)}`);
  return mappedRecords;
}

/**
 * Normalize date formats
 */
/**
 * Normalize date formats - handles DD/M/YYYY, DD/MM/YYYY, and other formats
 */
function normalizeDate(value: any): string {
  if (!value) return new Date().toISOString().split('T')[0];
  
  if (value instanceof Date) {
    return value.toISOString().split('T')[0];
  }
  
  if (typeof value === 'string') {
    // Handle DD/M/YYYY or DD/MM/YYYY format
    const ddmmyyyyMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (ddmmyyyyMatch) {
      const [, day, month, year] = ddmmyyyyMatch;
      // Convert to YYYY-MM-DD
      const paddedMonth = month.padStart(2, '0');
      const paddedDay = day.padStart(2, '0');
      return `${year}-${paddedMonth}-${paddedDay}`;
    }
    
    // Try standard Date parsing
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }
  
  // Handle Excel serial number
  if (typeof value === 'number') {
    const date = new Date((value - 25569) * 86400 * 1000);
    return date.toISOString().split('T')[0];
  }
  
  return String(value);
}


/**
 * Insert records into Supabase in batches
 */
async function insertRecords(records: IMCStatRow[]): Promise<void> {
  const batchSize = 100;
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    
    const { data, error } = await supabase
      .from('imc_liquidity_statistics')
      .upsert(batch, {
        onConflict: 'report_start,report_end,exchange,bps_bucket,kpi,source_file',
        ignoreDuplicates: false,
      });
    
    if (error) {
      console.error(`❌ Error inserting batch ${Math.floor(i / batchSize) + 1}:`, error.message);
      errorCount += batch.length;
    } else {
      successCount += batch.length;
      console.log(`✅ Inserted batch ${Math.floor(i / batchSize) + 1} (${batch.length} records)`);
    }
  }
  
  console.log(`\n📊 Summary: ${successCount} succeeded, ${errorCount} failed`);
}

/**
 * Main function to import all CSV files
 */
async function importAllFiles(directoryPath: string): Promise<void> {
  console.log('🚀 Starting IMC Statistics Import...\n');
  
  // Get all CSV files from directory
  const files = fs.readdirSync(directoryPath)
    .filter(file => file.endsWith('.csv'))
    .map(file => path.join(directoryPath, file));
  
  console.log(`📁 Found ${files.length} CSV files\n`);
  
  if (files.length === 0) {
    console.error('❌ No CSV files found in directory:', directoryPath);
    return;
  }
  
  let allRecords: IMCStatRow[] = [];
  
  // Parse all files
  for (const filePath of files) {
    try {
      const records = parseCSVFile(filePath);
      allRecords = allRecords.concat(records);
    } catch (error) {
      console.error(`❌ Error parsing ${path.basename(filePath)}:`, error);
    }
  }
  
  console.log(`\n📊 Total records to import: ${allRecords.length}\n`);
  
  if (allRecords.length === 0) {
    console.error('❌ No valid records found');
    return;
  }
  
  // Insert all records
  await insertRecords(allRecords);
  
  console.log('\n✅ Import complete!');
}

// Run the import
const directoryPath = process.argv[2] || './data/imc';

importAllFiles(directoryPath)
  .then(() => {
    console.log('\n🎉 All done!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
