'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { AlertCircle } from 'lucide-react';

const exchangeData = [
  { name: 'Binance', share: '51%' },
  { name: 'OKX', share: '2.82%' },
  { name: 'Bybit', share: '3%' },
  { name: 'Coinbase', share: '19%' },
  { name: 'Kucoin', share: '2.3%' },
  { name: 'Gate', share: '3.9%' },
  { name: 'Kraken', share: '0.23%' },
  { name: 'Bitget', share: '0.16%' },
  { name: 'Bitstamp', share: '0.81%' },
  { name: 'Bitfinex', share: '0%' }
];

interface G20VolumeData {
  [key: string]: any;
}

export default function G20Metrics() {
  const [volumeData, setVolumeData] = useState<G20VolumeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('2025-ytd');
  const [error, setError] = useState<string | null>(null);
  const [dateColumnName, setDateColumnName] = useState<string | null>(null);
  const [volumeColumnName, setVolumeColumnName] = useState<string | null>(null);

  useEffect(() => {
    async function fetchVolumeData() {
      try {
        console.log('🚀 Fetching from /api/g20-metrics...');
        setError(null);
        
        const res = await fetch('/api/g20-metrics');
        
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        
        const data = await res.json();
        console.log('📦 Full API Response:', data);
        
        if (data.success) {
          console.log(`✅ Success! Got ${data.count} records`);
          setVolumeData(data.data || []);
          
          if (data.data && data.data.length > 0) {
            const firstRecord = data.data[0];
            const columns = Object.keys(firstRecord);
            
            console.log('📋 All column names:', columns);
            console.log('📋 First record:', firstRecord);
            
            // Auto-detect date column
            const dateCol = columns.find(col => 
              col.toLowerCase().includes('date') || 
              col.toLowerCase().includes('time') ||
              col === 'Date' ||
              col === 'DATE'
            );
            
            // Auto-detect volume column
            const volumeCol = columns.find(col => 
              col.toLowerCase().includes('volume') ||
              col.toLowerCase().includes('g20')
            );
            
            console.log('🔍 Detected date column:', dateCol, '→', firstRecord[dateCol || '']);
            console.log('🔍 Detected volume column:', volumeCol, '→', firstRecord[volumeCol || '']);
            
            setDateColumnName(dateCol || null);
            setVolumeColumnName(volumeCol || null);
            
            if (!dateCol) {
              console.warn('⚠️ Could not auto-detect date column!');
            }
            if (!volumeCol) {
              console.warn('⚠️ Could not auto-detect volume column!');
            }
          }
        } else {
          console.error('❌ API returned success: false');
          setError(data.error || 'Failed to fetch data');
        }
      } catch (error: any) {
        console.error('❌ Fetch error:', error);
        setError(error.message || 'Network error');
      } finally {
        setLoading(false);
      }
    }

    fetchVolumeData();
  }, []);

  const getDate = (row: G20VolumeData): Date | null => {
    if (!dateColumnName) return null;
    
    const dateValue = row[dateColumnName];
    if (!dateValue) return null;
    
    try {
      const parsed = new Date(dateValue);
      return isNaN(parsed.getTime()) ? null : parsed;
    } catch {
      return null;
    }
  };

  const getVolume = (row: G20VolumeData): number => {
    if (!volumeColumnName) return 0;
    
    const volume = row[volumeColumnName];
    
    if (typeof volume === 'number') return volume;
    if (typeof volume === 'string') {
      const parsed = parseFloat(volume.replace(/[^0-9.-]/g, ''));
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  const availablePeriods = useMemo(() => {
    if (!dateColumnName || volumeData.length === 0) return [];
    
    const periods = volumeData
      .map(item => {
        const date = getDate(item);
        if (!date) return null;
        
        const year = date.getFullYear();
        const month = date.getMonth();
        return {
          value: `${year}-${String(month + 1).padStart(2, '0')}`,
          label: date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
        };
      })
      .filter(Boolean) as { value: string; label: string }[];

    const uniquePeriods = Array.from(
      new Map(periods.map(p => [p.value, p])).values()
    ).sort((a, b) => b.value.localeCompare(a.value));

    console.log('📅 Available periods:', uniquePeriods);
    return uniquePeriods;
  }, [volumeData, dateColumnName]);

  const calculatedVolume = useMemo(() => {
    if (volumeData.length === 0 || !dateColumnName || !volumeColumnName) {
      console.log('⚠️ Cannot calculate - missing data or column names');
      return null;
    }

    console.log(`🧮 Calculating volume for period: ${selectedPeriod}`);

    if (selectedPeriod === '2025-ytd') {
      const filteredData = volumeData.filter(item => {
        const date = getDate(item);
        const isMatch = date && date.getFullYear() === 2025;
        if (isMatch) {
          console.log('  ✓ Match:', date.toISOString(), 'Volume:', getVolume(item));
        }
        return isMatch;
      });
      
      console.log(`📊 2025 YTD: Found ${filteredData.length} records`);
      
      const total = filteredData.reduce((sum, item) => sum + getVolume(item), 0);
      console.log(`💰 Total volume: ${total}`);
      
      return { total, count: filteredData.length };
    } else {
      const [year, month] = selectedPeriod.split('-').map(Number);
      const monthData = volumeData.filter(item => {
        const date = getDate(item);
        if (!date) return false;
        const isMatch = date.getFullYear() === year && date.getMonth() === month - 1;
        if (isMatch) {
          console.log('  ✓ Match:', date.toISOString(), 'Volume:', getVolume(item));
        }
        return isMatch;
      });
      
      console.log(`📊 ${year}-${String(month).padStart(2, '0')}: Found ${monthData.length} records`);
      
      const total = monthData.reduce((sum, item) => sum + getVolume(item), 0);
      console.log(`💰 Total volume: ${total}`);
      
      return { total, count: monthData.length };
    }
  }, [volumeData, selectedPeriod, dateColumnName, volumeColumnName]);

  const formatVolume = (volume: number) => {
    if (volume >= 1_000_000_000) {
      return `$${(volume / 1_000_000_000).toFixed(2)}B`;
    } else if (volume >= 1_000_000) {
      return `$${(volume / 1_000_000).toFixed(2)}M`;
    } else if (volume >= 1_000) {
      return `$${(volume / 1_000).toFixed(2)}K`;
    }
    return `$${volume.toFixed(2)}`;
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">
            G20 Market Making Metrics
          </h2>
          <div className="flex items-start gap-2 text-xs text-gray-400 max-w-2xl">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p>
              Reported data is based on monthly G20 reports. Some dates may be missing due to reporting schedules.
            </p>
          </div>
          
          {loading && (
            <div className="mt-2 text-xs text-blue-400">
              ⏳ Loading data from API...
            </div>
          )}
          
          {!loading && !error && volumeData.length > 0 && (
            <div className="mt-2 space-y-1">
              <div className="text-xs text-green-400">
                ✓ Loaded {volumeData.length} records from Supabase
              </div>
              {dateColumnName && (
                <div className="text-xs text-blue-400">
                  📅 Date column: <span className="font-mono">{dateColumnName}</span>
                </div>
              )}
              {volumeColumnName && (
                <div className="text-xs text-blue-400">
                  💰 Volume column: <span className="font-mono">{volumeColumnName}</span>
                </div>
              )}
              {(!dateColumnName || !volumeColumnName) && (
                <div className="text-xs text-orange-400">
                  ⚠️ Could not detect column names - check console (F12)
                </div>
              )}
            </div>
          )}
          
          {error && (
            <div className="mt-2 p-3 bg-red-900/20 border border-red-600/30 rounded">
              <p className="text-sm font-semibold text-red-400 mb-1">⚠️ Error Loading Data</p>
              <p className="text-xs text-red-300">{error}</p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="g20-period-filter" className="text-sm text-gray-400 whitespace-nowrap">
            Period:
          </label>
          <select
            id="g20-period-filter"
            value={selectedPeriod}
            onChange={(e) => {
              console.log('📅 Period changed to:', e.target.value);
              setSelectedPeriod(e.target.value);
            }}
            disabled={loading || !dateColumnName}
            className="bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <option value="2025-ytd">2025 To Date</option>
            {availablePeriods.length > 0 && (
              <optgroup label="Monthly Data">
                {availablePeriods.map(period => (
                  <option key={period.value} value={period.value}>
                    {period.label}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-700 rounded-lg p-4">
          <p className="text-gray-400 text-sm mb-1">Total MM Volume</p>
          {loading ? (
            <div className="h-8 bg-gray-600 animate-pulse rounded"></div>
          ) : error ? (
            <p className="text-xl font-bold text-red-400">Error</p>
          ) : !dateColumnName || !volumeColumnName ? (
            <>
              <p className="text-xl font-bold text-orange-400">Config Issue</p>
              <p className="text-xs text-gray-400 mt-1">Check console (F12)</p>
            </>
          ) : calculatedVolume && calculatedVolume.total > 0 ? (
            <>
              <p className="text-2xl font-bold text-yellow-400">
                {formatVolume(calculatedVolume.total)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {calculatedVolume.count} data point{calculatedVolume.count !== 1 ? 's' : ''}
              </p>
            </>
          ) : (
            <>
              <p className="text-2xl font-bold text-gray-500">No Data</p>
              <p className="text-xs text-gray-500 mt-1">
                {volumeData.length > 0 ? 'No data for selected period' : 'No records in database'}
              </p>
            </>
          )}
        </div>

        <div className="bg-gray-700 rounded-lg p-4">
          <p className="text-gray-400 text-sm mb-1">Active Exchanges</p>
          <p className="text-2xl font-bold text-blue-400">{exchangeData.length}</p>
        </div>

        <div className="bg-gray-700 rounded-lg p-4">
          <p className="text-gray-400 text-sm mb-1">Avg Spread Range</p>
          <p className="text-2xl font-bold text-green-400">0.15% - 1.5%</p>
        </div>
      </div>

      <div>
        <h3 className="text-xl font-semibold text-white mb-4">
          G20 Volume Split (As of Dec 2025 report)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {exchangeData.map((exchange) => (
            <div
              key={exchange.name}
              className="bg-gray-700 rounded-lg p-4 hover:bg-gray-600 transition-colors"
            >
              <p className="text-white font-semibold mb-2">{exchange.name}</p>
              <p className="text-gray-400 text-sm">Volume Share</p>
              <p className="text-yellow-400 font-bold text-xl">{exchange.share}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
