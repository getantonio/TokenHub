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
  tokensPerEth: bigint;  // Changed from presaleRate
  minContribution: bigint;
  maxContribution: bigint;
  presaleCap: bigint;
  startTime: bigint;
  endTime: bigint;
  presalePercentage: bigint;  // in basis points (e.g., 3500n for 35%)
  liquidityPercentage: bigint; // in basis points (e.g., 3000n for 30%)
  liquidityLockDuration: bigint;
  teamPercentage: bigint;     // in basis points (e.g., 1500n for 15%)
  marketingPercentage: bigint; // in basis points (e.g., 1000n for 10%)
  developmentPercentage: bigint; // in basis points (e.g., 500n for 5%)
}

const PLATFORM_FEE_BASIS_POINTS = BigInt(500); // 5%
const TOTAL_BASIS_POINTS = BigInt(10000); // 100%
const REQUIRED_ALLOCATION_BASIS_POINTS = BigInt(9500); // 95%

const formatPercentage = (basisPoints: number | bigint): string => {
  return (Number(basisPoints) / 100).toFixed(2);
};

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

      // Ensure all numeric values are properly converted to BigInt
      const safeParams = {
        name: params.name,
        symbol: params.symbol,
        initialSupply: params.initialSupply,
        maxSupply: params.maxSupply,
        owner: params.owner,
        enableBlacklist: params.enableBlacklist,
        enableTimeLock: params.enableTimeLock,
        tokensPerEth: params.tokensPerEth,  // Changed from presaleRate
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

      // Validate total allocation equals 100%
      const totalAllocation = BigInt(500) + // Platform fee (5%)
        safeParams.presalePercentage +
        safeParams.liquidityPercentage +
        safeParams.teamPercentage +
        safeParams.marketingPercentage +
        safeParams.developmentPercentage;

      if (totalAllocation !== BigInt(10000)) {
        throw new Error(`Total allocation must equal 100% (10000 basis points). Current total: ${totalAllocation} basis points`);
      }

      // Validate presale cap
      const presaleTokens = (safeParams.initialSupply * safeParams.presalePercentage) / BigInt(10000);
      const requiredPresaleCap = presaleTokens / safeParams.tokensPerEth;  // Changed from presaleRate
      
      if (safeParams.presaleCap < requiredPresaleCap) {
        throw new Error(`Presale cap too low. Required: ${requiredPresaleCap.toString()} ETH, Provided: ${safeParams.presaleCap.toString()} ETH`);
      }

      // Log the exact parameters being sent
      console.log('Safe Parameters:', {
        name: safeParams.name,
        symbol: safeParams.symbol,
        initialSupply: safeParams.initialSupply,
        maxSupply: safeParams.maxSupply,
        owner: safeParams.owner,
        enableBlacklist: safeParams.enableBlacklist,
        enableTimeLock: safeParams.enableTimeLock,
        tokensPerEth: safeParams.tokensPerEth,  // Changed from presaleRate
        minContribution: safeParams.minContribution,
        maxContribution: safeParams.maxContribution,
        presaleCap: safeParams.presaleCap,
        startTime: safeParams.startTime,
        endTime: safeParams.endTime,
        presalePercentage: safeParams.presalePercentage,
        liquidityPercentage: safeParams.liquidityPercentage,
        liquidityLockDuration: safeParams.liquidityLockDuration,
        teamPercentage: safeParams.teamPercentage,
        marketingPercentage: safeParams.marketingPercentage,
        developmentPercentage: safeParams.developmentPercentage
      });

      // Prepare the transaction
      const { request } = await publicClient.simulateContract({
        address: factoryAddress as `0x${string}`,
        abi: TokenFactoryV3ABI.abi as Abi,
        functionName: 'createToken',
        args: [safeParams],
        value: deploymentFee
      });

      // Log the exact transaction data being sent
      console.log('Transaction request:', {
        to: request.address,
        value: request.value?.toString(),
        args: request.args
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