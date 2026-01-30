import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const month = searchParams.get('month')
  const year = searchParams.get('year') || '2025'

  try {
    let query = supabase
      .from('g20_volumeandcapture')
      .select('*')
      .order('Date', { ascending: false })

    // Filter by month if provided
    if (month) {
      const monthNum = String(parseInt(month)).padStart(2, '0')
      const startDate = `${year}-${monthNum}-01`
      
      // Calculate last day of month
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate()
      const endDate = `${year}-${monthNum}-${String(lastDay).padStart(2, '0')}`
      
      query = query
        .gte('Date', startDate)
        .lte('Date', endDate)
    }

    const { data, error } = await query

    if (error) {
      console.error('Supabase error:', error)
      throw error
    }

    if (!data || data.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        summary: {
          total_near_volume: 0,
          total_g20_volume: 0,
          average_capture: '0.00',
          record_count: 0
        }
      })
    }

    // Calculate aggregates using exact column names
    const totals = data.reduce((acc, row) => ({
      total_near_vol: acc.total_near_vol + Number(row.near_aggregate_vol || 0),
      total_g20_vol: acc.total_g20_vol + Number(row.G20_aggregate_volumes || 0),
      avg_capture: acc.avg_capture + Number(row.G20_Trading_Volume_Capture || 0)
    }), { total_near_vol: 0, total_g20_vol: 0, avg_capture: 0 })

    const avgCapture = data.length > 0 
      ? (totals.avg_capture / data.length).toFixed(2) 
      : '0.00'

    return NextResponse.json({
      success: true,
      data,
      summary: {
        total_near_volume: totals.total_near_vol,
        total_g20_volume: totals.total_g20_vol,
        average_capture: avgCapture,
        record_count: data.length
      }
    })
  } catch (error: any) {
    console.error('Error fetching G20 data:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
