import { NextApiRequest, NextApiResponse } from 'next';
import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';
import SplitTokenABI from '@/contracts/abi/SplitToken.json';

const client = createPublicClient({
  chain: mainnet,
  transport: http()
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { address, tokenAddress } = req.query;

  if (!address || !tokenAddress || Array.isArray(address) || Array.isArray(tokenAddress)) {
    return res.status(400).json({ error: 'Invalid parameters' });
  }

  try {
    const balance = await client.readContract({
      address: tokenAddress as `0x${string}`,
      abi: SplitTokenABI.abi,
      functionName: 'balanceOf',
      args: [address as `0x${string}`]
    }) as bigint;

    return res.status(200).json({ balance: balance.toString() });
  } catch (error) {
    console.error('Error fetching balance:', error);
    return res.status(500).json({ error: 'Failed to fetch balance' });
  }
} 