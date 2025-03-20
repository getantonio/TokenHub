import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useForm } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import TokenPreview from '@/components/features/token/TokenPreview';
import { useToast } from '@/components/ui/toast/use-toast';
import { TokenDistributionPreview } from '@/components/features/token/TokenDistributionPreview';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { ethers, Log, LogDescription } from 'ethers';
import { getNetworkContractAddress } from '@/config/contracts';

/**
 * Utility function to check if a chainId corresponds to Polygon Amoy network
 */
function isPolygonAmoyNetwork(chainId: number): boolean {
  return chainId === 80002;
}

/**
 * Get the block explorer URL for a given network and transaction hash
 */
function getExplorerUrl(chainId: number, txHash: string): string {
  // Default to Etherscan
  let baseUrl = 'https://etherscan.io';
  
  // Check for specific networks
  if (chainId === 80002) {
    // Polygon Amoy
    baseUrl = 'https://www.oklink.com/amoy';
  } else if (chainId === 11155111) {
    // Sepolia
    baseUrl = 'https://sepolia.etherscan.io';
  } else if (chainId === 421614) {
    // Arbitrum Sepolia
    baseUrl = 'https://sepolia-explorer.arbitrum.io';
  } else if (chainId === 11155420) {
    // Optimism Sepolia
    baseUrl = 'https://sepolia-optimism.etherscan.io';
  } else if (chainId === 97) {
    // BSC Testnet
    baseUrl = 'https://testnet.bscscan.com';
  } else if (chainId === 56) {
    // BSC Mainnet
    baseUrl = 'https://bscscan.com';
  }
  
  return `${baseUrl}/tx/${txHash}`;
}

interface TokenFormV4Props {
  isConnected: boolean;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

interface FormData {
  // Basic Token Info
  name: string;
  symbol: string;
  initialSupply: string;
  maxSupply: string;

  // Tax System
  dynamicTaxEnabled: boolean;
  baseBuyTax: string;
  baseSellTax: string;
  maxTaxRate: string;
  volumeThreshold: string;
  autoLiquidityPercent: string;

  // Tokenomics
  buybackEnabled: boolean;
  buybackThreshold: string;
  autoBurnPercent: string;
  rewardToken: string;
  rewardPercent: string;
  antiDumpEnabled: boolean;
  maxTxAmount: string;
  maxWalletAmount: string;

  // Supply Control
  elasticSupplyEnabled: boolean;
  targetPrice: string;
  priceThreshold: string;
  mintLimit: string;
  burnLimit: string;

  // Security
  securityEnabled: boolean;

  // Distribution
  merkleRoot: string;
  vestingEnabled: boolean;
  vestingDuration: number;
  cliffDuration: number;
  liquidityPercentage: number;
  presaleEnabled: boolean;
  presalePercentage: number;
  wallets: Array<{
    name: string;
    address: string;
    percentage: number;
    vestingEnabled: boolean;
    vestingDuration: number;
    cliffDuration: number;
    vestingStartTime: number;
  }>;
  presaleRate: string;
  presaleSoftCap: string;
  presaleHardCap: string;
  presaleMinBuy: string;
  presaleMaxBuy: string;
  presaleStartTime: number;
  presaleEndTime: number;
}

// Vesting presets for quick configuration
const VESTING_PRESETS = {
  standard: {
    presalePercentage: 30,
    liquidityPercentage: 60,
    wallets: [
      {
        name: "Team",
        percentage: 5,
        vestingEnabled: true,
        vestingDuration: 365,
        cliffDuration: 90
      },
      {
        name: "Marketing",
        percentage: 5,
        vestingEnabled: true,
        vestingDuration: 180,
        cliffDuration: 30
      }
    ]
  },
  fair_launch: {
    presalePercentage: 0,
    liquidityPercentage: 95,
    wallets: [
      {
        name: "Team",
        percentage: 5,
        vestingEnabled: true,
        vestingDuration: 365,
        cliffDuration: 90
      }
    ]
  },
  community: {
    presalePercentage: 40,
    liquidityPercentage: 40,
    wallets: [
      {
        name: "Community Treasury",
        percentage: 10,
        vestingEnabled: true,
        vestingDuration: 730,
        cliffDuration: 180
      },
      {
        name: "Team",
        percentage: 5,
        vestingEnabled: true,
        vestingDuration: 365,
        cliffDuration: 90
      },
      {
        name: "Marketing",
        percentage: 5,
        vestingEnabled: true,
        vestingDuration: 180,
        cliffDuration: 30
      }
    ]
  }
};

const tooltips = {
  basic: {
    name: "The name of your token that will be displayed in wallets and exchanges.",
    symbol: "A short identifier for your token (2-6 characters recommended).",
    initialSupply: "The initial amount of tokens that will be minted at deployment.",
    maxSupply: "The maximum amount of tokens that can ever exist. Set to 0 for unlimited supply.",
    securityModule: "The security module adds extra protection to your token with multi-signature capabilities and transaction guards."
  },
  tax: {
    dynamicTax: `A tax is a percentage fee taken from each transaction.

Dynamic tax means this fee can automatically adjust based on trading conditions:

• Higher volume = Lower tax
• Lower volume = Higher tax

This helps prevent price manipulation and encourages healthy trading.`,
    baseBuyTax: "The standard tax rate applied to buy transactions.",
    baseSellTax: "The standard tax rate applied to sell transactions.",
    maxTaxRate: "The highest possible tax rate when dynamic tax is enabled.",
    volumeThreshold: "Trading volume threshold that triggers dynamic tax adjustments.",
    autoLiquidity: "Percentage of collected taxes automatically added to liquidity."
  },
  tokenomics: {
    buyback: "Automatically buy back and burn tokens using collected fees.",
    buybackThreshold: "Amount of ETH accumulated before triggering a buyback.",
    autoBurn: "Percentage of tokens automatically burned from each transaction.",
    rewardToken: "Token address used for holder rewards (e.g., WETH, USDT).",
    rewardPercent: "Percentage of transaction volume distributed as rewards.",
    antiDump: "Prevent large sells by limiting transaction and wallet sizes.",
    maxTxAmount: "Maximum tokens allowed per transaction.",
    maxWalletAmount: "Maximum tokens that can be held in a single wallet."
  },
  supply: {
    elasticSupply: "Automatically adjust token supply to target a specific price.",
    targetPrice: "The desired token price in ETH.",
    priceThreshold: "Price deviation percentage that triggers supply adjustments.",
    mintLimit: "Maximum tokens that can be minted in a single adjustment.",
    burnLimit: "Maximum tokens that can be burned in a single adjustment."
  },
  distribution: {
    merkleRoot: `The Merkle Root is generated from your airdrop list, not entered manually. Here's how to get it:

1. Create a CSV/JSON file with airdrop recipients:
   address,amount
   0x123...,1000
   0x456...,500

2. Use a tool like MerkleTreeGenerator to convert your list into a Merkle Root
   • OpenZeppelin's merkletreejs
   • Online tools like Merkle Tree Generator
   • Our airdrop dashboard (coming soon)

3. The tool will generate your Merkle Root (0x...) and proof data

Leave this field empty if you're not doing an airdrop yet - you can add it later.`,
    presale: `Configure your token's presale parameters:
• Rate: How many tokens users get per ETH
• Soft Cap: Minimum ETH needed for success
• Hard Cap: Maximum ETH that can be raised
• Min/Max Buy: Limits per wallet
• Timeline: Start and end times`,
    liquidity: "Percentage of tokens allocated to initial liquidity.",
    vesting: {
      enabled: "Enable gradual token unlocking over time.",
      duration: "Total time period for tokens to fully vest.",
      cliff: "Initial period where tokens remain locked before vesting begins."
    },
    presaleRate: "Number of tokens given per 1 ETH contributed",
    presaleCaps: "Soft cap must be met for success. Hard cap is the maximum raise amount.",
    presaleLimits: "Minimum and maximum ETH contribution allowed per wallet",
    presaleTime: "When the presale starts and ends. Must be in the future."
  }
};

export default function TokenForm_V4({ isConnected, onSuccess, onError }: TokenFormV4Props) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'basic' | 'tax' | 'tokenomics' | 'supply' | 'distribution'>('basic');
  const form = useForm<FormData>({
    defaultValues: {
      // Basic Token Info
      name: 'Test Token',
      symbol: 'TEST',
      initialSupply: '1000000',
      maxSupply: '1000000',

      // Tax System
      dynamicTaxEnabled: true,
      baseBuyTax: '5',
      baseSellTax: '7',
      maxTaxRate: '10',
      volumeThreshold: '100',
      autoLiquidityPercent: '50',

      // Tokenomics
      buybackEnabled: true,
      buybackThreshold: '1',
      autoBurnPercent: '2',
      rewardToken: '0xb6083258E7E7B04Bdc72640E1a75E1F40541e83F', // Updated reward token address
      rewardPercent: '2',
      antiDumpEnabled: true,
      maxTxAmount: '10000',
      maxWalletAmount: '20000',

      // Supply Control
      elasticSupplyEnabled: false,
      targetPrice: '0.01',
      priceThreshold: '10',
      mintLimit: '1000',
      burnLimit: '1000',

      // Security
      securityEnabled: false,

      // Distribution
      merkleRoot: '',  // Leave empty as it's optional
      vestingEnabled: true,
      vestingDuration: 180,
      cliffDuration: 30,
      liquidityPercentage: 60,

      // Presale Settings
      presaleEnabled: true,
      presalePercentage: 30,
      presaleRate: '100000',
      presaleSoftCap: '50',
      presaleHardCap: '100',
      presaleMinBuy: '0.1',
      presaleMaxBuy: '2',
      presaleStartTime: Math.floor(Date.now() / 1000) + (24 * 3600), // 24h from now
      presaleEndTime: Math.floor(Date.now() / 1000) + (7 * 24 * 3600), // 7 days from now

      // Default Wallets (using standard preset)
      wallets: [
        {
          name: "Team",
          address: '0x10C8c279c6b381156733ec160A89Abb260bfcf0C', // First wallet address
          percentage: 5,
          vestingEnabled: true,
          vestingDuration: 365,
          cliffDuration: 90,
          vestingStartTime: Math.floor(Date.now() / 1000) + (24 * 3600)
        },
        {
          name: "Marketing",
          address: '0x991Ed392F033B2228DC55A1dE2b706ef8D9d9DcD', // Second wallet address
          percentage: 5,
          vestingEnabled: true,
          vestingDuration: 180,
          cliffDuration: 30,
          vestingStartTime: Math.floor(Date.now() / 1000) + (24 * 3600)
        }
      ]
    }
  });

  const handleSubmit = async (data: FormData) => {
    if (!isConnected) {
      toast({
        title: "Wallet Connection Required",
        description: "Please connect your wallet to create a token",
        variant: "destructive"
      });
      return;
    }

    try {
      // Get signer
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // Get factory address based on network
      const { chainId } = await provider.getNetwork();
      const factoryAddress = getNetworkContractAddress(Number(chainId), 'FACTORY_ADDRESS_V4');
      
      if (!factoryAddress || factoryAddress === '0x' || factoryAddress === '0x0000000000000000000000000000000000000000') {
        throw new Error(`Factory address for network ${Number(chainId)} not found or invalid. Please check your network configuration.`);
      }
      
      // Validate that we're on Polygon Amoy for V4
      if (!isPolygonAmoyNetwork(Number(chainId))) {
        throw new Error(`This token version (V4) is only available on Polygon Amoy network. Please switch to Polygon Amoy in your wallet.`);
      }

      console.log('Using factory address:', factoryAddress);

      // Create factory contract instance
      const factory = new ethers.Contract(
        factoryAddress,
        [
          "function createToken(string,string,uint256,address) returns (address)",
          "function createTokenForWeb(string,string,uint256,address,bool) returns (address)",
          "function createTokenWithSecurity(string,string,uint256,address,bool,address[],uint256) returns (address)",
          "function getTokenImplementation() view returns (address)",
          "function getSecurityModuleImplementation() view returns (address)",
          "function getAllTokens() view returns (address[])",
          "function upgradeTokenImplementation(address) returns (bool)",
          "function upgradeSecurityModuleImplementation(address) returns (bool)",
          "event TokenCreated(address indexed tokenAddress, string name, string symbol, address indexed owner)",
          "event TokenDeployed(address indexed tokenAddress, string name, string symbol, address indexed owner)"
        ],
        signer
      );

      // Prepare parameters for basic token creation
      const initialSupply = ethers.parseUnits(data.initialSupply, 18);
      const ownerAddress = await signer.getAddress();

      // Deploy token with basic configuration
      console.log('Deploying token with params:', {
        name: data.name,
        symbol: data.symbol,
        initialSupply: initialSupply.toString(),
        owner: ownerAddress,
        includeDistribution: true // Enable distribution module for vesting and allocations
      });

      // Add transaction options with sufficient gas limit
      console.log('Estimating gas price...');
      const feeData = await provider.getFeeData();
      console.log('Fee data:', {
        gasPrice: feeData.gasPrice?.toString(),
        maxFeePerGas: feeData.maxFeePerGas?.toString(),
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.toString()
      });

      // Try an alternative approach by manually creating the transaction
      const iface = new ethers.Interface([
        "function createTokenForWeb(string,string,uint256,address,bool) returns (address)"
      ]);
      
      const encodedData = iface.encodeFunctionData("createTokenForWeb", [
        data.name,
        data.symbol,
        initialSupply,
        ownerAddress,
        true // includeDistribution parameter
      ]);
      
      console.log('Manual transaction data:', encodedData);
      
      // Try with a simple transaction and a low nonce
      const nonce = await provider.getTransactionCount(ownerAddress);
      console.log('Current nonce:', nonce);
      
      interface TransactionRequest {
        to: string;
        from: string;
        data: string;
        nonce: number;
        gasLimit: bigint;
        type: number;
        maxFeePerGas?: bigint;
        maxPriorityFeePerGas?: bigint;
        gasPrice?: bigint;
      }
      
      const txRequest: TransactionRequest = {
        to: factoryAddress,
        from: ownerAddress,
        data: encodedData,
        nonce: nonce,
        gasLimit: BigInt(6000000), // Double the gas limit just to be safe
        type: 2 // EIP-1559 transaction type
      };
      
      // Special handling for Polygon Amoy network which doesn't fully support EIP-1559
      if (isPolygonAmoyNetwork(Number(chainId))) {
        // Force legacy transaction type for Polygon Amoy
        txRequest.type = 0; // Legacy transaction type
        if (feeData.gasPrice) {
          txRequest.gasPrice = feeData.gasPrice;
        } else {
          // Fallback gas price if not available from provider
          txRequest.gasPrice = BigInt(50000000000); // 50 gwei
        }
        // Remove EIP-1559 specific fields
        delete txRequest.maxFeePerGas;
        delete txRequest.maxPriorityFeePerGas;
      } else {
        // For other networks, use EIP-1559 if available, otherwise fallback to legacy
        if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
          txRequest.maxFeePerGas = feeData.maxFeePerGas;
          txRequest.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
        } else if (feeData.gasPrice) {
          // Fallback to legacy gas price
          delete txRequest.maxFeePerGas;
          delete txRequest.maxPriorityFeePerGas;
          txRequest.gasPrice = feeData.gasPrice;
          txRequest.type = 0; // Legacy transaction type
        }
      }
      
      console.log('Sending manual transaction:', txRequest);
      const tx = await signer.sendTransaction(txRequest);

      console.log('Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      if (!receipt) {
        throw new Error('Transaction receipt is null');
      }
      console.log('Transaction confirmed:', receipt);
      
      // Log all receipt logs for debugging
      console.log('All transaction logs:', receipt.logs);
      
      // Try to manually parse all logs to see available events
      console.log('Attempting to parse all logs:');
      receipt.logs.forEach((log: Log, index: number) => {
        try {
          console.log(`Log ${index}:`, {
            address: log.address,
            topics: log.topics,
            data: log.data
          });
        } catch (e) {
          console.log(`Failed to parse log ${index}`);
        }
      });

      // Get deployed token address from the transaction receipt
      let tokenAddress: string | null = null;

      // First, try to find the TokenCreated event
      const events = receipt.logs
        .map((log: Log) => {
          try {
            return factory.interface.parseLog({
              topics: log.topics,
              data: log.data
            });
          } catch (e) {
            return null;
          }
        })
        .filter((event: LogDescription | null): event is LogDescription => 
          event !== null && (event.name === "TokenCreated" || event.name === "TokenDeployed")
        );

      if (events.length > 0) {
        // We found an event we're looking for
        tokenAddress = events[0].args[0] as string;
        console.log('Found token address from event:', tokenAddress);
      } else {
        console.log('No TokenCreated/TokenDeployed event found. Looking for CreateProxy events...');
        
        // Create a list of known system addresses to ignore
        const systemAddresses = [
          '0x0000000000000000000000000000000000000000', // Zero address
          '0x0000000000000000000000000000000000001010', // Polygon system contract
        ];
        
        // First try to extract address from return data if possible
        // This would work if the function returns the token address
        try {
          // Try to decode the return data to get the token address
          // The createToken method should return the token address
          const returnData = await provider.call({
            to: factoryAddress,
            data: encodedData
          });
          
          if (returnData && returnData !== '0x') {
            // Assuming the returned address is the last 20 bytes of the response
            const potentialTokenAddr = '0x' + returnData.slice(-40);
            if (ethers.isAddress(potentialTokenAddr) && 
                !systemAddresses.includes(potentialTokenAddr.toLowerCase()) &&
                potentialTokenAddr !== ethers.ZeroAddress) {
              tokenAddress = potentialTokenAddr;
              console.log('Extracted token address from return data:', tokenAddress);
            }
          }
        } catch (e) {
          console.log('Failed to extract address from return data:', e);
        }
        
        // If we still don't have a valid token address, look at the logs
        if (!tokenAddress) {
          // Look for BeaconProxy creation events
          // A common pattern is to emit events when proxies are created
          for (const log of receipt.logs) {
            // Skip logs from known system addresses
            if (systemAddresses.includes(log.address.toLowerCase())) {
              console.log('Skipping system address log:', log.address);
              continue;
            }
            
            // Check if the log is from a contract other than the factory
            // Often, the created token itself will emit an event
            if (log.address.toLowerCase() !== factoryAddress.toLowerCase()) {
              console.log('Found non-factory log address:', log.address);
              tokenAddress = log.address;
              break;
            }
            
            // In proxy patterns, often there's an event with a new contract address as a parameter
            // It's typically indexed, so it appears in the topics
            if (log.topics.length > 1) {
              // Try to get any address-like topics
              for (let i = 1; i < log.topics.length; i++) {
                const topic = log.topics[i];
                // Sometimes addresses are padded in topics, so extract last 40 chars
                const potentialAddress = '0x' + topic.slice(-40);
                if (ethers.isAddress(potentialAddress) && 
                    !systemAddresses.includes(potentialAddress.toLowerCase()) &&
                    potentialAddress !== ethers.ZeroAddress) {
                  console.log(`Found potential token address in topic ${i}:`, potentialAddress);
                  tokenAddress = potentialAddress;
                  break;
                }
              }
              if (tokenAddress) break;
            }
          }
        }
        
        // As a fallback, try to get the address from the receipt's contractAddress
        if (!tokenAddress && receipt.contractAddress && 
            !systemAddresses.includes(receipt.contractAddress.toLowerCase()) &&
            receipt.contractAddress !== ethers.ZeroAddress) {
          console.log('Using contractAddress as token address:', receipt.contractAddress);
          tokenAddress = receipt.contractAddress;
        }
      }

      if (!tokenAddress) {
        throw new Error('Could not determine the token address from the transaction receipt. Please check deployed contracts manually on the blockchain explorer.');
      }

      // Validate token address - ensure it's not a system address
      if (tokenAddress.toLowerCase() === '0x0000000000000000000000000000000000000000' || 
          tokenAddress.toLowerCase() === '0x0000000000000000000000000000000000001010') {
        throw new Error('Invalid token address detected. The system returned a system contract address. Please check transaction on the blockchain explorer.');
      }
      
      console.log('Token deployed at:', tokenAddress);

      toast({
        title: "Token Deployed Successfully",
        description: `Your token has been deployed to ${tokenAddress}. Check it on the blockchain explorer: ${getExplorerUrl(Number(chainId), tx.hash)}`,
      });

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error deploying token:', error);
      
      // Create a more specific error message for Polygon Amoy issues
      let errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      
      // Try to determine if we're on Polygon Amoy
      let isPolygonAmoy = false;
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const networkInfo = await provider.getNetwork();
        isPolygonAmoy = isPolygonAmoyNetwork(Number(networkInfo.chainId));
      } catch (e) {
        // If we can't determine the network, assume we're not on Polygon Amoy
        console.error("Failed to determine network:", e);
      }
      
      // Add Polygon Amoy specific suggestions based on the error message
      if (isPolygonAmoy) {
        if (errorMessage.includes("Internal JSON-RPC error") || 
            errorMessage.includes("eth_maxPriorityFeePerGas") || 
            errorMessage.includes("underpriced")) {
          errorMessage = `Polygon Amoy transaction failed: ${errorMessage}\n\nPolygon Amoy is an experimental testnet that may have issues. Please try:\n1. Refreshing the page and trying again\n2. Using a smaller token amount (< 1 million tokens)\n3. Ensuring you have enough test MATIC (at least 0.1 MATIC)\n4. Trying again later as the testnet may be experiencing congestion`;
        } else {
          errorMessage = `${errorMessage}\n\nPolygon Amoy is an experimental testnet that may experience issues. Please try:\n1. Using a lower amount of tokens\n2. Waiting a few minutes and trying again\n3. Ensuring you have enough MATIC for gas fees`;
        }
      }
      
      toast({
        title: "Deployment Failed",
        description: errorMessage,
        variant: "destructive"
      });
      if (onError) {
        onError(error as Error);
      }
    }
  };

  const tabs = [
    { id: 'basic', label: 'Basic Info' },
    { id: 'tax', label: 'Tax System' },
    { id: 'tokenomics', label: 'Tokenomics' },
    { id: 'supply', label: 'Supply Control' },
    { id: 'distribution', label: 'Distribution' }
  ] as const;

  const inputClasses = "bg-gray-900 border-gray-800 text-white placeholder-gray-500 focus:ring-0 focus:border-gray-700";
  const walletInputClasses = "bg-gray-900 text-sm h-8 border-gray-800 text-white placeholder-gray-500 focus:ring-0 focus:border-gray-700";
  const checkboxClasses = "w-4 h-4 rounded border-gray-700 bg-gray-900 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-900";
  const labelClasses = "text-sm font-medium text-gray-200";
  const sectionClasses = "grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3";

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-gray-800/50 border border-gray-700/50">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-white">Create Your Token</h2>
          <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/50">
            Development
          </Badge>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-4 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700/50 text-gray-400 hover:text-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          {/* Basic Info */}
          <div className={activeTab === 'basic' ? 'block' : 'hidden'}>
            <div className={sectionClasses}>
              <div>
                <div className="flex items-center gap-2">
                  <Label className={labelClasses}>Token Name</Label>
                  <InfoTooltip content={tooltips.basic.name} />
                </div>
                <Input {...form.register('name')} placeholder="My Token" className={inputClasses} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Label className={labelClasses}>Token Symbol</Label>
                  <InfoTooltip content={tooltips.basic.symbol} />
                </div>
                <Input {...form.register('symbol')} placeholder="MTK" className={inputClasses} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Label className={labelClasses}>Initial Supply</Label>
                  <InfoTooltip content={tooltips.basic.initialSupply} />
                </div>
                <Input 
                  {...form.register('initialSupply')} 
                  type="number"
                  min="0"
                  placeholder="1000000"
                  className={inputClasses} 
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Label className={labelClasses}>Max Supply</Label>
                  <InfoTooltip content={tooltips.basic.maxSupply} />
                </div>
                <Input 
                  {...form.register('maxSupply')} 
                  type="number"
                  min="0"
                  placeholder="0 (Unlimited)"
                  className={inputClasses} 
                />
              </div>
            </div>

            {/* Security Module */}
            <div className="mt-4">
              <div className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  id="securityEnabled"
                  {...form.register('securityEnabled')}
                  className={checkboxClasses}
                />
                <Label htmlFor="securityEnabled" className={labelClasses}>
                  Enable Security Module
                </Label>
                <InfoTooltip content={tooltips.basic.securityModule} />
              </div>
            </div>
          </div>

          {/* Tax System */}
          <div className={activeTab === 'tax' ? 'block' : 'hidden'}>
            <div className={sectionClasses}>
              <div className="md:col-span-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    {...form.register('dynamicTaxEnabled')}
                    className={checkboxClasses}
                  />
                  <span className={labelClasses}>Enable Dynamic Tax</span>
                  <InfoTooltip content={tooltips.tax.dynamicTax} />
                </label>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Label className={labelClasses}>Base Buy Tax (%)</Label>
                  <InfoTooltip content={tooltips.tax.baseBuyTax} />
                </div>
                <Input 
                  {...form.register('baseBuyTax')} 
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  className={inputClasses} 
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Label className={labelClasses}>Base Sell Tax (%)</Label>
                  <InfoTooltip content={tooltips.tax.baseSellTax} />
                </div>
                <Input 
                  {...form.register('baseSellTax')} 
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  className={inputClasses} 
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Label className={labelClasses}>Max Tax Rate (%)</Label>
                  <InfoTooltip content={tooltips.tax.maxTaxRate} />
                </div>
                <Input 
                  {...form.register('maxTaxRate')} 
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  className={inputClasses} 
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Label className={labelClasses}>Volume Threshold (ETH)</Label>
                  <InfoTooltip content={tooltips.tax.volumeThreshold} />
                </div>
                <Input 
                  {...form.register('volumeThreshold')} 
                  type="number"
                  min="0"
                  step="0.01"
                  className={inputClasses} 
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Label className={labelClasses}>Auto-Liquidity (%)</Label>
                  <InfoTooltip content={tooltips.tax.autoLiquidity} />
                </div>
                <Input 
                  {...form.register('autoLiquidityPercent')} 
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  className={inputClasses} 
                />
              </div>
            </div>
          </div>

          {/* Tokenomics */}
          <div className={activeTab === 'tokenomics' ? 'block' : 'hidden'}>
            <div className={sectionClasses}>
              <div className="md:col-span-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    {...form.register('buybackEnabled')}
                    className={checkboxClasses}
                  />
                  <span className={labelClasses}>Enable Buyback</span>
                  <InfoTooltip content={tooltips.tokenomics.buyback} />
                </label>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Label className={labelClasses}>Buyback Threshold (ETH)</Label>
                  <InfoTooltip content={tooltips.tokenomics.buybackThreshold} />
                </div>
                <Input 
                  {...form.register('buybackThreshold')} 
                  type="number"
                  min="0"
                  step="0.01"
                  className={inputClasses} 
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Label className={labelClasses}>Auto-Burn (%)</Label>
                  <InfoTooltip content={tooltips.tokenomics.autoBurn} />
                </div>
                <Input 
                  {...form.register('autoBurnPercent')} 
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  className={inputClasses} 
                />
              </div>
              <div className="md:col-span-2">
                <div className="flex items-center gap-2">
                  <Label className={labelClasses}>Reward Token Address</Label>
                  <InfoTooltip content={tooltips.tokenomics.rewardToken} />
                </div>
                <Input {...form.register('rewardToken')} placeholder="0x..." className={inputClasses} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Label className={labelClasses}>Reward Percent (%)</Label>
                  <InfoTooltip content={tooltips.tokenomics.rewardPercent} />
                </div>
                <Input 
                  {...form.register('rewardPercent')} 
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  className={inputClasses} 
                />
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    {...form.register('antiDumpEnabled')}
                    className={checkboxClasses}
                  />
                  <span className={labelClasses}>Enable Anti-Dump</span>
                  <InfoTooltip content={tooltips.tokenomics.antiDump} />
                </label>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Label className={labelClasses}>Max Transaction Amount</Label>
                  <InfoTooltip content={tooltips.tokenomics.maxTxAmount} />
                </div>
                <Input 
                  {...form.register('maxTxAmount')} 
                  type="number"
                  min="0"
                  step="1"
                  className={inputClasses} 
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Label className={labelClasses}>Max Wallet Amount</Label>
                  <InfoTooltip content={tooltips.tokenomics.maxWalletAmount} />
                </div>
                <Input 
                  {...form.register('maxWalletAmount')} 
                  type="number"
                  min="0"
                  step="1"
                  className={inputClasses} 
                />
              </div>
            </div>
          </div>

          {/* Supply Control */}
          <div className={activeTab === 'supply' ? 'block' : 'hidden'}>
            <div className={sectionClasses}>
              <div className="md:col-span-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    {...form.register('elasticSupplyEnabled')}
                    className={checkboxClasses}
                  />
                  <span className={labelClasses}>Enable Elastic Supply</span>
                  <InfoTooltip content={tooltips.supply.elasticSupply} />
                </label>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Label className={labelClasses}>Target Price (ETH)</Label>
                  <InfoTooltip content={tooltips.supply.targetPrice} />
                </div>
                <Input 
                  {...form.register('targetPrice')} 
                  type="number"
                  min="0"
                  step="0.000000000000000001"
                  className={inputClasses} 
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Label className={labelClasses}>Price Threshold (%)</Label>
                  <InfoTooltip content={tooltips.supply.priceThreshold} />
                </div>
                <Input 
                  {...form.register('priceThreshold')} 
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  className={inputClasses} 
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Label className={labelClasses}>Mint Limit</Label>
                  <InfoTooltip content={tooltips.supply.mintLimit} />
                </div>
                <Input 
                  {...form.register('mintLimit')} 
                  type="number"
                  min="0"
                  step="1"
                  className={inputClasses} 
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Label className={labelClasses}>Burn Limit</Label>
                  <InfoTooltip content={tooltips.supply.burnLimit} />
                </div>
                <Input 
                  {...form.register('burnLimit')} 
                  type="number"
                  min="0"
                  step="1"
                  className={inputClasses} 
                />
              </div>
            </div>
          </div>

          {/* Distribution */}
          <div className={activeTab === 'distribution' ? 'block' : 'hidden'}>
            <div className={sectionClasses}>
              <div className="md:col-span-2">
                <div className="flex items-center gap-2">
                  <Label className={labelClasses}>Merkle Root (for airdrops)</Label>
                  <InfoTooltip content={tooltips.distribution.merkleRoot} />
                </div>
                <Input {...form.register('merkleRoot')} placeholder="0x..." className={inputClasses} />
              </div>
              
              {/* Distribution Configuration */}
              <div className="md:col-span-2 bg-gray-900/50 rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-white">Distribution & Vesting</h3>
                    <p className="text-sm text-gray-400">Configure token allocations and vesting schedules</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select 
                      className="bg-gray-800 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-gray-200"
                      onChange={(e) => {
                        const preset = e.target.value as keyof typeof VESTING_PRESETS;
                        if (preset) {
                          const config = VESTING_PRESETS[preset];
                          form.setValue('presaleEnabled', config.presalePercentage > 0);
                          form.setValue('presalePercentage', config.presalePercentage);
                          form.setValue('liquidityPercentage', config.liquidityPercentage);
                          form.setValue('wallets', config.wallets.map(w => ({
                            ...w,
                            address: '',
                            vestingStartTime: Math.floor(Date.now() / 1000) + (24 * 3600)
                          })));
                        }
                      }}
                    >
                      <option value="">Select Preset</option>
                      <option value="standard">Standard Distribution</option>
                      <option value="fair_launch">Fair Launch</option>
                      <option value="community">Community Focused</option>
                    </select>
                  </div>
                </div>

                {/* Distribution Percentages */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Label className={labelClasses}>Liquidity Percentage (%)</Label>
                      <InfoTooltip content={tooltips.distribution.liquidity} />
                    </div>
                    <Input 
                      {...form.register('liquidityPercentage')} 
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      className={inputClasses} 
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        {...form.register('presaleEnabled')}
                        className={checkboxClasses}
                      />
                      <span className={labelClasses}>Enable Presale</span>
                      <InfoTooltip content={tooltips.distribution.presale} />
                    </label>
                    {form.watch('presaleEnabled') && (
                      <div className="flex-1">
                        <Input 
                          {...form.register('presalePercentage')} 
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          className={inputClasses} 
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Presale Configuration */}
                {form.watch('presaleEnabled') && (
                  <div className="bg-gray-800 rounded-lg p-4 space-y-4">
                    <h4 className="text-sm font-medium text-white mb-3">Presale Configuration</h4>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <Label className={labelClasses}>Token Rate (per ETH)</Label>
                          <InfoTooltip content={tooltips.distribution.presaleRate} />
                        </div>
                        <Input
                          {...form.register('presaleRate')}
                          type="number"
                          min="0"
                          step="1"
                          className={inputClasses}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <Label className={labelClasses}>Soft Cap (ETH)</Label>
                          <InfoTooltip content={tooltips.distribution.presaleCaps} />
                        </div>
                        <Input
                          {...form.register('presaleSoftCap')}
                          type="number"
                          min="0"
                          step="0.1"
                          className={inputClasses}
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Label className={labelClasses}>Hard Cap (ETH)</Label>
                          <InfoTooltip content={tooltips.distribution.presaleCaps} />
                        </div>
                        <Input
                          {...form.register('presaleHardCap')}
                          type="number"
                          min="0"
                          step="0.1"
                          className={inputClasses}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <Label className={labelClasses}>Min Buy (ETH)</Label>
                          <InfoTooltip content={tooltips.distribution.presaleLimits} />
                        </div>
                        <Input
                          {...form.register('presaleMinBuy')}
                          type="number"
                          min="0"
                          step="0.01"
                          className={inputClasses}
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Label className={labelClasses}>Max Buy (ETH)</Label>
                          <InfoTooltip content={tooltips.distribution.presaleLimits} />
                        </div>
                        <Input
                          {...form.register('presaleMaxBuy')}
                          type="number"
                          min="0"
                          step="0.01"
                          className={inputClasses}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <Label className={labelClasses}>Start Time</Label>
                          <InfoTooltip content={tooltips.distribution.presaleTime} />
                        </div>
                        <Input
                          type="datetime-local"
                          className={inputClasses}
                          onChange={(e) => {
                            const timestamp = Math.floor(new Date(e.target.value).getTime() / 1000);
                            form.setValue('presaleStartTime', timestamp);
                          }}
                          defaultValue={new Date(form.getValues('presaleStartTime') * 1000)
                            .toISOString()
                            .slice(0, 16)}
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Label className={labelClasses}>End Time</Label>
                          <InfoTooltip content={tooltips.distribution.presaleTime} />
                        </div>
                        <Input
                          type="datetime-local"
                          className={inputClasses}
                          onChange={(e) => {
                            const timestamp = Math.floor(new Date(e.target.value).getTime() / 1000);
                            form.setValue('presaleEndTime', timestamp);
                          }}
                          defaultValue={new Date(form.getValues('presaleEndTime') * 1000)
                            .toISOString()
                            .slice(0, 16)}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Wallet Management */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-medium text-white">Additional Wallets</h4>
                      <InfoTooltip content="Configure wallet allocations and vesting schedules for team, marketing, etc." />
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-7 text-xs"
                      onClick={() => {
                        const wallets = form.getValues('wallets') || [];
                        form.setValue('wallets', [...wallets, {
                          name: `Wallet ${wallets.length + 1}`,
                          address: '',
                          percentage: 0,
                          vestingEnabled: false,
                          vestingDuration: 365,
                          cliffDuration: 90,
                          vestingStartTime: Math.floor(Date.now() / 1000) + (24 * 3600)
                        }]);
                      }}
                    >
                      Add Wallet
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {form.watch('wallets')?.map((_, index) => (
                      <div key={index} className="p-3 bg-gray-800 rounded-lg space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <Input
                              {...form.register(`wallets.${index}.name`)}
                              placeholder="Wallet Name"
                              className={walletInputClasses}
                            />
                          </div>
                          <div className="w-24">
                            <Input
                              {...form.register(`wallets.${index}.percentage`)}
                              type="number"
                              placeholder="%"
                              className={walletInputClasses}
                              min="0"
                              max="100"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="checkbox"
                                {...form.register(`wallets.${index}.vestingEnabled`)}
                                className={checkboxClasses}
                              />
                              <span className="text-xs text-gray-400">Vest</span>
                              <InfoTooltip content={tooltips.distribution.vesting.enabled} className="ml-1" />
                            </label>
                            <Button
                              type="button"
                              variant="destructive"
                              className="h-7 w-7 p-0"
                              onClick={() => {
                                const wallets = form.getValues('wallets');
                                form.setValue('wallets', wallets.filter((_, i) => i !== index));
                              }}
                            >
                              ×
                            </Button>
                          </div>
                        </div>

                        <Input
                          {...form.register(`wallets.${index}.address`)}
                          placeholder="Wallet Address"
                          className={walletInputClasses}
                        />

                        {form.watch(`wallets.${index}.vestingEnabled`) && (
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <Label className="text-xs text-gray-400">Vesting Duration (days)</Label>
                                <InfoTooltip content={tooltips.distribution.vesting.duration} />
                              </div>
                              <Input
                                {...form.register(`wallets.${index}.vestingDuration`)}
                                type="number"
                                placeholder="365"
                                className={walletInputClasses}
                                min="1"
                              />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <Label className="text-xs text-gray-400">Cliff Duration (days)</Label>
                                <InfoTooltip content={tooltips.distribution.vesting.cliff} />
                              </div>
                              <Input
                                {...form.register(`wallets.${index}.cliffDuration`)}
                                type="number"
                                placeholder="90"
                                className={walletInputClasses}
                                min="0"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white h-9"
            disabled={!isConnected}
          >
            {isConnected ? "Create Token" : "Connect Wallet to Deploy"}
          </Button>
        </form>
      </Card>

      {/* Token Preview */}
      <div className="grid gap-6">
        <TokenPreview
          name={form.watch('name')}
          symbol={form.watch('symbol')}
          initialSupply={form.watch('initialSupply')}
          maxSupply={form.watch('maxSupply')}
        />
        
        {activeTab === 'distribution' && (
          <TokenDistributionPreview
            presaleEnabled={form.watch('presaleEnabled')}
            presalePercentage={Number(form.watch('presalePercentage')) || 0}
            liquidityPercentage={Number(form.watch('liquidityPercentage')) || 0}
            wallets={form.watch('wallets') || []}
          />
        )}
      </div>
    </div>
  );
} 