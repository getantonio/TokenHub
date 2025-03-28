import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useAccount, useWriteContract, useReadContract } from 'wagmi';
import { parseEther, Abi } from 'viem';
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
import { AlertCircle } from 'lucide-react';

interface CreatePoolFormProps {
  onPoolCreated?: (poolAddress: string) => void;
  factoryAddress: `0x${string}`;
}

export function CreatePoolForm({ onPoolCreated, factoryAddress }: CreatePoolFormProps) {
  const { address: userAddress } = useAccount();
  const { writeContract, isPending, isSuccess, error: contractError } = useWriteContract();

  // Form state
  const [assetAddress, setAssetAddress] = useState('');
  const [poolName, setPoolName] = useState('');
  const [poolSymbol, setPoolSymbol] = useState('');
  const [collateralFactor, setCollateralFactor] = useState(75);
  const [reserveFactor, setReserveFactor] = useState(10);
  const [error, setError] = useState('');

  // Get fee information
  const { data: feeCollectorAddress } = useReadContract({
    address: factoryAddress,
    abi: LOAN_POOL_FACTORY_ABI as Abi,
    functionName: 'feeCollector',
  });

  const [poolCreationFee, setPoolCreationFee] = useState('0.05');

  // Fetch fee amount from the fee collector
  useEffect(() => {
    const fetchFee = async () => {
      if (feeCollectorAddress) {
        try {
          // Note: In a real app, you would have an API endpoint or direct contract call
          // For simplicity, we'll use a static value
          setPoolCreationFee('0.05');
        } catch (err) {
          console.error('Error fetching fee:', err);
          setPoolCreationFee('0.05'); // Default fee
        }
      }
    };
    
    fetchFee();
  }, [feeCollectorAddress]);

  // Handle success
  useEffect(() => {
    if (isSuccess && onPoolCreated) {
      resetForm();
      onPoolCreated(assetAddress);
      toast.success('Pool created successfully!');
    }
  }, [isSuccess, onPoolCreated, assetAddress]);

  // Update error message from contract error
  useEffect(() => {
    if (contractError) {
      setError(contractError.message || 'Transaction failed');
      toast.error('Failed to create pool');
    }
  }, [contractError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      // Validate inputs
      if (!assetAddress || !poolName || !poolSymbol) {
        toast.error('Please fill in all fields');
        return;
      }

      if (collateralFactor < 0 || collateralFactor > 100) {
        toast.error('Collateral factor must be between 0 and 100');
        return;
      }

      if (reserveFactor < 0 || reserveFactor > 100) {
        toast.error('Reserve factor must be between 0 and 100');
        return;
      }

      const collateralFactorBps = collateralFactor * 100;
      const reserveFactorBps = reserveFactor * 100;

      // Create pool
      await writeContract({
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
        value: parseEther(poolCreationFee || '0.05')
      });
      
    } catch (err: any) {
      console.error('Error creating pool:', err);
      setError(err.message || 'Failed to create pool');
      toast.error('Failed to create pool');
    }
  };

  const resetForm = () => {
    setAssetAddress('');
    setPoolName('');
    setPoolSymbol('');
    setCollateralFactor(75);
    setReserveFactor(10);
    setError('');
  };

  if (!userAddress) {
    return (
      <div className="p-4 bg-amber-900/20 border border-amber-700 rounded-lg flex items-center gap-2 text-amber-500">
        <AlertCircle className="h-5 w-5" />
        <p>Please connect your wallet to create a lending pool.</p>
      </div>
    );
  }

  return (
    <Card className="bg-gray-800 text-white shadow-xl border-gray-700">
      <CardHeader>
        <CardTitle className="text-xl font-bold">Create New Lending Pool</CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="p-4 mb-4 bg-red-900/20 border border-red-700 rounded-lg flex items-center gap-2 text-red-500">
            <AlertCircle className="h-5 w-5" />
            <p>{error}</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="assetAddress" className="text-gray-300">Asset Address</Label>
            <Input
              id="assetAddress"
              value={assetAddress}
              onChange={(e) => setAssetAddress(e.target.value)}
              placeholder="0x..."
              className="bg-gray-700 border-gray-600 text-white"
              disabled={isPending}
            />
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
              disabled={isPending}
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
              disabled={isPending}
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
                    disabled={isPending}
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
                    disabled={isPending}
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
      <CardFooter>
        <Button
          type="button"
          onClick={handleSubmit}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          disabled={isPending}
        >
          {isPending ? 'Creating Pool...' : 'Create Pool'}
        </Button>
      </CardFooter>
    </Card>
  );
} 