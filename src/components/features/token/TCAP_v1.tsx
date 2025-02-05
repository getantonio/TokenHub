import React, { useState, useEffect } from 'react';
import { BrowserProvider, Contract } from 'ethers';
import TokenTemplate_v1 from '@contracts/abi/TokenTemplate_v1.1.0.json';
import { Button } from '@components/ui/button';
import { Card } from '@components/ui/card';
import { useToast } from '@/components/ui/toast/use-toast';
import { Spinner } from '@components/ui/Spinner';

interface TokenAdminProps {
  isConnected: boolean;
  address?: string;
  provider: BrowserProvider | null;
}

export default function TokenAdmin({ isConnected, address, provider }: TokenAdminProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [tokenInfo, setTokenInfo] = useState<{
    name: string;
    symbol: string;
    totalSupply: string;
    blacklistEnabled: boolean;
    timeLockEnabled: boolean;
  } | null>(null);

  useEffect(() => {
    if (isConnected && address && provider) {
      loadTokenInfo();
    }
  }, [isConnected, address, provider]);

  const loadTokenInfo = async () => {
    if (!address || !provider) {
      console.error("Missing address or provider");
      return;
    }

    try {
      setIsLoading(true);
      
      // First check if the contract exists and has code
      const code = await provider.getCode(address);
      if (code === '0x') {
        throw new Error('No contract found at this address');
      }

      const token = new Contract(address, TokenTemplate_v1.abi, provider);
      
      // Check if contract has required methods before calling them
      const [name, symbol, totalSupply, blacklistEnabled, timeLockEnabled] = await Promise.all([
        token.name().catch(() => ''),
        token.symbol().catch(() => ''),
        token.totalSupply().catch(() => BigInt(0)),
        token.blacklistEnabled().catch(() => false),
        token.timeLockEnabled().catch(() => false)
      ]);

      setTokenInfo({
        name: name || 'Unknown',
        symbol: symbol || 'Unknown',
        totalSupply: totalSupply.toString(),
        blacklistEnabled,
        timeLockEnabled
      });
    } catch (error: any) {
      console.error('Error loading token info:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load token information. Please verify this is a valid V1 token contract.',
        variant: 'destructive'
      });
      setTokenInfo(null);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <Card className="p-6">
        <p className="text-gray-400">Please connect your wallet to access admin features.</p>
      </Card>
    );
  }

  if (!address) {
    return (
      <Card className="p-6">
        <p className="text-gray-400">No token address provided.</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      {isLoading ? (
        <div className="flex justify-center items-center">
          <Spinner className="w-8 h-8" />
        </div>
      ) : tokenInfo ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-400">Name</h3>
              <p className="mt-1">{tokenInfo.name}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-400">Symbol</h3>
              <p className="mt-1">{tokenInfo.symbol}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-400">Total Supply</h3>
              <p className="mt-1">{tokenInfo.totalSupply}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-400">Features</h3>
              <p className="mt-1">
                {tokenInfo.blacklistEnabled && 'Blacklist '}
                {tokenInfo.timeLockEnabled && 'TimeLock'}
              </p>
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <Button
              onClick={loadTokenInfo}
              variant="secondary"
            >
              Refresh Info
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-gray-400">Failed to load token information. Please verify this is a valid V1 token contract.</p>
      )}
    </Card>
  );
} 