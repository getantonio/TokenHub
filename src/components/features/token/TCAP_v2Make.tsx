'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { BrowserProvider, Contract, formatEther } from 'ethers';
import TokenFactoryV2MakeABI from '@/contracts/abi/TokenFactory_v2_Make.json';
import TestTokenABI from '@/contracts/abi/TestToken.json';
import { PublicClient } from 'viem';

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
}

export default function TCAP_v2Make({ isConnected, address, provider }: TCAP_v2MakeProps) {
  const [userTokens, setUserTokens] = useState<TokenInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
              enableSellFees
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
  }, [isConnected, address, provider]);

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

  if (userTokens.length === 0) {
    return (
      <Card className="p-4">
        <p className="text-center text-text-secondary">You haven't created any tokens yet.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {userTokens.map((token) => (
        <Card key={token.address} className="p-4 bg-background-secondary border-border">
          <div className="grid gap-2">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white">{token.name} ({token.symbol})</h3>
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
      ))}
    </div>
  );
} 