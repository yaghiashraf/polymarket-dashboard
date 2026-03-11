'use server';

export async function getMarket(slug: string) {
  // First try to fetch as a single market
  let res = await fetch(`https://gamma-api.polymarket.com/markets?slug=${slug}&limit=1`, { cache: 'no-store' });
  let data = await res.json();
  
  if (data && data.length > 0) {
    return data[0];
  }

  // If not found, try to fetch as an event and return the most prominent market
  res = await fetch(`https://gamma-api.polymarket.com/events?slug=${slug}&limit=1`, { cache: 'no-store' });
  data = await res.json();

  if (data && data.length > 0 && data[0].markets && data[0].markets.length > 0) {
    // Return the first active market from the event, or just the first market
    const activeMarket = data[0].markets.find((m: any) => m.active && !m.closed) || data[0].markets[0];
    
    // Some event API markets lack the parent title, so we append it for clarity
    if (activeMarket) {
        activeMarket.title = activeMarket.question || data[0].title;
    }
    return activeMarket;
  }

  throw new Error('Market or Event not found');
}

export async function getCandles(tokenId: string) {
  const res = await fetch(`https://clob.polymarket.com/prices-history?market=${tokenId}&interval=5m`, { cache: 'no-store' });
  if (!res.ok) {
    const fallbackRes = await fetch(`https://data-api.polymarket.com/v1/candles?token=${tokenId}&window=1d&interval=5m`, { cache: 'no-store' });
    if (!fallbackRes.ok) throw new Error('Failed to fetch candles');
    return fallbackRes.json();
  }
  return res.json();
}

export async function getRecentTrades(tokenId: string) {
  const res = await fetch(`https://clob.polymarket.com/trades?market=${tokenId}`, { cache: 'no-store' });
  if (!res.ok) {
    const fallbackRes = await fetch(`https://data-api.polymarket.com/v1/trades?market=${tokenId}`, { cache: 'no-store' });
    if (!fallbackRes.ok) throw new Error('Failed to fetch trades');
    return fallbackRes.json();
  }
  return res.json();
}
