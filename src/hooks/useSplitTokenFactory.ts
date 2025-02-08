import { useState } from 'react';
import { useAccount, useChainId, usePublicClient, useWriteContract } from 'wagmi';
import { type Abi, type PublicClient, decodeEventLog } from 'viem';
import SplitTokenFactoryABI from '@/contracts/abi/SplitTokenFactory.json';
import { SPLIT_TOKEN_FACTORY_ADDRESS } from '@/config/contracts';
import { ChainId } from '@/types/chain';

interface CreateTokenParams {
  name: string;
  symbol: string;
  totalSupply: bigint;
  wallets: `0x${string}`[];
  percentages: number[];
}

interface TokenCreatedEventArgs {
  tokenAddress: `0x${string}`;
  name: string;
  symbol: string;
  totalSupply: bigint;
  wallets: `0x${string}`[];
  percentages: number[];
}

export const useSplitTokenFactory = () => {
  const { address } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const [error, setError] = useState<string | null>(null);
  const [isWaiting, setIsWaiting] = useState(false);

  const factoryAddress = chainId ? SPLIT_TOKEN_FACTORY_ADDRESS[chainId as ChainId] : undefined;

  const { writeContractAsync, isPending: isLoading } = useWriteContract();

  const createToken = async (params: CreateTokenParams): Promise<`0x${string}` | undefined> => {
    try {
      setError(null);
      
      if (!address) {
        throw new Error('Wallet not connected');
      }

      if (!factoryAddress || factoryAddress === '0x0000000000000000000000000000000000000000') {
        throw new Error('Split Token Factory not deployed on this network');
      }

      if (!publicClient) {
        throw new Error('Public client not available');
      }

      // Log network info
      const networkName = chainId === ChainId.OPTIMISM_SEPOLIA ? 'Optimism Sepolia' :
                         chainId === ChainId.SEPOLIA ? 'Sepolia' :
                         chainId === ChainId.ARBITRUM_SEPOLIA ? 'Arbitrum Sepolia' :
                         chainId === ChainId.POLYGON_AMOY ? 'Polygon Amoy' : 'Unknown Network';
      
      console.log('Network:', networkName, '(Chain ID:', chainId, ')');
      console.log('Factory Address:', factoryAddress);

      // Validate wallets and percentages
      if (params.wallets.length === 0) {
        throw new Error('Must provide at least one wallet');
      }
      if (params.wallets.length !== params.percentages.length) {
        throw new Error('Number of wallets must match number of percentages');
      }
      const totalPercentage = params.percentages.reduce((sum, p) => sum + p, 0);
      if (totalPercentage !== 95) {
        throw new Error('Total percentage must equal 95% (5% platform fee is automatic)');
      }

      // Log parameters for debugging
      console.log('Creating token with parameters:', {
        name: params.name,
        symbol: params.symbol,
        totalSupply: params.totalSupply.toString(),
        wallets: params.wallets,
        percentages: params.percentages
      });

      // Try to get any required value for the transaction
      let value = BigInt(0);
      try {
        const code = await publicClient.getBytecode({ address: factoryAddress as `0x${string}` });
        console.log('Contract bytecode exists:', !!code);
      } catch (err) {
        console.error('Error checking contract bytecode:', err);
      }

      // Prepare the transaction
      const { request } = await publicClient.simulateContract({
        address: factoryAddress as `0x${string}`,
        abi: SplitTokenFactoryABI.abi as Abi,
        functionName: 'createToken',
        args: [
          params.name,
          params.symbol,
          params.totalSupply,
          params.wallets,
          params.percentages
        ],
        value
      });

      console.log('Transaction simulation successful');

      // Send the transaction
      const hash = await writeContractAsync(request);
      console.log('Transaction sent:', hash);
      setIsWaiting(false);

      // Wait for transaction receipt
      console.log('Waiting for transaction confirmation...');
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log('Transaction confirmed:', receipt);

      // Find the TokenCreated event
      const event = receipt.logs.find(log => {
        try {
          const decodedLog = decodeEventLog({
            abi: SplitTokenFactoryABI.abi as Abi,
            data: log.data,
            topics: log.topics
          });
          return decodedLog.eventName === 'TokenCreated';
        } catch (err) {
          // Ignore decoding errors for other events
          return false;
        }
      });

      if (event) {
        const decodedLog = decodeEventLog({
          abi: SplitTokenFactoryABI.abi as Abi,
          data: event.data,
          topics: event.topics
        });

        if (decodedLog.eventName === 'TokenCreated') {
          console.log('Decoded TokenCreated event:', decodedLog);
          const args = decodedLog.args as unknown as TokenCreatedEventArgs;
          return args.tokenAddress;
        }
      } else {
        console.log('No TokenCreated event found in logs:', receipt.logs);
      }

      return undefined;
      
    } catch (err) {
      console.error('Error in useSplitTokenFactory:', err);
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