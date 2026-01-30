import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role key for admin access
)

async function importData() {
  const data = [
    {
      date: '2025-02-20',
      near_aggregate_vol: 180000000,
      g20_aggregate_volumes: 10460000,
      g20_trading_volume_capture: 5.80
    },
    {
      date: '2025-07-24',
      near_aggregate_vol: 97000000,
      g20_aggregate_volumes: 7342900,
      g20_trading_volume_capture: 7.60
    },
    {
      date: '2025-06-14',
      near_aggregate_vol: 36000000,
      g20_aggregate_volumes: 5730000,
      g20_trading_volume_capture: 15.90
    },
    {
      date: '2025-02-12',
      near_aggregate_vol: 202000000,
      g20_aggregate_volumes: 9473800,
      g20_trading_volume_capture: 4.70
    },
    {
      date: '2025-09-27',
      near_aggregate_vol: 36000000,
      g20_aggregate_volumes: 7390000,
      g20_trading_volume_capture: 20.40
    }
  ]

  const { data: result, error } = await supabase
    .from('g20_metrics')
    .insert(data)

  if (error) {
    console.error('Error importing data:', error)
  } else {
    console.log('✅ Successfully imported', result.length, 'rows')
  }
}

importData()
