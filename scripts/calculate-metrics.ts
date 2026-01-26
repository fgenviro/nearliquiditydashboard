// Load environment variables
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Define the ManifoldRow interface to match your database schema
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
}

interface PerformanceMetrics {
  exchange: string;
  asset_pair: string;
  period_days: number;
  
  // Volume metrics
  total_mm_volume: number;
  total_market_volume: number;
  mm_market_share: number;
  avg_daily_volume: number;
  
  // Spread metrics
  avg_spread_ratio: number;
  spread_consistency: number;
  
  // Depth metrics
  avg_depth_50bps: number;
  avg_depth_100bps: number;
  avg_depth_200bps: number;
  depth_balance_50bps: number;
  depth_balance_100bps: number;
  depth_balance_200bps: number;
  
  // Performance scores
  volume_score: number;
  spread_score: number;
  depth_score: number;
  overall_score: number;
  
  // Rankings
  volume_rank: number;
  spread_rank: number;
  depth_rank: number;
  overall_rank: number;
}

async function calculateMetrics(): Promise<void> {
  console.log('📊 Calculating performance metrics...\n');
  
  // Fetch all data
  const { data: reports, error } = await supabase
    .from('manifold_reports')
    .select('*')
    .order('start_date', { ascending: true });
  
  if (error) {
    console.error('❌ Error fetching reports:', error);
    return;
  }
  
  if (!reports || reports.length === 0) {
    console.error('❌ No reports found in database');
    return;
  }
  
  console.log(`📄 Analyzing ${reports.length} reports\n`);
  
  // Group by exchange and asset pair with proper typing
  const grouped = reports.reduce((acc, report) => {
    const key = `${report.exchange}-${report.asset_pair_symbol}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(report as ManifoldRow);
    return acc;
  }, {} as Record<string, ManifoldRow[]>);
  
  const metrics: PerformanceMetrics[] = [];
  
  // ✅ FIX: Add explicit type annotation for Object.entries
  for (const [key, group] of Object.entries(grouped) as [string, ManifoldRow[]][]) {
    const [exchange, asset_pair] = key.split('-');
    
    // Volume metrics
    const total_mm_volume = group.reduce((sum, r) => sum + (r.market_maker_volume_usd_dollars || 0), 0);
    const total_market_volume = group.reduce((sum, r) => sum + (r.total_volume_usd_dollars || 0), 0);
    const mm_market_share = total_market_volume > 0 ? (total_mm_volume / total_market_volume) * 100 : 0;
    
    // Calculate period
    const dates = group.map(r => new Date(r.start_date).getTime());
    const period_days = (Math.max(...dates) - Math.min(...dates)) / (1000 * 60 * 60 * 24);
    const avg_daily_volume = total_mm_volume / (period_days || 1);
    
    // Spread metrics
    const spreads = group.map(r => r.average_bid_ask_spread_ratio).filter(s => s > 0);
    const avg_spread_ratio = spreads.length > 0 
      ? spreads.reduce((sum, s) => sum + s, 0) / spreads.length 
      : 0;
    const spread_variance = spreads.length > 0
      ? spreads.reduce((sum, s) => sum + Math.pow(s - avg_spread_ratio, 2), 0) / spreads.length
      : 0;
    const spread_consistency = 1 / (1 + Math.sqrt(spread_variance));
    
    // Depth metrics
    const avg_depth_50bps = (
      group.reduce((sum, r) => 
        sum + (r.market_maker_depth_bid_50_bps_usd_dollars || 0) + (r.market_maker_depth_ask_50_bps_usd_dollars || 0), 0
      )
    ) / group.length;
    
    const avg_depth_100bps = (
      group.reduce((sum, r) => 
        sum + (r.market_maker_depth_bid_100_bps_usd_dollars || 0) + (r.market_maker_depth_ask_100_bps_usd_dollars || 0), 0
      )
    ) / group.length;
    
    const avg_depth_200bps = (
      group.reduce((sum, r) => 
        sum + (r.market_maker_depth_bid_200_bps_usd_dollars || 0) + (r.market_maker_depth_ask_200_bps_usd_dollars || 0), 0
      )
    ) / group.length;
    
    // Depth balance (how balanced are bid/ask depths)
    const depth_balance_50bps = group.reduce((sum, r) => {
      const bid = r.market_maker_depth_bid_50_bps_usd_dollars || 0;
      const ask = r.market_maker_depth_ask_50_bps_usd_dollars || 0;
      const max = Math.max(bid, ask);
      return sum + (max > 0 ? Math.min(bid, ask) / max : 0);
    }, 0) / group.length;
    
    const depth_balance_100bps = group.reduce((sum, r) => {
      const bid = r.market_maker_depth_bid_100_bps_usd_dollars || 0;
      const ask = r.market_maker_depth_ask_100_bps_usd_dollars || 0;
      const max = Math.max(bid, ask);
      return sum + (max > 0 ? Math.min(bid, ask) / max : 0);
    }, 0) / group.length;
    
    const depth_balance_200bps = group.reduce((sum, r) => {
      const bid = r.market_maker_depth_bid_200_bps_usd_dollars || 0;
      const ask = r.market_maker_depth_ask_200_bps_usd_dollars || 0;
      const max = Math.max(bid, ask);
      return sum + (max > 0 ? Math.min(bid, ask) / max : 0);
    }, 0) / group.length;
    
    metrics.push({
      exchange,
      asset_pair,
      period_days: Math.round(period_days),
      total_mm_volume,
      total_market_volume,
      mm_market_share,
      avg_daily_volume,
      avg_spread_ratio,
      spread_consistency,
      avg_depth_50bps,
      avg_depth_100bps,
      avg_depth_200bps,
      depth_balance_50bps,
      depth_balance_100bps,
      depth_balance_200bps,
      volume_score: 0,
      spread_score: 0,
      depth_score: 0,
      overall_score: 0,
      volume_rank: 0,
      spread_rank: 0,
      depth_rank: 0,
      overall_rank: 0,
    });
  }
  
  if (metrics.length === 0) {
    console.error('❌ No metrics calculated');
    return;
  }
  
  // Calculate scores (normalized 0-100)
  const maxVolume = Math.max(...metrics.map(m => m.total_mm_volume), 1);
  const minSpread = Math.min(...metrics.map(m => m.avg_spread_ratio).filter(s => s > 0), 1);
  const maxDepth = Math.max(...metrics.map(m => m.avg_depth_50bps), 1);
  
  metrics.forEach(m => {
    m.volume_score = (m.total_mm_volume / maxVolume) * 100;
    m.spread_score = m.avg_spread_ratio > 0 
      ? (minSpread / m.avg_spread_ratio) * 100 * m.spread_consistency 
      : 0;
    m.depth_score = ((m.avg_depth_50bps / maxDepth) * 100 * m.depth_balance_50bps);
    m.overall_score = (m.volume_score * 0.4 + m.spread_score * 0.3 + m.depth_score * 0.3);
  });
  
  // Calculate rankings
  const sortedByVolume = [...metrics].sort((a, b) => b.volume_score - a.volume_score);
  const sortedBySpread = [...metrics].sort((a, b) => b.spread_score - a.spread_score);
  const sortedByDepth = [...metrics].sort((a, b) => b.depth_score - a.depth_score);
  const sortedByOverall = [...metrics].sort((a, b) => b.overall_score - a.overall_score);
  
  metrics.forEach(m => {
    m.volume_rank = sortedByVolume.findIndex(x => x.exchange === m.exchange && x.asset_pair === m.asset_pair) + 1;
    m.spread_rank = sortedBySpread.findIndex(x => x.exchange === m.exchange && x.asset_pair === m.asset_pair) + 1;
    m.depth_rank = sortedByDepth.findIndex(x => x.exchange === m.exchange && x.asset_pair === m.asset_pair) + 1;
    m.overall_rank = sortedByOverall.findIndex(x => x.exchange === m.exchange && x.asset_pair === m.asset_pair) + 1;
  });
  
  // Print results
  console.log('🏆 TOP PERFORMERS\n');
  console.log('═'.repeat(120));
  
  sortedByOverall.slice(0, 10).forEach((m, i) => {
    console.log(`\n${i + 1}. ${m.exchange.toUpperCase()} - ${m.asset_pair}`);
    console.log(`   Overall Score: ${m.overall_score.toFixed(1)}/100`);
    console.log(`   Volume: $${(m.total_mm_volume / 1_000_000).toFixed(2)}M (Rank #${m.volume_rank})`);
    console.log(`   Market Share: ${m.mm_market_share.toFixed(2)}%`);
    console.log(`   Avg Spread: ${(m.avg_spread_ratio * 100).toFixed(3)}% (Rank #${m.spread_rank})`);
    console.log(`   Avg Depth 50bps: $${(m.avg_depth_50bps / 1000).toFixed(1)}K (Rank #${m.depth_rank})`);
  });
  
  console.log('\n' + '═'.repeat(120));
  
  // Ensure data directory exists
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  // Save to JSON file
  const outputPath = path.join(dataDir, 'performance-metrics.json');
  fs.writeFileSync(
    outputPath,
    JSON.stringify(metrics, null, 2)
  );
  
  console.log(`\n✅ Metrics saved to ${outputPath}`);
  console.log(`📊 Total exchange-pair combinations analyzed: ${metrics.length}`);
}

calculateMetrics()
  .then(() => {
    console.log('\n🎉 All done!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
