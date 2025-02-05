import { useState } from 'react';
import { type BigNumberish } from 'ethers';
import { useAccount, useChainId } from 'wagmi';
import { useWriteContract } from 'wagmi';
import type { Abi } from 'viem';
import { getAddress } from 'viem';
import TokenFactoryV3ABI from '@/contracts/abi/TokenFactory_v3.0.0.json';
import { FACTORY_ADDRESSES } from '@/config/contracts';

interface CreateTokenParams {
  name: string;
  symbol: string;
  initialSupply: bigint;
  maxSupply: bigint;
  enableBlacklist?: boolean;
  enableTimeLock?: boolean;
  vestingAmounts?: bigint[];
  vestingPeriods?: number[];
  beneficiaries?: string[];
}

export const useTokenFactory = (version: 'v3') => {
  const { address } = useAccount();
  const chainId = useChainId();
  const [error, setError] = useState<string | null>(null);

  const factoryAddress = FACTORY_ADDRESSES[version][chainId || 0];

  const { writeContract, isPending: isLoading } = useWriteContract();

  const createToken = async (params: CreateTokenParams) => {
    try {
      setError(null);
      
      if (!address) {
        throw new Error('Please connect your wallet');
      }

      if (!chainId) {
        throw new Error('Please connect to a supported network');
      }

      if (!factoryAddress) {
        throw new Error('Token Factory not deployed on this network');
      }

      if (!writeContract) {
        throw new Error('Contract write not available');
      }

      const hash = await writeContract({
        address: getAddress(factoryAddress),
        abi: TokenFactoryV3ABI.abi as unknown as Abi,
        functionName: 'createToken',
        args: [
          params.name,
          params.symbol,
          params.initialSupply,
          params.maxSupply,
          params.vestingAmounts,
          params.vestingPeriods,
          params.beneficiaries
        ],
      });

      // Note: In wagmi v2, we don't need to wait for the transaction
      // as it's handled by the hook internally
    } catch (err) {
      console.error('Error creating token:', err);
      setError(err instanceof Error ? err.message : 'Failed to create token');
      throw err;
    }
  };

  return {
    createToken,
    isLoading,
    error
  };
}; 