'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { parseEther } from 'viem';

interface TokenFormProps {
  isConnected: boolean;
}

export function TokenForm_V2_DirectDEX({ isConnected }: TokenFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    // Basic Token Info
    name: '',
    symbol: '',
    totalSupply: '',
    
    // Liquidity Settings
    initialLiquidityInETH: '',
    listingPriceInETH: '',
    
    // Trading Controls
    maxTxAmount: '',
    maxWalletAmount: '',
    enableTrading: true,
    tradingStartTime: '',
    
    // Fee Configuration
    marketingFee: '',
    developmentFee: '',
    autoLiquidityFee: '',
    
    // DEX Selection
    selectedDEX: 'pancakeswap',
    
    // Security Settings
    enableAntiBot: true,
    enableMaxWallet: true
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected) {
      toast({
        title: "Error",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    try {
      // TODO: Implement contract interaction
      toast({
        title: "Success",
        description: "Token created and listed successfully!",
      });
    } catch (error) {
      console.error('Error creating token:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to create token',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-4 bg-gray-800/50 border border-gray-700/50">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Token Information */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-white">Token Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-sm text-gray-300">Token Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="My Token"
                className="bg-gray-700/50 border-gray-600 h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="symbol" className="text-sm text-gray-300">Token Symbol</Label>
              <Input
                id="symbol"
                value={formData.symbol}
                onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                placeholder="TKN"
                className="bg-gray-700/50 border-gray-600 h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="totalSupply" className="text-sm text-gray-300">Total Supply</Label>
              <Input
                id="totalSupply"
                type="number"
                value={formData.totalSupply}
                onChange={(e) => setFormData({ ...formData, totalSupply: e.target.value })}
                placeholder="1000000"
                className="bg-gray-700/50 border-gray-600 h-9"
              />
            </div>
          </div>
        </div>

        {/* Liquidity Settings */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-white">Liquidity Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="initialLiquidityInETH" className="text-sm text-gray-300">Initial Liquidity (ETH)</Label>
              <Input
                id="initialLiquidityInETH"
                type="number"
                value={formData.initialLiquidityInETH}
                onChange={(e) => setFormData({ ...formData, initialLiquidityInETH: e.target.value })}
                placeholder="1"
                className="bg-gray-700/50 border-gray-600 h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="listingPriceInETH" className="text-sm text-gray-300">Listing Price (ETH)</Label>
              <Input
                id="listingPriceInETH"
                type="number"
                value={formData.listingPriceInETH}
                onChange={(e) => setFormData({ ...formData, listingPriceInETH: e.target.value })}
                placeholder="0.0001"
                className="bg-gray-700/50 border-gray-600 h-9"
              />
            </div>
          </div>
        </div>

        {/* Fee Configuration */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-white">Fee Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="marketingFee" className="text-sm text-gray-300">Marketing Fee (%)</Label>
              <Input
                id="marketingFee"
                type="number"
                value={formData.marketingFee}
                onChange={(e) => setFormData({ ...formData, marketingFee: e.target.value })}
                placeholder="2"
                className="bg-gray-700/50 border-gray-600 h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="developmentFee" className="text-sm text-gray-300">Development Fee (%)</Label>
              <Input
                id="developmentFee"
                type="number"
                value={formData.developmentFee}
                onChange={(e) => setFormData({ ...formData, developmentFee: e.target.value })}
                placeholder="3"
                className="bg-gray-700/50 border-gray-600 h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="autoLiquidityFee" className="text-sm text-gray-300">Auto-Liquidity Fee (%)</Label>
              <Input
                id="autoLiquidityFee"
                type="number"
                value={formData.autoLiquidityFee}
                onChange={(e) => setFormData({ ...formData, autoLiquidityFee: e.target.value })}
                placeholder="2"
                className="bg-gray-700/50 border-gray-600 h-9"
              />
            </div>
          </div>
        </div>

        {/* Trading Controls */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-white">Trading Controls</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="maxTxAmount" className="text-sm text-gray-300">Max Transaction Amount</Label>
              <Input
                id="maxTxAmount"
                type="number"
                value={formData.maxTxAmount}
                onChange={(e) => setFormData({ ...formData, maxTxAmount: e.target.value })}
                placeholder="1000"
                className="bg-gray-700/50 border-gray-600 h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="maxWalletAmount" className="text-sm text-gray-300">Max Wallet Amount</Label>
              <Input
                id="maxWalletAmount"
                type="number"
                value={formData.maxWalletAmount}
                onChange={(e) => setFormData({ ...formData, maxWalletAmount: e.target.value })}
                placeholder="2000"
                className="bg-gray-700/50 border-gray-600 h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tradingStartTime" className="text-sm text-gray-300">Trading Start Time</Label>
              <Input
                id="tradingStartTime"
                type="datetime-local"
                value={formData.tradingStartTime}
                onChange={(e) => setFormData({ ...formData, tradingStartTime: e.target.value })}
                className="bg-gray-700/50 border-gray-600 h-9"
              />
            </div>
            <div className="flex items-center space-x-2 h-9">
              <Switch
                id="enableTrading"
                checked={formData.enableTrading}
                onCheckedChange={(checked) => setFormData({ ...formData, enableTrading: checked })}
              />
              <Label htmlFor="enableTrading" className="text-sm text-gray-300">Enable Trading at Launch</Label>
            </div>
          </div>
        </div>

        {/* DEX Selection */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-white">DEX Selection</h3>
          <div className="space-y-1.5">
            <Label htmlFor="selectedDEX" className="text-sm text-gray-300">Select DEX</Label>
            <Select
              value={formData.selectedDEX}
              onValueChange={(value) => setFormData({ ...formData, selectedDEX: value })}
            >
              <SelectTrigger className="bg-gray-700/50 border-gray-600 h-9">
                <SelectValue placeholder="Select a DEX" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pancakeswap">PancakeSwap</SelectItem>
                <SelectItem value="uniswap">Uniswap</SelectItem>
                <SelectItem value="sushiswap">SushiSwap</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button 
          type="submit" 
          className="w-full bg-blue-600 hover:bg-blue-700 h-9"
          disabled={!isConnected || isLoading}
        >
          {isLoading ? "Creating..." : "Create & List Token"}
        </Button>
      </form>
    </Card>
  );
} 