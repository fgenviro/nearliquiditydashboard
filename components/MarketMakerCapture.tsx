'use client'

interface MarketMaker {
  name: string
  capture: string | number
  isPending?: boolean
}

export default function MarketMakerCapture() {
  const marketMakers: MarketMaker[] = [
    { name: 'G20', capture: 0.46 },
    { name: 'Manifold', capture: 10 },
    { name: 'IMC', capture: 4.1}
  ]

  const formatCapture = (capture: string | number) => {
    if (typeof capture === 'number') {
      return `${capture}%`
    }
    return capture
  }

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <h2 className="text-2xl font-bold text-white mb-6">Market Maker Capture</h2>
      

      
      <div className="space-y-4">
        {marketMakers.map((mm) => (
          <div 
            key={mm.name}
            className="flex items-center justify-between p-4 bg-gray-700 rounded-lg hover:bg-gray-650 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                {mm.name.substring(0, 2).toUpperCase()}
              </div>
              <span className="text-white font-semibold text-lg">{mm.name}</span>
            </div>
            
            <div className="flex items-center gap-2">
              {mm.isPending ? (
                <span className="px-4 py-2 bg-yellow-900/30 text-yellow-400 rounded-lg text-sm font-medium border border-yellow-700">
                  {mm.capture}
                </span>
              ) : (
                <span className="text-2xl font-bold text-green-400">
                  {formatCapture(mm.capture)}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-gray-700/50 rounded-lg border border-gray-600">
        <p className="text-sm text-gray-400">
          <span className="font-semibold text-gray-300">Market Maker Capture</span> represents the percentage of total trading volume captured by each market maker for NEAR/USDT on Binance.
        </p>
      </div>
    </div>
  )
}
