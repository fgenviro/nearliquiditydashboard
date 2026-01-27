'use client';

import React from 'react';

const exchanges = [
  'Binance',
  'OKX',
  'Bybit',
  'Kucoin',
  'Gate',
  'Coinbase',
  'Kraken',
  'Bitget',
  'Bitfinex',
  'Bitstamp'
];

export default function G20Metrics() {
  return (
    <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
      <h2 className="text-2xl font-bold text-white mb-6">
        G20 Market Making Metrics
      </h2>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-700 rounded-lg p-4">
          <p className="text-gray-400 text-sm mb-1">Total MM Volume</p>
          <p className="text-2xl font-bold text-yellow-400">Pending</p>
        </div>

        <div className="bg-gray-700 rounded-lg p-4">
          <p className="text-gray-400 text-sm mb-1">Active Exchanges</p>
          <p className="text-2xl font-bold text-blue-400">{exchanges.length}</p>
        </div>

        <div className="bg-gray-700 rounded-lg p-4">
          <p className="text-gray-400 text-sm mb-1">Avg Spread Range</p>
          <p className="text-2xl font-bold text-green-400">0.15% - 1.5%</p>
        </div>
      </div>

      {/* Market Share per Exchange */}
      <div>
        <h3 className="text-xl font-semibold text-white mb-4">
          Market Share per Exchange
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {exchanges.map((exchange) => (
            <div
              key={exchange}
              className="bg-gray-700 rounded-lg p-4 hover:bg-gray-600 transition-colors"
            >
              <p className="text-white font-semibold mb-2">{exchange}</p>
              <p className="text-gray-400 text-sm">Market Share</p>
              <p className="text-yellow-400 font-bold">Pending</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
