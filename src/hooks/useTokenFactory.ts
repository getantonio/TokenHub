import { useState } from 'react';
import { useAccount, useChainId, usePublicClient } from 'wagmi';
import { useWriteContract } from 'wagmi';
import type { Abi } from 'viem';
import TokenFactoryV3ABI from '@/contracts/abi/TokenFactory_v3.json';
import { FACTORY_ADDRESSES } from '@/config/contracts';
import { ChainId } from '@/types/chain';
import { formatEther } from 'viem';

interface CreateTokenParams {
  name: string;
  symbol: string;
  initialSupply: bigint;
  maxSupply: bigint;
  owner: string;
  enableBlacklist: boolean;
  enableTimeLock: boolean;
  tokensPerEth: bigint;
  minContribution: bigint;
  maxContribution: bigint;
  presaleCap: bigint;
  startTime: bigint;
  endTime: bigint;
  presalePercentage: bigint;
  liquidityPercentage: bigint;
  liquidityLockDuration: bigint;
  teamPercentage: bigint;
  marketingPercentage: bigint;
  developmentPercentage: bigint;
  platformFeeRecipient: string;
  platformFeeTokens: bigint;
  platformFeeVestingEnabled: boolean;
  platformFeeVestingDuration: bigint;
  platformFeeCliffDuration: bigint;
}

const TOTAL_BASIS_POINTS = BigInt(10000); // 100%

export const useTokenFactory = (version: 'v3') => {
  const { address } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const [error, setError] = useState<string | null>(null);
  const [isWaiting, setIsWaiting] = useState(false);

  const factoryAddress = FACTORY_ADDRESSES[version][chainId || 0];

  const { writeContract, isPending: isLoading } = useWriteContract();

  const createToken = async (params: CreateTokenParams): Promise<void> => {
    try {
      setError(null);
      
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

      if (!publicClient) {
        throw new Error('Public client not available');
      }

      // Get the deployment fee first
      const deploymentFee = await publicClient.readContract({
        address: factoryAddress as `0x${string}`,
        abi: TokenFactoryV3ABI.abi as Abi,
        functionName: 'getDeploymentFee',
        args: [address]
      }) as bigint;

      console.log('Deployment Fee:', deploymentFee.toString());

      // Validate total allocation equals 100%
      const totalAllocation = 
        params.presalePercentage +
        params.liquidityPercentage +
        params.teamPercentage +
        params.marketingPercentage +
        params.developmentPercentage;

      if (totalAllocation !== TOTAL_BASIS_POINTS) {
        throw new Error(`Total allocation must equal 100% (10000 basis points). Current total: ${totalAllocation} basis points`);
      }

      // Log parameters for debugging
      console.log('Parameters:', {
        name: params.name,
        symbol: params.symbol,
        initialSupply: params.initialSupply.toString(),
        maxSupply: params.maxSupply.toString(),
        owner: params.owner,
        enableBlacklist: params.enableBlacklist,
        enableTimeLock: params.enableTimeLock,
        tokensPerEth: params.tokensPerEth.toString(),
        minContribution: params.minContribution.toString(),
        maxContribution: params.maxContribution.toString(),
        presaleCap: params.presaleCap.toString(),
        startTime: params.startTime.toString(),
        endTime: params.endTime.toString(),
        presalePercentage: params.presalePercentage.toString(),
        liquidityPercentage: params.liquidityPercentage.toString(),
        liquidityLockDuration: params.liquidityLockDuration.toString(),
        teamPercentage: params.teamPercentage.toString(),
        marketingPercentage: params.marketingPercentage.toString(),
        developmentPercentage: params.developmentPercentage.toString(),
        platformFeeRecipient: params.platformFeeRecipient,
        platformFeeTokens: params.platformFeeTokens.toString(),
        platformFeeVestingEnabled: params.platformFeeVestingEnabled,
        platformFeeVestingDuration: params.platformFeeVestingDuration.toString(),
        platformFeeCliffDuration: params.platformFeeCliffDuration.toString()
      });

      // Create the token creation parameters object
      const tokenParams = {
        name: params.name,
        symbol: params.symbol,
        initialSupply: params.initialSupply,
        maxSupply: params.maxSupply,
        owner: params.owner,
        enableBlacklist: params.enableBlacklist,
        enableTimeLock: params.enableTimeLock,
        tokensPerEth: params.tokensPerEth,
        minContribution: params.minContribution,
        maxContribution: params.maxContribution,
        presaleCap: params.presaleCap,
        startTime: params.startTime,
        endTime: params.endTime,
        presalePercentage: params.presalePercentage,
        liquidityPercentage: params.liquidityPercentage,
        liquidityLockDuration: params.liquidityLockDuration,
        teamPercentage: params.teamPercentage,
        marketingPercentage: params.marketingPercentage,
        developmentPercentage: params.developmentPercentage
      };

      // Prepare the transaction
      const { request } = await publicClient.simulateContract({
        address: factoryAddress as `0x${string}`,
        abi: TokenFactoryV3ABI.abi as Abi,
        functionName: 'createToken',
        args: [tokenParams],
        value: deploymentFee
      });

      // Send the transaction
      await writeContract(request);
      setIsWaiting(false);
      
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