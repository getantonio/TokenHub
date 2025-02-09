import { useCallback } from 'react';
import { parseEther } from 'viem';
import { usePublicClient, useWalletClient, useChainId } from 'wagmi';
import TokenFactoryV3ABI from '@/contracts/abi/TokenFactory_v3.json';
import { FACTORY_ADDRESSES } from '@/config/contracts';
import { ChainId } from '@/types/chain';
import { Abi } from 'viem';

export type CreateTokenParams = {
  name: string;
  symbol: string;
  initialSupply: bigint;
  maxSupply: bigint;
  owner: `0x${string}`;
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
  wallets: Array<{
    name: string;
    address: `0x${string}`;
    percentage: number;
  }>;
};

export const useTokenFactory = () => {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const chainId = useChainId() as ChainId;

  const createToken = async (params: CreateTokenParams) => {
    try {
      if (!publicClient) throw new Error('Public client not available');
      if (!chainId) throw new Error('Chain ID not available');
      if (!walletClient) throw new Error('Wallet client not available');

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

      // Get the factory address for the current chain
      const factoryAddress = FACTORY_ADDRESSES['v3'][chainId] as `0x${string}` | undefined;
      console.log('Factory address for chain', chainId, ':', factoryAddress);
      
      if (!factoryAddress) {
        throw new Error(`Token Factory v3 not deployed on network ${chainId}`);
      }

      const deploymentFee = await publicClient.readContract({
        address: factoryAddress,
        abi: TokenFactoryV3ABI.abi as Abi,
        functionName: 'deploymentFee',
      }) as bigint;

      console.log('Deployment Fee:', deploymentFee.toString());
      console.log('Creating token with params:', {
        ...params,
        initialSupply: params.initialSupply.toString(),
        maxSupply: params.maxSupply.toString(),
        presaleRate: params.presaleRate.toString(),
        minContribution: params.minContribution.toString(),
        maxContribution: params.maxContribution.toString(),
        presaleCap: params.presaleCap.toString(),
        startTime: params.startTime.toString(),
        endTime: params.endTime.toString()
      });

      // Convert wallets array to WalletAllocation array
      const walletAllocations = params.wallets.map(wallet => ({
        wallet: wallet.address,
        percentage: wallet.percentage
      }));

      // Log wallet information for debugging
      console.log('Using wallet allocations:', walletAllocations);

      // Structure the parameters according to the InitParams struct
      const { request } = await publicClient.simulateContract({
        address: factoryAddress,
        abi: TokenFactoryV3ABI.abi as Abi,
        functionName: 'createToken',
        args: [{
          name: params.name,
          symbol: params.symbol,
          initialSupply: params.initialSupply,
          maxSupply: params.maxSupply,
          owner: params.owner,
          enableBlacklist: params.enableBlacklist,
          enableTimeLock: params.enableTimeLock,
          presaleRate: params.presaleRate,
          minContribution: params.minContribution,
          maxContribution: params.maxContribution,
          presaleCap: params.presaleCap,
          startTime: params.startTime,
          endTime: params.endTime,
          presalePercentage: params.presalePercentage,
          liquidityPercentage: params.liquidityPercentage,
          liquidityLockDuration: params.liquidityLockDuration,
          walletAllocations: walletAllocations
        }],
        value: deploymentFee,
      });

      const hash = await walletClient.writeContract(request);
      return hash;

    } catch (error) {
      console.error('Error in createToken:', error);
      throw error;
    }
  };

  return { createToken };
};