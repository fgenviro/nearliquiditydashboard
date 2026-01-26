import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    console.log('📊 Fetching manifold reports...');
    
    const { data: reports, error } = await supabase
      .from('manifold_reports')
      .select('*')
      .order('start_date', { ascending: false });

    if (error) {
      console.error('❌ Supabase error:', error);
      return NextResponse.json({ 
        error: error.message,
        reports: [],
        count: 0 
      }, { status: 500 });
    }

    console.log(`✅ Fetched ${reports?.length || 0} reports`);
    
    return NextResponse.json({ 
      reports: reports || [],
      count: reports?.length || 0 
    });
  } catch (error) {
    console.error('❌ API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      reports: [],
      count: 0
    }, { status: 500 });
  }
}
