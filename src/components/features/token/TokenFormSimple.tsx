import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useNetwork } from '@/contexts/NetworkContext';
import { BrowserProvider, Contract, parseEther, formatEther, Log, LogDescription } from 'ethers';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toast/use-toast';
import { getNetworkContractAddress } from '@/config/contracts';
import TokenFactoryTestABI from '@/contracts/abi/TokenFactoryTest.json';
import { Switch } from '@/components/ui/switch';

interface TokenFormSimpleProps {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

interface SimpleTokenParams {
  name: string;
  symbol: string;
  totalSupply: string;
  marketingFeePercent: string;
  developmentFeePercent: string;
  autoLiquidityFeePercent: string;
  marketingWallet: string;
  developmentWallet: string;
  enableBuyFees: boolean;
  enableSellFees: boolean;
}

export default function TokenFormSimple({ onSuccess, onError }: TokenFormSimpleProps) {
  const { isConnected } = useAccount();
  const { chainId } = useNetwork();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [tokenParams, setTokenParams] = useState<SimpleTokenParams>({
    name: '',
    symbol: '',
    totalSupply: '',
    marketingFeePercent: '2',
    developmentFeePercent: '2',
    autoLiquidityFeePercent: '1',
    marketingWallet: '',
    developmentWallet: '',
    enableBuyFees: true,
    enableSellFees: true
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTokenParams(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSwitchChange = (name: string) => (checked: boolean) => {
    setTokenParams(prev => ({
      ...prev,
      [name]: checked
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

    const factoryAddress = getNetworkContractAddress(Number(chainId), 'factoryAddressTest');
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
        TokenFactoryTestABI.abi,
        signer
      );

      // Get creation fee
      const creationFee = await factory.getCreationFee();
      console.log("Creation Fee:", formatEther(creationFee));

      // Format total supply with proper decimals (18)
      const totalSupply = tokenParams.totalSupply.replace(/,/g, '');
      const formattedTotalSupply = parseEther(totalSupply);

      console.log("Parameters:", {
        name: tokenParams.name,
        symbol: tokenParams.symbol,
        totalSupply: formattedTotalSupply.toString(),
        marketingFeePercent: parseInt(tokenParams.marketingFeePercent),
        developmentFeePercent: parseInt(tokenParams.developmentFeePercent),
        autoLiquidityFeePercent: parseInt(tokenParams.autoLiquidityFeePercent),
        marketingWallet: tokenParams.marketingWallet,
        developmentWallet: tokenParams.developmentWallet,
        enableBuyFees: tokenParams.enableBuyFees,
        enableSellFees: tokenParams.enableSellFees
      });

      // Create token with direct contract call
      const tx = await factory.createToken(
        tokenParams.name,
        tokenParams.symbol,
        formattedTotalSupply,
        parseInt(tokenParams.marketingFeePercent),
        parseInt(tokenParams.developmentFeePercent),
        parseInt(tokenParams.autoLiquidityFeePercent),
        tokenParams.marketingWallet,
        tokenParams.developmentWallet,
        tokenParams.enableBuyFees,
        tokenParams.enableSellFees,
        {
          value: creationFee,
          gasLimit: 3000000
        }
      );

      console.log("Transaction hash:", tx.hash);
      const receipt = await tx.wait();
      
      if (!receipt) {
        throw new Error("Failed to get transaction receipt");
      }

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
        toast({
          title: "Success",
          description: `Token created successfully at ${event.args.token}`,
          variant: "default"
        });
      } else {
        toast({
          title: "Success",
          description: "Token created successfully!",
          variant: "default"
        });
      }

      onSuccess?.();
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

  return (
    <Card className="p-6 bg-gray-900">
      <form onSubmit={createToken}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name" className="text-white">Token Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="My Token"
                value={tokenParams.name}
                onChange={handleInputChange}
                required
                className="bg-gray-800 text-white border-gray-700 focus:border-blue-500"
              />
            </div>
            
            <div>
              <Label htmlFor="symbol" className="text-white">Token Symbol</Label>
              <Input
                id="symbol"
                name="symbol"
                placeholder="MTK"
                value={tokenParams.symbol}
                onChange={handleInputChange}
                required
                className="bg-gray-800 text-white border-gray-700 focus:border-blue-500"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="totalSupply" className="text-white">Total Supply</Label>
            <Input
              id="totalSupply"
              name="totalSupply"
              type="text"
              placeholder="1000000"
              value={tokenParams.totalSupply}
              onChange={handleInputChange}
              required
              className="bg-gray-800 text-white border-gray-700 focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="marketingFeePercent" className="text-white">Marketing Fee (%)</Label>
              <Input
                id="marketingFeePercent"
                name="marketingFeePercent"
                type="number"
                min="0"
                max="10"
                placeholder="2"
                value={tokenParams.marketingFeePercent}
                onChange={handleInputChange}
                required
                className="bg-gray-800 text-white border-gray-700 focus:border-blue-500"
              />
            </div>

            <div>
              <Label htmlFor="developmentFeePercent" className="text-white">Development Fee (%)</Label>
              <Input
                id="developmentFeePercent"
                name="developmentFeePercent"
                type="number"
                min="0"
                max="10"
                placeholder="2"
                value={tokenParams.developmentFeePercent}
                onChange={handleInputChange}
                required
                className="bg-gray-800 text-white border-gray-700 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="marketingWallet" className="text-white">Marketing Wallet</Label>
              <Input
                id="marketingWallet"
                name="marketingWallet"
                type="text"
                placeholder="0x..."
                value={tokenParams.marketingWallet}
                onChange={handleInputChange}
                required
                className="bg-gray-800 text-white border-gray-700 focus:border-blue-500"
              />
            </div>

            <div>
              <Label htmlFor="developmentWallet" className="text-white">Development Wallet</Label>
              <Input
                id="developmentWallet"
                name="developmentWallet"
                type="text"
                placeholder="0x..."
                value={tokenParams.developmentWallet}
                onChange={handleInputChange}
                required
                className="bg-gray-800 text-white border-gray-700 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="autoLiquidityFeePercent" className="text-white">Auto-Liquidity Fee (%)</Label>
            <Input
              id="autoLiquidityFeePercent"
              name="autoLiquidityFeePercent"
              type="number"
              min="0"
              max="10"
              placeholder="1"
              value={tokenParams.autoLiquidityFeePercent}
              onChange={handleInputChange}
              required
              className="bg-gray-800 text-white border-gray-700 focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="enableBuyFees"
                checked={tokenParams.enableBuyFees}
                onCheckedChange={handleSwitchChange('enableBuyFees')}
              />
              <Label htmlFor="enableBuyFees" className="text-white">Enable Buy Fees</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="enableSellFees"
                checked={tokenParams.enableSellFees}
                onCheckedChange={handleSwitchChange('enableSellFees')}
              />
              <Label htmlFor="enableSellFees" className="text-white">Enable Sell Fees</Label>
            </div>
          </div>

          <Button 
            type="submit" 
            disabled={isLoading} 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isLoading ? 'Creating Token...' : 'Create Token'}
          </Button>
        </div>
      </form>
    </Card>
  );
} 