'use client';

import { useState, useEffect } from 'react';
import TokenPreview from './TokenPreview';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/toast/use-toast';
import { HelpCircle, Calculator } from 'lucide-react';
import { useAccount, useWalletClient } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { useNetwork } from '@/contexts/NetworkContext';
import { getNetworkContractAddress } from '@/config/contracts';
import { Contract, Interface } from 'ethers';
import TokenFactoryV2DirectDEXABI from '@/contracts/abi/TokenFactory_v2_DirectDEX.json';
import { BrowserProvider } from 'ethers';

interface TokenFormV2DirectDEXProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

interface ValidationResult {
  category: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: string[];
}

export function TokenForm_V2DirectDEX({ onSuccess, onError }: TokenFormV2DirectDEXProps) {
  const { isConnected } = useAccount();
  const { chainId } = useNetwork();
  const { data: walletClient } = useWalletClient();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [ethPrice] = useState(2000); // Mock ETH price for demo
  
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
    maxTxPercentage: '2', // Default 2% of total supply
    maxWalletPercentage: '4', // Default 4% of total supply
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

  // Calculate USD value
  const calculateUsdValue = (tokenAmount: string, pricePerToken: string): string => {
    if (!tokenAmount || !pricePerToken || !ethPrice) return '0';
    const tokens = parseFloat(tokenAmount);
    const priceInEth = parseFloat(pricePerToken);
    return (tokens * priceInEth * ethPrice).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD'
    });
  };

  // Calculate token amounts based on percentages
  useEffect(() => {
    if (formData.totalSupply && formData.maxTxPercentage) {
      const maxTx = (parseFloat(formData.totalSupply) * parseFloat(formData.maxTxPercentage)) / 100;
      setFormData(prev => ({ ...prev, maxTxAmount: maxTx.toString() }));
    }
    if (formData.totalSupply && formData.maxWalletPercentage) {
      const maxWallet = (parseFloat(formData.totalSupply) * parseFloat(formData.maxWalletPercentage)) / 100;
      setFormData(prev => ({ ...prev, maxWalletAmount: maxWallet.toString() }));
    }
  }, [formData.totalSupply, formData.maxTxPercentage, formData.maxWalletPercentage]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isConnected || !walletClient) {
      toast({
        title: "Wallet Connection Required",
        description: "Please connect your wallet to create a token",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    try {
      const provider = new BrowserProvider(walletClient as any);
      const signer = await provider.getSigner();
      
      // Get factory address for current network
      const factoryAddress = chainId ? getNetworkContractAddress(chainId, 'factoryAddressV2DirectDEX') : null;
      if (!factoryAddress) {
        throw new Error('DirectDEX factory not deployed on this network');
      }

      // Create contract instance
      const factoryInterface = new Interface(TokenFactoryV2DirectDEXABI.abi);
      const factory = new Contract(factoryAddress, factoryInterface, signer);

      // Get listing fee
      const listingFee = await factory.getListingFee();
      console.log('Listing fee:', formatEther(listingFee), 'ETH');

      // Calculate token amounts
      const maxTxAmount = (parseFloat(formData.totalSupply) * parseFloat(formData.maxTxPercentage)) / 100;
      const maxWalletAmount = (parseFloat(formData.totalSupply) * parseFloat(formData.maxWalletPercentage)) / 100;

      // Prepare listing parameters
      const listingParams = {
        name: formData.name,
        symbol: formData.symbol,
        totalSupply: parseEther(formData.totalSupply),
        initialLiquidityInETH: parseEther(formData.initialLiquidityInETH),
        listingPriceInETH: parseEther(formData.listingPriceInETH),
        maxTxAmount: parseEther(maxTxAmount.toString()),
        maxWalletAmount: parseEther(maxWalletAmount.toString()),
        enableTrading: formData.enableTrading,
        tradingStartTime: formData.tradingStartTime ? Math.floor(new Date(formData.tradingStartTime).getTime() / 1000) : 0,
        dexName: formData.selectedDEX,
        enableBuyTax: true,
        enableSellTax: true,
        buyTaxPercentage: 5, // 5% buy tax
        sellTaxPercentage: 5  // 5% sell tax
      };

      // Create and list token
      const tx = await factory.createAndListToken(listingParams, {
        value: listingFee + parseEther(formData.initialLiquidityInETH)
      });

      toast({
        title: "Transaction Submitted",
        description: "Your token is being created and listed...",
      });

      const receipt = await tx.wait();
      console.log('Transaction receipt:', receipt);

      // Get token address from event
      const tokenListedEvent = receipt.events?.find((event: any) => event.event === 'TokenListed');
      if (tokenListedEvent) {
        const tokenAddress = tokenListedEvent.args?.token;
        toast({
          title: "Success",
          description: `Token created and listed at ${tokenAddress}`,
        });
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error creating token:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to create token',
        variant: "destructive",
      });
      if (onError) {
        onError(error as Error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const InfoTooltip = ({ text }: { text: string }) => (
    <div className="group relative inline-block ml-1">
      <HelpCircle className="w-4 h-4 text-gray-400 inline-block cursor-help" />
      <div className="hidden group-hover:block absolute z-50 w-64 p-2 text-sm bg-gray-800 text-white rounded-md shadow-lg -left-32 top-6">
        {text}
      </div>
    </div>
  );

  const validateSymbol = (): ValidationResult => {
    const isValid = /^[A-Z0-9]{2,6}$/.test(formData.symbol);
    const isCommon = ['ETH', 'BTC', 'BNB', 'USDT', 'USDC'].includes(formData.symbol);

    if (!isValid) {
      return {
        category: 'Token Symbol',
        status: 'error',
        message: 'Invalid symbol format',
        details: [
          'Should be 2-6 characters',
          'Only uppercase letters and numbers allowed'
        ]
      };
    }

    if (isCommon) {
      return {
        category: 'Token Symbol',
        status: 'error',
        message: 'Reserved symbol',
        details: ['This symbol is already in use by a major token']
      };
    }

    return {
      category: 'Token Symbol',
      status: 'success',
      message: 'Valid symbol',
      details: ['Follows standard format']
    };
  };

  return (
    <Card className="p-6 bg-gray-800/50 border border-gray-700/50">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Create Token</h2>
          <p className="text-sm text-gray-400">Deploy your token with DirectDEX features</p>
        </div>
        <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/50">
          V2
        </Badge>
      </div>

      <div className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Token Information */}
          <div className="space-y-3">
            <h3 className="text-base font-semibold text-white">Token Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label htmlFor="name" className="text-sm text-white">Token Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="My Token"
                  className="bg-gray-900/50 border-gray-700 text-white placeholder:text-gray-500 h-8"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="symbol" className="text-sm text-white">Token Symbol</Label>
                <Input
                  id="symbol"
                  value={formData.symbol}
                  onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                  placeholder="TKN"
                  className="bg-gray-900/50 border-gray-700 text-white placeholder:text-gray-500 h-8"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="totalSupply" className="text-sm text-white">Total Supply</Label>
                <Input
                  id="totalSupply"
                  type="number"
                  value={formData.totalSupply}
                  onChange={(e) => setFormData({ ...formData, totalSupply: e.target.value })}
                  placeholder="1000000"
                  className="bg-gray-900/50 border-gray-700 text-white placeholder:text-gray-500 h-8"
                />
              </div>
            </div>
          </div>

          {/* Liquidity Settings */}
          <div className="space-y-3">
            <h3 className="text-base font-semibold text-white flex items-center">
              Liquidity Settings
              <InfoTooltip text="Initial liquidity is locked in the DEX pool to enable trading. Minimum requirement is 0.1 ETH. Higher liquidity means less price impact per trade." />
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="initialLiquidityInETH" className="text-sm text-white flex items-center">
                  Initial Liquidity (ETH)
                  <InfoTooltip text="Minimum: 0.1 ETH. This amount will be locked in the liquidity pool to enable trading." />
                </Label>
                <Input
                  id="initialLiquidityInETH"
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={formData.initialLiquidityInETH}
                  onChange={(e) => setFormData({ ...formData, initialLiquidityInETH: e.target.value })}
                  placeholder="1"
                  className="bg-gray-900/50 border-gray-700 text-white placeholder:text-gray-500 h-8"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="listingPriceInETH" className="text-sm text-white flex items-center">
                  Listing Price (ETH)
                  <InfoTooltip text="Initial token price in ETH. This determines how many tokens are added to the liquidity pool." />
                </Label>
                <Input
                  id="listingPriceInETH"
                  type="number"
                  value={formData.listingPriceInETH}
                  onChange={(e) => setFormData({ ...formData, listingPriceInETH: e.target.value })}
                  placeholder="0.0001"
                  className="bg-gray-900/50 border-gray-700 text-white placeholder:text-gray-500 h-8"
                />
              </div>
            </div>
          </div>

          {/* Fee Configuration */}
          <div className="space-y-3">
            <h3 className="text-base font-semibold text-white flex items-center">
              Fee Configuration
              <InfoTooltip text="Fees are collected on each trade and distributed automatically. Total fees cannot exceed 10%." />
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label htmlFor="marketingFee" className="text-sm text-white flex items-center">
                  Marketing Fee (%)
                  <InfoTooltip text="Percentage of each trade sent to marketing wallet. Max: 5%" />
                </Label>
                <Input
                  id="marketingFee"
                  type="number"
                  min="0"
                  max="5"
                  value={formData.marketingFee}
                  onChange={(e) => setFormData({ ...formData, marketingFee: e.target.value })}
                  placeholder="2"
                  className="bg-gray-900/50 border-gray-700 text-white placeholder:text-gray-500 h-8"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="developmentFee" className="text-sm text-white flex items-center">
                  Development Fee (%)
                  <InfoTooltip text="Percentage of each trade sent to development wallet. Max: 5%" />
                </Label>
                <Input
                  id="developmentFee"
                  type="number"
                  min="0"
                  max="5"
                  value={formData.developmentFee}
                  onChange={(e) => setFormData({ ...formData, developmentFee: e.target.value })}
                  placeholder="3"
                  className="bg-gray-900/50 border-gray-700 text-white placeholder:text-gray-500 h-8"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="autoLiquidityFee" className="text-sm text-white flex items-center">
                  Auto-Liquidity Fee (%)
                  <InfoTooltip text="Percentage of each trade automatically added to liquidity. Max: 3%" />
                </Label>
                <Input
                  id="autoLiquidityFee"
                  type="number"
                  min="0"
                  max="3"
                  value={formData.autoLiquidityFee}
                  onChange={(e) => setFormData({ ...formData, autoLiquidityFee: e.target.value })}
                  placeholder="2"
                  className="bg-gray-900/50 border-gray-700 text-white placeholder:text-gray-500 h-8"
                />
              </div>
            </div>
          </div>

          {/* Trading Controls */}
          <div className="space-y-3">
            <h3 className="text-base font-semibold text-white flex items-center">
              Trading Controls
              <InfoTooltip text="Set limits on transactions and wallet holdings to prevent price manipulation and whale concentration." />
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="maxTxPercentage" className="text-sm text-white flex items-center">
                  Max Transaction (% of Total Supply)
                  <InfoTooltip text="Maximum amount of tokens that can be bought/sold in a single transaction. Lower values provide better protection against price manipulation. Recommended: 1-2%" />
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="maxTxPercentage"
                    type="number"
                    min="0.1"
                    max="100"
                    step="0.1"
                    value={formData.maxTxPercentage}
                    onChange={(e) => setFormData({ ...formData, maxTxPercentage: e.target.value })}
                    placeholder="2"
                    className="bg-gray-900/50 border-gray-700 text-white placeholder:text-gray-500 h-8"
                  />
                  <span className="text-sm text-gray-400 whitespace-nowrap">
                    = {parseInt(formData.maxTxAmount).toLocaleString()} tokens
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="maxWalletPercentage" className="text-sm text-white flex items-center">
                  Max Wallet (% of Total Supply)
                  <InfoTooltip text="Maximum amount of tokens that can be held in a single wallet. Prevents whale concentration. Recommended: 2-4%" />
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="maxWalletPercentage"
                    type="number"
                    min="0.1"
                    max="100"
                    step="0.1"
                    value={formData.maxWalletPercentage}
                    onChange={(e) => setFormData({ ...formData, maxWalletPercentage: e.target.value })}
                    placeholder="4"
                    className="bg-gray-900/50 border-gray-700 text-white placeholder:text-gray-500 h-8"
                  />
                  <span className="text-sm text-gray-400 whitespace-nowrap">
                    = {parseInt(formData.maxWalletAmount).toLocaleString()} tokens
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="tradingStartTime" className="text-sm text-white flex items-center">
                  Trading Start Time
                  <InfoTooltip text="When trading will be enabled for everyone. Leave empty to enable immediately after listing." />
                </Label>
                <Input
                  id="tradingStartTime"
                  type="datetime-local"
                  value={formData.tradingStartTime}
                  onChange={(e) => setFormData({ ...formData, tradingStartTime: e.target.value })}
                  className="bg-gray-900/50 border-gray-700 text-white h-8"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="enableTrading"
                  checked={formData.enableTrading}
                  onCheckedChange={(checked) => setFormData({ ...formData, enableTrading: checked })}
                  className="data-[state=checked]:bg-blue-600"
                />
                <Label htmlFor="enableTrading" className="text-sm text-white">Enable Trading at Launch</Label>
              </div>
            </div>

            {/* Value Calculator */}
            <div className="mt-4 p-3 bg-gray-900/30 rounded-lg border border-gray-700/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-white">Value Calculator</span>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowCalculator(!showCalculator)}
                  className="text-gray-400 hover:text-white h-8 px-2"
                >
                  <Calculator className="w-4 h-4 mr-1" />
                  {showCalculator ? 'Hide' : 'Show'} Calculator
                </Button>
              </div>
              {showCalculator && (
                <div className="space-y-2">
                  <div className="text-sm text-gray-400">
                    <div className="flex justify-between">
                      <span>Max Transaction Value:</span>
                      <span>{calculateUsdValue(formData.maxTxAmount, formData.listingPriceInETH)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Max Wallet Value:</span>
                      <span>{calculateUsdValue(formData.maxWalletAmount, formData.listingPriceInETH)}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      * Values based on listing price and current ETH price (${ethPrice})
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* DEX Selection */}
          <div className="space-y-3">
            <h3 className="text-base font-semibold text-white flex items-center">
              DEX Selection
              <InfoTooltip text="Choose the DEX where your token will be listed. Test networks are available for development." />
            </h3>
            <div className="space-y-1">
              <Label htmlFor="selectedDEX" className="text-sm text-white">Select DEX</Label>
              <Select
                value={formData.selectedDEX}
                onValueChange={(value) => setFormData({ ...formData, selectedDEX: value })}
              >
                <SelectTrigger className="bg-gray-900/50 border-gray-700 text-white h-8">
                  <SelectValue placeholder="Select a DEX" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="pancakeswap-test" className="text-white hover:bg-gray-700">PancakeSwap (BSC Testnet)</SelectItem>
                  <SelectItem value="uniswap-test" className="text-white hover:bg-gray-700">Uniswap (Sepolia)</SelectItem>
                  <SelectItem value="pancakeswap" className="text-white hover:bg-gray-700">PancakeSwap</SelectItem>
                  <SelectItem value="uniswap" className="text-white hover:bg-gray-700">Uniswap</SelectItem>
                  <SelectItem value="sushiswap" className="text-white hover:bg-gray-700">SushiSwap</SelectItem>
                </SelectContent>
              </Select>
              <div className="mt-2 text-sm text-gray-400">
                <p>Test Networks Available:</p>
                <ul className="list-disc list-inside text-xs mt-1 space-y-1">
                  <li>BSC Testnet (Chain ID: 97)</li>
                  <li>Sepolia (Chain ID: 11155111)</li>
                  <li>Arbitrum Sepolia (Chain ID: 421614)</li>
                </ul>
              </div>
            </div>
          </div>

          <Button 
            type="submit" 
            disabled={!isConnected || isLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white w-auto px-6"
          >
            {isLoading ? "Creating..." : isConnected ? "Create Token" : "Connect Wallet to Deploy"}
          </Button>
        </form>

        <TokenPreview 
          name={formData.name || ''}
          symbol={formData.symbol || ''}
          initialSupply={formData.totalSupply || '0'}
          maxSupply={formData.totalSupply || '0'}
        />
      </div>
    </Card>
  );
} 