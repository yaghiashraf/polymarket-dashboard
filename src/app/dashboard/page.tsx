'use client';

import { useState } from 'react';
import useSWR from 'swr';
import dynamic from 'next/dynamic';
import { getMarket, getCandles, getRecentTrades } from '@/lib/polymarket';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

const CURATED_MARKETS = [
  { slug: 'when-will-bitcoin-hit-150k', title: 'When will Bitcoin hit $150k?' },
  { slug: 'microstrategy-sells-any-bitcoin-by-december-31-2026', title: 'MicroStrategy sells Bitcoin by 2026?' },
  { slug: 'presidential-election-winner-2028', title: 'Presidential Election Winner 2028' },
  { slug: 'will-trump-resign-by-december-31-2026', title: 'Will Trump resign by Dec 2026?' },
  { slug: 'trump-eliminates-capital-gains-tax-on-crypto-in-2025', title: 'Trump cuts crypto capital gains tax?' },
  { slug: 'uk-election-called-by', title: 'UK Election called by...?' },
  { slug: 'will-trump-meet-with-putin-again-by', title: 'Will Trump meet Putin again by...?' }
];

export default function DashboardPage() {
  const [slug, setSlug] = useState(CURATED_MARKETS[0].slug);
  const [customSlug, setCustomSlug] = useState('');
  const [isCustom, setIsCustom] = useState(false);

  const activeSlug = isCustom ? customSlug : slug;

  const fetcher = async () => {
    if (!activeSlug) return null;
    const market = await getMarket(activeSlug);
    if (!market) throw new Error('Market not found');
    
    const outcomes = JSON.parse(market.outcomes || '[]');
    const tokenIds = JSON.parse(market.clobTokenIds || '[]');
    const prices = JSON.parse(market.outcomePrices || '[]');

    const yesIndex = outcomes.indexOf('Yes');
    if (yesIndex === -1) throw new Error('Yes token not found in market');
    
    const yesTokenId = tokenIds[yesIndex];
    market.yesPrice = parseFloat(prices[yesIndex] || '0');
    
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

  const { data, error, isLoading } = useSWR(`dashboard-${activeSlug}`, fetcher, { 
    refreshInterval: 30000,
    revalidateOnFocus: false
  });

  const handleDropdownChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value === 'custom') {
      setIsCustom(true);
    } else {
      setIsCustom(false);
      setSlug(e.target.value);
    }
  };

  return (
    <div className="min-h-screen bg-[#0E1114] text-gray-100 font-sans selection:bg-blue-500/30">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0E1114]/90 backdrop-blur-md border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]">
              P
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">PolyDash</h1>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <select 
              className="bg-[#1C2025] border border-gray-700 hover:border-gray-600 text-sm rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all w-full sm:w-72 shadow-sm appearance-none cursor-pointer"
              value={isCustom ? 'custom' : slug}
              onChange={handleDropdownChange}
              style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: `right .5rem center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.5em 1.5em`, paddingRight: `2.5rem` }}
            >
              <optgroup label="Curated Markets">
                {CURATED_MARKETS.map(m => (
                  <option key={m.slug} value={m.slug}>{m.title}</option>
                ))}
              </optgroup>
              <option value="custom">Custom Slug...</option>
            </select>
            
            {isCustom && (
              <input 
                type="text" 
                value={customSlug}
                onChange={(e) => setCustomSlug(e.target.value)}
                className="bg-[#1C2025] border border-blue-500/50 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64 transition-all"
                placeholder="Paste market slug..."
                autoFocus
              />
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6">
            Failed to load dashboard: {error.message}. Please check the slug.
          </div>
        )}
        
        {isLoading || !data ? (
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
            <p className="text-gray-400 text-sm animate-pulse">Syncing market data...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column - Stats & Image */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-[#1C2025] p-6 rounded-2xl border border-gray-800/60 shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                
                <div className="flex items-start justify-between mb-4">
                  {data.market.icon && (
                    <img src={data.market.icon} alt="Market icon" className="w-12 h-12 rounded-lg border border-gray-700/50 shadow-md" />
                  )}
                  {data.market.active ? (
                    <span className="bg-green-500/10 text-green-400 text-xs px-2.5 py-1 rounded-full font-medium border border-green-500/20">Active</span>
                  ) : (
                    <span className="bg-gray-500/10 text-gray-400 text-xs px-2.5 py-1 rounded-full font-medium border border-gray-500/20">Closed</span>
                  )}
                </div>

                <h2 className="text-xl font-bold mb-4 leading-snug text-gray-50">{data.market.question || data.market.title}</h2>
                
                {data.market.endDate && (
                  <p className="text-sm text-gray-400 mb-6 flex items-center gap-2">
                    <svg className="w-4 h-4 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                    Resolves: {new Date(data.market.endDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                  </p>
                )}
                
                <div className="space-y-5 mt-8">
                  <div>
                    <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold block mb-1">Current "Yes" Odds</span>
                    <div className="flex items-baseline gap-2">
                      <span className="font-bold text-5xl text-white tracking-tight">{(data.market.yesPrice * 100).toFixed(1)}<span className="text-3xl text-gray-400 ml-0.5">¢</span></span>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-gray-800">
                    <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold block mb-1">Market Volume</span>
                    <span className="font-medium text-xl text-gray-200">${Number(data.market.volume || 0).toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                  </div>
                </div>
              </div>

              {/* Order Book / Trades */}
              <div className="bg-[#1C2025] rounded-2xl border border-gray-800/60 shadow-xl overflow-hidden flex flex-col h-[400px]">
                <div className="p-4 border-b border-gray-800 bg-[#1C2025]/80 backdrop-blur-sm z-10">
                  <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Recent Fills</h3>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                  {(data.trades && (Array.isArray(data.trades) ? data.trades : data.trades.trades || []).length > 0) ? (
                    <table className="w-full text-sm text-left">
                      <thead className="sticky top-0 bg-[#1C2025] z-10">
                        <tr className="text-gray-500 text-xs uppercase tracking-wider">
                          <th className="px-3 py-2 font-medium">Price</th>
                          <th className="px-3 py-2 font-medium">Shares</th>
                          <th className="px-3 py-2 font-medium text-right">Side</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800/50">
                        {(Array.isArray(data.trades) ? data.trades : data.trades.trades).slice(0, 50).map((trade: any, i: number) => {
                          const isBuy = trade.side === 'BUY';
                          return (
                            <tr key={i} className="hover:bg-gray-800/30 transition-colors font-mono text-sm">
                              <td className="px-3 py-2.5 text-gray-200">{(Number(trade.price || 0) * 100).toFixed(1)}¢</td>
                              <td className="px-3 py-2.5 text-gray-400">{Number(trade.size || 0).toFixed(0)}</td>
                              <td className={`px-3 py-2.5 text-right font-medium ${isBuy ? 'text-[#00C853]' : 'text-[#FF3B69]'}`}>
                                {isBuy ? 'BUY' : 'SELL'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <div className="text-gray-500 text-sm h-full flex items-center justify-center">No recent trades found</div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Charts */}
            <div className="lg:col-span-8 space-y-6">
              <div className="bg-[#1C2025] p-6 rounded-2xl border border-gray-800/60 shadow-xl h-[480px] flex flex-col relative">
                <div className="absolute top-6 right-6 flex items-center gap-2 z-10">
                   <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                   <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Live</span>
                </div>
                <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Odds History</h3>
                <div className="flex-1 min-h-0 relative -mx-2">
                  <Plot
                    data={[
                      {
                        x: (Array.isArray(data.candles) ? data.candles : (data.candles?.history || [])).map((c: any) => new Date((c.t || c.timestamp || 0) * (c.t ? 1000 : 1))),
                        y: (Array.isArray(data.candles) ? data.candles : (data.candles?.history || [])).map((c: any) => (c.p || c.close || 0) * 100),
                        type: 'scatter',
                        mode: 'lines',
                        line: { color: '#2563EB', width: 2, shape: 'spline' },
                        fill: 'tozeroy',
                        fillcolor: 'rgba(37, 99, 235, 0.1)',
                      }
                    ]}
                    layout={{
                      autosize: true,
                      margin: { l: 40, r: 10, t: 10, b: 30 },
                      xaxis: { fixedrange: false, gridcolor: '#2A2E33', tickcolor: '#4B5563', tickfont: { color: '#9CA3AF' } },
                      yaxis: { fixedrange: false, gridcolor: '#2A2E33', tickcolor: '#4B5563', tickfont: { color: '#9CA3AF' }, ticksuffix: '¢' },
                      paper_bgcolor: 'transparent',
                      plot_bgcolor: 'transparent',
                      hovermode: 'x unified',
                      hoverlabel: { bgcolor: '#1C2025', bordercolor: '#374151', font: { color: '#fff' } }
                    }}
                    useResizeHandler={true}
                    style={{ width: '100%', height: '100%', position: 'absolute' }}
                    config={{ displayModeBar: false, responsive: true }}
                  />
                </div>
              </div>

              <div className="bg-[#1C2025] p-6 rounded-2xl border border-gray-800/60 shadow-xl h-[300px] flex flex-col">
                <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Volume History</h3>
                <div className="flex-1 min-h-0 relative -mx-2">
                  <Plot
                    data={[
                      {
                        x: (Array.isArray(data.candles) ? data.candles : (data.candles?.history || [])).map((c: any) => new Date((c.t || c.timestamp || 0) * (c.t ? 1000 : 1))),
                        y: (Array.isArray(data.candles) ? data.candles : (data.candles?.history || [])).map((c: any) => c.v || c.volume || 0),
                        type: 'bar',
                        marker: { color: '#374151', line: { color: '#4B5563', width: 1 } },
                        hoverinfo: 'y'
                      }
                    ]}
                    layout={{
                      autosize: true,
                      margin: { l: 40, r: 10, t: 10, b: 30 },
                      xaxis: { fixedrange: false, gridcolor: '#2A2E33', tickcolor: '#4B5563', tickfont: { color: '#9CA3AF' } },
                      yaxis: { fixedrange: false, gridcolor: '#2A2E33', tickcolor: '#4B5563', tickfont: { color: '#9CA3AF' } },
                      paper_bgcolor: 'transparent',
                      plot_bgcolor: 'transparent',
                      bargap: 0.2
                    }}
                    useResizeHandler={true}
                    style={{ width: '100%', height: '100%', position: 'absolute' }}
                    config={{ displayModeBar: false, responsive: true }}
                  />
                </div>
              </div>
            </div>
            
          </div>
        )}
      </main>
      
      {/* Global styles injected for the scrollbar to make it look native and premium */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #374151;
          border-radius: 20px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: #4B5563;
        }
      `}} />
    </div>
  );
}
