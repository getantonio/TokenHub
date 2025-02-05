import React, { useState, useEffect } from 'react';
import { BrowserProvider, Contract, formatUnits } from 'ethers';
import TokenFactory_v1 from '@contracts/abi/TokenFactory_v1.1.0.json';
import TokenTemplate_v1 from '@contracts/abi/TokenTemplate_v1.1.0.json';
import { Card, CardHeader, CardTitle, CardContent } from '@components/ui/card';
import { useToast } from '@components/ui/toast/use-toast';
import { Spinner } from '@components/ui/Spinner';
import { Button } from '@/components/ui/button';
import { useNetwork } from '@contexts/NetworkContext';

interface Props {
  isConnected: boolean;
  address?: string;
  provider: BrowserProvider | null;
}

interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  totalSupply: string;
}

export default function TCAP_v1({ isConnected, address, provider }: Props) {
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { chainId } = useNetwork();

  useEffect(() => {
    if (isConnected && address && provider) {
      loadTokens();
    }
  }, [isConnected, address, provider, chainId]);

  const loadTokens = async () => {
    if (!isConnected || !address || !provider) {
      setError('Please connect your wallet');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // First verify the contract exists
      const code = await provider.getCode(address);
      if (code === '0x') {
        setError('Token factory not deployed on this network');
        setTokens([]);
        return;
      }

      const factory = new Contract(address, TokenFactory_v1.abi, provider);
      
      // Verify contract version
      try {
        const version = await factory.VERSION();
        console.log('Factory version:', version);
      } catch (err) {
        console.warn('Could not verify factory version');
      }

      let deployedTokens: string[] = [];
      try {
        deployedTokens = await factory.getDeployedTokens();
      } catch (err) {
        console.error('Error getting deployed tokens:', err);
        setError('Could not fetch deployed tokens. The contract might not be properly initialized.');
        setTokens([]);
        return;
      }

      if (!deployedTokens || deployedTokens.length === 0) {
        setTokens([]);
        return;
      }

      const tokenPromises = deployedTokens.map(async (tokenAddress: string) => {
        try {
          const tokenContract = new Contract(tokenAddress, TokenTemplate_v1.abi, provider);
          
          const [name, symbol, totalSupply] = await Promise.all([
            tokenContract.name().catch(() => 'Unknown'),
            tokenContract.symbol().catch(() => '???'),
            tokenContract.totalSupply().catch(() => BigInt(0))
          ]);

          return {
            address: tokenAddress,
            name,
            symbol,
            totalSupply: formatUnits(totalSupply, 18)
          };
        } catch (err) {
          console.error(`Error loading token ${tokenAddress}:`, err);
          return null;
        }
      });

      const tokenResults = await Promise.all(tokenPromises);
      const validTokens = tokenResults.filter((token): token is TokenInfo => token !== null);
      setTokens(validTokens);

    } catch (err) {
      console.error('Error loading tokens:', err);
      setError('Failed to load tokens. Please check if you are on the correct network.');
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load tokens. Please check your network connection and try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isConnected || !address || !provider) {
    return null;
  }

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-lg font-semibold text-white">Your Tokens</CardTitle>
            <p className="text-sm text-gray-400">Manage your deployed tokens</p>
          </div>
          <Button
            onClick={loadTokens}
            disabled={isLoading}
            variant="secondary"
            className="h-8 px-3 text-sm"
          >
            {isLoading ? <Spinner className="w-4 h-4" /> : 'Refresh'}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <Spinner className="w-6 h-6" />
          </div>
        ) : error ? (
          <div className="text-center py-6 text-red-400">
            {error}
          </div>
        ) : tokens.length > 0 ? (
          <div className="space-y-3">
            {tokens.map(token => (
              <div key={token.address} className="p-3 bg-gray-900 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-base font-medium text-white">{token.name} ({token.symbol})</h3>
                    <p className="text-sm text-gray-400 mt-1">Supply: {Number(token.totalSupply).toLocaleString()} {token.symbol}</p>
                  </div>
                  <div className="text-xs text-gray-500">
                    {token.address.slice(0, 6)}...{token.address.slice(-4)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-gray-400">
            No tokens found. Create one using the form above.
          </div>
        )}
      </CardContent>
    </Card>
  );
} 