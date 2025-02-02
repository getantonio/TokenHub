import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const response = await fetch(
      'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=ETH&convert=USD',
      {
        headers: {
          'X-CMC_PRO_API_KEY': process.env.COINMARKETCAP_API_KEY || ''
        }
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch from CoinMarketCap');
    }
    
    const data = await response.json();
    const ethPrice = data.data.ETH.quote.USD.price;
    
    res.status(200).json({ price: ethPrice });
  } catch (error) {
    console.error('Failed to fetch ETH price:', error);
    res.status(500).json({ error: 'Failed to fetch ETH price' });
  }
} 