'use client'

import { useState, useMemo } from 'react'
import { DollarSign, TrendingUp, Activity, BarChart3 } from 'lucide-react'
import { LiquiditySnapshot } from '@/lib/supabase'

interface StatsCardsProps {
  snapshots: LiquiditySnapshot[]
}

export default function StatsCards({ snapshots }: StatsCardsProps) {
  const [selectedDate, setSelectedDate] = useState<string>('most-recent')

  // Extract unique dates from snapshots
  const availableDates = useMemo(() => {
    const dates = snapshots.map(s => {
      const date = new Date(s.timestamp)
      return date.toISOString().split('T')[0] // YYYY-MM-DD format
    })
    return [...new Set(dates)].sort().reverse() // Unique dates, newest first
  }, [snapshots])

  // Get the snapshot to display based on selected date
  const displaySnapshot = useMemo(() => {
    if (snapshots.length === 0) return null

    if (selectedDate === 'most-recent') {
      // Get the most recent snapshot
      return snapshots.reduce((latest, current) => {
        return new Date(current.timestamp) > new Date(latest.timestamp) ? current : latest
      })
    } else {
      // Get the most recent snapshot for the selected date
      const dateSnapshots = snapshots.filter(s => {
        const snapshotDate = new Date(s.timestamp).toISOString().split('T')[0]
        return snapshotDate === selectedDate
      })
      
      if (dateSnapshots.length === 0) return null
      
      return dateSnapshots.reduce((latest, current) => {
        return new Date(current.timestamp) > new Date(latest.timestamp) ? current : latest
      })
    }
  }, [snapshots, selectedDate])

  if (snapshots.length === 0) {
    return (
      <div className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-gray-800 rounded-xl p-6 border border-gray-700 animate-pulse">
              <div className="h-4 bg-gray-700 rounded w-1/2 mb-4"></div>
              <div className="h-8 bg-gray-700 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!displaySnapshot) {
    return (
      <div className="mb-8">
        <div className="flex justify-end mb-4">
          <div className="flex items-center gap-2">
            <label htmlFor="stats-date-filter" className="text-sm text-gray-400">
              View:
            </label>
            <select
              id="stats-date-filter"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="most-recent">Most Recent Snapshot</option>
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
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <p className="text-gray-400 text-center">No data available for selected date.</p>
        </div>
      </div>
    )
  }

  const stats = [
    {
      label: 'Mid Price',
      value: `$${displaySnapshot.mid_price.toFixed(4)}`,
      icon: DollarSign,
      color: 'text-green-400',
      bgColor: 'bg-green-400/10'
    },
    {
      label: 'Spread',
      value: `${displaySnapshot.spread_bps.toFixed(2)} bps`,
      icon: TrendingUp,
      color: 'text-blue-400',
      bgColor: 'bg-blue-400/10'
    },
    {
      label: '50bps Depth',
      value: `$${(displaySnapshot.total_50bps / 1000).toFixed(0)}k`,
      icon: Activity,
      color: 'text-purple-400',
      bgColor: 'bg-purple-400/10'
    },
    {
      label: '2% Depth',
      value: `$${(displaySnapshot.total_2pct / 1000).toFixed(0)}k`,
      icon: BarChart3,
      color: 'text-orange-400',
      bgColor: 'bg-orange-400/10'
    }
  ]

  return (
    <div className="mb-8">
      {/* Dropdown Filter */}
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-gray-400">
          {selectedDate === 'most-recent' ? (
            <span>Last updated: {new Date(displaySnapshot.timestamp).toLocaleString()}</span>
          ) : (
            <span>Snapshot from: {new Date(displaySnapshot.timestamp).toLocaleString()}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="stats-date-filter" className="text-sm text-gray-400">
            View:
          </label>
          <select
            id="stats-date-filter"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="most-recent">Most Recent Snapshot</option>
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

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <div key={index} className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-gray-600 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <h3 className="text-gray-400 text-sm font-medium">{stat.label}</h3>
              </div>
              <p className="text-3xl font-bold text-white">{stat.value}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
