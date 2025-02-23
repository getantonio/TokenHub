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
  maxActivePresales: number;
  presaleEnabled: boolean;
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

      // Get factory address
      const factoryAddress = getNetworkContractAddress(chainId, 'factoryAddressV3');
      if (!factoryAddress) {
        throw new Error('Factory not deployed on this network');
      }
      console.log('Using factory address:', factoryAddress);

      // Convert durations to seconds
      const SECONDS_PER_DAY = BigInt(86400);
      const now = BigInt(Math.floor(Date.now() / 1000));

      // Convert wallet allocations to contract format
      const walletAllocations = params.walletAllocations.map(wallet => ({
        wallet: wallet.wallet,
        percentage: wallet.percentage,
        vestingEnabled: wallet.vestingEnabled,
        vestingDuration: wallet.vestingEnabled ? wallet.vestingDuration * SECONDS_PER_DAY : BigInt(0),
        cliffDuration: wallet.vestingEnabled ? wallet.cliffDuration * SECONDS_PER_DAY : BigInt(0),
        vestingStartTime: wallet.vestingEnabled ? wallet.vestingStartTime : BigInt(0)
      }));

      // Set contract parameters
      const contractParams = {
        name: params.name,
        symbol: params.symbol,
        initialSupply: params.initialSupply,
        maxSupply: params.maxSupply,
        owner: params.owner,
        enableBlacklist: params.enableBlacklist,
        enableTimeLock: params.enableTimeLock,
        presaleRate: params.presaleEnabled ? parseEther(params.presaleRate.toString()) : BigInt(0),
        softCap: params.presaleEnabled ? parseEther(params.softCap.toString()) : BigInt(0),
        hardCap: params.presaleEnabled ? parseEther(params.hardCap.toString()) : BigInt(0),
        minContribution: params.presaleEnabled ? parseEther(params.minContribution.toString()) : BigInt(0),
        maxContribution: params.presaleEnabled ? parseEther(params.maxContribution.toString()) : BigInt(0),
        startTime: params.presaleEnabled ? BigInt(params.startTime) : BigInt(0),
        endTime: params.presaleEnabled ? BigInt(params.endTime) : BigInt(0),
        presalePercentage: params.presaleEnabled ? 5 : 0,
        liquidityPercentage: params.liquidityPercentage,
        liquidityLockDuration: BigInt(365) * SECONDS_PER_DAY, // Set to 365 days
        walletAllocations,
        maxActivePresales: params.presaleEnabled ? 1 : 0,
        presaleEnabled: params.presaleEnabled
      };

      // Calculate total percentage based on presale state
      const totalPercentage = params.presaleEnabled ? 
        (params.presalePercentage + params.liquidityPercentage) :
        params.liquidityPercentage;
      const totalWithWallets = totalPercentage + 
        params.walletAllocations.reduce((sum: number, w: { percentage: number }) => sum + w.percentage, 0);

      console.log('Presale configuration:', {
        presaleEnabled: params.presaleEnabled,
        presalePercentage: params.presalePercentage,
        liquidityPercentage: params.liquidityPercentage,
        totalPercentage,
        totalWithWallets
      });

      if (totalWithWallets !== 100) {
        throw new Error(
          `Total percentage must be 100, got ${totalWithWallets}. ` +
          `${params.presaleEnabled ? `Presale: ${params.presalePercentage}%, ` : ''}` +
          `Liquidity: ${params.liquidityPercentage}%, ` +
          `Wallets: ${params.walletAllocations.reduce((sum: number, w: { percentage: number }) => sum + w.percentage, 0)}%`
        );
      }

      // Log the contract parameters
      console.log('Contract parameters:', {
        name: contractParams.name,
        symbol: contractParams.symbol,
        initialSupply: contractParams.initialSupply.toString(),
        maxSupply: contractParams.maxSupply.toString(),
        owner: contractParams.owner,
        enableBlacklist: contractParams.enableBlacklist,
        enableTimeLock: contractParams.enableTimeLock,
        presaleEnabled: contractParams.presaleEnabled,
        maxActivePresales: contractParams.maxActivePresales,
        presaleRate: contractParams.presaleRate.toString(),
        softCap: contractParams.softCap.toString(),
        hardCap: contractParams.hardCap.toString(),
        minContribution: contractParams.minContribution.toString(),
        maxContribution: contractParams.maxContribution.toString(),
        startTime: contractParams.startTime.toString(),
        endTime: contractParams.endTime.toString(),
        presalePercentage: contractParams.presalePercentage,
        liquidityPercentage: contractParams.liquidityPercentage,
        liquidityLockDuration: contractParams.liquidityLockDuration.toString(),
        walletAllocations: contractParams.walletAllocations.map(w => ({
          wallet: w.wallet,
          percentage: w.percentage,
          vestingEnabled: w.vestingEnabled,
          vestingDuration: w.vestingDuration.toString(),
          cliffDuration: w.cliffDuration.toString(),
          vestingStartTime: w.vestingStartTime.toString()
        })),
        factoryAddress
      });

      // Create the contract request
      const { request } = await publicClient.simulateContract({
        address: factoryAddress as `0x${string}`,
        abi: TokenFactoryV3ABI.abi,
        functionName: 'createToken',
        args: [contractParams],
        value: deploymentFee,
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