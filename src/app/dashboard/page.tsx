'use client';

import { useState } from 'react';
import useSWR from 'swr';
import dynamic from 'next/dynamic';
import { getMarket, getCandles, getRecentTrades } from '@/lib/polymarket';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

export default function DashboardPage() {
  const [slug, setSlug] = useState(
    typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POLYMARKET_SLUG 
      ? process.env.NEXT_PUBLIC_POLYMARKET_SLUG 
      : 'will-trump-win-the-2024-election'
  );

  const fetcher = async () => {
    const market = await getMarket(slug);
    if (!market) throw new Error('Market not found');
    
    // Find the Yes token
    const yesToken = market.tokens?.find((t: any) => t.outcome === 'Yes');
    if (!yesToken) throw new Error('Yes token not found in market');
    const yesTokenId = yesToken.token_id;
    
    // Fetch candles and trades
    let candles: any = [];
    let trades: any = [];
    try {
      [candles, trades] = await Promise.all([
        getCandles(yesTokenId),
        getRecentTrades(yesTokenId)
      ]);
    } catch (e) {
      console.error("Failed to load full history:", e);
    }
    
    return { market, candles, trades };
  };

  const { data, error, isLoading } = useSWR(`dashboard-${slug}`, fetcher, { 
    refreshInterval: 30000,
    revalidateOnFocus: false
  });

  if (error) return <div className="p-8 text-red-500 min-h-screen bg-gray-50">Failed to load dashboard: {error.message}</div>;
  if (isLoading || !data) return <div className="p-8 min-h-screen bg-gray-50">Loading dashboard...</div>;

  const { market, candles, trades } = data;
  const yesTokenPrice = market.tokens?.find((t: any) => t.outcome === 'Yes')?.price || 0;

  // Process data for charts
  const history = Array.isArray(candles) ? candles : (candles?.history || []);
  const times = history.map((c: any) => new Date((c.t || c.timestamp || 0) * (c.t ? 1000 : 1)));
  const prices = history.map((c: any) => c.p || c.close || 0);
  const volumes = history.map((c: any) => c.v || c.volume || 0);

  const tradeList = Array.isArray(trades) ? trades : (trades?.trades || []);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 text-gray-900 font-sans">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <h1 className="text-3xl font-bold text-gray-800">Polymarket Dashboard</h1>
          <div className="flex items-center gap-2">
            <input 
              type="text" 
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
              placeholder="Market slug..."
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Stats */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-xl font-semibold mb-2 leading-tight">{market.question || market.title}</h2>
              {market.endDate && <p className="text-sm text-gray-500 mb-6">Resolves: {new Date(market.endDate).toLocaleDateString()}</p>}
              
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-gray-50 pb-3">
                  <span className="text-gray-600">"Yes" Price</span>
                  <span className="font-bold text-3xl text-blue-600">{(yesTokenPrice * 100).toFixed(1)}¢</span>
                </div>
                <div className="flex justify-between items-center pb-1">
                  <span className="text-gray-600">Total Volume</span>
                  <span className="font-medium text-lg">${Number(market.volume || 0).toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-96 overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4 text-gray-800 sticky top-0 bg-white">Latest Trades</h3>
              {tradeList.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="border-b border-gray-100 text-gray-500">
                        <th className="py-2 font-medium">Price</th>
                        <th className="py-2 font-medium">Size</th>
                        <th className="py-2 font-medium text-right">Side</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tradeList.slice(0, 50).map((trade: any, i: number) => {
                        const isBuy = trade.side === 'BUY';
                        return (
                          <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                            <td className="py-3 font-medium">${Number(trade.price || 0).toFixed(3)}</td>
                            <td className="py-3 text-gray-600">{Number(trade.size || 0).toFixed(1)}</td>
                            <td className={`py-3 text-right font-medium ${isBuy ? 'text-green-500' : 'text-red-500'}`}>{trade.side}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-gray-500 text-sm py-4 text-center">No recent trades available</div>
              )}
            </div>
          </div>

          {/* Right Column - Charts */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-[400px] flex flex-col">
              <h3 className="text-lg font-semibold mb-2 text-gray-800">"Yes" Price History</h3>
              <div className="flex-1 min-h-0 relative">
                <Plot
                  data={[
                    {
                      x: times,
                      y: prices,
                      type: 'scatter',
                      mode: 'lines',
                      line: { color: '#3b82f6', width: 2 },
                      fill: 'tozeroy',
                      fillcolor: 'rgba(59, 130, 246, 0.1)',
                    }
                  ]}
                  layout={{
                    autosize: true,
                    margin: { l: 40, r: 20, t: 10, b: 40 },
                    xaxis: { fixedrange: false, gridcolor: '#f3f4f6' },
                    yaxis: { fixedrange: false, gridcolor: '#f3f4f6', tickformat: '.2f' },
                    paper_bgcolor: 'transparent',
                    plot_bgcolor: 'transparent',
                  }}
                  useResizeHandler={true}
                  style={{ width: '100%', height: '100%', position: 'absolute' }}
                  config={{ displayModeBar: false, responsive: true }}
                />
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-[300px] flex flex-col">
              <h3 className="text-lg font-semibold mb-2 text-gray-800">Volume</h3>
              <div className="flex-1 min-h-0 relative">
                <Plot
                  data={[
                    {
                      x: times,
                      y: volumes,
                      type: 'bar',
                      marker: { color: '#93c5fd' },
                    }
                  ]}
                  layout={{
                    autosize: true,
                    margin: { l: 40, r: 20, t: 10, b: 40 },
                    xaxis: { fixedrange: false, gridcolor: '#f3f4f6' },
                    yaxis: { fixedrange: false, gridcolor: '#f3f4f6' },
                    paper_bgcolor: 'transparent',
                    plot_bgcolor: 'transparent',
                  }}
                  useResizeHandler={true}
                  style={{ width: '100%', height: '100%', position: 'absolute' }}
                  config={{ displayModeBar: false, responsive: true }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
