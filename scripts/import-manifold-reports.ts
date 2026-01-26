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

interface ManifoldRow {
  start_date: string;
  end_date: string;
  asset_pair_symbol: string;
  exchange: string;
  total_volume_usd_dollars: number;
  market_maker_volume_usd_dollars: number;
  average_bid_ask_spread_ratio: number;
  market_maker_depth_bid_50_bps_usd_dollars: number;
  market_maker_depth_ask_50_bps_usd_dollars: number;
  market_maker_depth_bid_100_bps_usd_dollars: number;
  market_maker_depth_ask_100_bps_usd_dollars: number;
  market_maker_depth_bid_200_bps_usd_dollars: number;
  market_maker_depth_ask_200_bps_usd_dollars: number;
  file_name: string;
}

/**
 * Parse CSV file
 */
function parseCSVFile(filePath: string): ManifoldRow[] {
  console.log(`📄 Reading: ${path.basename(filePath)}`);
  
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  
  // Parse CSV with headers
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    cast: true,
    cast_date: false,
  });
  
  const mappedRecords: ManifoldRow[] = records.map((row: any) => {
    // Helper to find column value with multiple possible names
    const findValue = (possibleNames: string[]): any => {
      for (const name of possibleNames) {
        const lowerName = name.toLowerCase();
        const key = Object.keys(row).find(k => k.toLowerCase() === lowerName);
        if (key && row[key] !== undefined && row[key] !== null && row[key] !== '') {
          return row[key];
        }
      }
      return null;
    };
    
    return {
      start_date: normalizeDate(findValue(['start_date', 'start date', 'Start Date'])),
      end_date: normalizeDate(findValue(['end_date', 'end date', 'End Date'])),
      asset_pair_symbol: String(findValue(['asset_pair_symbol', 'asset pair', 'symbol', 'Asset Pair Symbol']) || '').toUpperCase(),
      exchange: String(findValue(['exchange', 'Exchange']) || '').toLowerCase(),
      total_volume_usd_dollars: parseFloat(String(findValue(['total_volume_usd_dollars', 'total volume', 'Total Volume (USD)', 'total_volume']) || '0')),
      market_maker_volume_usd_dollars: parseFloat(String(findValue(['market_maker_volume_usd_dollars', 'mm volume', 'Market Maker Volume (USD)', 'market_maker_volume']) || '0')),
      average_bid_ask_spread_ratio: parseFloat(String(findValue(['average_bid_ask_spread_ratio', 'avg spread', 'spread ratio', 'Average Bid-Ask Spread Ratio']) || '0')),
      market_maker_depth_bid_50_bps_usd_dollars: parseFloat(String(findValue(['market_maker_depth_bid_50_bps_usd_dollars', 'bid depth 50bps', 'bid_50', 'MM Depth Bid 50bps (USD)']) || '0')),
      market_maker_depth_ask_50_bps_usd_dollars: parseFloat(String(findValue(['market_maker_depth_ask_50_bps_usd_dollars', 'ask depth 50bps', 'ask_50', 'MM Depth Ask 50bps (USD)']) || '0')),
      market_maker_depth_bid_100_bps_usd_dollars: parseFloat(String(findValue(['market_maker_depth_bid_100_bps_usd_dollars', 'bid depth 100bps', 'bid_100', 'MM Depth Bid 100bps (USD)']) || '0')),
      market_maker_depth_ask_100_bps_usd_dollars: parseFloat(String(findValue(['market_maker_depth_ask_100_bps_usd_dollars', 'ask depth 100bps', 'ask_100', 'MM Depth Ask 100bps (USD)']) || '0')),
      market_maker_depth_bid_200_bps_usd_dollars: parseFloat(String(findValue(['market_maker_depth_bid_200_bps_usd_dollars', 'bid depth 200bps', 'bid_200', 'MM Depth Bid 200bps (USD)']) || '0')),
      market_maker_depth_ask_200_bps_usd_dollars: parseFloat(String(findValue(['market_maker_depth_ask_200_bps_usd_dollars', 'ask depth 200bps', 'ask_200', 'MM Depth Ask 200bps (USD)']) || '0')),
      file_name: path.basename(filePath),
    };
  }).filter((record: ManifoldRow) => {
    // Only include records with valid data
    return record.asset_pair_symbol && record.exchange;
  });
  
  console.log(`✅ Parsed ${mappedRecords.length} rows from ${path.basename(filePath)}`);
  return mappedRecords;
}

/**
 * Normalize date formats
 */
function normalizeDate(value: any): string {
  if (!value) return new Date().toISOString().split('T')[0];
  
  // If it's already a Date object
  if (value instanceof Date) {
    return value.toISOString().split('T')[0];
  }
  
  // If it's a string
  if (typeof value === 'string') {
    // Try parsing common formats
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }
  
  // If it's a number (Excel serial)
  if (typeof value === 'number') {
    const date = new Date((value - 25569) * 86400 * 1000);
    return date.toISOString().split('T')[0];
  }
  
  return String(value);
}

/**
 * Insert records into Supabase in batches
 */
async function insertRecords(records: ManifoldRow[]): Promise<void> {
  const batchSize = 100;
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    
    const { data, error } = await supabase
      .from('manifold_reports')
      .upsert(batch, {
        onConflict: 'start_date,end_date,asset_pair_symbol,exchange',
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
  console.log('🚀 Starting Manifold Reports Import...\n');
  
  // Get all CSV files from directory
  const files = fs.readdirSync(directoryPath)
    .filter(file => file.endsWith('.csv'))
    .map(file => path.join(directoryPath, file));
  
  console.log(`📁 Found ${files.length} CSV files\n`);
  
  if (files.length === 0) {
    console.error('❌ No CSV files found in directory:', directoryPath);
    console.log('💡 Tip: Make sure your CSV files are in:', path.resolve(directoryPath));
    
    // List what files ARE in the directory
    const allFiles = fs.readdirSync(directoryPath);
    if (allFiles.length > 0) {
      console.log('\n📂 Files found in directory:');
      allFiles.forEach(f => console.log(`   - ${f}`));
    }
    
    return;
  }
  
  let allRecords: ManifoldRow[] = [];
  
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
const directoryPath = process.argv[2] || './data/manifold';

importAllFiles(directoryPath)
  .then(() => {
    console.log('\n🎉 All done!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
