'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Users } from 'lucide-react';

interface RatioData {
  exchange: string;
  symbol: string;
  longRatio: number;
  shortRatio: number;
  timestamp: number;
}

export default function LongShortRatio() {
  const [ratios, setRatios] = useState<RatioData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRatios();
    const interval = setInterval(fetchRatios, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const fetchRatios = async () => {
    try {
      const response = await fetch('/api/coinalyze/long-short-ratio');
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Check if data is an array
      if (Array.isArray(data)) {
        setRatios(data);
        setError(null);
      } else {
        console.error('API returned non-array data:', data);
        setError('Invalid data format received');
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch long/short ratios:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch data');
      setLoading(false);
    }
  };

  const getSentiment = (longRatio: number) => {
    if (longRatio > 55) return { text: 'Bullish', color: 'text-green-400', bg: 'bg-green-900/20' };
    if (longRatio < 45) return { text: 'Bearish', color: 'text-red-400', bg: 'bg-red-900/20' };
    return { text: 'Neutral', color: 'text-yellow-400', bg: 'bg-yellow-900/20' };
  };

  if (loading) {
    return (
      <div className="bg-gray-800 p-6 rounded-lg animate-pulse">
        <div className="h-8 bg-gray-700 rounded w-1/3 mb-4"></div>
        <div className="space-y-4">
          <div className="h-24 bg-gray-700 rounded"></div>
          <div className="h-24 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-red-900/50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5" />
            Long/Short Ratio
          </h2>
        </div>
        <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
          <p className="text-red-400 text-sm">⚠️ {error}</p>
          <p className="text-gray-400 text-xs mt-2">
            Check console for details or verify API configuration
          </p>
          <button 
            onClick={fetchRatios}
            className="mt-3 text-xs text-blue-400 hover:text-blue-300 underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (ratios.length === 0) {
    return (
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5" />
            Long/Short Ratio
          </h2>
        </div>
        <div className="bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-4">
          <p className="text-yellow-400 text-sm">No data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Users className="w-5 h-5" />
          Long/Short Ratio
        </h2>
        <span className="text-xs text-gray-400">
          Updates every minute
        </span>
      </div>

      <div className="space-y-4">
        {ratios.map((ratio) => {
          const sentiment = getSentiment(ratio.longRatio);
          
          return (
            <div 
              key={`${ratio.exchange}-${ratio.symbol}`}
              className="bg-gray-900/50 p-4 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-white">
                    {ratio.exchange === 'binance' ? 'Binance' : 'Bybit'} Futures
                  </h3>
                  <p className="text-xs text-gray-400">{ratio.symbol}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${sentiment.bg} ${sentiment.color}`}>
                  {sentiment.text}
                </span>
              </div>

              {/* Ratio Display */}
              <div className="grid grid-cols-2 gap-4">
                {/* Long */}
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-400" />
                  <div>
                    <p className="text-xs text-gray-400">Long</p>
                    <p className="text-2xl font-bold text-green-400">
                      {ratio.longRatio.toFixed(1)}%
                    </p>
                  </div>
                </div>

                {/* Short */}
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-red-400" />
                  <div>
                    <p className="text-xs text-gray-400">Short</p>
                    <p className="text-2xl font-bold text-red-400">
                      {ratio.shortRatio.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Visual Bar */}
              <div className="mt-4 h-2 bg-gray-700 rounded-full overflow-hidden flex">
                <div 
                  className="bg-green-500 transition-all duration-500"
                  style={{ width: `${ratio.longRatio}%` }}
                />
                <div 
                  className="bg-red-500 transition-all duration-500"
                  style={{ width: `${ratio.shortRatio}%` }}
                />
              </div>

              {/* Ratio Text */}
              <p className="text-center text-xs text-gray-400 mt-2">
                {(ratio.longRatio / ratio.shortRatio).toFixed(2)}:1 ratio
              </p>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <p className="text-xs text-gray-500 mt-4 text-center">
        Data from Coinalyze API
      </p>
    </div>
  );
}
