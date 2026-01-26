import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const apiKey = process.env.COINALYZE_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Coinalyze API key not configured' },
      { status: 500 }
    );
  }

  try {
    // Fetch data for both exchanges
    const symbols = [
      'NEARUSDT_PERP.A',  // Binance
      'NEARUSDT_PERP.4',  // Bybit
    ];

    const requests = symbols.map(symbol =>
      fetch(
        `https://api.coinalyze.net/v1/long-short-ratio?api_key=${apiKey}&symbols=${symbol}`,
        { next: { revalidate: 60 } }
      )
    );

    const responses = await Promise.all(requests);
    const data = await Promise.all(responses.map(r => r.json()));

    // Format the data
    const formattedData = data.map((item, index) => {
      if (!item[0] || !item[0].long_rate || !item[0].short_rate) {
        return {
          exchange: index === 0 ? 'binance' : 'bybit',
          symbol: 'BTCUSDT',
          longRatio: 50,
          shortRatio: 50,
          timestamp: Date.now(),
        };
      }

      const longRate = parseFloat(item[0].long_rate);
      const shortRate = parseFloat(item[0].short_rate);
      const total = longRate + shortRate;

      return {
        exchange: index === 0 ? 'binance' : 'bybit',
        symbol: 'BTCUSDT',
        longRatio: (longRate / total) * 100,
        shortRatio: (shortRate / total) * 100,
        timestamp: item[0].t * 1000,
      };
    });

    return NextResponse.json(formattedData);
  } catch (error) {
    console.error('Coinalyze API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch long/short ratio data' },
      { status: 500 }
    );
  }
}
