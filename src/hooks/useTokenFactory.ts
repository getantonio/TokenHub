import { useCallback } from 'react';
import { parseEther } from 'viem';
import { usePublicClient, useWalletClient, useChainId } from 'wagmi';
import TokenFactoryV3ABI from '@contracts/abi/TokenFactory_v3.json';
import { FACTORY_ADDRESSES } from '@/config/contracts';
import { ChainId } from '@/types/chain';
import { Abi, PublicClient, WalletClient } from 'viem';
import { FACTORY_ABI } from '@/contracts/abi/TokenFactory_v2_DirectDEX_TwoStep';
import { BrowserProvider } from 'ethers';
import { Contract } from 'ethers';
import { getNetworkContractAddress } from '@/config/contracts';
import { useAccount } from 'wagmi';

interface TokenParams {
  name: string;
  symbol: string;
  initialSupply: bigint;
  maxSupply: bigint;
  owner: `0x${string}`;
  enableBlacklist: boolean;
  enableTimeLock: boolean;
  presaleEnabled: boolean;
  maxActivePresales: number;
  presaleRate: bigint;
  softCap: bigint;
  hardCap: bigint;
  minContribution: bigint;
  maxContribution: bigint;
  startTime: bigint;
  endTime: bigint;
  presalePercentage: number;
  liquidityPercentage: number;
  liquidityLockDuration: bigint;
  walletAllocations: {
    wallet: `0x${string}`;
    percentage: number;
    vestingEnabled: boolean;
    vestingDuration: bigint;
    cliffDuration: bigint;
    vestingStartTime: bigint;
  }[];
}

export function useTokenFactory() {
  const chainId = useChainId();
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const getDeploymentFee = async (): Promise<bigint> => {
    if (!publicClient || !chainId) throw new Error('Client not initialized');
    
    const factoryAddress = getNetworkContractAddress(chainId, 'factoryAddressV3');
    if (!factoryAddress) throw new Error('Factory not deployed on this network');

    console.log('Getting deployment fee from factory:', factoryAddress);
    
    return await publicClient.readContract({
      address: factoryAddress as `0x${string}`,
      abi: TokenFactoryV3ABI.abi,
      functionName: 'deploymentFee'
    }) as bigint;
  };

  const createToken = async (params: TokenParams) => {
    if (!publicClient || !chainId || !walletClient) {
      throw new Error('Wallet not connected');
    }

    try {
      console.log('Creating token with params:', {
        name: params.name,
        symbol: params.symbol,
        initialSupply: params.initialSupply.toString(),
        maxSupply: params.maxSupply.toString(),
        owner: params.owner,
        enableBlacklist: params.enableBlacklist,
        enableTimeLock: params.enableTimeLock,
        presaleEnabled: params.presaleEnabled,
        maxActivePresales: params.maxActivePresales,
        presaleRate: params.presaleRate.toString(),
        softCap: params.softCap.toString(),
        hardCap: params.hardCap.toString(),
        minContribution: params.minContribution.toString(),
        maxContribution: params.maxContribution.toString(),
        startTime: params.startTime.toString(),
        endTime: params.endTime.toString(),
        presalePercentage: params.presalePercentage,
        liquidityPercentage: params.liquidityPercentage,
        liquidityLockDuration: params.liquidityLockDuration.toString(),
        walletAllocations: params.walletAllocations.map(w => ({
          ...w,
          vestingDuration: w.vestingDuration.toString(),
          cliffDuration: w.cliffDuration.toString(),
          vestingStartTime: w.vestingStartTime.toString()
        }))
      });

      // Get deployment fee
      const deploymentFee = await getDeploymentFee();
      console.log('Deployment Fee:', {
        wei: deploymentFee.toString(),
        ether: Number(deploymentFee) / 1e18,
        hex: `0x${deploymentFee.toString(16)}`
      });

      // Send only deployment fee
      const totalValue = deploymentFee;
      console.log('Total value to send:', {
        wei: totalValue.toString(),
        ether: Number(totalValue) / 1e18,
        hex: `0x${totalValue.toString(16)}`
      });

      // Get factory address
      const factoryAddress = getNetworkContractAddress(chainId, 'factoryAddressV3');
      if (!factoryAddress) {
        throw new Error('Factory not deployed on this network');
      }
      console.log('Using factory address:', factoryAddress);

      // Create the contract request
      const { request } = await publicClient.simulateContract({
        address: factoryAddress as `0x${string}`,
        abi: TokenFactoryV3ABI.abi,
        functionName: 'createToken',
        args: [params],
        value: totalValue, // Send only deployment fee
      });

      // Execute the transaction
      const hash = await walletClient.writeContract(request);
      return hash;
    } catch (error) {
      console.error('Error details:', error);
      throw error;
    }
  };

  return {
    createToken
  };
}