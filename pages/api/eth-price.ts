import type { NextApiRequest, NextApiResponse } from 'next';

const CMC_API_KEY = process.env.COINMARKETCAP_API_KEY;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const response = await fetch(
      'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=ETH',
      {
        headers: {
          'X-CMC_PRO_API_KEY': CMC_API_KEY || '',
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch ETH price');
    }

    const data = await response.json();
    const ethPrice = data.data.ETH.quote.USD.price;
    
    res.status(200).json({ ethereum: { usd: ethPrice } });
  } catch (error) {
    console.error('Error fetching ETH price:', error);
    res.status(500).json({ error: 'Failed to fetch ETH price' });
  }
} 