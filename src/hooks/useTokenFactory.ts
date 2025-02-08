import { useCallback } from 'react';
import { parseEther } from 'viem';
import { usePublicClient, useWalletClient, useChainId } from 'wagmi';
import TokenFactoryV3ABI from '@/contracts/abi/TokenFactory_v3_clone.json';
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
  presalePercentage: bigint;
  liquidityPercentage: bigint;
  liquidityLockDuration: bigint;
  marketingWallet: `0x${string}`;
  marketingPercentage: bigint;
  teamWallet: `0x${string}`;
  teamPercentage: bigint;
};

export const useTokenFactory = () => {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const chainId = useChainId();

  const createToken = async (params: CreateTokenParams) => {
    try {
      if (!publicClient) throw new Error('Public client not available');
      if (!chainId) throw new Error('Chain ID not available');

      const factoryAddress = process.env.NEXT_PUBLIC_OPTIMISMSEPOLIA_FACTORY_ADDRESS_V3;
      if (!factoryAddress) {
        throw new Error('Token Factory not deployed on this network');
      }

      const deploymentFee = await publicClient.readContract({
        address: factoryAddress as `0x${string}`,
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
        endTime: params.endTime.toString(),
        presalePercentage: params.presalePercentage.toString(),
        liquidityPercentage: params.liquidityPercentage.toString(),
        liquidityLockDuration: params.liquidityLockDuration.toString()
      });

      const { request } = await publicClient.simulateContract({
        address: factoryAddress as `0x${string}`,
        abi: TokenFactoryV3ABI.abi as Abi,
        functionName: 'createToken',
        args: [params],
        value: deploymentFee
      });

      const hash = await walletClient?.writeContract(request);
      return hash;
    } catch (error) {
      console.error('Error creating token:', error);
      throw error;
    }
  };

  return { createToken };
};