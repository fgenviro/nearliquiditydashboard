'use client'

import { useState, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { LiquiditySnapshot } from '@/lib/supabase'

interface SpreadChartProps {
  snapshots: LiquiditySnapshot[]
}

export default function SpreadChart({ snapshots }: SpreadChartProps) {
  const [selectedDate, setSelectedDate] = useState<string>('most-recent')

  // Extract unique dates from snapshots
  const availableDates = useMemo(() => {
    const dates = snapshots.map(s => {
      const date = new Date(s.timestamp)
      return date.toISOString().split('T')[0] // YYYY-MM-DD format
    })
    return [...new Set(dates)].sort().reverse() // Unique dates, newest first
  }, [snapshots])

  // Filter snapshots based on selected date
  const filteredSnapshots = useMemo(() => {
    if (selectedDate === 'most-recent') {
      // Get the most recent 24 hours of data
      if (snapshots.length === 0) return []
      const latestTimestamp = Math.max(...snapshots.map(s => new Date(s.timestamp).getTime()))
      const oneDayAgo = latestTimestamp - (24 * 60 * 60 * 1000)
      return snapshots.filter(s => new Date(s.timestamp).getTime() >= oneDayAgo)
    } else {
      // Filter by specific date
      return snapshots.filter(s => {
        const snapshotDate = new Date(s.timestamp).toISOString().split('T')[0]
        return snapshotDate === selectedDate
      })
    }
  }, [snapshots, selectedDate])

  // Transform data for chart
  const chartData = filteredSnapshots
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .map(snapshot => ({
      time: new Date(snapshot.timestamp).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      fullTime: new Date(snapshot.timestamp).toLocaleString(),
      spread: snapshot.spread_bps.toFixed(2)
    }))

  if (snapshots.length === 0) {
    return null
  }

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-8">
      {/* Header with Title and Dropdown */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Spread Trends</h2>
        
        {/* Dropdown Filter */}
        <div className="flex items-center gap-2">
          <label htmlFor="spread-date-filter" className="text-sm text-gray-400">
            View:
          </label>
          <select
            id="spread-date-filter"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="most-recent">Most Recent Snapshot (24h)</option>
            <optgroup label="Specific Dates">
              {availableDates.map(date => (
                <option key={date} value={date}>
                  {new Date(date).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </option>
              ))}
            </optgroup>
          </select>
        </div>
      </div>

      {/* Chart */}
      {chartData.length === 0 ? (
        <div className="h-[300px] flex items-center justify-center text-gray-500">
          No data available for selected date range.
        </div>
      ) : (
        <>
          {/* Data Summary */}
          <div className="mb-4 text-sm text-gray-400">
            Showing {chartData.length} data points
            {selectedDate !== 'most-recent' && (
              <span> for {new Date(selectedDate).toLocaleDateString('en-US', { 
                weekday: 'long',
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</span>
            )}
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="time" 
                stroke="#9CA3AF"
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                stroke="#9CA3AF"
                style={{ fontSize: '12px' }}
                label={{ 
                  value: 'Spread (bps)', 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { fill: '#9CA3AF' }
                }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151', 
                  borderRadius: '8px',
                  color: '#fff'
                }}
                labelFormatter={(label, payload) => {
                  if (payload && payload[0]) {
                    return payload[0].payload.fullTime
                  }
                  return label
                }}
                formatter={(value: any) => [`${value} bps`, 'Spread']}
              />
              <Line 
                type="monotone" 
                dataKey="spread" 
                stroke="#06B6D4" 
                strokeWidth={3}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </>
      )}
    </div>
  )
}
