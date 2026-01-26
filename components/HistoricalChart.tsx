'use client'

import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { supabase } from '@/lib/supabase'
import { Calendar } from 'lucide-react'

interface KlineData {
  timestamp: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

type TimeRange = '24h' | '7d' | '30d' | 'custom'

export default function HistoricalChart() {
  const [data, setData] = useState<KlineData[]>([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<TimeRange>('7d')
  const [showCustom, setShowCustom] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const fetchHistoricalData = async () => {
    setLoading(true)
    
    const now = new Date()
    let queryStartDate = new Date()
    let queryEndDate = now
    
    if (timeRange === 'custom') {
      if (!startDate || !endDate) {
        setLoading(false)
        return
      }
      queryStartDate = new Date(startDate)
      queryEndDate = new Date(endDate)
      queryEndDate.setHours(23, 59, 59, 999)
    } else {
      switch(timeRange) {
        case '24h':
          queryStartDate.setDate(now.getDate() - 1)
          break
        case '7d':
          queryStartDate.setDate(now.getDate() - 7)
          break
        case '30d':
          queryStartDate.setDate(now.getDate() - 30)
          break
      }
    }

    const { data: klines, error } = await supabase
      .from('historical_klines')
      .select('timestamp, open, high, low, close, volume')
      .eq('symbol', 'NEARUSDT')
      .eq('exchange', 'binance')
      .gte('timestamp', queryStartDate.toISOString())
      .lte('timestamp', queryEndDate.toISOString())
      .order('timestamp', { ascending: true })

    if (error) {
      console.error('Error fetching historical data:', error)
    } else {
      setData(klines || [])
    }
    
    setLoading(false)
  }

  useEffect(() => {
    fetchHistoricalData()
  }, [timeRange, startDate, endDate])

  const handleRangeChange = (range: TimeRange) => {
    setTimeRange(range)
    if (range === 'custom') {
      setShowCustom(true)
      const end = new Date()
      const start = new Date()
      start.setDate(end.getDate() - 30)
      setEndDate(end.toISOString().split('T')[0])
      setStartDate(start.toISOString().split('T')[0])
    } else {
      setShowCustom(false)
    }
  }

  const formatXAxis = (timestamp: string) => {
    const date = new Date(timestamp)
    
    if (timeRange === '24h') {
      // Show hours and minutes for 24h view
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      })
    } else if (timeRange === '7d') {
      // Show day and short month for 7 day view
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      })
    } else {
      // Show full date for 30d and custom
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: data.length > 0 && 
              new Date(data[0].timestamp).getFullYear() !== date.getFullYear() 
              ? 'numeric' 
              : undefined
      })
    }
  }

  const getTickCount = () => {
    if (timeRange === '24h') return 8
    if (timeRange === '7d') return 7
    if (timeRange === '30d') return 10
    // For custom range, calculate based on days
    if (startDate && endDate) {
      const days = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24))
      return Math.min(days, 12)
    }
    return 10
  }

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h2 className="text-2xl font-bold text-white">Historical Price Chart</h2>
          
          <div className="flex gap-2">
            {(['24h', '7d', '30d', 'custom'] as const).map((range) => (
              <button
                key={range}
                onClick={() => handleRangeChange(range)}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                  timeRange === range
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {range === 'custom' && <Calendar className="w-4 h-4" />}
                {range === 'custom' ? 'Custom' : range}
              </button>
            ))}
          </div>
        </div>

        {showCustom && (
          <div className="flex flex-col sm:flex-row gap-4 p-4 bg-gray-700 rounded-lg">
            <div className="flex flex-col gap-2">
              <label className="text-sm text-gray-300">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                max={endDate || new Date().toISOString().split('T')[0]}
                className="px-3 py-2 rounded-lg bg-gray-600 text-white border border-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm text-gray-300">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                max={new Date().toISOString().split('T')[0]}
                className="px-3 py-2 rounded-lg bg-gray-600 text-white border border-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={fetchHistoricalData}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="h-96 flex items-center justify-center">
          <div className="text-gray-400">Loading chart data...</div>
        </div>
      ) : data.length === 0 ? (
        <div className="h-96 flex items-center justify-center">
          <div className="text-gray-400">No historical data available for selected range</div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="timestamp" 
              tickFormatter={formatXAxis}
              stroke="#9CA3AF"
              minTickGap={50}
              tickCount={getTickCount()}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis 
              stroke="#9CA3AF"
              domain={['auto', 'auto']}
              tickFormatter={(value) => `$${value.toFixed(3)}`}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1F2937', 
                border: '1px solid #374151',
                borderRadius: '8px'
              }}
              labelFormatter={(label) => new Date(label).toLocaleString()}
              formatter={(value: number | undefined) => {
                 if (value === undefined) return ['$0.0000', 'Price'];
                 return [`$${value.toFixed(4)}`, 'Price'];
                }}

            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="close" 
              stroke="#3B82F6" 
              strokeWidth={2}
              dot={false}
              name="Close Price"
            />
            <Line 
              type="monotone" 
              dataKey="high" 
              stroke="#10B981" 
              strokeWidth={1}
              dot={false}
              name="High"
              opacity={0.5}
            />
            <Line 
              type="monotone" 
              dataKey="low" 
              stroke="#EF4444" 
              strokeWidth={1}
              dot={false}
              name="Low"
              opacity={0.5}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
