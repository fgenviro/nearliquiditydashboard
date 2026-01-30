'use client'

import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { supabase, LiquiditySnapshot, getLatestSnapshots, getLatestSnapshot } from '@/lib/supabase'
import StatsCards from '@/components/StatsCards'
import LiquidityChart from '@/components/LiquidityChart'
import SpreadChart from '@/components/SpreadChart'
import HistoricalChart from '@/components/HistoricalChart'
import ManifoldMetrics from '@/components/ManifoldMetrics'
import G20Metrics from '@/components/G20Metrics'
import IMCPerformanceStats from '@/components/IMCPerformanceStats';

export default function Home() {
  const [snapshots, setSnapshots] = useState<LiquiditySnapshot[]>([])
  const [latestSnapshot, setLatestSnapshot] = useState<LiquiditySnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const fetchData = async () => {
    setLoading(true)
    
    const [snapshotsData, latestData] = await Promise.all([
      getLatestSnapshots(100),
      getLatestSnapshot()
    ])
    
    setSnapshots(snapshotsData)
    setLatestSnapshot(latestData)
    setLastUpdate(new Date())
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
    
    const channel = supabase
      .channel('liquidity_changes')
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'liquidity_snapshots' 
        },
        (payload) => {
          const newSnapshot = payload.new as LiquiditySnapshot
          setSnapshots(prev => [...prev.slice(-99), newSnapshot])
          setLatestSnapshot(newSnapshot)
          setLastUpdate(new Date())
        }
      )
      .subscribe()

    const interval = setInterval(fetchData, 300000)
    
    return () => {
      channel.unsubscribe()
      clearInterval(interval)
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <div className="max-w-7xl mx-auto p-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              NEAR Liquidity Monitor
            </h1>
            <p className="text-gray-400">Real-time Binance orderbook analysis</p>
          </div>
          
          <button 
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-6 py-3 rounded-lg transition-colors disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {/* Stats Cards */}
        <StatsCards snapshots={snapshots} />

        {/* Liquidity Chart */}
        <LiquidityChart snapshots={snapshots} />

        {/* 🆕 Manifold Market Making Metrics */}
        <ManifoldMetrics />

        {/* New IMC Stats */}  
        <IMCPerformanceStats />

        {/* 🆕 G20 Market Making Metrics */}
        <G20Metrics />


        {/* Spread Chart */}
        <SpreadChart snapshots={snapshots} />

        {/* Data Table */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-2xl font-bold mb-6 text-white">Recent Snapshots</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Time</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-medium">Mid Price</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-medium">Spread</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-medium">50bps</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-medium">1%</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-medium">2%</th>
                </tr>
              </thead>
              <tbody>
                {snapshots.slice(-20).reverse().map((snapshot) => (
                  <tr key={snapshot.id} className="border-b border-gray-700 hover:bg-gray-750 transition-colors">
                    <td className="py-3 px-4 text-gray-300">
                      {new Date(snapshot.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      ${snapshot.mid_price.toFixed(4)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      {snapshot.spread_bps.toFixed(2)} bps
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      ${(snapshot.total_50bps / 1000).toFixed(0)}k
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      ${(snapshot.total_1pct / 1000).toFixed(0)}k
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      ${(snapshot.total_2pct / 1000).toFixed(0)}k
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          {mounted ? (
            <p>Last updated: {lastUpdate.toLocaleString()}</p>
          ) : (
            <p>Loading...</p>
          )}
          <p className="mt-2">Data updates automatically every 30 minutes</p>
        </div>
      </div>
    </div>
  )
}
