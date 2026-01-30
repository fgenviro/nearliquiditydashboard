import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    console.log('🔍 G20 Metrics API route called')

    // Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase credentials')
      return NextResponse.json(
        { success: false, error: 'Supabase credentials not configured' },
        { status: 500 }
      )
    }

    console.log('✅ Supabase credentials found')

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Fetch data
    console.log('📊 Fetching from g20_volumeandcapture...')
    
    const { data, error } = await supabase
      .from('g20_volumeandcapture')
      .select('*')
      .order('date', { ascending: false })

    if (error) {
      console.error('❌ Supabase error:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    console.log(`✅ Fetched ${data?.length || 0} records`)

    return NextResponse.json({
      success: true,
      data: data || [],
      count: data?.length || 0
    })

  } catch (error: any) {
    console.error('❌ API Route error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Unknown error' },
      { status: 500 }
    )
  }
}
