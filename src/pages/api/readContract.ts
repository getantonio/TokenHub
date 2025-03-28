import type { NextApiRequest, NextApiResponse } from 'next';
import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';
import { LENDING_POOL_ABI, ERC20_ABI } from '@/contracts/defi/abis';

// Mock data for development
const mockData = {
  // Lending pool data
  asset: '0x1234567890123456789012345678901234567890',
  name: 'USDC Lending Pool',
  symbol: 'lUSDC',
  totalAssets: BigInt(100000000000),
  totalBorrowed: BigInt(50000000000),
  collateralFactorBps: BigInt(7500),
  reserveFactorBps: BigInt(1000),
  reserveBalance: BigInt(1000000000),
  // ERC20 data
  decimals: 6,
};

// Create public client for reading contract data
const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(process.env.NEXT_PUBLIC_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/demo'),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { address, functionName } = req.query;

  if (!address || !functionName) {
    return res.status(400).json({ error: 'Missing address or functionName' });
  }

  // For development, return mock data
  if (process.env.NODE_ENV === 'development') {
    // @ts-ignore
    return res.status(200).json({ data: mockData[functionName as string] || null });
  }

  // In production, we would actually call the contract
  try {
    const isERC20Function = ['decimals', 'balanceOf', 'symbol', 'name', 'totalSupply'].includes(functionName as string);
    const abi = isERC20Function ? ERC20_ABI : LENDING_POOL_ABI;

    const data = await publicClient.readContract({
      address: address as `0x${string}`,
      abi,
      functionName: functionName as string,
    });

    return res.status(200).json({ data });
  } catch (error: any) {
    console.error('Error reading contract:', error);
    return res.status(500).json({ error: error.message });
  }
} 