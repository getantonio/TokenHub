import { useCallback } from 'react';
import { parseEther } from 'viem';
import { usePublicClient, useWalletClient, useChainId } from 'wagmi';
import TokenFactoryV3ABI from '@/contracts/abi/TokenFactory_v3.json';
import { FACTORY_ADDRESSES } from '@/config/contracts';
import { ChainId } from '@/types/chain';
import { Abi, PublicClient, WalletClient } from 'viem';
import { FACTORY_ABI } from '@/contracts/abi/TokenFactory_v2_DirectDEX_TwoStep';
import { BrowserProvider } from 'ethers';
import { Contract } from 'ethers';
import { getNetworkContractAddress } from '@/config/contracts';

interface TokenParams {
  name: string;
  symbol: string;
  initialSupply: bigint;
  maxSupply: bigint;
  owner: `0x${string}`;
  enableBlacklist: boolean;
  enableTimeLock: boolean;
  presaleRate: bigint;
  softCap: bigint;
  hardCap: bigint;
  minContribution: bigint;
  maxContribution: bigint;
  startTime: bigint;
  endTime: bigint;
  presalePercentage: number;
  liquidityPercentage: number;
  liquidityLockDuration: number;
  wallets: {
    name: string;
    address: `0x${string}`;
    percentage: number;
    vestingEnabled: boolean;
    vestingDuration: number;
    cliffDuration: number;
    vestingStartTime: bigint;
  }[];
}

export function useTokenFactory() {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const chainId = useChainId() as ChainId;

  const createToken = async (params: TokenParams) => {
    if (!publicClient || !chainId || !walletClient) {
      throw new Error('Wallet not connected');
    }

    const factoryAddress = getNetworkContractAddress(Number(chainId), 'dexListingFactory');
    if (!factoryAddress) {
      throw new Error('Factory not deployed on this network');
    }

    try {
      // Get listing fee
      const listingFee = await publicClient.readContract({
        address: factoryAddress as `0x${string}`,
        abi: FACTORY_ABI,
        functionName: 'listingFee',
      }) as bigint;

      console.log('Listing Fee:', listingFee.toString());

      // Validate percentages
      const totalPercentage = params.presalePercentage + params.liquidityPercentage + 
        params.wallets.reduce((sum, wallet) => sum + wallet.percentage, 0);
      
      if (totalPercentage !== 100) {
        throw new Error('Total percentage must equal 100%');
      }

      // Only validate that presale and liquidity percentages are greater than 0
      if (params.presalePercentage <= 0) throw new Error('Presale percentage must be greater than 0');
      if (params.liquidityPercentage <= 0) throw new Error('Liquidity percentage must be greater than 0');

      // Validate wallet addresses and percentages
      for (const wallet of params.wallets) {
        if (!wallet.address || wallet.address === '0x0000000000000000000000000000000000000000') {
          throw new Error(`Invalid wallet address for "${wallet.name}"`);
        }
        if (wallet.percentage <= 0) {
          throw new Error(`Percentage for "${wallet.name}" must be greater than 0`);
        }
      }

      // Safe logging of parameters
      const logParams = {
        name: params.name,
        symbol: params.symbol,
        initialSupply: params.initialSupply?.toString() || '0',
        maxSupply: params.maxSupply?.toString() || '0',
        presaleRate: params.presaleRate?.toString() || '0',
        minContribution: params.minContribution?.toString() || '0',
        maxContribution: params.maxContribution?.toString() || '0',
        startTime: params.startTime?.toString() || '0',
        endTime: params.endTime?.toString() || '0',
        presalePercentage: params.presalePercentage,
        liquidityPercentage: params.liquidityPercentage,
        liquidityLockDuration: params.liquidityLockDuration,
        wallets: params.wallets.map(w => ({
          name: w.name,
          address: w.address,
          percentage: w.percentage
        }))
      };
      console.log('Creating token with params:', logParams);

      // Create the contract request
      const { request } = await publicClient.simulateContract({
        address: factoryAddress as `0x${string}`,
        abi: FACTORY_ABI,
        functionName: 'createToken',
        args: [params],
        value: listingFee,
      });

      const hash = await walletClient.writeContract(request);
      return hash;
    } catch (error) {
      console.error('Error creating token:', error);
      throw error;
    }
  };

  return { createToken };
}