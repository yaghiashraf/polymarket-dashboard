const slug = 'will-joe-biden-get-coronavirus-before-the-election';

async function test() {
  const res = await fetch(`https://gamma-api.polymarket.com/markets?slug=${slug}&limit=1`);
  const data = await res.json();
  const market = data[0];
  
  if (!market) throw new Error('Market not found');
  
  const outcomes = JSON.parse(market.outcomes || '[]');
  const tokenIds = JSON.parse(market.clobTokenIds || '[]');
  const prices = JSON.parse(market.outcomePrices || '[]');

  const yesIndex = outcomes.indexOf('Yes');
  if (yesIndex === -1) throw new Error('Yes token not found in market');
  
  const yesTokenId = tokenIds[yesIndex];
  const yesPrice = parseFloat(prices[yesIndex] || '0');
  
  console.log("SUCCESS:");
  console.log("Yes Index:", yesIndex);
  console.log("Yes Token ID:", yesTokenId);
  console.log("Yes Price:", yesPrice);
}

test().catch(console.error);