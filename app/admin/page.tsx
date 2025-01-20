"use client";

import { useState, useEffect } from 'react';
import { useAccount, useConnect } from 'wagmi';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BrowserProvider, Contract } from 'ethers';
import { parseUnits } from 'viem';
import TokenFactoryABI from '@/contracts/abis/TokenFactory.json';

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [discountAddress, setDiscountAddress] = useState('');
  const [discountAmount, setDiscountAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const { address } = useAccount();
  const { connect, connectors } = useConnect();

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!address || !window.ethereum) {
        setDebugInfo('No address or ethereum provider found');
        setIsLoading(false);
        return;
      }
      try {
        const contractAddress = process.env.NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS;
        setDebugInfo(`Checking admin status for address: ${address}\nContract address: ${contractAddress}`);
        
        if (!contractAddress) {
          throw new Error('Contract address not configured in environment');
        }

        const provider = new BrowserProvider(window.ethereum as any);
        const factory = new Contract(
          contractAddress,
          TokenFactoryABI,
          provider
        );
        const owner = await factory.owner();
        setDebugInfo(prev => `${prev}\nContract owner: ${owner}`);
        setIsAdmin(owner.toLowerCase() === address.toLowerCase());
        setDebugInfo(prev => `${prev}\nIs admin: ${owner.toLowerCase() === address.toLowerCase()}`);
      } catch (err: any) {
        console.error('Error checking admin status:', err);
        setError('Failed to verify admin status');
        setDebugInfo(prev => `${prev}\nError: ${err.message}`);
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

      const provider = new BrowserProvider(window.ethereum as any);
      const signer = await provider.getSigner();
      const factory = new Contract(
        process.env.NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS as string,
        TokenFactoryABI,
        signer
      );

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
      <div className="flex justify-center items-center min-h-screen">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (!address) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <Alert>
          <AlertDescription>
            Please connect your wallet to access the admin panel.
            <div className="mt-4">
              {connectors.map((connector) => (
                <Button
                  key={connector.uid}
                  onClick={() => connect({ connector })}
                  className="mr-2"
                >
                  Connect {connector.name}
                </Button>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <Alert>
          <AlertDescription>
            You must be the contract owner to access this page.
            <pre className="mt-4 p-2 bg-gray-800 rounded text-xs whitespace-pre-wrap">
              {debugInfo}
            </pre>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      
      <Card className="bg-gray-800 border-gray-700 mb-4">
        <CardHeader className="py-3 border-b border-gray-700">
          <CardTitle className="text-lg">Discount Management</CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Discount Address</label>
              <input
                type="text"
                value={discountAddress}
                onChange={(e) => setDiscountAddress(e.target.value)}
                placeholder="0x..."
                className="w-full p-1.5 rounded bg-gray-700 text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Discount Amount (ETH)</label>
              <input
                type="text"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(e.target.value)}
                placeholder="0.05"
                className="w-full p-1.5 rounded bg-gray-700 text-white text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">
                Set to 0 for free token creation, or any amount less than the standard fee (0.1 ETH)
              </p>
            </div>
            <Button
              onClick={handleSetDiscount}
              disabled={isSubmitting || !discountAddress || !discountAmount}
              className="w-full"
            >
              {isSubmitting ? <Spinner /> : 'Set Discount'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <pre className="mt-4 p-2 bg-gray-800 rounded text-xs whitespace-pre-wrap">
        {debugInfo}
      </pre>
    </div>
  );
} 