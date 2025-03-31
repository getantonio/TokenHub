import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { parseEther, Abi, isAddress } from 'viem';
import { LOAN_POOL_FACTORY_ABI } from '@/contracts/defi/abis';
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { QuestionMarkCircledIcon } from "@radix-ui/react-icons";
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { DirectPoolCreator } from './DirectPoolCreator';

interface CreatePoolFormProps {
  onPoolCreated?: (poolAddress: string) => void;
  factoryAddress: `0x${string}`;
}

export function CreatePoolForm({ onPoolCreated, factoryAddress }: CreatePoolFormProps) {
  const { address: userAddress } = useAccount();
  const { writeContract, isPending, isSuccess, error: contractError, data: txHash } = useWriteContract();
  const publicClient = usePublicClient();

  // Form state
  const [assetAddress, setAssetAddress] = useState('');
  const [poolName, setPoolName] = useState('');
  const [poolSymbol, setPoolSymbol] = useState('');
  const [collateralFactor, setCollateralFactor] = useState(75);
  const [reserveFactor, setReserveFactor] = useState(10);
  const [error, setError] = useState('');
  const [factoryValidated, setFactoryValidated] = useState(false);
  const [newPoolAddress, setNewPoolAddress] = useState<string | null>(null);
  const [validatingAsset, setValidatingAsset] = useState(false);
  const [assetValidated, setAssetValidated] = useState(false);
  const [assetSymbol, setAssetSymbol] = useState('');
  const [addressMismatchDetected, setAddressMismatchDetected] = useState(false);
  const [correctFactoryAddress, setCorrectFactoryAddress] = useState<string | null>(null);

  // Get fee information
  const { data: feeCollectorAddress } = useReadContract({
    address: factoryAddress,
    abi: LOAN_POOL_FACTORY_ABI as Abi,
    functionName: 'feeCollector',
  });

  // Watch transaction receipt
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Check if the factory contract exists and is valid
  useEffect(() => {
    const validateFactory = async () => {
      if (!publicClient || !factoryAddress) return;
      
      try {
        console.log("Validating factory contract at:", factoryAddress);
        
        // Check for bytecode
        const bytecode = await publicClient.getBytecode({ address: factoryAddress });
        if (!bytecode || bytecode === '0x') {
          setError("Factory contract not found at the provided address");
          console.error("Factory contract not found (no bytecode)");
          return;
        }
        
        // Try to call a view function to verify it's the right contract
        const implementation = await publicClient.readContract({
          address: factoryAddress,
          abi: LOAN_POOL_FACTORY_ABI as Abi,
          functionName: 'implementation'
        });
        
        console.log("Factory implementation address:", implementation);
        
        // Check if getAllPools function exists and can be called
        const pools = await publicClient.readContract({
          address: factoryAddress,
          abi: LOAN_POOL_FACTORY_ABI as Abi,
          functionName: 'getAllPools'
        });
        
        console.log("Factory validation successful, existing pools:", pools);
        setFactoryValidated(true);
      } catch (err: any) {
        console.error("Factory validation error:", err);
        setError(`Factory contract validation failed: ${err.message || "Unknown error"}`);
      }
    };
    
    validateFactory();
  }, [factoryAddress, publicClient]);

  // Validate asset address when entered
  useEffect(() => {
    const validateAsset = async () => {
      if (!publicClient || !assetAddress || !isAddress(assetAddress)) {
        setAssetValidated(false);
        setAssetSymbol('');
        return;
      }
      
      setValidatingAsset(true);
      
      try {
        // Basic ERC20 ABI for validation
        const erc20Abi = [
          {
            "inputs": [],
            "name": "symbol",
            "outputs": [{"internalType": "string", "name": "", "type": "string"}],
            "stateMutability": "view",
            "type": "function"
          }
        ] as const;
        
        // Try to get the token symbol
        const symbol = await publicClient.readContract({
          address: assetAddress as `0x${string}`,
          abi: erc20Abi,
          functionName: 'symbol'
        });
        
        console.log(`Asset validated: ${assetAddress}, symbol: ${symbol}`);
        setAssetValidated(true);
        setAssetSymbol(symbol as string);
        
        // Auto-populate pool name and symbol if not already set
        if (!poolName) {
          setPoolName(`${symbol} Lending Pool`);
        }
        if (!poolSymbol) {
          setPoolSymbol(`${symbol}-LP`);
        }
      } catch (err) {
        console.error("Asset validation error:", err);
        setAssetValidated(false);
        setAssetSymbol('');
      } finally {
        setValidatingAsset(false);
      }
    };
    
    if (assetAddress) {
      validateAsset();
    }
  }, [assetAddress, publicClient, poolName, poolSymbol]);

  const [poolCreationFee, setPoolCreationFee] = useState('0.05');

  // Add a validation function for the fee
  const validateFee = (feeString: string): boolean => {
    try {
      // Check if the fee is a valid number
      if (isNaN(parseFloat(feeString))) {
        console.error('[DEBUG] Fee is not a valid number:', feeString);
        return false;
      }
      
      // Check if parseEther can handle it
      const parsedFee = parseEther(feeString);
      if (typeof parsedFee !== 'bigint') {
        console.error('[DEBUG] parseEther did not return a BigInt:', parsedFee);
        return false;
      }
      
      // Validate the fee is positive and reasonable (less than 10 ETH)
      if (parsedFee <= BigInt(0) || parsedFee > parseEther('10')) {
        console.error('[DEBUG] Fee is outside reasonable range:', parsedFee.toString());
        return false;
      }
      
      return true;
    } catch (err) {
      console.error('[DEBUG] Error validating fee:', err);
      return false;
    }
  };

  // Update pool creation fee handling
  useEffect(() => {
    const fetchFee = async () => {
      if (feeCollectorAddress) {
        try {
          console.log('[DEBUG] Fee collector address:', feeCollectorAddress);
          
          // In a production app, you'd fetch this from a contract or API
          const suggestedFee = '0.05';
          
          // Validate the fee
          if (validateFee(suggestedFee)) {
            setPoolCreationFee(suggestedFee);
            console.log('[DEBUG] Pool creation fee set to:', suggestedFee);
          } else {
            // Fallback to a default if validation fails
            setPoolCreationFee('0.05');
            console.warn('[DEBUG] Using default pool creation fee: 0.05 ETH');
          }
        } catch (err) {
          console.error('[DEBUG] Error fetching fee:', err);
          setPoolCreationFee('0.05'); // Default fee
        }
      }
    };
    
    fetchFee();
  }, [feeCollectorAddress]);

  // Listen for pool creation events to get the new pool address
  useEffect(() => {
    if (isConfirmed && txHash && !newPoolAddress && publicClient) {
      console.log('[DEBUG] Transaction confirmed, looking for pool address, txHash:', txHash);
      const getPoolFromReceipt = async () => {
        try {
          // Get transaction receipt
          console.log('[DEBUG] Getting transaction receipt for hash:', txHash);
          const receipt = await publicClient.getTransactionReceipt({ hash: txHash });
          
          if (receipt) {
            console.log("[DEBUG] Transaction receipt status:", receipt.status);
            console.log("[DEBUG] Transaction logs count:", receipt.logs.length);
            
            // Parse logs to find the PoolCreated event
            const poolCreatedEvent = receipt.logs.find(log => 
              log.topics[0] === '0x21a9d8e221211780696258a0986638686c9b9bc553568bff5192bb340a4a4f19' // keccak256("PoolCreated(address,address,string,string)")
            );
            
            if (poolCreatedEvent && poolCreatedEvent.topics.length >= 3) {
              // The pool address is the second indexed parameter (topics[2])
              const poolAddress = `0x${poolCreatedEvent.topics[2].substring(26)}`;
              console.log("[DEBUG] Found PoolCreated event, new pool address:", poolAddress);
              setNewPoolAddress(poolAddress);
              
              if (onPoolCreated) {
                onPoolCreated(poolAddress);
              }
            } else {
              console.error("[DEBUG] PoolCreated event not found in receipt logs");
            }
          } else {
            console.error("[DEBUG] No receipt returned for transaction");
          }
        } catch (err) {
          console.error("[DEBUG] Error getting pool from receipt:", err);
        }
      };
      
      getPoolFromReceipt();
    }
  }, [isConfirmed, txHash, publicClient, onPoolCreated, newPoolAddress]);

  // Handle success
  useEffect(() => {
    if (isSuccess && txHash) {
      console.log('[DEBUG] Transaction submitted successfully, hash:', txHash);
      toast.success('Transaction submitted! Waiting for confirmation...');
      
      // Add a timeout to manually check pool existence after a few seconds
      // This helps when the event listener might not detect the PoolCreated event
      if (publicClient && assetAddress) {
        setTimeout(async () => {
          try {
            console.log('[DEBUG] Manually checking if pool was created for asset:', assetAddress);
            const result = await publicClient.readContract({
              address: factoryAddress,
              abi: LOAN_POOL_FACTORY_ABI as Abi,
              functionName: 'assetToPools',
              args: [assetAddress as `0x${string}`]
            });
            
            console.log('[DEBUG] Manual pool check result:', result);
            if (result && result !== '0x0000000000000000000000000000000000000000') {
              console.log('[DEBUG] Pool found in registry at:', result);
              // Set the pool address if we don't already have it
              if (!newPoolAddress) {
                setNewPoolAddress(result as string);
                if (onPoolCreated) {
                  onPoolCreated(result as string);
                }
              }
            } else {
              console.log('[DEBUG] Pool not found in registry after manual check');
            }
          } catch (err) {
            console.error('[DEBUG] Error during manual pool check:', err);
          }
        }, 5000); // Check after 5 seconds
      }
    }
  }, [isSuccess, txHash, publicClient, assetAddress, factoryAddress, newPoolAddress, onPoolCreated]);

  // Update error message from contract error
  useEffect(() => {
    if (contractError) {
      console.error('[DEBUG] Contract error full details:', contractError);
      const errorMessage = contractError.message || 'Transaction failed';
      
      // Extract more meaningful error messages
      let userFriendlyError = errorMessage;
      if (errorMessage.includes("insufficient funds")) {
        userFriendlyError = "Insufficient funds for transaction. Make sure you have enough ETH to cover the pool creation fee and gas.";
      } else if (errorMessage.includes("user rejected")) {
        userFriendlyError = "Transaction was rejected in your wallet.";
      } else if (errorMessage.includes("already exists")) {
        userFriendlyError = "A pool for this asset already exists.";
      }
      
      console.error('[DEBUG] User friendly error:', userFriendlyError);
      setError(userFriendlyError);
      toast.error('Failed to create pool: ' + userFriendlyError);
    }
  }, [contractError]);

  // *** NEW: Check for address mismatch by loading deployment data ***
  useEffect(() => {
    const checkDeploymentAddress = () => {
      const factoryAddress = process.env.NEXT_PUBLIC_LOAN_POOL_FACTORY_ADDRESS;
      if (!factoryAddress) {
        throw new Error('Factory address not configured in environment variables');
      }
      return factoryAddress;
    };
    
    checkDeploymentAddress();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNewPoolAddress(null);
    
    try {
      console.log('[DEBUG] Starting pool creation process...');
      // Validate inputs
      if (!factoryValidated) {
        console.error('[DEBUG] Factory contract not validated');
        toast.error('Factory contract validation failed. Please contact support.');
        return;
      }
      
      if (!assetAddress || !isAddress(assetAddress)) {
        console.error('[DEBUG] Invalid asset address format');
        toast.error('Please enter a valid asset address');
        return;
      }
      
      if (!assetValidated) {
        console.error('[DEBUG] Asset address not validated as ERC20');
        toast.error('The asset address does not appear to be a valid ERC20 token');
        return;
      }

      if (!poolName || !poolSymbol) {
        console.error('[DEBUG] Missing pool name or symbol');
        toast.error('Please fill in pool name and symbol');
        return;
      }

      if (collateralFactor < 0 || collateralFactor > 100) {
        console.error('[DEBUG] Invalid collateral factor:', collateralFactor);
        toast.error('Collateral factor must be between 0 and 100');
        return;
      }

      if (reserveFactor < 0 || reserveFactor > 100) {
        console.error('[DEBUG] Invalid reserve factor:', reserveFactor);
        toast.error('Reserve factor must be between 0 and 100');
        return;
      }

      // Check if a pool already exists for this asset
      try {
        if (!publicClient) {
          console.warn("[DEBUG] Public client not available, skipping existing pool check");
        } else {
          console.log(`[DEBUG] Checking if pool exists for asset ${assetAddress}`);
          const result = await publicClient.readContract({
            address: factoryAddress,
            abi: LOAN_POOL_FACTORY_ABI as Abi,
            functionName: 'assetToPools',
            args: [assetAddress as `0x${string}`]
          });
          
          console.log(`[DEBUG] Asset to pool check result:`, result);
          
          if (result && result !== '0x0000000000000000000000000000000000000000') {
            console.error(`[DEBUG] Pool for asset ${assetAddress} already exists at ${result}`);
            setError(`A pool for this asset already exists at ${String(result).slice(0, 6)}...${String(result).slice(-4)}`);
            toast.error(`A pool for this asset already exists! Please use the existing pool.`);
            return;
          }
          
          console.log(`[DEBUG] No existing pool found for asset ${assetAddress}, proceeding with creation`);
        }
      } catch (err) {
        console.warn("[DEBUG] Error checking existing pool:", err);
        console.warn("[DEBUG] Will attempt to create anyway");
      }

      // NEW: Additional pre-flight checks
      if (publicClient) {
        try {
          // Check if we're the owner (this might be required)
          try {
            const ownerAbi = [{ 
              inputs: [], 
              name: 'owner', 
              outputs: [{ internalType: 'address', name: '', type: 'address' }], 
              stateMutability: 'view', 
              type: 'function' 
            }] as const;
            
            const owner = await publicClient.readContract({
              address: factoryAddress,
              abi: ownerAbi,
              functionName: 'owner'
            });
            
            if (owner && owner.toLowerCase() !== userAddress?.toLowerCase()) {
              console.warn(`[DEBUG] Current user (${userAddress}) is not the owner (${owner}) of the factory contract`);
              toast.warning("You're not the owner of the factory contract. Pool creation might fail if it's restricted.");
            }
          } catch (err) {
            console.warn("[DEBUG] Error checking owner:", err);
          }
          
          // Try to verify the implementation contract
          try {
            const implementationAbi = [{ 
              inputs: [], 
              name: 'implementation', 
              outputs: [{ internalType: 'address', name: '', type: 'address' }], 
              stateMutability: 'view', 
              type: 'function' 
            }] as const;
            
            const implementation = await publicClient.readContract({
              address: factoryAddress,
              abi: implementationAbi,
              functionName: 'implementation'
            });
            
            if (implementation) {
              const implCode = await publicClient.getBytecode({ address: implementation as `0x${string}` });
              if (!implCode || implCode === '0x') {
                console.error("[DEBUG] Implementation contract doesn't have bytecode:", implementation);
                toast.error("Implementation contract issue detected. Please contact support.");
                return;
              }
            }
          } catch (err) {
            console.warn("[DEBUG] Error checking implementation:", err);
          }
        } catch (err) {
          console.warn("[DEBUG] Error during pre-flight checks:", err);
        }
      }

      // Add this before the transaction submission in handleSubmit
      // Validate contract state
      if (publicClient) {
        try {
          console.log("[DEBUG] Validating contract state...");
          
          // Check if we can read basic contract state
          const feeCollector = await publicClient.readContract({
            address: factoryAddress,
            abi: LOAN_POOL_FACTORY_ABI as Abi,
            functionName: 'feeCollector'
          });
          console.log("[DEBUG] Fee collector address:", feeCollector);
          
          // Check if we can read the implementation
          const implementation = await publicClient.readContract({
            address: factoryAddress,
            abi: LOAN_POOL_FACTORY_ABI as Abi,
            functionName: 'implementation'
          });
          console.log("[DEBUG] Implementation address:", implementation);
          
          // Check if we can read the owner
          const owner = await publicClient.readContract({
            address: factoryAddress,
            abi: LOAN_POOL_FACTORY_ABI as Abi,
            functionName: 'owner'
          });
          console.log("[DEBUG] Contract owner:", owner);
          
          // Check if we can read the asset to pool mapping
          const existingPool = await publicClient.readContract({
            address: factoryAddress,
            abi: LOAN_POOL_FACTORY_ABI as Abi,
            functionName: 'assetToPools',
            args: [assetAddress as `0x${string}`]
          });
          console.log("[DEBUG] Existing pool for asset:", existingPool);
          
          // If we get here, we can read the contract state
          console.log("[DEBUG] Contract state validation successful");
        } catch (err) {
          console.error("[DEBUG] Contract state validation failed:", err);
          toast.error("Failed to validate contract state. Please try again or contact support.");
          return;
        }
      }

      console.log("[DEBUG] Submitting create pool transaction with parameters:", {
        factoryAddress,
        method: 'createLendingPool',
        asset: assetAddress,
        name: poolName,
        symbol: poolSymbol,
        collateralFactorBps: collateralFactor * 100,
        reserveFactorBps: reserveFactor * 100,
        value: poolCreationFee
      });

      const collateralFactorBps = collateralFactor * 100;
      const reserveFactorBps = reserveFactor * 100;
      
      // Validate fee before parsing to ensure it works correctly
      if (!validateFee(poolCreationFee)) {
        console.error('[DEBUG] Invalid fee detected before submission:', poolCreationFee);
        toast.error("Invalid pool creation fee. Please contact support.");
        return;
      }
      
      // ****** KEY FIX 1: More explicit fee handling and verification ******
      // If validation passes, parse the fee - using a more explicit and verified approach
      const feeString = poolCreationFee || '0.05';
      const feeValue = parseEther(feeString); 
      
      console.log("[DEBUG] Final fee calculation verification:", {
        poolCreationFee: feeString,
        parsedValue: feeValue.toString(),
        isValidBigInt: typeof feeValue === 'bigint',
        valueInEth: Number(feeValue) / 10**18,
        valueType: typeof feeValue
      });

      // ****** KEY FIX 2: More explicit transaction parameter construction ******
      try {
        console.log("[DEBUG] Constructing transaction with verified parameters");
        
        // Create well-defined transaction parameters object
        const txParams = {
          address: factoryAddress,
          abi: LOAN_POOL_FACTORY_ABI as Abi,
          functionName: 'createLendingPool',
          args: [
            assetAddress as `0x${string}`, 
            poolName, 
            poolSymbol, 
            BigInt(collateralFactorBps), 
            BigInt(reserveFactorBps)
          ],
          value: feeValue,
          gas: BigInt(3000000)
        };
        
        console.log("[DEBUG] Transaction parameters:", {
          to: txParams.address,
          functionName: txParams.functionName,
          value: txParams.value.toString(), 
          valueInEth: Number(txParams.value) / 10**18,
          args: txParams.args.map(arg => arg.toString())
        });
        
        // Execute the transaction with the explicitly constructed parameters
        const result = await writeContract(txParams);
        console.log("[DEBUG] writeContract result:", result);
        
        console.log("[DEBUG] Create pool transaction submitted, watching for events...");
      } catch (err) {
        console.error("[DEBUG] Transaction execution error:", err);
        
        // Log detailed error information
        if (err instanceof Error) {
          console.error("[DEBUG] Error name:", err.name);
          console.error("[DEBUG] Error message:", err.message);
          console.error("[DEBUG] Error stack:", err.stack);
        }
        
        // Check for specific error types
        if (err && typeof err === 'object') {
          console.error("[DEBUG] Error object keys:", Object.keys(err));
          if ('cause' in err) console.error("[DEBUG] Error cause:", err.cause);
          if ('details' in err) console.error("[DEBUG] Error details:", err.details);
          if ('data' in err) console.error("[DEBUG] Error data:", err.data);
        }
        
        // Last resort fallback with even higher gas limit
        console.log("[DEBUG] Trying fallback with higher gas limit");
        
        try {
          const fallbackResult = await writeContract({
            address: factoryAddress,
            abi: LOAN_POOL_FACTORY_ABI as Abi,
            functionName: 'createLendingPool',
            args: [
              assetAddress as `0x${string}`, 
              poolName, 
              poolSymbol, 
              BigInt(collateralFactorBps), 
              BigInt(reserveFactorBps)
            ],
            value: feeValue,
            gas: BigInt(4000000)
          });
          
          console.log("[DEBUG] Fallback transaction result:", fallbackResult);
        } catch (fallbackErr) {
          console.error("[DEBUG] Fallback transaction error:", fallbackErr);
        }
      }
      
    } catch (err: any) {
      console.error('[DEBUG] Detailed error creating pool:', err);
      
      // Enhanced error detection
      let errorMessage = err.message || 'Failed to create pool';
      let userFriendlyError = errorMessage;
      
      // Check for specific error conditions from debug analysis
      if (errorMessage.toLowerCase().includes('reverted') || 
          errorMessage.toLowerCase().includes('revert') ||
          (err.details && err.details.toLowerCase().includes('reverted'))) {
        
        // Common error patterns based on debug findings
        if (errorMessage.toLowerCase().includes('notowner')) {
          userFriendlyError = "Only the contract owner can create pools. Please contact the admin.";
        } else if (errorMessage.toLowerCase().includes('poolalreadyexists')) {
          userFriendlyError = "A pool for this asset already exists.";
        } else if (errorMessage.toLowerCase().includes('invalidasset')) {
          userFriendlyError = "The asset address is not valid for pool creation. It may not be a standard ERC20 token.";
        } else if (errorMessage.toLowerCase().includes('invalidcollateralfactor')) {
          userFriendlyError = "The collateral factor value is invalid according to the contract's requirements.";
        } else if (errorMessage.toLowerCase().includes('invalidreservefactor')) {
          userFriendlyError = "The reserve factor value is invalid according to the contract's requirements.";
        } else {
          userFriendlyError = "Transaction reverted. This might be due to the contract's internal validation or gas issues. Try reducing parameters or check with the contract owner.";
        }
      }
      
      if (err.cause) {
        console.error('[DEBUG] Error cause:', err.cause);
      }
      if (err.details) {
        console.error('[DEBUG] Error details:', err.details);
      }
      
      setError(userFriendlyError);
      toast.error('Failed to create pool: ' + userFriendlyError);
    }
  };

  const resetForm = () => {
    setAssetAddress('');
    setPoolName('');
    setPoolSymbol('');
    setCollateralFactor(75);
    setReserveFactor(10);
    setError('');
    setNewPoolAddress(null);
    setAssetValidated(false);
    setAssetSymbol('');
  };

  if (!userAddress) {
    return (
      <div className="p-4 bg-amber-900/20 border border-amber-700 rounded-lg flex items-center gap-2 text-amber-500">
        <AlertCircle className="h-5 w-5" />
        <p>Please connect your wallet to create a lending pool.</p>
      </div>
    );
  }

  if (isConfirmed && newPoolAddress) {
    return (
      <Card className="bg-gray-800 text-white shadow-xl border-gray-700">
        <CardContent className="pt-6 flex flex-col items-center justify-center">
          <div className="p-3 rounded-full bg-green-900/30 text-green-400 mb-4">
            <CheckCircle2 className="h-12 w-12" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Pool Created Successfully!</h2>
          <p className="text-gray-400 text-center mb-4">
            Your new lending pool has been created and is now ready to use.
          </p>
          
          <div className="bg-gray-700/50 p-4 rounded-lg w-full mb-4">
            <div className="flex justify-between mb-2">
              <span className="text-gray-400">Pool Name:</span>
              <span className="text-white font-medium">{poolName}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-400">Pool Symbol:</span>
              <span className="text-white font-medium">{poolSymbol}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-400">Asset Token:</span>
              <span className="text-white font-medium">{assetSymbol || "Unknown"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Pool Address:</span>
              <span className="text-white font-medium">{newPoolAddress.slice(0, 6)}...{newPoolAddress.slice(-4)}</span>
            </div>
          </div>
          
          <div className="flex space-x-4 w-full">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={resetForm}
            >
              Create Another Pool
            </Button>
            <Button
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => {
                if (onPoolCreated) onPoolCreated(newPoolAddress);
              }}
            >
              View In Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto border-primary/20">
      <CardHeader>
        <CardTitle>Create Lending Pool</CardTitle>
        {addressMismatchDetected && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mt-4" role="alert">
            <strong className="font-bold">Critical Error!</strong>
            <span className="block sm:inline"> You are using the wrong factory address!</span>
            <p className="mt-2">
              Current: <code className="bg-red-50 p-1 rounded">{factoryAddress}</code><br/>
              Correct: <code className="bg-green-50 p-1 rounded">{correctFactoryAddress}</code>
            </p>
            <p className="mt-2">
              Please update your environment variables or configuration to use the correct address.
            </p>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {error && (
          <div className="p-4 mb-4 bg-red-900/20 border border-red-700 rounded-lg flex items-center gap-2 text-red-500">
            <AlertCircle className="h-5 w-5" />
            <p>{error}</p>
          </div>
        )}
        
        {!factoryValidated && !error && (
          <div className="p-4 mb-4 bg-amber-900/20 border border-amber-700 rounded-lg flex items-center gap-2 text-amber-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            <p>Validating factory contract...</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="assetAddress" className="text-gray-300">Asset Address</Label>
            <div className="relative">
              <Input
                id="assetAddress"
                value={assetAddress}
                onChange={(e) => setAssetAddress(e.target.value)}
                placeholder="0x..."
                className={`bg-gray-700 border-gray-600 text-white pr-10 ${
                  assetValidated ? 'border-green-500' : assetAddress ? 'border-amber-500' : ''
                }`}
                disabled={isPending || isConfirming}
              />
              {validatingAsset && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                </div>
              )}
              {assetValidated && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                </div>
              )}
            </div>
            
            {assetValidated && assetSymbol && (
              <div className="mt-1 p-2 bg-green-900/20 border border-green-800/30 rounded flex items-center text-green-400 text-sm">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Token validated: {assetSymbol}
              </div>
            )}
            
            <p className="text-sm text-gray-400">
              The ERC20 token address that will be used for this lending pool.
            </p>
            
            <div className="mt-2 p-3 border border-gray-600 rounded-lg bg-gray-700/50">
              <p className="font-medium text-gray-300">Recommended: Use WETH (Wrapped ETH) for ETH-based pools</p>
              <p className="text-sm text-gray-400 mt-1">
                Direct ETH cannot be used; you need to use the wrapped version (WETH) or create a new token.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="poolName" className="text-gray-300">Pool Name</Label>
            <Input
              id="poolName"
              value={poolName}
              onChange={(e) => setPoolName(e.target.value)}
              placeholder="e.g., USDC Lending Pool"
              className="bg-gray-700 border-gray-600 text-white"
              disabled={isPending || isConfirming}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="poolSymbol" className="text-gray-300">Pool Symbol</Label>
            <Input
              id="poolSymbol"
              value={poolSymbol}
              onChange={(e) => setPoolSymbol(e.target.value)}
              placeholder="e.g., USDC-POOL"
              className="bg-gray-700 border-gray-600 text-white"
              disabled={isPending || isConfirming}
            />
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center">
                <Label htmlFor="collateralFactor" className="text-gray-300">Collateral Factor (%)</Label>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="ghost" className="h-6 w-6 ml-2 p-0">
                      <QuestionMarkCircledIcon className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-gray-800 text-white border-gray-700">
                    <DialogHeader>
                      <DialogTitle>Collateral Factor</DialogTitle>
                    </DialogHeader>
                    <DialogDescription className="text-gray-400">
                      The collateral factor determines how much of your deposited assets can be borrowed against. 
                      For example, a collateral factor of 75% means you can borrow up to 75% of the value of your deposited assets.
                      Higher values increase liquidation risk.
                    </DialogDescription>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Slider
                    value={[collateralFactor]}
                    onValueChange={(value) => setCollateralFactor(value[0])}
                    min={0}
                    max={100}
                    step={1}
                    className="mt-2"
                    disabled={isPending || isConfirming}
                  />
                </div>
                <div className="w-16 text-right">{collateralFactor}%</div>
              </div>
              <p className="text-sm text-gray-400 mt-1">
                Recommended: 75%. Higher values increase liquidation risk.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center">
                <Label htmlFor="reserveFactor" className="text-gray-300">Reserve Factor (%)</Label>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="ghost" className="h-6 w-6 ml-2 p-0">
                      <QuestionMarkCircledIcon className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-gray-800 text-white border-gray-700">
                    <DialogHeader>
                      <DialogTitle>Reserve Factor</DialogTitle>
                    </DialogHeader>
                    <DialogDescription className="text-gray-400">
                      The reserve factor determines what percentage of the interest paid by borrowers is set aside as reserves.
                      These reserves protect the protocol from insolvency. Higher values reduce yields for lenders.
                    </DialogDescription>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Slider
                    value={[reserveFactor]}
                    onValueChange={(value) => setReserveFactor(value[0])}
                    min={0}
                    max={100}
                    step={1}
                    className="mt-2"
                    disabled={isPending || isConfirming}
                  />
                </div>
                <div className="w-16 text-right">{reserveFactor}%</div>
              </div>
              <p className="text-sm text-gray-400 mt-1">
                Recommended: 10%. Higher values reduce depositor yields.
              </p>
            </div>
          </div>

          <div className="mt-6 p-4 border border-gray-600 rounded-lg bg-gray-700/50">
            <h4 className="font-medium text-gray-300">Pool Creation Fee: {poolCreationFee} ETH</h4>
            <p className="text-sm text-gray-400 mt-1">
              This one-time fee is charged when creating a new lending pool
            </p>
            <p className="text-sm text-gray-400">
              Note: An additional protocol fee of 10% is taken from interest earned
            </p>
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex-col gap-4 border-t pt-4">
        <div className="w-full flex flex-col space-y-3">
          <DirectPoolCreator
            factoryAddress={factoryAddress}
            assetAddress={assetAddress as `0x${string}`}
            poolName={poolName}
            poolSymbol={poolSymbol}
            collateralFactorBps={collateralFactor * 100}
            reserveFactorBps={reserveFactor * 100}
            disabled={!assetValidated || !factoryValidated || isPending || isConfirming}
            onSuccess={(txHash) => {
              console.log("[DIRECT] Transaction submitted:", txHash);
              // Set the txHash so the transaction watcher picks it up
              if (onPoolCreated) {
                // We'll manually check for the pool after a delay
                setTimeout(async () => {
                  try {
                    if (!publicClient) return;
                    
                    console.log("[DIRECT] Checking for pool creation...");
                    const poolAddress = await publicClient.readContract({
                      address: factoryAddress,
                      abi: LOAN_POOL_FACTORY_ABI as Abi,
                      functionName: 'assetToPools',
                      args: [assetAddress as `0x${string}`]
                    });
                    
                    if (poolAddress && poolAddress !== '0x0000000000000000000000000000000000000000') {
                      console.log("[DIRECT] Pool found at:", poolAddress);
                      setNewPoolAddress(poolAddress as string);
                      onPoolCreated(poolAddress as string);
                    } else {
                      console.log("[DIRECT] No pool found for asset after creation.");
                    }
                  } catch (err) {
                    console.error("[DIRECT] Error checking pool:", err);
                  }
                }, 5000);
              }
            }}
          />
        </div>
      </CardFooter>
    </Card>
  );
} 