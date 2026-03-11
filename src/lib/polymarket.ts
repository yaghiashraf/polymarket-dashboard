'use server';

export async function getMarket(slug: string) {
  const res = await fetch(`https://gamma-api.polymarket.com/markets?slug=${slug}&limit=1`, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error('Failed to fetch market data');
  }
  const data = await res.json();
  return data[0];
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
