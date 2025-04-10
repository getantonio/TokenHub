import React, { useState } from 'react';
import { useStacksWallet } from '@/contexts/StacksWalletContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/toast/use-toast';
import { request } from '@stacks/connect';

interface BatchFeeFormProps {
  deploymentFee?: number; // in STX
}

export default function BatchFeeForm({ deploymentFee = 1 }: BatchFeeFormProps) {
  const [tokenCount, setTokenCount] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(false);
  const { isConnected: isStacksConnected, address: stacksAddress } = useStacksWallet();
  const { toast } = useToast();

  // Calculate total fee
  const totalFee = tokenCount * deploymentFee;

  // Handle fee payment
  const handlePayFee = async () => {
    if (!isStacksConnected || !stacksAddress) {
      toast({
        variant: "destructive",
        title: "Wallet Error",
        description: "Please connect your Stacks wallet first."
      });
      return;
    }

    if (!process.env.NEXT_PUBLIC_STX_FEE_ADDRESS) {
      toast({
        variant: "destructive",
        title: "Configuration Error",
        description: "Fee collection address not configured. Please contact support."
      });
      return;
    }

    try {
      setIsLoading(true);

      // Call fee payment function
      const response = await request('stx_transferStx', {
        recipient: process.env.NEXT_PUBLIC_STX_FEE_ADDRESS,
        amount: (totalFee * 1000000).toString(), // Convert to microSTX
        memo: `TokenHub batch fee for ${tokenCount} tokens`,
      });

      if (response && response.txid) {
        toast({
          title: "Payment Successful",
          description: `Paid fee for ${tokenCount} tokens. Transaction ID: ${response.txid.slice(0, 10)}...`
        });
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        variant: "destructive",
        title: "Payment Error",
        description: error instanceof Error ? error.message : "An unknown error occurred"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-6 bg-gray-900 text-white">
      <h2 className="text-2xl font-bold mb-6">Batch Fee Payment</h2>
      
      <div className="space-y-6">
        <div>
          <Label htmlFor="tokenCount">Number of Tokens</Label>
          <Input
            id="tokenCount"
            type="number"
            min="1"
            value={tokenCount}
            onChange={(e) => setTokenCount(Math.max(1, parseInt(e.target.value) || 1))}
            className="mt-2"
          />
        </div>

        <div className="p-4 border border-gray-700 rounded-lg">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm font-medium">Total Fee:</span>
            <span className="text-sm font-semibold">{totalFee} STX</span>
          </div>
          <p className="text-xs text-gray-400 mb-4">
            Pay once for multiple token deployments ({deploymentFee} STX per token)
          </p>
          <Button
            onClick={handlePayFee}
            className="w-full bg-green-600 hover:bg-green-700"
            disabled={isLoading || !isStacksConnected || !process.env.NEXT_PUBLIC_STX_FEE_ADDRESS}
          >
            {isLoading ? <Spinner /> : `Pay Fee for ${tokenCount} Tokens`}
          </Button>
        </div>
      </div>
    </Card>
  );
} 