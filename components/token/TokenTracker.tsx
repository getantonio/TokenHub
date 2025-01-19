import { useState, useEffect } from 'react';
import { useAccount, useTransaction } from 'wagmi';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatEther } from 'ethers';
import { ethers } from 'ethers';

interface TokenTrackerProps {
  tokenAddress?: string;
  transactionHash?: string;
}

export function TokenTracker({ tokenAddress, transactionHash }: TokenTrackerProps) {
  const { address } = useAccount();
  const [isAdded, setIsAdded] = useState(false);
  const [status, setStatus] = useState<'pending' | 'success' | 'error'>('pending');
  const [tokenDetails, setTokenDetails] = useState<{
    name?: string;
    symbol?: string;
    totalSupply?: string;
  }>({});

  const { data: txData, isLoading } = useTransaction({
    hash: transactionHash as `0x${string}`,
  });

  useEffect(() => {
    const fetchTokenDetails = async () => {
      if (!tokenAddress) return;
      try {
        const provider = new ethers.BrowserProvider(window.ethereum!);
        const tokenContract = new ethers.Contract(
          tokenAddress,
          ['function name() view returns (string)', 'function symbol() view returns (string)', 'function totalSupply() view returns (uint256)'],
          provider
        );

        const [name, symbol, totalSupply] = await Promise.all([
          tokenContract.name(),
          tokenContract.symbol(),
          tokenContract.totalSupply(),
        ]);

        setTokenDetails({ name, symbol, totalSupply: formatEther(totalSupply) });
        setStatus('success');
      } catch (error) {
        console.error('Error fetching token details:', error);
        setStatus('error');
      }
    };

    if (tokenAddress && !isLoading) {
      fetchTokenDetails();
    }
  }, [tokenAddress, isLoading]);

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
        {isLoading && (
          <div className="space-y-2">
            <p>Deploying token...</p>
            <Progress value={undefined} />
          </div>
        )}
        
        {status === 'success' && tokenDetails.name && (
          <div className="space-y-4">
            <div className="grid gap-2">
              <div>
                <p className="text-sm text-gray-400">Token Address:</p>
                <p className="font-mono text-sm break-all">{tokenAddress}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Name:</p>
                <p>{tokenDetails.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Symbol:</p>
                <p>{tokenDetails.symbol}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Total Supply:</p>
                <p>{tokenDetails.totalSupply} tokens</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Transaction:</p>
                <a 
                  href={`https://sepolia.etherscan.io/tx/${transactionHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline break-all"
                >
                  {transactionHash}
                </a>
              </div>
            </div>
            
            <Button onClick={addToWallet} disabled={isAdded}>
              {isAdded ? 'Added to Wallet' : 'Add Token to Wallet'}
            </Button>
          </div>
        )}

        {status === 'error' && (
          <Alert variant="destructive">
            <AlertDescription>
              Failed to fetch token details. Please verify the contract on the block explorer.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
} 