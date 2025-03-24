import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useNetwork } from '@/contexts/NetworkContext';
import { BrowserProvider, Contract, parseEther, formatEther, TransactionReceipt, isAddress } from 'ethers';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/toast/use-toast';
import TokenFactoryV1ABI from '@/contracts/abi/TokenFactory_v1.json';
import { FACTORY_ABI } from '@/contracts/abi/TokenFactory_v2_DirectDEX_TwoStep';
import { FACTORY_ABI_FIXED } from '@/contracts/abi/TokenFactory_v2_DirectDEX_Fixed';
import { getNetworkContractAddress } from '@/config/contracts';
import { Interface } from 'ethers';

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
    maxTxAmount: parseEther('1000000'),
    maxWalletAmount: parseEther('1000000'),
    enableTrading: true,
    tradingStartTime: Math.floor(Date.now() / 1000) + 3600,
    marketingFeePercentage: BigInt(1),
    marketingWallet: process.env.NEXT_PUBLIC_DEFAULT_MARKETING_WALLET || '0x0000000000000000000000000000000000000000',
    developmentFeePercentage: BigInt(1),
    developmentWallet: process.env.NEXT_PUBLIC_DEFAULT_DEVELOPMENT_WALLET || '0x0000000000000000000000000000000000000000',
    autoLiquidityFeePercentage: BigInt(1),
    enableBuyFees: true,
    enableSellFees: true
  });

  if (!process.env.NEXT_PUBLIC_DEFAULT_MARKETING_WALLET || !process.env.NEXT_PUBLIC_DEFAULT_DEVELOPMENT_WALLET) {
    console.error('Missing required environment variables for default wallet addresses');
  }

  useEffect(() => {
    const fetchListingFee = async () => {
      if (!isConnected || !chainId) return;
      
      // Get the correct factory address for the current network
      const factoryAddress = getNetworkContractAddress(chainId, 'factoryAddressV2DirectDEX_Fixed');
      console.log(`Using network-specific factory address: ${factoryAddress}`);
      
      // If no valid address is found, fall back to a default for testing
      if (!factoryAddress) {
        console.log('No factory address found for the current network, using default');
        // Set a default listing fee
        const transactionFee = parseEther("0.001");
        console.log(`Setting default listing fee: ${transactionFee.toString()} (${formatEther(transactionFee)} ETH/BNB)`);
        setListingFee(transactionFee);
        return;
      }

      try {
        const provider = new BrowserProvider(window.ethereum);
        const factory = new Contract(
          factoryAddress,
          FACTORY_ABI_FIXED,
          provider
        );
        
        const fee = await factory.listingFee();
        console.log(`Listing fee from contract: ${fee.toString()} (${formatEther(fee)} ETH/BNB)`);
        setListingFee(fee);
      } catch (error) {
        console.error('Error fetching listing fee:', error);
        // Set a default listing fee based on the network
        const transactionFee = parseEther("0.001");
        console.log(`Setting default listing fee: ${transactionFee.toString()} (${formatEther(transactionFee)} ETH/BNB)`);
        setListingFee(transactionFee);
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

    // Log the specific parameters being changed to debug
    console.log(`Parameter changed: ${e.target.name} = ${e.target.value}`);
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

    // Get the correct factory address for the current network
    const factoryAddress = getNetworkContractAddress(chainId, 'factoryAddressV2DirectDEX_Fixed');
    
    if (!factoryAddress) {
      toast({
        title: "Error",
        description: `No factory contract found for the current network (Chain ID: ${chainId})`,
        variant: "destructive"
      });
      return;
    }
    
    console.log(`Using network-specific factory at address: ${factoryAddress} for chain ${chainId}`);

    try {
      setIsLoading(true);
      
      // Get listing fee from state, or use a network-specific default
      let transactionFee = listingFee > BigInt(0) ? listingFee : parseEther("0.001");
      console.log(`Using listing fee: ${formatEther(transactionFee)} ETH/BNB (${transactionFee.toString()})`);
      
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // Get network details for debugging
      const network = await provider.getNetwork();
      const networkId = Number(network.chainId);
      console.log(`Connected to network: ${networkId}, name: ${network.name}`);
      
      // Verify we're using the correct ABI for this network
      console.log('Using FACTORY_ABI_FIXED for token creation');
      
      // First check if there's code at the contract address
      const contractCode = await provider.getCode(factoryAddress);
      if (contractCode === '0x' || contractCode === '') {
        console.error(`No contract deployed at address ${factoryAddress}`);
        toast({
          title: "Contract Error",
          description: `No contract found at address ${factoryAddress}. The contract might not be deployed on this network.`,
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }
      console.log(`Contract exists at ${factoryAddress} (bytecode length: ${contractCode.length})`);
      
      const factory = new Contract(
        factoryAddress,
        FACTORY_ABI_FIXED,
        signer
      );
      
      // Verify if basic contract functions work
      try {
        console.log("Checking basic contract compatibility...");
        
        // Try to get contract version
        try {
          const version = await factory.VERSION();
          console.log(`Contract version: ${version}`);
        } catch (versionError) {
          console.log("VERSION function not available:", versionError);
        }
        
        // Try to get owner
        try {
          const owner = await factory.owner();
          console.log(`Contract owner: ${owner}`);
        } catch (ownerError) {
          console.log("owner function not available:", ownerError);
        }
        
        // Try to get listing fee
        try {
          const fee = await factory.listingFee();
          console.log(`Contract listing fee: ${formatEther(fee)} ETH (${fee.toString()})`);
          
          // If we got a valid fee from the contract, use it
          if (fee > BigInt(0) && fee !== transactionFee) {
            console.log(`Updating fee to match contract requirement: ${formatEther(fee)} ETH`);
            // Set the correct fee for the transaction
            setListingFee(fee);
            // Use the correct fee for this transaction
            transactionFee = fee;
          }
        } catch (feeError) {
          console.log("listingFee function not available or error:", feeError);
        }
      } catch (compatError) {
        console.error("Contract compatibility check error:", compatError);
      }

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

      // Test parameter encoding compatibility...
      console.log("Testing parameter encoding compatibility...");
      try {
        const encodedParams = factory.interface.encodeFunctionData("createToken", [tokenParams]);
        console.log("Parameters successfully encoded:", encodedParams.substring(0, 66) + "...");
      } catch (encodeError) {
        console.error("Parameter encoding failed:", encodeError);
        toast({
          title: "Parameter Error",
          description: "Failed to encode parameters for the contract. The contract might be incompatible with the current ABI.",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }

      // Try multiple parameter variations to identify what works
      const paramVariations = [
        // Variation 1: All fees enabled, realistic limits
        {
          ...tokenParams,
          enableTrading: true,
          maxTxAmount: tokenParams.totalSupply / BigInt(100), // 1% of total
          maxWalletAmount: tokenParams.totalSupply / BigInt(50), // 2% of total
          marketingFeePercentage: BigInt(1),
          developmentFeePercentage: BigInt(1),
          autoLiquidityFeePercentage: BigInt(1),
          enableBuyFees: true,
          enableSellFees: true
        },
        
        // Variation 2: No fees at all, zero addresses
        {
          ...tokenParams,
          enableTrading: true,
          maxTxAmount: tokenParams.totalSupply / BigInt(100),
          maxWalletAmount: tokenParams.totalSupply / BigInt(50),
          marketingFeePercentage: BigInt(0),
          developmentFeePercentage: BigInt(0),
          autoLiquidityFeePercentage: BigInt(0),
          marketingWallet: "0x0000000000000000000000000000000000000000",
          developmentWallet: "0x0000000000000000000000000000000000000000",
          enableBuyFees: false,
          enableSellFees: false
        },
        
        // Variation 3: Minimal parameters, no trading, no fees
        {
          ...tokenParams,
          enableTrading: false,
          maxTxAmount: tokenParams.totalSupply, // 100% of total (no limit)
          maxWalletAmount: tokenParams.totalSupply, // 100% of total (no limit)
          marketingFeePercentage: BigInt(0),
          developmentFeePercentage: BigInt(0),
          autoLiquidityFeePercentage: BigInt(0),
          marketingWallet: "0x0000000000000000000000000000000000000000",
          developmentWallet: "0x0000000000000000000000000000000000000000",
          enableBuyFees: false,
          enableSellFees: false
        }
      ];
      
      // Try each variation until one succeeds
      let successfulParams = null;
      let simulationError = null;
      
      for (const variationParams of paramVariations) {
        try {
          console.log("Trying parameter variation:", {
            ...variationParams,
            totalSupply: variationParams.totalSupply.toString(),
            maxTxAmount: variationParams.maxTxAmount.toString(),
            maxWalletAmount: variationParams.maxWalletAmount.toString(),
            marketingFeePercentage: variationParams.marketingFeePercentage.toString(),
            developmentFeePercentage: variationParams.developmentFeePercentage.toString(),
            autoLiquidityFeePercentage: variationParams.autoLiquidityFeePercentage.toString()
          });
          
          const callOverrides = { 
            value: transactionFee,
            gasLimit: BigInt(5000000)
          };
          
          const callResult = await factory.createToken.staticCall(
            variationParams,
            callOverrides
          );
          
          console.log("Simulation successful with params:", variationParams);
          successfulParams = variationParams;
          break; // Exit the loop if successful
        } catch (error) {
          console.error("Variation failed:", error);
          simulationError = error;
        }
      }
      
      // Use the successful params or fall back to the last one tried
      const finalParams = successfulParams || paramVariations[paramVariations.length - 1];
      console.log("Using final parameters:", {
        ...finalParams,
        totalSupply: finalParams.totalSupply.toString(),
        maxTxAmount: finalParams.maxTxAmount.toString(),
        maxWalletAmount: finalParams.maxWalletAmount.toString()
      });
      
      // Double the transaction fee for safety
      const adjustedFee = transactionFee * BigInt(2);
      console.log(`Sending transaction with doubled value: ${formatEther(adjustedFee)} ETH/BNB`);
      
      // Attempt direct method call with increased gas limit
      const gasEstimate = BigInt(5000000);
      console.log(`Using gas limit: ${gasEstimate.toString()}`);
      
      // If all simulations failed, ask user if they want to continue anyway
      if (!successfulParams && simulationError) {
        const shouldContinue = window.confirm(
          "All parameter variations failed simulation. Continue anyway with best-guess parameters?"
        );
        if (!shouldContinue) {
          setIsLoading(false);
          return;
        }
      }

      // Use direct contract method call with value parameter explicitly set
      const tx = await factory.createToken(
        finalParams, // Use the final parameters
        {
          value: adjustedFee,
          gasLimit: gasEstimate
        }
      );

      console.log('Transaction sent:', tx.hash);
      console.log('Transaction data:', tx);

      // Wait for receipt with timeout
      console.log("Waiting for transaction confirmation...");
      const receipt = await tx.wait();

      console.log("Transaction receipt:", {
        status: receipt.status,
        gasUsed: receipt.gasUsed.toString(),
        blockNumber: receipt.blockNumber,
        events: receipt.logs.length
      });

      // Check if there are any events in the logs
      if (receipt.logs && receipt.logs.length > 0) {
        console.log("Transaction has logs, checking for token creation event...");
        
        try {
          // Try to parse the logs to find the token creation event
          const parsedLogs = receipt.logs
            .map((log: { topics: string[], data: string, blockNumber?: number, blockHash?: string, address?: string }) => {
              try {
                return factory.interface.parseLog(log);
              } catch (e) {
                return null;
              }
            })
            .filter(Boolean);
            
          console.log("Parsed logs:", parsedLogs);
          
          // Find the TokenCreated event
          const tokenCreatedEvent = parsedLogs.find((log: any) => 
            log && log.name === 'TokenCreated'
          );
          
          if (tokenCreatedEvent) {
            const tokenAddress = tokenCreatedEvent.args.token;
            console.log("Token created at address:", tokenAddress);
            
            // Call onSuccess with the token address
            onSuccess && onSuccess(tokenAddress);
            
            toast({
              title: "Token Created Successfully!",
              description: `Your token has been created at address ${tokenAddress}`,
              variant: "default"
            });
            
            return;
          }
        } catch (parseError) {
          console.error("Error parsing logs:", parseError);
        }
      }
    } catch (error: any) {
      console.error("Token creation failed:", error);
      
      // More detailed error debugging
      console.error("Transaction error details:", {
        message: error.message,
        code: error.code,
        data: error.data || "No data",
        receipt: error.receipt || "No receipt",
        transaction: error.transaction || "No transaction details"
      });

      // Try to get more info from any receipt
      if (error.receipt) {
        console.error("Transaction receipt:", {
          status: error.receipt.status,
          gasUsed: error.receipt.gasUsed?.toString() || "Unknown",
          logs: error.receipt.logs || []
        });
      }
      
      // Forward error to parent component
      onError && onError(error);
      
      toast({
        title: "Token Creation Failed",
        description: `Transaction failed: ${error.message}`,
        variant: "destructive"
      });
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
                  placeholder="1000000"
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
                  placeholder="1000000"
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
                  placeholder="0"
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
                  placeholder="0"
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
                  placeholder="0"
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