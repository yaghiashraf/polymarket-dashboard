export async function getMarket(slug: string) {
  const res = await fetch(`https://gamma-api.polymarket.com/markets?slug=${slug}&limit=1`);
  if (!res.ok) {
    throw new Error('Failed to fetch market data');
  }
  const data = await res.json();
  return data[0];
}

export async function getCandles(tokenId: string) {
  const res = await fetch(`https://clob.polymarket.com/prices-history?market=${tokenId}&interval=5m`);
  if (!res.ok) {
     // fallback to data-api if clob doesn't work, though clob is the standard for prices-history
    const fallbackRes = await fetch(`https://data-api.polymarket.com/v1/candles?token=${tokenId}&window=1d&interval=5m`);
    if (!fallbackRes.ok) throw new Error('Failed to fetch candles');
    return fallbackRes.json();
  }
  return res.json();
}

export async function getRecentTrades(tokenId: string) {
  const res = await fetch(`https://clob.polymarket.com/trades?market=${tokenId}`);
  if (!res.ok) {
     // fallback to v1 trades
    const fallbackRes = await fetch(`https://data-api.polymarket.com/v1/trades?market=${tokenId}`);
    if (!fallbackRes.ok) throw new Error('Failed to fetch trades');
    return fallbackRes.json();
  }
  return res.json();
}
