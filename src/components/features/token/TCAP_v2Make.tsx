'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { BrowserProvider, Contract, formatEther } from 'ethers';
import TokenFactoryV2MakeABI from '@/contracts/abi/TokenFactory_v2_Make.json';
import TestTokenABI from '@/contracts/abi/TestToken.json';
import { PublicClient } from 'viem';
import { Switch } from '@/components/ui/switch';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useLocalStorage } from '@/hooks/useLocalStorage';

interface TCAP_v2MakeProps {
  isConnected: boolean;
  address?: string;
  provider?: PublicClient;
}

interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  totalSupply: bigint;
  marketingFeePercent: number;
  developmentFeePercent: number;
  autoLiquidityFeePercent: number;
  marketingWallet: string;
  developmentWallet: string;
  enableBuyFees: boolean;
  enableSellFees: boolean;
  isVisible?: boolean;
}

interface TokenVisibilityState {
  [key: string]: boolean;
}

export default function TCAP_v2Make({ isConnected, address, provider }: TCAP_v2MakeProps) {
  const [userTokens, setUserTokens] = useState<TokenInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showHidden, setShowHidden] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'date'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [tokenVisibility, setTokenVisibility] = useLocalStorage<TokenVisibilityState>('token-visibility', {});

  useEffect(() => {
    const fetchTokens = async () => {
      if (!isConnected || !address || !provider) return;

      try {
        const ethersProvider = new BrowserProvider(window.ethereum);
        const signer = await ethersProvider.getSigner();
        const factory = new Contract(address, TokenFactoryV2MakeABI.abi, signer);

        // Get user's tokens
        const tokenAddresses = await factory.getUserTokens(await signer.getAddress());
        
        const tokenInfoPromises = tokenAddresses.map(async (tokenAddress: string) => {
          const token = new Contract(tokenAddress, [
            'function name() view returns (string)',
            'function symbol() view returns (string)',
            'function totalSupply() view returns (uint256)',
            'function marketingFeePercent() view returns (uint256)',
            'function developmentFeePercent() view returns (uint256)',
            'function autoLiquidityFeePercent() view returns (uint256)',
            'function marketingWallet() view returns (address)',
            'function developmentWallet() view returns (address)',
            'function enableBuyFees() view returns (bool)',
            'function enableSellFees() view returns (bool)'
          ], signer);
          
          try {
            const [
              name,
              symbol,
              totalSupply,
              marketingFeePercent,
              developmentFeePercent,
              autoLiquidityFeePercent,
              marketingWallet,
              developmentWallet,
              enableBuyFees,
              enableSellFees
            ] = await Promise.all([
              token.name(),
              token.symbol(),
              token.totalSupply(),
              token.marketingFeePercent(),
              token.developmentFeePercent(),
              token.autoLiquidityFeePercent(),
              token.marketingWallet(),
              token.developmentWallet(),
              token.enableBuyFees(),
              token.enableSellFees()
            ]);

            return {
              address: tokenAddress,
              name,
              symbol,
              totalSupply,
              marketingFeePercent: Number(marketingFeePercent),
              developmentFeePercent: Number(developmentFeePercent),
              autoLiquidityFeePercent: Number(autoLiquidityFeePercent),
              marketingWallet,
              developmentWallet,
              enableBuyFees,
              enableSellFees,
              isVisible: tokenVisibility[tokenAddress] !== false // Default to visible if not set
            };
          } catch (error) {
            console.error(`Error fetching token info for ${tokenAddress}:`, error);
            return null;
          }
        });

        const tokens = (await Promise.all(tokenInfoPromises)).filter((token): token is TokenInfo => token !== null);
        setUserTokens(tokens);
      } catch (error) {
        console.error('Error fetching tokens:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTokens();
  }, [isConnected, address, provider, tokenVisibility]);

  const toggleTokenVisibility = (tokenAddress: string) => {
    const newVisibility = !tokenVisibility[tokenAddress];
    setTokenVisibility((prev: TokenVisibilityState) => ({
      ...prev,
      [tokenAddress]: newVisibility
    }));
  };

  const toggleAllTokensVisibility = (visible: boolean) => {
    const newVisibility = userTokens.reduce((acc: TokenVisibilityState, token) => ({
      ...acc,
      [token.address]: visible
    }), {});
    setTokenVisibility(newVisibility);
  };

  const sortTokens = (tokens: TokenInfo[]) => {
    return [...tokens].sort((a, b) => {
      if (sortBy === 'name') {
        const comparison = a.name.localeCompare(b.name);
        return sortOrder === 'asc' ? comparison : -comparison;
      }
      // Default to date (using address as proxy since we don't store creation date)
      const comparison = a.address.localeCompare(b.address);
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  };

  const visibleTokens = userTokens.filter(token => showHidden || token.isVisible !== false);
  const sortedTokens = sortTokens(visibleTokens);

  if (!isConnected) {
    return (
      <Card className="p-4">
        <p className="text-center text-text-secondary">Please connect your wallet to view your tokens.</p>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="p-4">
        <p className="text-center text-text-secondary">Loading your tokens...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4 bg-background-secondary p-4 rounded-lg">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm text-text-secondary">Show Hidden</label>
            <Switch
              checked={showHidden}
              onCheckedChange={setShowHidden}
            />
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="secondary"
              onClick={() => toggleAllTokensVisibility(true)}
              className="text-sm"
            >
              Show All
            </Button>
            <Button
              variant="secondary"
              onClick={() => toggleAllTokensVisibility(false)}
              className="text-sm"
            >
              Hide All
            </Button>
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-sm text-text-secondary">Sort By</label>
            <Select
              value={sortBy}
              onValueChange={(value: 'name' | 'date') => setSortBy(value)}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="date">Date</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="secondary"
            className="flex items-center space-x-1"
            onClick={() => setSortOrder(order => order === 'asc' ? 'desc' : 'asc')}
          >
            <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
            <span>{sortOrder === 'asc' ? 'Ascending' : 'Descending'}</span>
          </Button>
        </div>
        <div className="text-sm text-text-secondary">
          {userTokens.length} Total Tokens ({visibleTokens.length} Visible)
        </div>
      </div>

      {sortedTokens.length === 0 ? (
        <Card className="p-4">
          <p className="text-center text-text-secondary">
            {userTokens.length === 0 ? "You haven't created any tokens yet." : "No visible tokens."}
          </p>
        </Card>
      ) : (
        sortedTokens.map((token) => (
          <Card key={token.address} className="p-4 bg-background-secondary border-border">
            <div className="grid gap-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <h3 className="text-lg font-semibold text-white">{token.name} ({token.symbol})</h3>
                  <Button
                    variant="ghost"
                    onClick={() => toggleTokenVisibility(token.address)}
                    className="text-text-secondary hover:text-text-primary"
                  >
                    {token.isVisible === false ? 'Show' : 'Hide'}
                  </Button>
                </div>
                <span className="text-sm text-text-secondary">Total Supply: {formatEther(token.totalSupply)}</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <p className="text-sm text-text-secondary">Token Address:</p>
                  <p className="text-sm text-text-primary break-all">{token.address}</p>
                </div>
                <div>
                  <p className="text-sm text-text-secondary">Fees:</p>
                  <p className="text-sm text-text-primary">
                    Marketing: {token.marketingFeePercent}% | 
                    Development: {token.developmentFeePercent}% | 
                    Auto-Liquidity: {token.autoLiquidityFeePercent}%
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <p className="text-sm text-text-secondary">Marketing Wallet:</p>
                  <p className="text-sm text-text-primary break-all">{token.marketingWallet}</p>
                </div>
                <div>
                  <p className="text-sm text-text-secondary">Development Wallet:</p>
                  <p className="text-sm text-text-primary break-all">{token.developmentWallet}</p>
                </div>
              </div>

              <div className="flex gap-4 mt-2">
                <div className="flex items-center">
                  <span className="text-sm text-text-secondary mr-2">Buy Fees:</span>
                  <span className={`text-sm ${token.enableBuyFees ? 'text-green-500' : 'text-red-500'}`}>
                    {token.enableBuyFees ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="text-sm text-text-secondary mr-2">Sell Fees:</span>
                  <span className={`text-sm ${token.enableSellFees ? 'text-green-500' : 'text-red-500'}`}>
                    {token.enableSellFees ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        ))
      )}
    </div>
  );
} 