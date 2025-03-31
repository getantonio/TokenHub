import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useAccount, useWalletClient, usePublicClient } from 'wagmi';
import { encodeFunctionData, decodeErrorResult } from 'viem';
import { toast } from 'sonner';
import { LOAN_POOL_FACTORY_ABI } from '@/contracts/defi/abis';

// ERC20 ABI for token validation
const ERC20_ABI = [
  {
    "constant": true,
    "inputs": [],
    "name": "symbol",
    "outputs": [{"name": "", "type": "string"}],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  }
] as const;

interface DirectPoolCreatorZeroFeeProps {
  factoryAddress: `0x${string}`;
  assetAddress: `0x${string}`;
  poolName: string;
  poolSymbol: string;
  collateralFactorBps: number;
  reserveFactorBps: number;
  disabled?: boolean;
  onSuccess?: (txHash: string) => void;
  onError?: (error: Error) => void;
}

export function DirectPoolCreatorZeroFee({
  factoryAddress,
  assetAddress,
  poolName,
  poolSymbol,
  collateralFactorBps,
  reserveFactorBps,
  disabled = false,
  onSuccess,
  onError
}: DirectPoolCreatorZeroFeeProps) {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const [isPending, setIsPending] = React.useState(false);

  const handleCreatePool = async () => {
    if (!walletClient || !address || !publicClient) {
      toast.error('Wallet not connected or public client not available');
      return;
    }

    setIsPending(true);
    
    try {
      console.log("[DEBUG-ZEROFEE] Starting direct pool creation process with ZERO fee");
      console.log("[DEBUG-ZEROFEE] Parameters:", {
        factoryAddress,
        assetAddress,
        poolName,
        poolSymbol,
        collateralFactorBps,
        reserveFactorBps
      });

      // Check if the caller is the owner
      try {
        console.log("[DEBUG-ZEROFEE] Checking contract owner...");
        const owner = await publicClient.readContract({
          address: factoryAddress,
          abi: LOAN_POOL_FACTORY_ABI,
          functionName: 'owner'
        }) as `0x${string}`;
        console.log("[DEBUG-ZEROFEE] Contract owner:", owner);
        console.log("[DEBUG-ZEROFEE] Caller address:", address);

        if (owner.toLowerCase() !== address.toLowerCase()) {
          console.error("[DEBUG-ZEROFEE] Caller is not the owner");
          console.error("[DEBUG-ZEROFEE] Owner:", owner);
          console.error("[DEBUG-ZEROFEE] Caller:", address);
          toast.error('Only the contract owner can create pools. Please contact the admin.');
          if (onError) onError(new Error('Not owner'));
          return;
        }
      } catch (error) {
        console.error("[DEBUG-ZEROFEE] Failed to check owner:", error);
        toast.error('Failed to verify contract ownership. Please try again.');
        if (onError) onError(new Error('Failed to check owner'));
        return;
      }
      
      // Validate that the asset is a valid ERC20 token
      try {
        console.log("[DEBUG-ZEROFEE] Validating ERC20 token...");
        const symbol = await publicClient.readContract({
          address: assetAddress,
          abi: ERC20_ABI,
          functionName: 'symbol'
        });
        console.log("[DEBUG-ZEROFEE] Token symbol:", symbol);
      } catch (error) {
        console.error("[DEBUG-ZEROFEE] Failed to validate ERC20 token:", error);
        toast.error('The asset address is not a valid ERC20 token. Please check the address and try again.');
        if (onError) onError(new Error('Invalid ERC20 token'));
        return;
      }
      
      // 1. Encode the function data
      const data = encodeFunctionData({
        abi: LOAN_POOL_FACTORY_ABI,
        functionName: 'createLendingPool',
        args: [
          assetAddress, 
          poolName, 
          poolSymbol, 
          BigInt(collateralFactorBps), 
          BigInt(reserveFactorBps)
        ]
      });
      
      console.log("[DEBUG-ZEROFEE] Encoded function data:", data);
      
      // 2. Create the transaction object with ZERO fee value
      const tx = {
        to: factoryAddress,
        from: address,
        data,
        value: BigInt(0), // ZERO FEE - The contract indicates the pool creation fee is 0
        gas: BigInt(12000000),  // High gas limit
        maxFeePerGas: BigInt(50000000000), // 50 Gwei
        maxPriorityFeePerGas: BigInt(2000000000), // 2 Gwei
        type: 'eip1559' as const
      };
      
      console.log("[DEBUG-ZEROFEE] Transaction object:", {
        to: tx.to,
        from: tx.from,
        value: tx.value.toString(),
        gas: tx.gas.toString(),
        maxFeePerGas: tx.maxFeePerGas.toString(),
        maxPriorityFeePerGas: tx.maxPriorityFeePerGas.toString(),
        type: tx.type
      });
      
      // 3. Send the transaction using the wallet client directly
      const txHash = await walletClient.sendTransaction(tx);
      console.log("[DEBUG-ZEROFEE] Transaction submitted with hash:", txHash);
      
      // 4. Wait for transaction receipt
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      console.log("[DEBUG-ZEROFEE] Transaction receipt:", receipt);
      
      if (receipt.status === 'reverted') {
        console.error("[DEBUG-ZEROFEE] Transaction reverted");
        
        // Try to decode the revert reason from the transaction data
        try {
          const decodedReason = decodeErrorResult({
            abi: LOAN_POOL_FACTORY_ABI,
            data: receipt.transactionHash
          });
          console.error("[DEBUG-ZEROFEE] Decoded revert reason:", decodedReason);
          
          // Show specific error messages based on the revert reason
          if (decodedReason.errorName === 'NotOwner') {
            toast.error('Only the contract owner can create pools. Please contact the admin.');
          } else if (decodedReason.errorName === 'PoolAlreadyExists') {
            toast.error('A pool for this asset already exists.');
          } else if (decodedReason.errorName === 'InvalidAsset') {
            toast.error('The asset address is not valid for pool creation. It may not be a standard ERC20 token.');
          } else if (decodedReason.errorName === 'InvalidCollateralFactor') {
            toast.error('The collateral factor value is invalid according to the contract\'s requirements.');
          } else if (decodedReason.errorName === 'InvalidReserveFactor') {
            toast.error('The reserve factor value is invalid according to the contract\'s requirements.');
          } else if (decodedReason.errorName === 'PoolCreationFailed') {
            toast.error('An internal error occurred during pool creation. Please try again.');
          } else if (decodedReason.errorName === 'InsufficientFee') {
            toast.error('The transaction does not include the required fee. Please try again with the correct fee amount.');
          } else {
            toast.error(`Pool creation failed: ${decodedReason.errorName}`);
          }
        } catch (decodeError) {
          console.error("[DEBUG-ZEROFEE] Failed to decode revert reason:", decodeError);
          toast.error('Pool creation failed. Please check the console for details.');
        }
        
        if (onError) onError(new Error('Transaction reverted'));
        return;
      }
      
      // 6. Show success toast
      toast.success('Pool created successfully!');
      
      // 7. Call onSuccess callback
      if (onSuccess) onSuccess(txHash);
      
    } catch (error) {
      console.error('[DEBUG-ZEROFEE] Pool creation error:', error);
      
      // Enhanced error logging
      if (error instanceof Error) {
        console.error('[DEBUG-ZEROFEE] Error name:', error.name);
        console.error('[DEBUG-ZEROFEE] Error message:', error.message);
        console.error('[DEBUG-ZEROFEE] Error stack:', error.stack);
        
        // Check for specific error types
        if (error.message.includes('insufficient funds')) {
          toast.error('Insufficient funds for transaction. Make sure you have enough ETH to cover gas costs.');
        } else if (error.message.includes('user rejected')) {
          toast.error('Transaction was rejected in your wallet.');
        } else if (error.message.includes('already exists')) {
          toast.error('A pool for this asset already exists.');
        } else if (error.message.includes('notowner')) {
          toast.error('Only the contract owner can create pools. Please contact the admin.');
        } else if (error.message.includes('invalid asset')) {
          toast.error('The asset address is not valid for pool creation. It may not be a standard ERC20 token.');
        } else if (error.message.includes('invalid collateral factor')) {
          toast.error('The collateral factor value is invalid according to the contract\'s requirements.');
        } else if (error.message.includes('invalid reserve factor')) {
          toast.error('The reserve factor value is invalid according to the contract\'s requirements.');
        } else {
          toast.error('Failed to create pool: ' + error.message);
        }
      } else if (error && typeof error === 'object') {
        console.error('[DEBUG-ZEROFEE] Error object keys:', Object.keys(error));
        if ('cause' in error) console.error('[DEBUG-ZEROFEE] Error cause:', error.cause);
        if ('details' in error) console.error('[DEBUG-ZEROFEE] Error details:', error.details);
        if ('data' in error) console.error('[DEBUG-ZEROFEE] Error data:', error.data);
        toast.error('Failed to create pool: Unknown error');
      }
      
      if (onError) onError(error as Error);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Button 
      onClick={handleCreatePool}
      disabled={disabled || isPending || !walletClient}
      className="w-full bg-green-600 hover:bg-green-700 text-white"
    >
      {isPending ? (
        <div className="flex items-center">
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Creating Pool...
        </div>
      ) : (
        'Create Pool (Zero Fee)'
      )}
    </Button>
  );
} 