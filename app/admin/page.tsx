"use client";

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BrowserProvider, Contract, isAddress } from 'ethers';
import { parseUnits } from 'viem';
import TokenFactoryABI from '@/contracts/abis/TokenFactory.json';
import { getContractOwner } from '@/lib/alchemy';

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [discountAddress, setDiscountAddress] = useState('');
  const [discountAmount, setDiscountAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { address } = useAccount();

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!address) {
        setIsLoading(false);
        setError('Please connect your wallet first');
        return;
      }

      try {
        const contractAddress = process.env.NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS;
        if (!contractAddress || !isAddress(contractAddress)) {
          throw new Error('Invalid contract address configuration');
        }

        const owner = await getContractOwner(contractAddress);
        if (!owner) {
          throw new Error('Failed to get contract owner');
        }

        const isOwner = owner.toLowerCase() === address.toLowerCase();
        setIsAdmin(isOwner);
        
        if (!isOwner) {
          setError('You must be the contract owner to access this page');
        }
      } catch (err: any) {
        console.error('Admin check error:', err);
        setError(err.message || 'Failed to check admin status');
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminStatus();
  }, [address]);

  const handleSetDiscount = async () => {
    if (!address || !window.ethereum) return;
    
    try {
      setIsSubmitting(true);
      setError(null);

      const contractAddress = process.env.NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS;
      if (!contractAddress || !isAddress(contractAddress)) {
        throw new Error('Invalid contract address configuration');
      }

      if (!isAddress(discountAddress)) {
        throw new Error('Invalid discount address');
      }

      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const factory = new Contract(contractAddress, TokenFactoryABI, signer);

      const tx = await factory.setDiscountedFee(
        discountAddress,
        parseUnits(discountAmount || '0', 18)
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-900 p-8">
        <Alert variant="destructive">
          <AlertDescription>
            {error || 'You must be the contract owner to access this page'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle>Admin Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Wallet Address"
                value={discountAddress}
                onChange={(e) => setDiscountAddress(e.target.value)}
                className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Discount Amount (ETH)"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(e.target.value)}
                className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <Button
              onClick={handleSetDiscount}
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? <Spinner className="h-4 w-4" /> : 'Set Discount'}
            </Button>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 