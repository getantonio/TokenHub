'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useNetwork } from '@/contexts/NetworkContext';
import { BrowserProvider, Contract, parseEther, formatEther, Log, LogDescription } from 'ethers';
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
  totalSupply: bigint;
  marketingFeePercent: bigint;
  marketingWallet: string;
  developmentFeePercent: bigint;
  developmentWallet: string;
  autoLiquidityFeePercent: bigint;
  enableBuyFees: boolean;
  enableSellFees: boolean;
}

interface ListingParameters {
  tokenAddress: string;
  initialLiquidityInETH: string;
  listingPriceInETH: string;
  dexName: string;
  marketingFeePercentage: bigint;
  marketingWallet: string;
  developmentFeePercentage: bigint;
  developmentWallet: string;
  autoLiquidityFeePercentage: bigint;
  enableBuyFees: boolean;
  enableSellFees: boolean;
}

interface CreatedTokenInfo {
  address: string;
  name?: string;
  symbol?: string;
  totalSupply?: bigint;
}

export default function TokenForm_v2DD_2Step({ onSuccess, onError }: TokenFormV2DD2StepProps) {
  const { isConnected, address } = useAccount();
  const { chainId } = useNetwork();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [createdTokenInfo, setCreatedTokenInfo] = useState<CreatedTokenInfo | null>(null);

  // Token Creation State
  const [creationParams, setCreationParams] = useState<TokenCreationParams>({
    name: '',
    symbol: '',
    totalSupply: parseEther('1000000'),
    marketingFeePercent: BigInt(2),
    marketingWallet: address || '',
    developmentFeePercent: BigInt(1),
    developmentWallet: address || '',
    autoLiquidityFeePercent: BigInt(2),
    enableBuyFees: true,
    enableSellFees: true
  });

  // Token Listing State
  const [currentListingParams, setCurrentListingParams] = useState<ListingParameters>({
    tokenAddress: '',
    initialLiquidityInETH: '0.1',
    listingPriceInETH: '0.0001',
    dexName: 'uniswap-test',
    marketingFeePercentage: BigInt(2),
    marketingWallet: address || '',
    developmentFeePercentage: BigInt(2),
    developmentWallet: address || '',
    autoLiquidityFeePercentage: BigInt(1),
    enableBuyFees: true,
    enableSellFees: true
  });

  // Update wallet addresses when user connects
  useEffect(() => {
    if (address) {
      setCreationParams(prev => ({
        ...prev,
        marketingWallet: address,
        developmentWallet: address
      }));
      setCurrentListingParams(prev => ({
        ...prev,
        marketingWallet: address,
        developmentWallet: address
      }));
    }
  }, [address]);

  const handleCreationParamChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    
    setCreationParams(prev => ({
      ...prev,
      [name]: type === 'number' ? 
        (name === 'totalSupply') ?
          parseEther(value || '0') :
        (name.includes('FeePercent')) ? 
          BigInt(value || '0') : 
          value : 
        value
    }));
  };

  const handleListingParamChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCurrentListingParams(prev => ({
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
    console.log("Factory Address:", factoryAddress);

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
      
      // Create contract instance
      const factory = new Contract(
        factoryAddress,
        TokenFactoryV2MakeABI.abi,
        signer
      );

      // Get creation fee
      const creationFee = await factory.getCreationFee();
      console.log("Creation Fee:", formatEther(creationFee));

      // Format total supply (no need to parse again as it's already in wei)
      const formattedTotalSupply = creationParams.totalSupply.toString();

      // Create token
      const tx = await factory.createToken(
        creationParams.name,
        creationParams.symbol,
        formattedTotalSupply,
        creationParams.marketingFeePercent,
        creationParams.developmentFeePercent,
        creationParams.autoLiquidityFeePercent,
        creationParams.marketingWallet || await signer.getAddress(),
        creationParams.developmentWallet || await signer.getAddress(),
        creationParams.enableBuyFees,
        creationParams.enableSellFees,
        {
          value: creationFee,
          gasLimit: 5000000
        }
      );

      console.log("Transaction hash:", tx.hash);
      const receipt = await tx.wait();

      // Get token address from event
      const event = receipt.logs
        .map((log: Log) => {
          try {
            return factory.interface.parseLog(log);
          } catch (e) {
            return null;
          }
        })
        .find((event: LogDescription | null) => event && event.name === "TokenCreated");

      if (event) {
        setCreatedTokenInfo({
          address: event.args.token,
          name: event.args.name,
          symbol: event.args.symbol,
          totalSupply: event.args.totalSupply
        });

        toast({
          title: "Success",
          description: `Token created successfully at ${event.args.token}`,
          variant: "default"
        });

        onSuccess?.();
      }
    } catch (error) {
      console.error("Error creating token:", error);
      toast({
        title: "Error",
        description: "Failed to create token. Please try again.",
        variant: "destructive"
      });
      onError?.(error as Error);
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

      // In the listToken function
      const listingParamsForContract = {
        tokenAddress: createdTokenInfo?.address || '',
        initialLiquidityInETH: currentListingParams.initialLiquidityInETH,
        listingPriceInETH: currentListingParams.listingPriceInETH,
        dexName: currentListingParams.dexName,
        marketingFeePercentage: currentListingParams.marketingFeePercentage,
        marketingWallet: currentListingParams.marketingWallet,
        developmentFeePercentage: currentListingParams.developmentFeePercentage,
        developmentWallet: currentListingParams.developmentWallet,
        autoLiquidityFeePercentage: currentListingParams.autoLiquidityFeePercentage,
        enableBuyFees: currentListingParams.enableBuyFees,
        enableSellFees: currentListingParams.enableSellFees
      };

      // Get listing fee
      const listingFee = await factory.getListingFee();
      const totalValue = parseEther(currentListingParams.initialLiquidityInETH) + listingFee;

      // First approve the factory to spend tokens
      const tokenContract = new Contract(createdTokenInfo?.address || '', TokenFactoryV2BakeABI.abi, signer);
      
      // Get token total supply
      const totalSupply = await tokenContract.totalSupply();
      const tokensForLiquidity = (totalSupply * BigInt(20)) / BigInt(100); // 20% of total supply
      
      const approveTx = await tokenContract.approve(factoryAddress, tokensForLiquidity);
      await approveTx.wait();

      // Then list on DEX
      const tx = await factory.listTokenOnDEX(
        listingParamsForContract.tokenAddress,
        parseEther(currentListingParams.initialLiquidityInETH),
        parseEther(currentListingParams.listingPriceInETH),
        currentListingParams.dexName,
        { 
          value: totalValue,
          gasLimit: 3000000 // Set explicit gas limit
        }
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
              <div className="grid grid-cols-2 gap-4">
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
                    placeholder="TKN"
                    required
                    className="bg-gray-900 text-white border-border"
                  />
                </div>
              </div>

              <h3 className="text-lg font-semibold text-white mt-4">Supply</h3>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="totalSupply" className="text-white">Total Supply</Label>
                  <Input
                    id="totalSupply"
                    name="totalSupply"
                    type="text"
                    value={formatEther(creationParams.totalSupply)}
                    onChange={handleCreationParamChange}
                    placeholder="1000000"
                    required
                    className="bg-gray-900 text-white border-border"
                  />
                </div>
              </div>

              <h3 className="text-lg font-semibold text-white mt-4">Fee Controls</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="marketingFeePercent" className="text-white">Marketing Fee (%)</Label>
                  <Input
                    id="marketingFeePercent"
                    name="marketingFeePercent"
                    type="number"
                    value={Number(creationParams.marketingFeePercent)}
                    onChange={handleCreationParamChange}
                    placeholder="2"
                    required
                    className="bg-gray-900 text-white border-border"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="developmentFeePercent" className="text-white">Development Fee (%)</Label>
                  <Input
                    id="developmentFeePercent"
                    name="developmentFeePercent"
                    type="number"
                    value={Number(creationParams.developmentFeePercent)}
                    onChange={handleCreationParamChange}
                    placeholder="1"
                    required
                    className="bg-gray-900 text-white border-border"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="autoLiquidityFeePercent" className="text-white">Auto-Liquidity Fee (%)</Label>
                  <Input
                    id="autoLiquidityFeePercent"
                    name="autoLiquidityFeePercent"
                    type="number"
                    value={Number(creationParams.autoLiquidityFeePercent)}
                    onChange={handleCreationParamChange}
                    placeholder="2"
                    required
                    className="bg-gray-900 text-white border-border"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="enableBuyFees"
                    name="enableBuyFees"
                    checked={creationParams.enableBuyFees}
                    onCheckedChange={(checked) => setCreationParams(prev => ({ ...prev, enableBuyFees: checked }))}
                  />
                  <Label htmlFor="enableBuyFees" className="text-white">Enable Buy Fees</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="enableSellFees"
                    name="enableSellFees"
                    checked={creationParams.enableSellFees}
                    onCheckedChange={(checked) => setCreationParams(prev => ({ ...prev, enableSellFees: checked }))}
                  />
                  <Label htmlFor="enableSellFees" className="text-white">Enable Sell Fees</Label>
                </div>
              </div>

              <h3 className="text-lg font-semibold text-white mt-4">Wallet Addresses</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="marketingWallet" className="text-white">Marketing Wallet</Label>
                  <Input
                    id="marketingWallet"
                    name="marketingWallet"
                    value={creationParams.marketingWallet}
                    onChange={handleCreationParamChange}
                    placeholder="0x..."
                    required
                    className="bg-gray-900 text-white border-border"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="developmentWallet" className="text-white">Development Wallet</Label>
                  <Input
                    id="developmentWallet"
                    name="developmentWallet"
                    value={creationParams.developmentWallet}
                    onChange={handleCreationParamChange}
                    placeholder="0x..."
                    required
                    className="bg-gray-900 text-white border-border"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full mt-4">
                Create Token
              </Button>
            </div>
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
                  value={currentListingParams.tokenAddress}
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
                  value={currentListingParams.initialLiquidityInETH}
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
                  value={currentListingParams.listingPriceInETH}
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