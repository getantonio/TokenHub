'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useNetwork } from '@/contexts/NetworkContext';
import { BrowserProvider, Contract, parseEther, formatEther } from 'ethers';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/components/ui/toast/use-toast';
import { getNetworkContractAddress } from '@/config/contracts';
import TokenFactoryV2MakeABI from '@/contracts/abi/TokenFactory_v2_Make.json';
import TokenFactoryV2BakeABI from '@/contracts/abi/TokenFactory_v2_Bake.json';

interface TokenFormV2DD2StepProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

interface TokenCreationParams {
  name: string;
  symbol: string;
  totalSupply: string;
  maxTxAmount: string;
  maxWalletAmount: string;
  enableTrading: boolean;
  tradingStartTime: number;
  marketingFeePercentage: number;
  marketingWallet: string;
  developmentFeePercentage: number;
  developmentWallet: string;
  autoLiquidityFeePercentage: number;
  enableBuyFees: boolean;
  enableSellFees: boolean;
}

interface TokenListingParams {
  tokenAddress: string;
  initialLiquidityInETH: string;
  listingPriceInETH: string;
  dexName: string;
}

export default function TokenForm_v2DD_2Step({ onSuccess, onError }: TokenFormV2DD2StepProps) {
  const { isConnected } = useAccount();
  const { chainId } = useNetwork();
  const { toast } = useToast();

  // Token Creation State
  const [creationParams, setCreationParams] = useState<TokenCreationParams>({
    name: '',
    symbol: '',
    totalSupply: '1000000',
    maxTxAmount: '10000',
    maxWalletAmount: '20000',
    enableTrading: false,
    tradingStartTime: Math.floor(Date.now() / 1000) + 300,
    marketingFeePercentage: 2,
    marketingWallet: '',
    developmentFeePercentage: 2,
    developmentWallet: '',
    autoLiquidityFeePercentage: 1,
    enableBuyFees: true,
    enableSellFees: true
  });

  // Token Listing State
  const [listingParams, setListingParams] = useState<TokenListingParams>({
    tokenAddress: '',
    initialLiquidityInETH: '0.1',
    listingPriceInETH: '0.0001',
    dexName: 'uniswap-test'
  });

  const [isLoading, setIsLoading] = useState(false);
  const [createdTokenInfo, setCreatedTokenInfo] = useState<{ address: string } | null>(null);

  const handleCreationParamChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setCreationParams(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }));
  };

  const handleListingParamChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setListingParams(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const createToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected || !chainId) {
      toast({
        title: "Error",
        description: "Please connect your wallet first",
        variant: "destructive"
      });
      return;
    }

    const factoryAddress = getNetworkContractAddress(Number(chainId), 'factoryAddressV2DirectDEX_Make');
    if (!factoryAddress) {
      toast({
        title: "Error",
        description: "Factory not deployed on this network",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const factory = new Contract(factoryAddress, TokenFactoryV2MakeABI.abi, signer);

      // Get creation fee
      const creationFee = await factory.getCreationFee();

      const tx = await factory.createToken(
        [
          creationParams.name,
          creationParams.symbol,
          parseEther(creationParams.totalSupply),
          parseEther(creationParams.maxTxAmount),
          parseEther(creationParams.maxWalletAmount),
          creationParams.enableTrading,
          creationParams.tradingStartTime,
          creationParams.marketingFeePercentage,
          creationParams.marketingWallet || await signer.getAddress(),
          creationParams.developmentFeePercentage,
          creationParams.developmentWallet || await signer.getAddress(),
          creationParams.autoLiquidityFeePercentage,
          creationParams.enableBuyFees,
          creationParams.enableSellFees
        ],
        { value: creationFee }
      );

      const receipt = await tx.wait();
      const event = receipt.logs
        .map((log: any) => {
          try {
            return factory.interface.parseLog(log);
          } catch (e) {
            return null;
          }
        })
        .find((event: any) => event && event.name === 'TokenCreated');

      if (event) {
        const tokenAddress = event.args.token;
        setCreatedTokenInfo({ address: tokenAddress });
        setListingParams(prev => ({ ...prev, tokenAddress }));
        
        toast({
          title: "Success",
          description: "Token created successfully!",
          variant: "default"
        });
      }

      onSuccess?.();
    } catch (error: any) {
      console.error('Error creating token:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create token",
        variant: "destructive"
      });
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  };

  const listToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected || !chainId) {
      toast({
        title: "Error",
        description: "Please connect your wallet first",
        variant: "destructive"
      });
      return;
    }

    const factoryAddress = getNetworkContractAddress(Number(chainId), 'factoryAddressV2DirectDEX_Bake');
    if (!factoryAddress) {
      toast({
        title: "Error",
        description: "Factory not deployed on this network",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const factory = new Contract(factoryAddress, TokenFactoryV2BakeABI.abi, signer);

      // Get listing fee
      const listingFee = await factory.getListingFee();
      const totalValue = parseEther(listingParams.initialLiquidityInETH) + listingFee;

      const tx = await factory.listTokenOnDEX(
        listingParams.tokenAddress,
        parseEther(listingParams.initialLiquidityInETH),
        parseEther(listingParams.listingPriceInETH),
        listingParams.dexName,
        { value: totalValue }
      );

      const receipt = await tx.wait();
      toast({
        title: "Success",
        description: "Token listed successfully!",
        variant: "default"
      });

      onSuccess?.();
    } catch (error: any) {
      console.error('Error listing token:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to list token",
        variant: "destructive"
      });
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Tabs defaultValue="create" className="space-y-4 w-full max-w-2xl mx-auto">
      <TabsList className="grid w-full grid-cols-2 bg-background-secondary border border-border">
        <TabsTrigger 
          value="create"
          className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-white"
        >
          Create Token
        </TabsTrigger>
        <TabsTrigger 
          value="list"
          className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-white"
        >
          List on DEX
        </TabsTrigger>
      </TabsList>

      <TabsContent value="create">
        <Card className="p-4 bg-background-secondary border-border">
          <form onSubmit={createToken} className="space-y-4">
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-white">Basic Token Information</h3>
              <div className="grid gap-2">
                <Label htmlFor="name" className="text-white">Token Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={creationParams.name}
                  onChange={handleCreationParamChange}
                  placeholder="My Token"
                  required
                  className="bg-gray-900 text-white border-border"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="symbol" className="text-white">Token Symbol</Label>
                <Input
                  id="symbol"
                  name="symbol"
                  value={creationParams.symbol}
                  onChange={handleCreationParamChange}
                  placeholder="MTK"
                  required
                  className="bg-gray-900 text-white border-border"
                />
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-white">Supply & Limits</h3>
              <div className="grid gap-2">
                <Label htmlFor="totalSupply" className="text-white">Total Supply</Label>
                <Input
                  id="totalSupply"
                  name="totalSupply"
                  type="number"
                  value={creationParams.totalSupply}
                  onChange={handleCreationParamChange}
                  required
                  className="bg-gray-900 text-white border-border"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="maxTxAmount" className="text-white">Max Transaction Amount</Label>
                <Input
                  id="maxTxAmount"
                  name="maxTxAmount"
                  type="number"
                  value={creationParams.maxTxAmount}
                  onChange={handleCreationParamChange}
                  required
                  className="bg-gray-900 text-white border-border"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="maxWalletAmount" className="text-white">Max Wallet Amount</Label>
                <Input
                  id="maxWalletAmount"
                  name="maxWalletAmount"
                  type="number"
                  value={creationParams.maxWalletAmount}
                  onChange={handleCreationParamChange}
                  required
                  className="bg-gray-900 text-white border-border"
                />
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-white">Fee Configuration</h3>
              <div className="grid gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-20">
                    <Input
                      id="marketingFeePercentage"
                      name="marketingFeePercentage"
                      type="number"
                      value={creationParams.marketingFeePercentage}
                      onChange={handleCreationParamChange}
                      required
                      className="bg-gray-900 text-white border-border"
                    />
                  </div>
                  <Label htmlFor="marketingFeePercentage" className="text-white whitespace-nowrap">Marketing Fee %</Label>
                  <Input
                    id="marketingWallet"
                    name="marketingWallet"
                    value={creationParams.marketingWallet}
                    onChange={handleCreationParamChange}
                    placeholder="Marketing Wallet Address"
                    className="flex-1 bg-gray-900 text-white border-border"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-20">
                    <Input
                      id="developmentFeePercentage"
                      name="developmentFeePercentage"
                      type="number"
                      value={creationParams.developmentFeePercentage}
                      onChange={handleCreationParamChange}
                      required
                      className="bg-gray-900 text-white border-border"
                    />
                  </div>
                  <Label htmlFor="developmentFeePercentage" className="text-white">Development Fee %</Label>
                  <Input
                    id="developmentWallet"
                    name="developmentWallet"
                    value={creationParams.developmentWallet}
                    onChange={handleCreationParamChange}
                    placeholder="Development Wallet Address"
                    className="flex-1 bg-gray-900 text-white border-border"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-20">
                    <Input
                      id="autoLiquidityFeePercentage"
                      name="autoLiquidityFeePercentage"
                      type="number"
                      value={creationParams.autoLiquidityFeePercentage}
                      onChange={handleCreationParamChange}
                      required
                      className="bg-gray-900 text-white border-border"
                    />
                  </div>
                  <Label htmlFor="autoLiquidityFeePercentage" className="text-white">Auto-Liquidity Fee %</Label>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Trading Controls</h3>
              <div className="flex items-center justify-between">
                <Label htmlFor="enableTrading" className="text-white">Enable Trading</Label>
                <Switch
                  id="enableTrading"
                  name="enableTrading"
                  checked={creationParams.enableTrading}
                  onCheckedChange={(checked) => setCreationParams(prev => ({ ...prev, enableTrading: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="enableBuyFees" className="text-white">Enable Buy Fees</Label>
                <Switch
                  id="enableBuyFees"
                  name="enableBuyFees"
                  checked={creationParams.enableBuyFees}
                  onCheckedChange={(checked) => setCreationParams(prev => ({ ...prev, enableBuyFees: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="enableSellFees" className="text-white">Enable Sell Fees</Label>
                <Switch
                  id="enableSellFees"
                  name="enableSellFees"
                  checked={creationParams.enableSellFees}
                  onCheckedChange={(checked) => setCreationParams(prev => ({ ...prev, enableSellFees: checked }))}
                />
              </div>
            </div>

            <Button type="submit" disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              {isLoading ? 'Creating...' : 'Create Token'}
            </Button>
          </form>
        </Card>
      </TabsContent>

      <TabsContent value="list">
        <Card className="p-4 bg-background-secondary border-border">
          <form onSubmit={listToken} className="space-y-4">
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-white">Token Listing</h3>
              <div className="grid gap-2">
                <Label htmlFor="tokenAddress" className="text-white">Token Address</Label>
                <Input
                  id="tokenAddress"
                  name="tokenAddress"
                  value={listingParams.tokenAddress}
                  onChange={handleListingParamChange}
                  placeholder="0x..."
                  required
                  className="bg-gray-900 text-white border-border"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="initialLiquidityInETH" className="text-white">Initial Liquidity (ETH)</Label>
                <Input
                  id="initialLiquidityInETH"
                  name="initialLiquidityInETH"
                  type="number"
                  step="0.01"
                  value={listingParams.initialLiquidityInETH}
                  onChange={handleListingParamChange}
                  required
                  className="bg-gray-900 text-white border-border"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="listingPriceInETH" className="text-white">Listing Price (ETH)</Label>
                <Input
                  id="listingPriceInETH"
                  name="listingPriceInETH"
                  type="number"
                  step="0.0000001"
                  value={listingParams.listingPriceInETH}
                  onChange={handleListingParamChange}
                  required
                  className="bg-gray-900 text-white border-border"
                />
              </div>
            </div>

            <Button type="submit" disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              {isLoading ? 'Listing...' : 'List Token'}
            </Button>
          </form>
        </Card>
      </TabsContent>
    </Tabs>
  );
} 