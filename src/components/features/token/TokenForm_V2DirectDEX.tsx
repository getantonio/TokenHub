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
import type { InterfaceAbi } from 'ethers';

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

interface FormData {
  // Basic Token Info
  name: string;
  symbol: string;
  totalSupply: string;
  
  // Liquidity Settings
  initialLiquidityInETH: string;
  listingPriceInETH: string;
  
  // Trading Controls
  maxTxAmount: string;
  maxWalletAmount: string;
  maxTxPercentage: string;
  maxWalletPercentage: string;
  enableTrading: boolean;
  tradingStartTime: string;
  
  // Fee Configuration
  marketingFee: string;
  developmentFee: string;
  autoLiquidityFee: string;
  enableBuyTax: boolean;
  enableSellTax: boolean;
  buyTaxPercentage: string;
  sellTaxPercentage: string;
  
  // Wallet Configuration
  marketingWallet: string;
  developmentWallet: string;
  
  // DEX Selection
  selectedDEX: string;
  
  // Security Settings
  enableAntiBot: boolean;
  enableMaxWallet: boolean;
}

interface ListingParams {
  name: string;
  symbol: string;
  totalSupply: bigint;
  initialLiquidityInETH: bigint;
  listingPriceInETH: bigint;
  maxTxAmount: bigint;
  maxWalletAmount: bigint;
  enableTrading: boolean;
  tradingStartTime: number;
  dexName: string;
  marketingFeePercentage: number;
  marketingWallet: string;
  developmentFeePercentage: number;
  developmentWallet: string;
  autoLiquidityFeePercentage: number;
}

export function TokenForm_V2DirectDEX({ onSuccess, onError }: TokenFormV2DirectDEXProps) {
  const { isConnected } = useAccount();
  const { chainId } = useNetwork();
  const { data: walletClient } = useWalletClient();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [ethPrice] = useState(2000); // Mock ETH price for demo
  
  const [formData, setFormData] = useState<FormData>({
    // Basic Token Info
    name: '',
    symbol: '',
    totalSupply: '1000000000',  // 1 billion tokens
    
    // Liquidity Settings
    initialLiquidityInETH: '0.1',  // 0.1 ETH
    listingPriceInETH: '0.0001',   // 0.0001 ETH
    
    // Trading Controls
    maxTxAmount: '',
    maxWalletAmount: '',
    maxTxPercentage: '2',      // 2% of total supply
    maxWalletPercentage: '4',  // 4% of total supply
    enableTrading: true,
    tradingStartTime: '',
    
    // Fee Configuration
    marketingFee: '5',         // 5% marketing fee
    developmentFee: '3',       // 3% development fee
    autoLiquidityFee: '2',     // 2% auto-liquidity fee
    enableBuyTax: true,
    enableSellTax: true,
    buyTaxPercentage: '5',
    sellTaxPercentage: '5',
    
    // Wallet Configuration
    marketingWallet: walletClient?.account.address || '',  // Use connected wallet as default
    developmentWallet: walletClient?.account.address || '', // Use connected wallet as default
    
    // DEX Selection
    selectedDEX: 'pancakeswap-test',
    
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
    if (!isConnected) {
      toast({
        title: "Wallet Connection Required",
        description: "Please connect your wallet to create a token",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      if (!chainId) {
        throw new Error('Network not connected');
      }

      const factoryAddress = getNetworkContractAddress(chainId, 'factoryAddressV2DirectDEX');
      if (!factoryAddress) {
        throw new Error('Factory contract not deployed on this network');
      }

      // Validate form data
      if (!formData.name || !formData.symbol || !formData.totalSupply) {
        throw new Error('Please fill in all required fields');
      }

      // Validate fees
      if (!formData.marketingFee || Number(formData.marketingFee) <= 0) {
        throw new Error('Marketing fee must be greater than 0%');
      }
      if (!formData.developmentFee || Number(formData.developmentFee) <= 0) {
        throw new Error('Development fee must be greater than 0%');
      }
      if (!formData.autoLiquidityFee || Number(formData.autoLiquidityFee) <= 0) {
        throw new Error('Auto-liquidity fee must be greater than 0%');
      }

      // Validate wallet addresses
      const addressRegex = /^0x[a-fA-F0-9]{40}$/;
      if (!formData.marketingWallet || !addressRegex.test(formData.marketingWallet)) {
        throw new Error('Please provide a valid marketing wallet address');
      }
      if (!formData.developmentWallet || !addressRegex.test(formData.developmentWallet)) {
        throw new Error('Please provide a valid development wallet address');
      }

      // Validate DEX name
      const validDexNames = ['uniswap-test', 'pancakeswap-test', 'uniswap', 'pancakeswap', 'sushiswap'];
      if (!validDexNames.includes(formData.selectedDEX)) {
        throw new Error('Invalid DEX selection');
      }

      // Validate liquidity
      if (Number(formData.initialLiquidityInETH) < 0.1) {
        throw new Error('Initial liquidity must be at least 0.1 ETH');
      }
      if (Number(formData.listingPriceInETH) <= 0) {
        throw new Error('Listing price must be greater than 0');
      }

      // Validate tax percentages
      if (formData.enableBuyTax && (Number(formData.buyTaxPercentage) < 0 || Number(formData.buyTaxPercentage) > 10)) {
        throw new Error('Buy tax must be between 0% and 10%');
      }
      if (formData.enableSellTax && (Number(formData.sellTaxPercentage) < 0 || Number(formData.sellTaxPercentage) > 10)) {
        throw new Error('Sell tax must be between 0% and 10%');
      }

      // Validate total fees
      const totalFees = Number(formData.marketingFee) + Number(formData.developmentFee) + Number(formData.autoLiquidityFee);
      if (totalFees > 25) {
        throw new Error('Total fees cannot exceed 25%');
      }

      // Get signer
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Create contract instance
      const factoryInterface = new Interface(TokenFactoryV2DirectDEXABI as InterfaceAbi);
      const factory = new Contract(factoryAddress, factoryInterface, signer);

      // Check if DEX is configured
      const dexRouter = await factory.getDEXRouter(formData.selectedDEX);
      if (!dexRouter.isActive || dexRouter.router === '0x0000000000000000000000000000000000000000') {
        throw new Error(`Selected DEX "${formData.selectedDEX}" is not available. Please contact the administrator.`);
      }

      // Prepare parameters for contract
      const params: ListingParams = {
        name: formData.name,
        symbol: formData.symbol.toUpperCase(),
        totalSupply: parseEther(formData.totalSupply),
        initialLiquidityInETH: parseEther(formData.initialLiquidityInETH),
        listingPriceInETH: parseEther(formData.listingPriceInETH),
        maxTxAmount: parseEther(formData.maxTxAmount),
        maxWalletAmount: parseEther(formData.maxWalletAmount),
        enableTrading: formData.enableTrading,
        tradingStartTime: formData.enableTrading ? Math.floor(Date.now() / 1000) : 0,
        dexName: formData.selectedDEX,
        marketingFeePercentage: Number(formData.marketingFee),
        marketingWallet: formData.marketingWallet,
        developmentFeePercentage: Number(formData.developmentFee),
        developmentWallet: formData.developmentWallet,
        autoLiquidityFeePercentage: Number(formData.autoLiquidityFee)
      };

      // Validate all parameters are present
      const requiredParams: Array<keyof ListingParams> = [
        'name', 'symbol', 'totalSupply', 'initialLiquidityInETH', 'listingPriceInETH',
        'maxTxAmount', 'maxWalletAmount', 'enableTrading', 'tradingStartTime', 'dexName',
        'marketingFeePercentage', 'marketingWallet', 'developmentFeePercentage',
        'developmentWallet', 'autoLiquidityFeePercentage'
      ];

      for (const param of requiredParams) {
        if (params[param] === undefined || params[param] === null || 
            (typeof params[param] === 'string' && params[param] === '')) {
          throw new Error(`Missing required parameter: ${param}`);
        }
      }

      // Get listing fee
      const listingFee = await factory.getListingFee();
      const totalValue = parseEther(formData.initialLiquidityInETH) + listingFee;

      // Log the parameters for debugging
      console.log('Contract Parameters:', {
        ...params,
        totalValue: formatEther(totalValue),
        listingFee: formatEther(listingFee),
        initialLiquidityInETH: formatEther(params.initialLiquidityInETH),
        listingPriceInETH: formatEther(params.listingPriceInETH)
      });

      // Create token with the total value (initial liquidity + listing fee)
      const tx = await factory.createAndListToken(params, {
        value: totalValue,
        gasLimit: 5000000 // Set a higher gas limit
      });

      // Wait for transaction
      const receipt = await tx.wait();
      
      // Get token address from event
      const tokenListedEvent = receipt.events?.find((e: { event: string }) => e.event === 'TokenListed');
      const tokenAddress = tokenListedEvent?.args?.token;

      toast({
        title: "Success",
        description: "Token created and listed successfully!",
      });

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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Buy Tax Configuration */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="text-sm text-white">Buy Tax Configuration</Label>
                  <Switch
                    id="enableBuyTax"
                    checked={formData.enableBuyTax}
                    onCheckedChange={(checked) => setFormData({ ...formData, enableBuyTax: checked })}
                    className="data-[state=checked]:bg-blue-600"
                  />
                </div>
                {formData.enableBuyTax && (
                  <div>
                    <Label htmlFor="buyTaxPercentage" className="text-sm text-white flex items-center">
                      Buy Tax (%)
                      <InfoTooltip text="Percentage fee applied to buy transactions. Max: 10%" />
                    </Label>
                    <Input
                      id="buyTaxPercentage"
                      type="number"
                      min="0"
                      max="10"
                      value={formData.buyTaxPercentage}
                      onChange={(e) => setFormData({ ...formData, buyTaxPercentage: e.target.value })}
                      placeholder="5"
                      className="bg-gray-900/50 border-gray-700 text-white placeholder:text-gray-500 h-8"
                    />
                  </div>
                )}
              </div>

              {/* Sell Tax Configuration */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="text-sm text-white">Sell Tax Configuration</Label>
                  <Switch
                    id="enableSellTax"
                    checked={formData.enableSellTax}
                    onCheckedChange={(checked) => setFormData({ ...formData, enableSellTax: checked })}
                    className="data-[state=checked]:bg-blue-600"
                  />
                </div>
                {formData.enableSellTax && (
                  <div>
                    <Label htmlFor="sellTaxPercentage" className="text-sm text-white flex items-center">
                      Sell Tax (%)
                      <InfoTooltip text="Percentage fee applied to sell transactions. Max: 10%" />
                    </Label>
                    <Input
                      id="sellTaxPercentage"
                      type="number"
                      min="0"
                      max="10"
                      value={formData.sellTaxPercentage}
                      onChange={(e) => setFormData({ ...formData, sellTaxPercentage: e.target.value })}
                      placeholder="5"
                      className="bg-gray-900/50 border-gray-700 text-white placeholder:text-gray-500 h-8"
                    />
                  </div>
                )}
              </div>

              {/* Fee Distribution */}
              <div className="md:col-span-2 space-y-3">
                <Label className="text-sm text-white">Fee Distribution</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Marketing Fee and Wallet */}
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
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
                      <div>
                        <Label htmlFor="marketingWallet" className="text-sm text-white flex items-center">
                          Marketing Wallet
                          <InfoTooltip text="Address that will receive the marketing fees" />
                        </Label>
                        <Input
                          id="marketingWallet"
                          value={formData.marketingWallet}
                          onChange={(e) => setFormData({ ...formData, marketingWallet: e.target.value })}
                          placeholder="0x..."
                          className="bg-gray-900/50 border-gray-700 text-white placeholder:text-gray-500 h-8"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Development Fee and Wallet */}
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="developmentFee" className="text-sm text-white flex items-center">
                          Development Fee (%)
                          <InfoTooltip text="Percentage of each trade sent to development wallet. Max: 3%" />
                        </Label>
                        <Input
                          id="developmentFee"
                          type="number"
                          min="0"
                          max="3"
                          value={formData.developmentFee}
                          onChange={(e) => setFormData({ ...formData, developmentFee: e.target.value })}
                          placeholder="2"
                          className="bg-gray-900/50 border-gray-700 text-white placeholder:text-gray-500 h-8"
                        />
                      </div>
                      <div>
                        <Label htmlFor="developmentWallet" className="text-sm text-white flex items-center">
                          Development Wallet
                          <InfoTooltip text="Address that will receive the development fees" />
                        </Label>
                        <Input
                          id="developmentWallet"
                          value={formData.developmentWallet}
                          onChange={(e) => setFormData({ ...formData, developmentWallet: e.target.value })}
                          placeholder="0x..."
                          className="bg-gray-900/50 border-gray-700 text-white placeholder:text-gray-500 h-8"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Auto-Liquidity Fee */}
                  <div className="md:col-span-2">
                    <Label htmlFor="autoLiquidityFee" className="text-sm text-white flex items-center">
                      Auto-Liquidity Fee (%)
                      <InfoTooltip text="Percentage of each trade automatically added to liquidity. Max: 2%. Managed by the factory contract." />
                    </Label>
                    <Input
                      id="autoLiquidityFee"
                      type="number"
                      min="0"
                      max="2"
                      value={formData.autoLiquidityFee}
                      onChange={(e) => setFormData({ ...formData, autoLiquidityFee: e.target.value })}
                      placeholder="1"
                      className="bg-gray-900/50 border-gray-700 text-white placeholder:text-gray-500 h-8"
                    />
                  </div>
                </div>
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