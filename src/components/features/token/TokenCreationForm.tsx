import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useNetwork } from '@/contexts/NetworkContext';
import { BrowserProvider, Contract, parseEther, formatEther } from 'ethers';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/toast/use-toast';
import TokenFactoryV1ABI from '@/contracts/abi/TokenFactory_v1.json';
import { FACTORY_ABI } from '@/contracts/abi/TokenFactory_v2_DirectDEX_TwoStep';
import { getNetworkContractAddress } from '@/config/contracts';

interface TokenCreationFormProps {
  onSuccess?: (tokenAddress: string) => void;
  onError?: (error: Error) => void;
}

interface TokenCreationParams {
  name: string;
  symbol: string;
  totalSupply: bigint;
  maxSupply: bigint;
  maxTxAmount: bigint;
  maxWalletAmount: bigint;
  enableTrading: boolean;
  tradingStartTime: number;
  marketingFeePercentage: bigint;
  marketingWallet: string;
  developmentFeePercentage: bigint;
  developmentWallet: string;
  autoLiquidityFeePercentage: bigint;
  enableBuyFees: boolean;
  enableSellFees: boolean;
}

type TokenCreationParamsKey = keyof TokenCreationParams;

export default function TokenCreationForm({ onSuccess, onError }: TokenCreationFormProps) {
  const { isConnected, address } = useAccount();
  const { chainId } = useNetwork();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [listingFee, setListingFee] = useState<bigint>(BigInt(0));

  const [creationParams, setCreationParams] = useState<TokenCreationParams>({
    name: '',
    symbol: '',
    totalSupply: parseEther('1000000'),
    maxSupply: parseEther('1000000'),
    maxTxAmount: parseEther('10000'),
    maxWalletAmount: parseEther('20000'),
    enableTrading: false,
    tradingStartTime: Math.floor(Date.now() / 1000) + 3600,
    marketingFeePercentage: BigInt(2),
    marketingWallet: '0x10C8c279c6b381156733ec160A89Abb260bfcf0C',
    developmentFeePercentage: BigInt(1),
    developmentWallet: '0x991Ed392F033B2228DC55A1dE2b706ef8D9d9DcD',
    autoLiquidityFeePercentage: BigInt(2),
    enableBuyFees: true,
    enableSellFees: true
  });

  useEffect(() => {
    const fetchListingFee = async () => {
      if (!isConnected || !chainId) return;
      
      const factoryAddress = getNetworkContractAddress(Number(chainId), 'dexListingFactory');
      if (!factoryAddress) return;

      try {
        const provider = new BrowserProvider(window.ethereum);
        const factory = new Contract(
          factoryAddress,
          FACTORY_ABI,
          provider
        );
        
        const fee = await factory.listingFee();
        setListingFee(fee);
      } catch (error) {
        console.error('Error fetching listing fee:', error);
      }
    };

    fetchListingFee();
  }, [chainId, isConnected]);

  const handleCreationParamChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setCreationParams(prev => {
      const updatedParams = { ...prev };
      
      if (name === 'totalSupply' || name === 'maxTxAmount' || name === 'maxWalletAmount' || name === 'maxSupply') {
        try {
          if (value === '') {
            if (name === 'totalSupply') {
              updatedParams.totalSupply = parseEther('0');
              updatedParams.maxSupply = parseEther('0'); // Update maxSupply when totalSupply is cleared
            }
            if (name === 'maxSupply') updatedParams.maxSupply = parseEther('0');
            if (name === 'maxTxAmount') updatedParams.maxTxAmount = parseEther('0');
            if (name === 'maxWalletAmount') updatedParams.maxWalletAmount = parseEther('0');
          } else {
            const cleanValue = value.replace(/[^0-9.]/g, '');
            const parts = cleanValue.split('.');
            const finalValue = parts[0] + (parts.length > 1 ? '.' + parts[1] : '');
            const parsedValue = parseEther(finalValue);
            
            if (name === 'totalSupply') {
              updatedParams.totalSupply = parsedValue;
              updatedParams.maxSupply = parsedValue; // Update maxSupply when totalSupply changes
            } else if (name === 'maxSupply') {
              updatedParams.maxSupply = parsedValue;
            } else if (name === 'maxTxAmount') {
              updatedParams.maxTxAmount = parsedValue;
            } else if (name === 'maxWalletAmount') {
              updatedParams.maxWalletAmount = parsedValue;
            }
          }
        } catch (error) {
          console.error(`Error calculating ${name}:`, error);
        }
      } else if (type === 'number') {
        if (name === 'marketingFeePercentage') updatedParams.marketingFeePercentage = BigInt(value || '0');
        if (name === 'developmentFeePercentage') updatedParams.developmentFeePercentage = BigInt(value || '0');
        if (name === 'autoLiquidityFeePercentage') updatedParams.autoLiquidityFeePercentage = BigInt(value || '0');
      } else {
        if (name === 'name') updatedParams.name = value;
        if (name === 'symbol') updatedParams.symbol = value;
        if (name === 'marketingWallet') updatedParams.marketingWallet = value;
        if (name === 'developmentWallet') updatedParams.developmentWallet = value;
      }
      
      return updatedParams;
    });
  };

  const handleSwitchChange = (checked: boolean, field: keyof TokenCreationParams) => {
    setCreationParams(prev => ({
      ...prev,
      [field]: checked
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

    const factoryAddress = getNetworkContractAddress(Number(chainId), 'dexListingFactory');
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
      
      const factory = new Contract(
        factoryAddress,
        FACTORY_ABI,
        signer
      );

      // Log the parameters for debugging
      const tokenParams = {
        name: creationParams.name,
        symbol: creationParams.symbol,
        totalSupply: creationParams.totalSupply,
        maxTxAmount: creationParams.maxTxAmount,
        maxWalletAmount: creationParams.maxWalletAmount,
        enableTrading: creationParams.enableTrading,
        tradingStartTime: BigInt(creationParams.tradingStartTime),
        marketingFeePercentage: BigInt(creationParams.marketingFeePercentage),
        marketingWallet: creationParams.marketingWallet,
        developmentFeePercentage: BigInt(creationParams.developmentFeePercentage),
        developmentWallet: creationParams.developmentWallet,
        autoLiquidityFeePercentage: BigInt(creationParams.autoLiquidityFeePercentage),
        enableBuyFees: creationParams.enableBuyFees,
        enableSellFees: creationParams.enableSellFees
      };

      console.log('Creating token with params:', {
        ...tokenParams,
        totalSupply: tokenParams.totalSupply.toString(),
        maxTxAmount: tokenParams.maxTxAmount.toString(),
        maxWalletAmount: tokenParams.maxWalletAmount.toString(),
        tradingStartTime: tokenParams.tradingStartTime.toString(),
        marketingFeePercentage: tokenParams.marketingFeePercentage.toString(),
        developmentFeePercentage: tokenParams.developmentFeePercentage.toString(),
        autoLiquidityFeePercentage: tokenParams.autoLiquidityFeePercentage.toString()
      });

      // Create token with properly structured parameters
      const tx = await factory.createToken(tokenParams, {
        value: listingFee
      });

      console.log('Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      
      if (receipt) {
        const event = receipt.logs
          .map((log: any) => {
            try {
              return factory.interface.parseLog(log);
            } catch (e) {
              return null;
            }
          })
          .find((event: any) => event && event.name === "TokenCreated");

        if (event) {
          const tokenAddress = event.args.token;
          toast({
            title: "Success",
            description: `Token created successfully at ${tokenAddress}`,
            variant: "default"
          });

          onSuccess?.(tokenAddress);
        }
      }
    } catch (error: any) {
      console.error('Transaction failed:', error);
      let errorMessage = "Failed to create token. Please try again.";
      if (error.reason) {
        errorMessage = error.reason;
      } else if (error.message && error.message.includes("insufficient funds")) {
        errorMessage = "Insufficient funds to pay for gas and deployment fee";
      } else if (error.message && error.message.includes("user rejected")) {
        errorMessage = "Transaction was rejected";
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-2 bg-background-secondary border-border">
      <CardContent className="p-2">
        <form onSubmit={createToken} className="space-y-2">
          {/* Basic Information */}
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-white">Basic Token Information</h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="name" className="text-white">Token Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={creationParams.name}
                  onChange={handleCreationParamChange}
                  placeholder="My Token"
                  required
                  className="mt-1 bg-gray-900 text-white border-gray-700 placeholder:text-gray-500 focus:bg-gray-900 hover:bg-gray-900"
                  style={{ backgroundColor: '#111827', color: 'white' }}
                />
              </div>
              <div>
                <Label htmlFor="symbol" className="text-white">Token Symbol</Label>
                <Input
                  id="symbol"
                  name="symbol"
                  value={creationParams.symbol}
                  onChange={handleCreationParamChange}
                  placeholder="TKN"
                  required
                  className="mt-1 bg-gray-900 text-white border-gray-700 placeholder:text-gray-500 focus:bg-gray-900 hover:bg-gray-900"
                  style={{ backgroundColor: '#111827', color: 'white' }}
                />
              </div>
            </div>
          </div>

          {/* Supply Configuration */}
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-white">Supply Configuration</h3>
            <div className="grid grid-cols-4 gap-2">
              <div>
                <Label htmlFor="totalSupply" className="text-white">Total Supply</Label>
                <Input
                  id="totalSupply"
                  name="totalSupply"
                  type="text"
                  value={formatEther(creationParams.totalSupply)}
                  onChange={handleCreationParamChange}
                  placeholder="1000000"
                  required
                  className="mt-1 bg-gray-900 text-white border-gray-700 placeholder:text-gray-500 focus:bg-gray-900 hover:bg-gray-900"
                  style={{ color: 'white', backgroundColor: '#111827' }}
                />
              </div>
              <div>
                <Label htmlFor="maxSupply" className="text-white">Maximum Supply</Label>
                <Input
                  id="maxSupply"
                  name="maxSupply"
                  type="text"
                  value={formatEther(creationParams.maxSupply)}
                  onChange={handleCreationParamChange}
                  placeholder="1000000"
                  required
                  className="mt-1 bg-gray-900 text-white border-gray-700 placeholder:text-gray-500 focus:bg-gray-900 hover:bg-gray-900"
                  style={{ color: 'white', backgroundColor: '#111827' }}
                />
              </div>
              <div>
                <Label htmlFor="maxTxAmount" className="text-white">Max Transaction</Label>
                <Input
                  id="maxTxAmount"
                  name="maxTxAmount"
                  type="text"
                  value={formatEther(creationParams.maxTxAmount)}
                  onChange={handleCreationParamChange}
                  placeholder="10000"
                  required
                  className="mt-1 bg-gray-900 text-white border-gray-700 placeholder:text-gray-500 focus:bg-gray-900 hover:bg-gray-900"
                  style={{ color: 'white', backgroundColor: '#111827' }}
                />
              </div>
              <div>
                <Label htmlFor="maxWalletAmount" className="text-white">Max Wallet</Label>
                <Input
                  id="maxWalletAmount"
                  name="maxWalletAmount"
                  type="text"
                  value={formatEther(creationParams.maxWalletAmount)}
                  onChange={handleCreationParamChange}
                  placeholder="20000"
                  required
                  className="mt-1 bg-gray-900 text-white border-gray-700 placeholder:text-gray-500 focus:bg-gray-900 hover:bg-gray-900"
                  style={{ color: 'white', backgroundColor: '#111827' }}
                />
              </div>
            </div>
          </div>

          {/* Fee Configuration */}
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-white">Fee Configuration</h3>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label htmlFor="marketingFeePercentage" className="text-white">Marketing Fee (%)</Label>
                <Input
                  id="marketingFeePercentage"
                  name="marketingFeePercentage"
                  type="number"
                  value={Number(creationParams.marketingFeePercentage)}
                  onChange={handleCreationParamChange}
                  placeholder="2"
                  required
                  className="mt-1 bg-gray-900 text-white border-gray-700 placeholder:text-gray-500 focus:bg-gray-900 hover:bg-gray-900"
                  style={{ color: 'white', backgroundColor: '#111827' }}
                />
                <div className="mt-1">
                  <Label htmlFor="marketingWallet" className="text-white">Marketing Wallet</Label>
                  <Input
                    id="marketingWallet"
                    name="marketingWallet"
                    value={creationParams.marketingWallet}
                    onChange={handleCreationParamChange}
                    placeholder="0x..."
                    required
                    className="mt-1 bg-gray-900 text-white border-gray-700 placeholder:text-gray-500 focus:bg-gray-900 hover:bg-gray-900"
                    style={{ color: 'white', backgroundColor: '#111827' }}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="developmentFeePercentage" className="text-white">Development Fee (%)</Label>
                <Input
                  id="developmentFeePercentage"
                  name="developmentFeePercentage"
                  type="number"
                  value={Number(creationParams.developmentFeePercentage)}
                  onChange={handleCreationParamChange}
                  placeholder="1"
                  required
                  className="mt-1 bg-gray-900 text-white border-gray-700 placeholder:text-gray-500 focus:bg-gray-900 hover:bg-gray-900"
                  style={{ color: 'white', backgroundColor: '#111827' }}
                />
                <div className="mt-1">
                  <Label htmlFor="developmentWallet" className="text-white">Development Wallet</Label>
                  <Input
                    id="developmentWallet"
                    name="developmentWallet"
                    value={creationParams.developmentWallet}
                    onChange={handleCreationParamChange}
                    placeholder="0x..."
                    required
                    className="mt-1 bg-gray-900 text-white border-gray-700 placeholder:text-gray-500 focus:bg-gray-900 hover:bg-gray-900"
                    style={{ color: 'white', backgroundColor: '#111827' }}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="autoLiquidityFeePercentage" className="text-white">Auto-Liquidity Fee (%)</Label>
                <Input
                  id="autoLiquidityFeePercentage"
                  name="autoLiquidityFeePercentage"
                  type="number"
                  value={Number(creationParams.autoLiquidityFeePercentage)}
                  onChange={handleCreationParamChange}
                  placeholder="2"
                  required
                  className="mt-1 bg-gray-900 text-white border-gray-700 placeholder:text-gray-500 focus:bg-gray-900 hover:bg-gray-900"
                  style={{ color: 'white', backgroundColor: '#111827' }}
                />
              </div>
            </div>
          </div>

          {/* Trading Configuration */}
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-white">Trading Configuration</h3>
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <Switch
                  id="enableTrading"
                  checked={creationParams.enableTrading}
                  onCheckedChange={(checked) => handleSwitchChange(checked, 'enableTrading')}
                />
                <Label htmlFor="enableTrading" className="text-white">Enable Trading</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="enableBuyFees"
                  checked={creationParams.enableBuyFees}
                  onCheckedChange={(checked) => handleSwitchChange(checked, 'enableBuyFees')}
                />
                <Label htmlFor="enableBuyFees" className="text-white">Enable Buy Fees</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="enableSellFees"
                  checked={creationParams.enableSellFees}
                  onCheckedChange={(checked) => handleSwitchChange(checked, 'enableSellFees')}
                />
                <Label htmlFor="enableSellFees" className="text-white">Enable Sell Fees</Label>
              </div>
            </div>
          </div>

          {/* Bottom Row with Trading Start Time and Actions */}
          <div className="grid grid-cols-2 gap-4 items-end mt-2">
            <div>
              <Label htmlFor="tradingStartTime" className="text-white">Trading Start Time</Label>
              <Input
                id="tradingStartTime"
                name="tradingStartTime"
                type="datetime-local"
                value={new Date(creationParams.tradingStartTime * 1000).toISOString().slice(0, 16)}
                onChange={(e) => {
                  const timestamp = Math.floor(new Date(e.target.value).getTime() / 1000);
                  setCreationParams(prev => ({
                    ...prev,
                    tradingStartTime: timestamp
                  }));
                }}
                required
                className="mt-1 bg-gray-900 text-white border-gray-700 focus:bg-gray-900 hover:bg-gray-900"
                style={{ color: 'white', backgroundColor: '#111827' }}
              />
            </div>
            <div className="text-sm text-gray-400 flex items-center">
              Deployment Fee: {isLoading ? <Spinner className="w-4 h-4" /> : `${formatEther(listingFee)} ETH`}
            </div>
            <div className="col-span-2">
              <Button 
                type="submit" 
                disabled={!isConnected || isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <Spinner className="w-4 h-4 mr-2" />
                    <span>Creating Token...</span>
                  </div>
                ) : !isConnected ? (
                  "Connect Wallet"
                ) : (
                  "Create Token"
                )}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
} 