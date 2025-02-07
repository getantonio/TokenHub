import { useState } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { useWriteContract } from 'wagmi';
import type { Abi } from 'viem';
import TokenFactoryV3ABI from '@/contracts/abi/TokenFactory_v3.json';
import { FACTORY_ADDRESSES } from '@/config/contracts';
import { ChainId } from '@/types/chain';

interface CreateTokenParams {
  name: string;
  symbol: string;
  initialSupply: bigint;
  maxSupply: bigint;
  owner: string;
  enableBlacklist: boolean;
  enableTimeLock: boolean;
  presaleRate: bigint;
  minContribution: bigint;
  maxContribution: bigint;
  presaleCap: bigint;
  startTime: bigint;
  endTime: bigint;
  presalePercentage: number;
  liquidityPercentage: number;
  liquidityLockDuration: number;
}

export const useTokenFactory = (version: 'v3') => {
  const { address } = useAccount();
  const chainId = useChainId();
  const [error, setError] = useState<string | null>(null);
  const [isWaiting, setIsWaiting] = useState(false);

  const factoryAddress = FACTORY_ADDRESSES[version][chainId || 0];

  const { writeContract, isPending: isLoading } = useWriteContract();

  const createToken = async (params: CreateTokenParams) => {
    try {
      // Log network info
      const networkName = chainId === ChainId.OPTIMISM_SEPOLIA ? 'Optimism Sepolia' :
                         chainId === ChainId.SEPOLIA ? 'Sepolia' :
                         chainId === ChainId.ARBITRUM_SEPOLIA ? 'Arbitrum Sepolia' :
                         chainId === ChainId.POLYGON_AMOY ? 'Polygon Amoy' : 'Unknown Network';
      
      console.log('Network:', networkName, '(Chain ID:', chainId, ')');
      console.log('Factory Address:', factoryAddress);
      console.log('Using Version:', version);
      
      if (!address) {
        throw new Error('Wallet not connected');
      }

      if (!factoryAddress || factoryAddress === '0x0000000000000000000000000000000000000000') {
        throw new Error(`Token Factory V3 not deployed on ${networkName}. Please switch to Optimism Sepolia.`);
      }

      const result = await writeContract({
        address: factoryAddress as `0x${string}`,
        abi: TokenFactoryV3ABI.abi as unknown as Abi,
        functionName: 'createToken',
        args: [params],
        value: BigInt('100000000000000') // 0.0001 ETH deployment fee
      });

      console.log('Transaction Result:', result);
      
      setIsWaiting(true);
      await new Promise(resolve => setTimeout(resolve, 2000));
      setIsWaiting(false);
      
      return result;
    } catch (err) {
      console.error('Error in useTokenFactory:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create token';
      setError(errorMessage);
      throw err;
    }
  };

  return {
    createToken,
    isLoading: isLoading || isWaiting,
    error
  };
}; 