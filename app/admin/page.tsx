"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { useAccount } from 'wagmi';
import { BrowserProvider, Contract, formatEther, parseEther } from 'ethers';
import TokenFactoryABI from '@/contracts/abis/TokenFactory.json';
import { NetworkRequirements } from '@/components/network/NetworkRequirements';

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentFee, setCurrentFee] = useState<string>('0');
  const [newFee, setNewFee] = useState<string>('');
  const [discountAddress, setDiscountAddress] = useState('');
  const [discountAmount, setDiscountAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contractBalance, setContractBalance] = useState<string>('0');

  const { address } = useAccount();

  // Check admin status and load contract data
  useEffect(() => {
    const loadContractData = async () => {
      if (!address || !window.ethereum) {
        setIsLoading(false);
        return;
      }

      try {
        const provider = new BrowserProvider(window.ethereum);
        const contractAddress = process.env.NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS;
        
        if (!contractAddress) {
          throw new Error('Contract address not configured');
        }

        const contract = new Contract(contractAddress, TokenFactoryABI, provider);
        
        // Check if user is admin
        const owner = await contract.owner();
        const isUserAdmin = owner.toLowerCase() === address.toLowerCase();
        setIsAdmin(isUserAdmin);

        if (isUserAdmin) {
          // Load contract data
          const fee = await contract.creationFee();
          setCurrentFee(formatEther(fee));

          // Get contract balance
          const balance = await provider.getBalance(contractAddress);
          setContractBalance(formatEther(balance));
        }

      } catch (err) {
        console.error('Error loading contract data:', err);
        setError('Failed to load contract data');
      } finally {
        setIsLoading(false);
      }
    };

    loadContractData();
  }, [address]);

  const handleUpdateFee = async () => {
    if (!window.ethereum || !address) return;
    
    try {
      setIsSubmitting(true);
      setError(null);

      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contractAddress = process.env.NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS;
      
      if (!contractAddress) {
        throw new Error('Contract address not configured');
      }

      const contract = new Contract(contractAddress, TokenFactoryABI, signer);
      
      const tx = await contract.updateCreationFee(parseEther(newFee));
      await tx.wait();
      
      // Update current fee
      const updatedFee = await contract.creationFee();
      setCurrentFee(formatEther(updatedFee));
      setNewFee('');
      
    } catch (err: any) {
      console.error('Error updating fee:', err);
      setError(err.message || 'Failed to update fee');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetDiscount = async () => {
    if (!window.ethereum || !address) return;
    
    try {
      setIsSubmitting(true);
      setError(null);

      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contractAddress = process.env.NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS;
      
      if (!contractAddress) {
        throw new Error('Contract address not configured');
      }

      const contract = new Contract(contractAddress, TokenFactoryABI, signer);
      
      const tx = await contract.setDiscountedFee(
        discountAddress,
        parseEther(discountAmount)
      );
      await tx.wait();
      
      setDiscountAddress('');
      setDiscountAmount('');
      
    } catch (err: any) {
      console.error('Error setting discount:', err);
      setError(err.message || 'Failed to set discount');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWithdraw = async () => {
    if (!window.ethereum || !address) return;
    
    try {
      setIsSubmitting(true);
      setError(null);

      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contractAddress = process.env.NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS;
      
      if (!contractAddress) {
        throw new Error('Contract address not configured');
      }

      const contract = new Contract(contractAddress, TokenFactoryABI, signer);
      
      const tx = await contract.withdrawFees();
      await tx.wait();
      
      // Update contract balance
      const balance = await provider.getBalance(contractAddress);
      setContractBalance(formatEther(balance));
      
    } catch (err: any) {
      console.error('Error withdrawing funds:', err);
      setError(err.message || 'Failed to withdraw funds');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertDescription>
            You do not have permission to access this page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-4">
      <NetworkRequirements />
      
      <div className="max-w-4xl mx-auto space-y-4">
        <h1 className="text-xl font-bold mb-3">Contract Administration</h1>

        {error && (
          <Alert variant="destructive" className="py-2">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Contract Overview & Fee Management Combined */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Contract & Fee Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Contract Info */}
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <span className="text-gray-400">Contract: </span>
                <span className="font-mono text-xs">{process.env.NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS}</span>
              </div>
              <div>
                <span className="text-gray-400">Current Fee: </span>
                <span>{currentFee} ETH</span>
              </div>
              <div>
                <span className="text-gray-400">Balance: </span>
                <span>{contractBalance} ETH</span>
              </div>
            </div>

            {/* Update Fee */}
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={newFee}
                onChange={(e) => setNewFee(e.target.value)}
                placeholder="New Fee (ETH)"
                className="flex-1 p-1.5 rounded bg-gray-700 text-white text-sm"
              />
              <Button
                onClick={handleUpdateFee}
                disabled={isSubmitting || !newFee}
                className="whitespace-nowrap"
                size="sm"
              >
                {isSubmitting ? <Spinner className="h-4 w-4" /> : 'Update Fee'}
              </Button>
            </div>

            {/* Withdraw Section */}
            <div className="flex gap-2 items-center justify-between border-t border-gray-700 pt-2">
              <span className="text-sm text-gray-400">
                Available to withdraw: {contractBalance} ETH
              </span>
              <Button
                onClick={handleWithdraw}
                disabled={isSubmitting || parseFloat(contractBalance) === 0}
                size="sm"
                variant={parseFloat(contractBalance) > 0 ? "default" : "secondary"}
              >
                {isSubmitting ? <Spinner className="h-4 w-4" /> : 'Withdraw All'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Discount Management */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Discount Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-[1fr,auto] gap-2 items-start">
              <div className="space-y-2">
                <input
                  type="text"
                  value={discountAddress}
                  onChange={(e) => setDiscountAddress(e.target.value)}
                  placeholder="Address (0x...)"
                  className="w-full p-1.5 rounded bg-gray-700 text-white text-sm"
                />
                <input
                  type="text"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value)}
                  placeholder="Discounted Fee (ETH)"
                  className="w-full p-1.5 rounded bg-gray-700 text-white text-sm"
                />
              </div>
              <Button
                onClick={handleSetDiscount}
                disabled={isSubmitting || !discountAddress || !discountAmount}
                size="sm"
                className="h-full"
              >
                {isSubmitting ? <Spinner className="h-4 w-4" /> : 'Set\nDiscount'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 