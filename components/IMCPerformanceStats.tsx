'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

interface IMCStats {
  activeExchanges: number;
  avgMarketLiquidity: number;
  avgKPIPercentage: number;
  tradingVolumeByExchange: Record<string, number>;
  avgUptime: number;
  reportStart: string | null;
  reportEnd: string | null;
}

export default function IMCPerformanceStats() {
  const [stats, setStats] = useState<IMCStats | null>(null);
  const [sourceFiles, setSourceFiles] = useState<string[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Fetch available source files for dropdown
  useEffect(() => {
    async function fetchSourceFiles() {
      const { data, error } = await supabase
        .from('imc_liquidity_statistics')
        .select('source_file')
        .order('source_file');

      if (data && !error) {
        const uniqueFiles = Array.from(new Set(data.map(d => d.source_file)));
        setSourceFiles(uniqueFiles);
      }
    }

    fetchSourceFiles();
  }, []);

  // Fetch stats based on selected filter
  useEffect(() => {
    async function fetchStats() {
      setLoading(true);

      let query = supabase
        .from('imc_liquidity_statistics')
        .select('*')
        .order('report_start', { ascending: true });

      // Apply filter if not "all"
      if (selectedFilter !== 'all') {
        query = query.eq('source_file', selectedFilter);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching IMC stats:', error);
        setLoading(false);
        return;
      }

      if (data && data.length > 0) {
        // Get unique exchanges
        const exchanges = new Set(data.map(d => d.exchange));
        
        // Calculate averages
        const avgMarketLiq = data.reduce((sum, d) => sum + (d.pct_of_market_liqudity || 0), 0) / data.length;
        const avgKPI = data.reduce((sum, d) => sum + (d.liq_provided_vs_kpi_percentage || 0), 0) / data.length;
        const avgUpt = data.reduce((sum, d) => sum + (d.exchange_uptime_pct || 0), 0) / data.length;

        // Get FIRST trading_volume_ms (as percentage) for each exchange
        const tradingVolumeByExchange: Record<string, number> = {};
        const exchangeList = ['binance', 'bybit', 'okx', 'coinbase'];
        
        exchangeList.forEach(exchange => {
          const exchangeData = data.filter(d => d.exchange.toLowerCase() === exchange);
          if (exchangeData.length > 0) {
            tradingVolumeByExchange[exchange] = exchangeData[0].trading_volume_ms || 0;
          } else {
            tradingVolumeByExchange[exchange] = 0; // Set to 0 if no data
          }
        });

        // Get date range
        const dates = data.map(d => new Date(d.report_start)).sort((a, b) => a.getTime() - b.getTime());
        const reportStart = dates[0]?.toISOString().split('T')[0] || null;
        const reportEnd = dates[dates.length - 1]?.toISOString().split('T')[0] || null;

        setStats({
          activeExchanges: exchanges.size,
          avgMarketLiquidity: avgMarketLiq,
          avgKPIPercentage: avgKPI,
          tradingVolumeByExchange,
          avgUptime: avgUpt,
          reportStart,
          reportEnd,
        });
      }

      setLoading(false);
    }

    fetchStats();
  }, [selectedFilter]);

  const formatPercent = (value: number) => `${value.toFixed(2)}%`;
  
  // Helper to format trading volume - show "N/A" if 0
  const formatTradingVolume = (value: number) => {
    if (value === 0) return 'N/A';
    return formatPercent(value);
  };
  
  // Helper to capitalize exchange names
  const capitalizeExchange = (exchange: string) => {
    if (exchange === 'okx') return 'OKX';
    return exchange.charAt(0).toUpperCase() + exchange.slice(1);
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-lg shadow-lg">
      {/* Header */}
      <div className="flex flex-row items-center justify-between p-6 pb-4">
        <h2 className="text-xl font-bold text-white">
          IMC Performance Statistics
        </h2>
        
        {/* Filter Dropdown */}
        <select
          value={selectedFilter}
          onChange={(e) => setSelectedFilter(e.target.value)}
          className="w-[280px] bg-slate-800 border border-slate-600 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Since Contract Inception</option>
          {sourceFiles.map(file => (
            <option key={file} value={file}>
              {file.replace('.csv', '').replace('.pdf', '').replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      </div>

      {/* Content */}
      <div className="p-6 pt-2">
        {loading ? (
          <div className="text-slate-400 text-center py-8">Loading...</div>
        ) : stats ? (
          <>
            {/* Date Range */}
            {stats.reportStart && stats.reportEnd && (
              <div className="text-sm text-slate-400 mb-4">
                Period: {stats.reportStart} to {stats.reportEnd}
              </div>
            )}

            {/* Stats Grid - First Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              {/* Active Exchanges */}
              <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                <div className="text-sm text-slate-400 mb-1">Active Exchanges</div>
                <div className="text-2xl font-bold text-blue-400">{stats.activeExchanges}</div>
                <div className="text-xs text-slate-500 mt-1">Binance, OKX, Bybit, Coinbase</div>
              </div>

              {/* Market Liquidity % */}
              <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                <div className="text-sm text-slate-400 mb-1">Market Liquidity %</div>
                <div className="text-2xl font-bold text-green-400">
                  {formatPercent(stats.avgMarketLiquidity)}
                </div>
                <div className="text-xs text-slate-500 mt-1">Average across exchanges</div>
              </div>

              {/* KPI Performance */}
              <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                <div className="text-sm text-slate-400 mb-1">Liquidity Provided vs KPI</div>
                <div className="text-2xl font-bold text-purple-400">
                  {formatPercent(stats.avgKPIPercentage)}
                </div>
                <div className="text-xs text-slate-500 mt-1">Average performance</div>
              </div>

              {/* Exchange Uptime */}
              <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                <div className="text-sm text-slate-400 mb-1">Average Uptime</div>
                <div className="text-2xl font-bold text-cyan-400">
                  {formatPercent(stats.avgUptime)}
                </div>
                <div className="text-xs text-slate-500 mt-1">Across all exchanges</div>
              </div>
            </div>

            {/* Trading Volume Capture Per Exchange - Second Row */}
            <div>
              <h3 className="text-sm font-semibold text-slate-300 mb-3">Trading Volume Capture by Exchange</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(stats.tradingVolumeByExchange).map(([exchange, volumePercent]) => (
                  <div key={exchange} className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                    <div className="text-sm text-slate-400 mb-1">{capitalizeExchange(exchange)}</div>
                    <div className={`text-2xl font-bold ${volumePercent === 0 ? 'text-slate-500' : 'text-yellow-400'}`}>
                      {formatTradingVolume(volumePercent)}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">Market share</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="text-slate-400 text-center py-8">No data available</div>
        )}
      </div>
    </div>
  );
}
