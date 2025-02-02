import { NextApiRequest, NextApiResponse } from 'next';

const RPC_URLS = {
  'sepolia': 'https://rpc.sepolia.org',
  'arbitrum-sepolia': 'https://sepolia-rollup.arbitrum.io/rpc',
  'op-sepolia': 'https://sepolia.optimism.io',
  'polygon-amoy': 'https://rpc.amoy.testnet.polygon.com'
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { network } = req.query;
  const rpcUrl = RPC_URLS[network as keyof typeof RPC_URLS];

  if (!rpcUrl) {
    return res.status(400).json({ error: 'Invalid network' });
  }

  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error('RPC proxy error:', error);
    res.status(500).json({ error: 'Failed to proxy RPC request' });
  }
} 