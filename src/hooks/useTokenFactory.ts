import { useCallback } from 'react';
import { parseEther } from 'viem';
import { usePublicClient, useWalletClient, useChainId } from 'wagmi';
import TokenFactoryV3EnhancedABI from '@contracts/artifacts/src/contracts/TokenFactory_v3_Enhanced.sol/TokenFactory_v3_Enhanced.json';
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
    console.log('Factory Address Resolution:', {
      chainId,
      factoryAddress,
      envValue: process.env.NEXT_PUBLIC_SEPOLIA_FACTORY_ADDRESS_V3,
      allEnvKeys: Object.keys(process.env).filter(key => key.includes('FACTORY')),
    });
    
    if (!factoryAddress) throw new Error('Factory not deployed on this network');

    console.log('Getting deployment fee from factory:', factoryAddress);
    
    return await publicClient.readContract({
      address: factoryAddress as `0x${string}`,
      abi: TokenFactoryV3EnhancedABI.abi,
      functionName: 'deploymentFee'
    }) as bigint;
  };

  const createToken = async (params: TokenParams) => {
    if (!publicClient || !walletClient || !chainId) throw new Error('Client not initialized');
    
    // Enhanced debugging for factory address resolution
    const factoryAddress = getNetworkContractAddress(chainId, 'factoryAddressV3');
    console.log('Token Creation Factory Resolution:', {
      chainId,
      factoryAddress,
      envDirect: process.env.NEXT_PUBLIC_SEPOLIA_FACTORY_ADDRESS_V3,
      envKeys: Object.keys(process.env).filter(key => key.includes('FACTORY')),
      factoryAddressesV3: FACTORY_ADDRESSES.v3,
      params
    });

    if (!factoryAddress) throw new Error('Factory not deployed on this network');

    // Get deployment fee
    const deploymentFee = await getDeploymentFee();
    console.log('Deployment fee:', deploymentFee.toString());

    // Prepare contract call
    const { request } = await publicClient.simulateContract({
      address: factoryAddress as `0x${string}`,
      abi: TokenFactoryV3EnhancedABI.abi,
      functionName: 'createToken',
      args: [{
        name: params.name,
        symbol: params.symbol,
        initialSupply: params.initialSupply,
        maxSupply: params.maxSupply,
        owner: params.owner,
        enableBlacklist: params.enableBlacklist,
        enableTimeLock: params.enableTimeLock,
        presaleEnabled: params.presaleEnabled,
        maxActivePresales: params.maxActivePresales,
        presaleRate: params.presaleRate,
        softCap: params.softCap,
        hardCap: params.hardCap,
        minContribution: params.minContribution,
        maxContribution: params.maxContribution,
        startTime: params.startTime,
        endTime: params.endTime,
        presalePercentage: params.presalePercentage,
        liquidityPercentage: params.liquidityPercentage,
        liquidityLockDuration: params.liquidityLockDuration,
        walletAllocations: params.walletAllocations
      }],
      value: deploymentFee,
      account: address
    });

    console.log('Contract call request:', request);

    // Execute the transaction
    const hash = await walletClient.writeContract(request);
    console.log('Transaction hash:', hash);

    return hash;
  };

  return {
    createToken
  };
}
