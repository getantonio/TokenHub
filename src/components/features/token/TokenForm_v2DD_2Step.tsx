'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useNetwork } from '@/contexts/NetworkContext';
import { BrowserProvider, Contract, parseEther, formatEther, EventLog, Log, LogDescription, Interface } from 'ethers';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/toast/use-toast';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Spinner } from '@/components/ui/Spinner';
import TokenFactoryV2MakeABI from '@/contracts/abi/TokenFactory_v2_Make.json';
import TokenFactoryV2BakeABI from '@/contracts/abi/TokenFactory_v2_Bake.json';
import TestTokenABI from '@/contracts/abi/TestToken.json';
import TokenFactoryV2DirectDEXABI from '@/contracts/abi/TokenFactory_v2_DirectDEX.json';
import TokenFactoryV2DirectDEXTwoStepABI from '@/contracts/abi/TokenFactory_v2_DirectDEX_TwoStep.json';
import { getNetworkContractAddress } from '@/config/contracts';

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
  enableTrading: boolean;
  tradingStartTime: number;
  isApproved?: boolean;
  liquidityPercentage: string;
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
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [createdTokenInfo, setCreatedTokenInfo] = useState<CreatedTokenInfo | null>(null);
  const [supportedDEXes, setSupportedDEXes] = useState<Array<{name: string, isActive: boolean, router: string}>>([]);

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
  const [listingParams, setListingParams] = useState<ListingParameters>({
    tokenAddress: '',
    initialLiquidityInETH: '',
    listingPriceInETH: '',
    dexName: '',
    enableTrading: false,
    tradingStartTime: Math.floor(Date.now() / 1000) + 300, // 5 minutes from now
    isApproved: false,
    liquidityPercentage: '20'
  });

  // Update wallet addresses when user connects
  useEffect(() => {
    if (address) {
      setCreationParams(prev => ({
        ...prev,
        marketingWallet: address,
        developmentWallet: address
      }));
      setListingParams(prev => ({
        ...prev,
        marketingWallet: address,
        developmentWallet: address
      }));
    }
  }, [address]);

  const handleCreationParamChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCreationParams(prev => {
      let updatedParams = { ...prev };
      
      if (name === 'totalSupply') {
        try {
          // Allow empty value
          if (value === '') {
            updatedParams.totalSupply = parseEther('0');
          } else {
            // Remove any non-numeric characters except decimal point
            const cleanValue = value.replace(/[^0-9.]/g, '');
            // Ensure only one decimal point
            const parts = cleanValue.split('.');
            const finalValue = parts[0] + (parts.length > 1 ? '.' + parts[1] : '');
            updatedParams.totalSupply = parseEther(finalValue);
          }
        } catch (error) {
          console.error('Error calculating total supply:', error);
        }
      } else {
        // Type-safe way to update specific fields
        switch (name) {
          case 'name':
          case 'symbol':
          case 'marketingWallet':
          case 'developmentWallet':
            updatedParams[name] = value;
            break;
          case 'marketingFeePercent':
          case 'developmentFeePercent':
          case 'autoLiquidityFeePercent':
            updatedParams[name] = BigInt(value || '0');
            break;
          case 'enableBuyFees':
          case 'enableSellFees':
            updatedParams[name] = value === 'true';
            break;
        }
      }
      
      return updatedParams;
    });
  };

  const handleListingParamChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setListingParams(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleDEXChange = (value: string) => {
    setListingParams(prev => ({ ...prev, dexName: value }));
  };

  const handleTradingStartTimeChange = (minutes: number) => {
    const newStartTime = Math.floor(Date.now() / 1000) + (minutes * 60);
    setListingParams(prev => ({ ...prev, tradingStartTime: newStartTime }));
  };

  const handleSwitchChange = (checked: boolean, field: keyof ListingParameters) => {
    setListingParams(prev => ({
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
      
      // Verify contract exists
      const code = await provider.getCode(factoryAddress);
      console.log("Contract code length at address:", code.length);
      if (code === '0x' || code === '0x0') {
        throw new Error(`No contract found at address ${factoryAddress}`);
      }

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

        // Update the listing params with the new token address
        setListingParams(prev => ({
          ...prev,
          tokenAddress: event.args.token
        }));

        // Move to the next step
        setStep(2);

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

  const handleApproveToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected || !chainId) {
      toast({
        title: "Error",
        description: "Please connect your wallet first",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const factoryAddress = getNetworkContractAddress(Number(chainId), 'factoryAddressV2DirectDEX_Bake');
      console.log("Bake Factory Address:", factoryAddress);
      
      if (!factoryAddress) {
        toast({
          title: "Error",
          description: "Factory not deployed on this network",
          variant: "destructive"
        });
        return;
      }

      // Create token contract instance
      const tokenContract = new Contract(
        listingParams.tokenAddress,
        [
          'function totalSupply() view returns (uint256)',
          'function approve(address spender, uint256 amount) returns (bool)',
          'function allowance(address owner, address spender) view returns (uint256)',
          'function owner() view returns (address)'
        ],
        signer
      );

      // Verify token ownership
      const tokenOwner = await tokenContract.owner();
      if (tokenOwner.toLowerCase() !== (await signer.getAddress()).toLowerCase()) {
        throw new Error('You are not the token owner');
      }

      // Calculate total supply and tokens needed for liquidity
      const totalSupply = await tokenContract.totalSupply();
      const tokensForLiquidity = (BigInt(totalSupply) * BigInt(listingParams.liquidityPercentage)) / BigInt(100);

      // Check current allowance
      const currentAllowance = await tokenContract.allowance(await signer.getAddress(), factoryAddress);
      
      // If allowance is insufficient, approve tokens
      if (BigInt(currentAllowance) < tokensForLiquidity) {
        console.log("Approving tokens for liquidity...");
        const approveTx = await tokenContract.approve(factoryAddress, tokensForLiquidity);
        await approveTx.wait();
        console.log("Token approval confirmed");
        
        // Set approval state and move to next step
        setListingParams(prev => ({
          ...prev,
          isApproved: true
        }));
        setStep(3);
        
        toast({
          title: "Success",
          description: "Token approved for listing. You can now complete the listing process.",
          variant: "default"
        });
      } else {
        console.log("Token already has sufficient allowance");
        setListingParams(prev => ({
          ...prev,
          isApproved: true
        }));
        setStep(3);
      }
    } catch (error) {
      console.error("Error approving token:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to approve token. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
      
      if (typeof onError === 'function') {
        onError(error instanceof Error ? error : new Error(errorMessage));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadSupportedDEXes = async () => {
    if (!chainId || !window.ethereum) {
      console.log('Missing chainId or ethereum object:', { chainId, ethereum: !!window.ethereum });
      return;
    }
    
    try {
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const bakeFactoryAddress = getNetworkContractAddress(Number(chainId), 'factoryAddressV2DirectDEX_Bake');
      
      console.log('Loading DEXes with:', {
        chainId,
        bakeFactoryAddress,
        signerAddress: await signer.getAddress()
      });
      
      if (!bakeFactoryAddress) {
        console.error('Bake factory address not available');
        toast({
          title: "Warning",
          description: "DEX factory not configured for this network. Please contact support.",
          variant: "destructive"
        });
        return;
      }

      const bakeFactory = new Contract(
        bakeFactoryAddress,
        TokenFactoryV2BakeABI.abi,
        signer
      );

      try {
        // Get supported DEXes
        console.log('Calling getSupportedDEXes...');
        const dexNames = await bakeFactory.getSupportedDEXes();
        console.log('Supported DEX names:', dexNames);

        if (!dexNames || dexNames.length === 0) {
          console.log('No DEXes returned from contract, checking if DEXes need to be added...');
          
          // Check specific DEX configurations
          const uniswapInfo = await bakeFactory.getDEXRouter('uniswap-test');
          const pancakeInfo = await bakeFactory.getDEXRouter('pancakeswap-test');
          
          console.log('DEX Configurations:', {
            'uniswap-test': uniswapInfo,
            'pancakeswap-test': pancakeInfo
          });

          toast({
            title: "Warning",
            description: "No active DEXes found. Please ensure DEXes are configured in the contract.",
            variant: "destructive"
          });
          return;
        }

        const dexPromises = dexNames.map(async (name: string) => {
          try {
            console.log('Getting info for DEX:', name);
            const dexInfo = await bakeFactory.getDEXRouter(name);
            console.log('DEX info:', { name, info: dexInfo });
            
            if (!dexInfo.router || dexInfo.router === '0x0000000000000000000000000000000000000000') {
              console.warn(`Invalid router address for DEX ${name}`);
              return null;
            }

            return {
              name,
              isActive: dexInfo.isActive,
              router: dexInfo.router
            };
          } catch (error) {
            console.error(`Error getting DEX info for ${name}:`, error);
            return null;
          }
        });

        const dexes = (await Promise.all(dexPromises)).filter(dex => dex !== null);
        console.log('Final DEX list:', dexes);
        
        if (dexes.length === 0) {
          toast({
            title: "Warning",
            description: "No properly configured DEXes found. Please contact support.",
            variant: "destructive"
          });
        }
        
        setSupportedDEXes(dexes);
      } catch (error) {
        console.error('Error in getSupportedDEXes:', error);
        toast({
          title: "Error",
          description: "Failed to load DEX information. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error loading supported DEXes:', error);
      toast({
        title: "Error",
        description: "Failed to connect to DEX factory. Please check your connection.",
        variant: "destructive"
      });
    }
  };

  // Add immediate DEX loading when component mounts
  useEffect(() => {
    if (isConnected && window.ethereum) {
      loadSupportedDEXes();
    }
  }, [isConnected, window.ethereum, chainId]);

  // Also load DEXes when step changes to 2
  useEffect(() => {
    if (step === 2 && isConnected && window.ethereum) {
      loadSupportedDEXes();
    }
  }, [step]);

  const handleListToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected || !chainId) {
      toast({
        title: "Error",
        description: "Please connect your wallet first",
        variant: "destructive"
      });
      return;
    }

    const bakeFactoryAddress = getNetworkContractAddress(Number(chainId), 'factoryAddressV2DirectDEX_Bake');
    if (!bakeFactoryAddress) {
      toast({
        title: "Error",
        description: "Factory not deployed on this network",
        variant: "destructive"
      });
      return;
    }

    // Validate DEX selection
    if (!listingParams.dexName) {
      toast({
        title: "Error",
        description: "Please select a DEX",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      console.log("Creating factory contract instance...");
      const factory = new Contract(
        bakeFactoryAddress,
        TokenFactoryV2DirectDEXTwoStepABI.abi,
        signer
      );

      // Get DEX info and validate before proceeding
      console.log("Checking DEX configuration...");
      const dexInfo = await factory.getDEXRouter(listingParams.dexName);
      console.log("DEX Info:", dexInfo);

      if (!dexInfo.router || dexInfo.router === '0x0000000000000000000000000000000000000000') {
        throw new Error(`DEX ${listingParams.dexName} is not properly configured (no router address)`);
      }

      if (!dexInfo.isActive) {
        throw new Error(`DEX ${listingParams.dexName} is not active`);
      }

      // Get listing fee
      console.log("Calling getListingFee...");
      const listingFee = await factory.getListingFee();
      console.log("Listing Fee:", formatEther(listingFee));

      // Calculate total value needed (listing fee + initial liquidity)
      const totalValue = BigInt(listingFee) + parseEther(listingParams.initialLiquidityInETH);

      // Debug values
      console.log("Listing parameters:", {
        tokenAddress: listingParams.tokenAddress,
        initialLiquidityWei: parseEther(listingParams.initialLiquidityInETH).toString(),
        listingPriceWei: parseEther(listingParams.listingPriceInETH).toString(),
        dexName: listingParams.dexName,
        totalValue: totalValue.toString(),
        liquidityPercentage: listingParams.liquidityPercentage,
        dexRouter: dexInfo.router
      });

      // Call listTokenOnDEX with the correct parameters for the Bake contract
      const tx = await factory.listTokenOnDEX(
        listingParams.tokenAddress,
        parseEther(listingParams.initialLiquidityInETH),
        parseEther(listingParams.listingPriceInETH),
        listingParams.dexName,
        Number(listingParams.liquidityPercentage),
        {
          value: totalValue.toString(),
          gasLimit: 5000000
        }
      );

      console.log("Transaction sent:", tx.hash);
      const receipt = await tx.wait();

      toast({
        title: "Success",
        description: `Token listed successfully on ${listingParams.dexName}`,
        variant: "default"
      });

      if (typeof onSuccess === 'function') {
        onSuccess();
      }
    } catch (error) {
      console.error("Error listing token:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to list token. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
      
      if (typeof onError === 'function') {
        onError(error instanceof Error ? error : new Error(errorMessage));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs value={String(step)} onValueChange={(value) => setStep(Number(value))} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger 
            value="1" 
            className="bg-blue-900 text-white data-[state=active]:bg-blue-800"
          >
            Create Token
          </TabsTrigger>
          <TabsTrigger 
            value="2" 
            className="bg-blue-900 text-white data-[state=active]:bg-blue-800"
          >
            Approve Listing
          </TabsTrigger>
          <TabsTrigger 
            value="3" 
            className="bg-blue-900 text-white data-[state=active]:bg-blue-800" 
            disabled={!listingParams.isApproved}
          >
            Complete Listing
          </TabsTrigger>
        </TabsList>

        {createdTokenInfo && (
          <div className="mt-4 p-4 bg-gray-900 rounded-lg border border-border">
            <h3 className="text-lg font-semibold text-white mb-2">Created Token Info</h3>
            <div className="space-y-2">
              <p className="text-white">
                <span className="text-gray-400">Name:</span> {createdTokenInfo.name}
              </p>
              <p className="text-white">
                <span className="text-gray-400">Symbol:</span> {createdTokenInfo.symbol}
              </p>
              <p className="text-white break-all">
                <span className="text-gray-400">Address:</span>{" "}
                <a 
                  href={`https://sepolia.etherscan.io/token/${createdTokenInfo.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300"
                >
                  {createdTokenInfo.address}
                </a>
              </p>
              <p className="text-white">
                <span className="text-gray-400">Total Supply:</span>{" "}
                {createdTokenInfo.totalSupply ? formatEther(createdTokenInfo.totalSupply) : "N/A"}
              </p>
              <p className="text-white">
                <span className="text-gray-400">Listing Status:</span>{" "}
                <span className="text-yellow-400">Pending Listing</span>
              </p>
            </div>
          </div>
        )}

        <TabsContent value="1">
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
                      onChange={(e) => {
                        const value = e.target.value;
                        try {
                          // Allow empty value
                          if (value === '') {
                            setCreationParams(prev => ({ ...prev, totalSupply: parseEther('0') }));
                            return;
                          }
                          // Remove any non-numeric characters except decimal point
                          const cleanValue = value.replace(/[^0-9.]/g, '');
                          // Ensure only one decimal point
                          const parts = cleanValue.split('.');
                          const finalValue = parts[0] + (parts.length > 1 ? '.' + parts[1] : '');
                          setCreationParams(prev => ({ ...prev, totalSupply: parseEther(finalValue) }));
                        } catch (error) {
                          console.error('Error calculating total supply:', error);
                        }
                      }}
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

                <Button type="submit" className="w-full mt-4" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Spinner className="w-4 h-4 mr-2" />
                      Creating Token...
                    </>
                  ) : (
                    "Create Token"
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="2">
          <Card className="p-4 bg-background-secondary border-border">
            <CardHeader className="px-0">
              <CardTitle className="text-white">Configure Listing Parameters</CardTitle>
            </CardHeader>
            <CardContent className="px-0">
              <form onSubmit={handleApproveToken} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="tokenAddress" className="text-white">Token Address</Label>
                  <Input
                    id="tokenAddress"
                    name="tokenAddress"
                    value={listingParams.tokenAddress}
                    onChange={handleListingParamChange}
                    placeholder="0x..."
                    type="text"
                    required
                    className="bg-gray-900 text-white border-border"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="initialLiquidityInETH" className="text-white">Initial Liquidity (ETH)</Label>
                    <Input
                      id="initialLiquidityInETH"
                      name="initialLiquidityInETH"
                      value={listingParams.initialLiquidityInETH}
                      onChange={handleListingParamChange}
                      placeholder="0.1"
                      type="text"
                      required
                      className="bg-gray-900 text-white border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="listingPriceInETH" className="text-white">Listing Price (ETH)</Label>
                    <Input
                      id="listingPriceInETH"
                      name="listingPriceInETH"
                      value={listingParams.listingPriceInETH}
                      onChange={handleListingParamChange}
                      placeholder="0.0001"
                      type="text"
                      required
                      className="bg-gray-900 text-white border-border"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="liquidityPercentage" className="text-white">Liquidity Percentage (%)</Label>
                  <Input
                    id="liquidityPercentage"
                    name="liquidityPercentage"
                    value={listingParams.liquidityPercentage}
                    onChange={handleListingParamChange}
                    placeholder="20"
                    type="text"
                    required
                    className="bg-gray-900 text-white border-border"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-white">Select DEX</Label>
                  <Select value={listingParams.dexName} onValueChange={handleDEXChange}>
                    <SelectTrigger className="bg-gray-900 text-white border-border">
                      <SelectValue placeholder="Choose a DEX" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 text-white border-border">
                      {supportedDEXes.length === 0 ? (
                        <SelectItem value="loading" disabled>Loading DEXes...</SelectItem>
                      ) : (
                        supportedDEXes.map((dex) => (
                          <SelectItem 
                            key={dex.name} 
                            value={dex.name || 'undefined'}
                            disabled={!dex.isActive}
                            className={!dex.isActive ? 'opacity-50' : ''}
                          >
                            {dex.name || 'Unknown DEX'} {!dex.isActive && '(Not Active)'}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {listingParams.dexName && !supportedDEXes.find(dex => dex.name === listingParams.dexName)?.isActive && (
                    <p className="text-sm text-red-500">Selected DEX is not currently active</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-white">Trading Start Time</Label>
                  <Select 
                    value={String((listingParams.tradingStartTime - Math.floor(Date.now() / 1000)) / 60)}
                    onValueChange={(value) => handleTradingStartTimeChange(Number(value))}
                  >
                    <SelectTrigger className="bg-gray-900 text-white border-border">
                      <SelectValue placeholder="Select delay" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 text-white border-border">
                      <SelectItem value="5">5 minutes</SelectItem>
                      <SelectItem value="10">10 minutes</SelectItem>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="enableTrading"
                    checked={listingParams.enableTrading}
                    onCheckedChange={(checked) => handleSwitchChange(checked, 'enableTrading')}
                  />
                  <Label htmlFor="enableTrading" className="text-white">Enable Trading at Start Time</Label>
                </div>

                <div className="mt-6 p-4 bg-gray-800 rounded-lg">
                  <h3 className="text-lg font-semibold text-white mb-4">Listing Parameters Summary</h3>
                  <div className="grid gap-2">
                    <p className="text-sm text-gray-300">Token Address: {listingParams.tokenAddress}</p>
                    <p className="text-sm text-gray-300">Initial Liquidity: {listingParams.initialLiquidityInETH} ETH</p>
                    <p className="text-sm text-gray-300">Listing Price: {listingParams.listingPriceInETH} ETH</p>
                    <p className="text-sm text-gray-300">DEX: {listingParams.dexName}</p>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? <Spinner className="w-4 h-4 mr-2" /> : null}
                  Approve Token for Listing
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="3">
          <Card className="p-4 bg-background-secondary border-border">
            <CardHeader className="px-0">
              <CardTitle className="text-white">Complete Token Listing</CardTitle>
            </CardHeader>
            <CardContent className="px-0">
              <form onSubmit={handleListToken} className="space-y-4">
                <div className="space-y-4 bg-gray-800 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-white">Final Listing Confirmation</h3>
                  <div className="grid gap-2">
                    <p className="text-sm text-gray-300">Token Address: {listingParams.tokenAddress}</p>
                    <p className="text-sm text-gray-300">Initial Liquidity: {listingParams.initialLiquidityInETH} ETH</p>
                    <p className="text-sm text-gray-300">Listing Price: {listingParams.listingPriceInETH} ETH</p>
                    <p className="text-sm text-gray-300">DEX: {listingParams.dexName}</p>
                    <p className="text-sm text-gray-300">Trading Enabled: {listingParams.enableTrading ? 'Yes' : 'No'}</p>
                    <p className="text-sm text-gray-300">Trading Start: {new Date(listingParams.tradingStartTime * 1000).toLocaleString()}</p>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading || !listingParams.isApproved}
                  className="w-full"
                >
                  {isLoading ? <Spinner className="w-4 h-4 mr-2" /> : null}
                  {listingParams.isApproved ? "Complete Listing" : "Token Not Yet Approved"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 