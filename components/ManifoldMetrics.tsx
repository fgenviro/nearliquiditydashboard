'use client';

import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Activity, BarChart3, Calendar } from 'lucide-react';

interface ManifoldReport {
  exchange: string;
  total_volume_usd_dollars: number;
  market_maker_volume_usd_dollars: number;
  average_bid_ask_spread_ratio: number;
  start_date?: string;
  end_date?: string;
}

interface ExchangeMetrics {
  exchange: string;
  marketShare: number;
  volume: number;
}

interface ManifoldAPIResponse {
  reports: ManifoldReport[];
  count: number;
}

interface MonthOption {
  value: string;
  label: string;
}

export default function ManifoldMetrics() {
  const [allReports, setAllReports] = useState<ManifoldReport[]>([]);
  const [filteredReports, setFilteredReports] = useState<ManifoldReport[]>([]);
  const [totalVolume, setTotalVolume] = useState<number>(0);
  const [exchangeMetrics, setExchangeMetrics] = useState<ExchangeMetrics[]>([]);
  const [avgSpreadRatio, setAvgSpreadRatio] = useState<number>(0);
  const [monthOptions, setMonthOptions] = useState<MonthOption[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('inception');
  const [loading, setLoading] = useState(true);

  // Fetch all data on mount
  useEffect(() => {
    fetchManifoldData();
  }, []);

  // Generate month options when data is loaded
  useEffect(() => {
    if (allReports.length > 0) {
      generateMonthOptions();
    }
  }, [allReports]);

  // Recalculate metrics when month filter changes
  useEffect(() => {
    if (allReports.length > 0) {
      filterAndCalculateMetrics();
    }
  }, [selectedMonth, allReports]);

  const fetchManifoldData = async () => {
    try {
      console.log('🔍 Fetching from /api/manifold...');
      const response = await fetch('/api/manifold');
      
      console.log('📡 Response status:', response.status);
      
      if (!response.ok) {
        console.error('❌ Failed to fetch Manifold data');
        setLoading(false);
        return;
      }

      const data = await response.json() as ManifoldAPIResponse;
      console.log('📦 Raw API response:', data);
      
      const reports = data.reports;

      if (!reports || reports.length === 0) {
        console.warn('⚠️ No Manifold data found');
        setLoading(false);
        return;
      }

      console.log('✅ Found', reports.length, 'reports');
      setAllReports(reports);
      setLoading(false);
    } catch (error) {
      console.error('💥 Error processing Manifold data:', error);
      setLoading(false);
    }
  };

  const generateMonthOptions = () => {
    const monthsMap = new Map<string, MonthOption>();
    
    allReports.forEach(report => {
      if (report.start_date) {
        const startDate = new Date(report.start_date);
        const monthKey = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthsMap.has(monthKey)) {
          const monthLabel = startDate.toLocaleDateString('en-US', { 
            month: 'long', 
            year: 'numeric' 
          });
          
          monthsMap.set(monthKey, {
            value: monthKey,
            label: monthLabel
          });
        }
      }
    });

    // Convert to array and sort by date (most recent first)
    const monthsArray = Array.from(monthsMap.values()).sort((a, b) => {
      const dateA = new Date(a.value + '-01');
      const dateB = new Date(b.value + '-01');
      return dateB.getTime() - dateA.getTime();
    });
    
    setMonthOptions(monthsArray);
  };

  const filterAndCalculateMetrics = () => {
    let reports = allReports;

    // Filter by selected month if not "inception"
    if (selectedMonth !== 'inception') {
      const [year, month] = selectedMonth.split('-').map(Number);
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 0); // Last day of the month

      reports = allReports.filter(report => {
        if (!report.start_date) return false;
        const reportDate = new Date(report.start_date);
        return reportDate >= monthStart && reportDate <= monthEnd;
      });

      console.log(`📅 Filtered to ${selectedMonth}:`, reports.length, 'reports');
    }

    setFilteredReports(reports);

    if (reports.length === 0) {
      setTotalVolume(0);
      setExchangeMetrics([]);
      setAvgSpreadRatio(0);
      return;
    }

    // 1. Calculate Total Volume (SUM for "Since Inception", filtered for specific months)
    const total = reports.reduce((sum: number, r: ManifoldReport) => 
      sum + r.market_maker_volume_usd_dollars, 0
    );
    console.log('💰 Total volume:', total);
    setTotalVolume(total);

    // 2. Calculate Market Share per Exchange
    const exchangeGroups = reports.reduce((acc: Record<string, { totalVolume: number; mmVolume: number }>, report: ManifoldReport) => {
      const ex = report.exchange.toLowerCase();
      if (!acc[ex]) {
        acc[ex] = {
          totalVolume: 0,
          mmVolume: 0,
        };
      }
      acc[ex].totalVolume += report.total_volume_usd_dollars;
      acc[ex].mmVolume += report.market_maker_volume_usd_dollars;
      return acc;
    }, {});

    console.log('🏦 Exchange groups:', exchangeGroups);

    const metrics: ExchangeMetrics[] = Object.entries(exchangeGroups).map(([exchange, data]) => ({
      exchange,
      volume: data.mmVolume,
      marketShare: (data.mmVolume / data.totalVolume) * 100,
    }));

    console.log('📈 Metrics:', metrics);

    // Sort by specific order: Binance, Bybit, OKX, Gate
    const order = ['binance', 'bybit', 'okx', 'gate'];
    metrics.sort((a, b) => {
      const aIndex = order.indexOf(a.exchange.toLowerCase());
      const bIndex = order.indexOf(b.exchange.toLowerCase());
      return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
    });

    setExchangeMetrics(metrics);

    // 3. Calculate Average Bid-Ask Spread Ratio
    const validSpreads = reports.filter((r: ManifoldReport) => r.average_bid_ask_spread_ratio > 0);
    const avgSpread = validSpreads.length > 0
      ? validSpreads.reduce((sum: number, r: ManifoldReport) => sum + r.average_bid_ask_spread_ratio, 0) / validSpreads.length
      : 0;
    console.log('📉 Average spread:', avgSpread);
    setAvgSpreadRatio(avgSpread);
  };

  const getExchangeColor = (exchange: string) => {
    const colors: Record<string, string> = {
      binance: 'from-yellow-900/30 to-yellow-800/20 border-yellow-500/50',
      bybit: 'from-orange-900/30 to-orange-800/20 border-orange-500/50',
      okx: 'from-blue-900/30 to-blue-800/20 border-blue-500/50',
      gate: 'from-purple-900/30 to-purple-800/20 border-purple-500/50',
    };
    return colors[exchange.toLowerCase()] || 'from-gray-800/30 to-gray-700/20 border-gray-600/50';
  };

  const getExchangeIcon = (exchange: string) => {
    const icons: Record<string, string> = {
      binance: '🟡',
      bybit: '🟠',
      okx: '🔵',
      gate: '🟣',
    };
    return icons[exchange.toLowerCase()] || '📊';
  };

  if (loading) {
    return (
      <div className="bg-gray-800 p-6 rounded-xl animate-pulse border border-gray-700">
        <div className="h-8 bg-gray-700 rounded w-1/3 mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-32 bg-gray-700 rounded"></div>
          <div className="h-32 bg-gray-700 rounded"></div>
          <div className="h-32 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-2xl">
      {/* Header with Filter */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <Activity className="w-7 h-7 text-blue-400" />
            Manifold Market Making Metrics
            <span className="ml-2 px-3 py-1 bg-blue-900/30 border border-blue-500/50 rounded-full text-sm text-blue-300">
              NEAR-USDT
            </span>
          </h2>
          <p className="text-gray-400 text-sm mt-2">
            Real-time performance metrics across all exchanges
          </p>
        </div>

        {/* Month Filter Dropdown */}
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-400" />
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-gray-700 border border-gray-600 text-white rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
          >
            <option value="inception">Since Inception</option>
            {monthOptions.map(month => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* 1. Total Volume */}
        <div className="bg-gradient-to-br from-green-900/30 to-green-800/20 p-6 rounded-xl border-2 border-green-500/50">
          <div className="flex items-center justify-between mb-3">
            <p className="text-green-300 text-sm font-semibold uppercase tracking-wide">
              {selectedMonth === 'inception' ? 'Total MM Volume' : 'Monthly MM Volume'}
            </p>
            <DollarSign className="w-6 h-6 text-green-400" />
          </div>
          <p className="text-4xl font-bold text-white mb-1">
            ${(totalVolume / 1_000_000).toFixed(2)}M
          </p>
          <p className="text-green-400 text-xs">
            {selectedMonth === 'inception' ? 'Across all exchanges' : `For ${monthOptions.find(m => m.value === selectedMonth)?.label || 'selected period'}`}
          </p>
        </div>

        {/* 2. Average Spread Ratio */}
        <div className="bg-gradient-to-br from-purple-900/30 to-purple-800/20 p-6 rounded-xl border-2 border-purple-500/50">
          <div className="flex items-center justify-between mb-3">
            <p className="text-purple-300 text-sm font-semibold uppercase tracking-wide">Avg Spread Ratio</p>
            <TrendingUp className="w-6 h-6 text-purple-400" />
          </div>
          <p className="text-4xl font-bold text-white mb-1">
            {(avgSpreadRatio * 100).toFixed(3)}%
          </p>
          <p className="text-purple-400 text-xs">
            Overall bid-ask spread
          </p>
        </div>

        {/* 3. Active Exchanges */}
        <div className="bg-gradient-to-br from-blue-900/30 to-blue-800/20 p-6 rounded-xl border-2 border-blue-500/50">
          <div className="flex items-center justify-between mb-3">
            <p className="text-blue-300 text-sm font-semibold uppercase tracking-wide">Active Exchanges</p>
            <BarChart3 className="w-6 h-6 text-blue-400" />
          </div>
          <p className="text-4xl font-bold text-white mb-1">
            {exchangeMetrics.length}
          </p>
          <p className="text-blue-400 text-xs">
            {exchangeMetrics.map(e => e.exchange.toUpperCase()).join(', ')}
          </p>
        </div>
      </div>

      {/* Exchange Market Share Grid */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-gray-400" />
          Market Share by Exchange
        </h3>
        
        {exchangeMetrics.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {exchangeMetrics.map((metric) => (
              <div
                key={metric.exchange}
                className={`bg-gradient-to-br ${getExchangeColor(metric.exchange)} p-5 rounded-xl border-2 hover:scale-105 transition-transform`}
              >
                {/* Exchange Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getExchangeIcon(metric.exchange)}</span>
                    <h4 className="font-bold text-white text-lg uppercase">
                      {metric.exchange}
                    </h4>
                  </div>
                </div>

                {/* Market Share */}
                <div className="mb-3">
                  <p className="text-xs text-gray-400 mb-1">Market Share</p>
                  <p className="text-3xl font-bold text-white">
                    {metric.marketShare.toFixed(2)}%
                  </p>
                </div>

                {/* Volume */}
                <div>
                  <p className="text-xs text-gray-400 mb-1">MM Volume</p>
                  <p className="text-lg font-semibold text-gray-200">
                    ${(metric.volume / 1_000_000).toFixed(2)}M
                  </p>
                </div>

                {/* Visual Bar */}
                <div className="mt-4 h-2 bg-gray-700/50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-white/70 to-white/90 transition-all duration-500"
                    style={{ width: `${Math.min(metric.marketShare, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-400 py-8">
            No data available for the selected period
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-gray-700">
        <p className="text-xs text-gray-500 text-center">
          Data sourced from Manifold reports • 
          {selectedMonth === 'inception' 
            ? ' Showing all-time metrics' 
            : ` Filtered for ${monthOptions.find(m => m.value === selectedMonth)?.label || 'selected period'}`
          }
        </p>
      </div>
    </div>
  );
}
