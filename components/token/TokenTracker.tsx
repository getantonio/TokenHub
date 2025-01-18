import { useState } from 'react';
import { useAccount, useTransaction } from 'wagmi';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface TokenTrackerProps {
  tokenAddress?: string;
  transactionHash?: string;
}

export function TokenTracker({ tokenAddress, transactionHash }: TokenTrackerProps) {
  const { address } = useAccount();
  const [isAdded, setIsAdded] = useState(false);

  const { data: txData, isLoading, isSuccess } = useTransaction({
    hash: transactionHash as `0x${string}`,
    enabled: !!transactionHash,
  });

  const addToWallet = async () => {
    try {
      if (!tokenAddress || !window.ethereum) return;

      const wasAdded = await window.ethereum.request({
        method: 'wallet_watchAsset',
        params: [{
          type: 'ERC20',
          options: {
            address: tokenAddress,
            symbol: 'YOUR_TOKEN', // Get from contract
            decimals: 18,
            image: '', // Optional token logo URL
          },
        }],
      });

      if (wasAdded) {
        setIsAdded(true);
      }
    } catch (error) {
      console.error('Error adding token to wallet:', error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Token Deployment Status</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <p>Deploying token...</p>}
        {isSuccess && (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-400">Token Address:</p>
              <p className="font-mono text-sm">{tokenAddress}</p>
            </div>
            <Button onClick={addToWallet} disabled={isAdded}>
              {isAdded ? 'Added to Wallet' : 'Add Token to Wallet'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 