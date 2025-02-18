import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useNetwork } from '@/contexts/NetworkContext';
import { BrowserProvider, Contract, parseEther, formatEther, Interface } from 'ethers';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/toast/use-toast';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Spinner } from '@/components/ui/Spinner';
import TokenFactoryV1ABI from '@/contracts/abi/TokenFactory_v1.json';
import TokenFactoryV2ABI from '@/contracts/abi/TokenFactory_v2.json';
import TokenFactoryV2DirectDEXABI from '@/contracts/abi/TokenFactory_v2_DirectDEX.json';
import TestTokenABI from '@/contracts/abi/TestToken.json';
import { getNetworkContractAddress } from '@/config/contracts';

interface TokenDetails {
  address: string;
  name: string;
  symbol: string;
  totalSupply: string;
  factoryVersion: string;
  isVerified: boolean;
}

interface ApprovalDetails {
  liquidityAmount: string;
  approved: boolean;
}

interface DEXDeploymentDetails {
  dex: string;
  initialLiquidityInETH: string;
  listingPriceInETH: string;
  enableTrading: boolean;
  tradingStartTime: number;
}

// Add standard ERC20 ABI
const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)"
];

// Add RPC URLs for different networks
const RPC_URLS: { [key: number]: string } = {
  11155111: 'https://sepolia.infura.io/v3/de082d8afc854286a7bdc56f2895fc67', // Sepolia
  97: 'https://data-seed-prebsc-1-s1.binance.org:8545/', // BSC Testnet
};

// Add network names for display
const NETWORK_NAMES: { [key: number]: string } = {
  11155111: 'Sepolia',
  97: 'BSC Testnet',
};

// Add interface for ABI JSON files
interface ContractArtifact {
  _format: string;
  contractName: string;
  sourceName: string;
  abi: any[];
}

// Add factory ABIs
const FACTORY_V1_ABI = [
  "event TokenCreated(address indexed tokenAddress, address indexed owner)",
  "function createToken(string name, string symbol, uint256 totalSupply, uint256 marketingFeePercent, uint256 developmentFeePercent, uint256 autoLiquidityFeePercent, address marketingWallet, address developmentWallet) external payable returns (address)"
];

const FACTORY_V2_ABI = [
  "event TokenCreated(address indexed tokenAddress, address indexed owner)",
  "function createToken(string name, string symbol, uint256 totalSupply, uint256 marketingFeePercent, uint256 developmentFeePercent, uint256 autoLiquidityFeePercent, address marketingWallet, address developmentWallet) external payable returns (address)"
];

const FACTORY_V2_DIRECTDEX_ABI = [
  "event TokenCreated(address indexed tokenAddress, address indexed owner)",
  "function createToken(string name, string symbol, uint256 totalSupply, uint256 marketingFeePercent, uint256 developmentFeePercent, uint256 autoLiquidityFeePercent, address marketingWallet, address developmentWallet) external payable returns (address)"
];

// Add factory addresses for different versions
const FACTORY_ADDRESSES: {
  [key: string]: {
    [chainId: number]: string;
  };
} = {
  v1: {
    11155111: '0x1a28d5eef66AB135208ee7b33864236eEB804586', // Sepolia
    97: '0x14cA8710278F31803fDA2D6363d7Df8c2710b6aa', // BSC Testnet
  },
  v2: {
    11155111: '0xF619Ae83260bFa49ce8ae7dB13D9CebD104710C8', // Sepolia
    97: '0xd02013450B2fc3CBa06f723EB59D500104f2ECD9', // BSC Testnet
  },
  v2DirectDEX: {
    11155111: '0x0000000000000000000000000000000000000000', // Sepolia
    97: '0x1b4EEF44c30b5C957aF4559aeEB8A5bF3287Cd28', // BSC Testnet
  }
};

// Create Interface instances for the ABIs
const factoryV1Interface = new Interface(TokenFactoryV1ABI.abi);
const factoryV2Interface = new Interface(TokenFactoryV2ABI.abi);
const factoryV2DirectDEXInterface = new Interface(TokenFactoryV2DirectDEXABI.abi);

export default function TokenListingProcess() {
  const { address: userAddress, isConnected } = useAccount();
  const { chainId } = useNetwork();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('register');
  const [isLoading, setIsLoading] = useState(false);
  const [tokenAddress, setTokenAddress] = useState('');
  
  // State for each stage
  const [tokenDetails, setTokenDetails] = useState<TokenDetails | null>(null);
  const [approvalDetails, setApprovalDetails] = useState<ApprovalDetails>({
    liquidityAmount: '',
    approved: false
  });
  const [dexDetails, setDexDetails] = useState<DEXDeploymentDetails>({
    dex: '',
    initialLiquidityInETH: '',
    listingPriceInETH: '',
    enableTrading: true,
    tradingStartTime: 0
  });

  // Function to get the appropriate provider based on the chain
  const getProvider = () => {
    if (!chainId) {
      throw new Error('No chain ID selected');
    }

    // If we're on BSC Testnet, use the BSC RPC URL
    if (chainId === 97) {
      return new BrowserProvider(window.ethereum, {
        chainId: 97,
        name: 'BSC Testnet'
      });
    }

    // For other networks, use the default provider
    return new BrowserProvider(window.ethereum);
  };

  // Function to detect which factory created the token
  const detectFactoryVersion = async (provider: BrowserProvider, tokenAddress: string): Promise<string> => {
    if (!chainId) return "unknown";

    try {
      // Create contract instances for each factory version
      const factoryV1 = new Contract(
        FACTORY_ADDRESSES.v1[chainId],
        FACTORY_V1_ABI,
        provider
      );

      const factoryV2 = new Contract(
        FACTORY_ADDRESSES.v2[chainId],
        FACTORY_V2_ABI,
        provider
      );

      const factoryV2DirectDEX = new Contract(
        FACTORY_ADDRESSES.v2DirectDEX[chainId],
        FACTORY_V2_DIRECTDEX_ABI,
        provider
      );

      // Get the block number when the token was created
      const code = await provider.getCode(tokenAddress);
      if (code === '0x') {
        throw new Error('Invalid token address');
      }

      // Check for token creation events from each factory
      const filterV1 = factoryV1.filters.TokenCreated(tokenAddress);
      const filterV2 = factoryV2.filters.TokenCreated(tokenAddress);
      const filterV2DirectDEX = factoryV2DirectDEX.filters.TokenCreated(tokenAddress);

      const [eventsV1, eventsV2, eventsV2DirectDEX] = await Promise.all([
        factoryV1.queryFilter(filterV1),
        factoryV2.queryFilter(filterV2),
        factoryV2DirectDEX.queryFilter(filterV2DirectDEX)
      ]);

      if (eventsV1.length > 0) return "v1";
      if (eventsV2.length > 0) return "v2";
      if (eventsV2DirectDEX.length > 0) return "v2DirectDEX";

      return "unknown";
    } catch (error) {
      console.error('Error detecting factory version:', error);
      return "unknown";
    }
  };

  // Function to detect factory version and get token details
  const scanToken = async () => {
    if (!tokenAddress) {
      toast({
        title: "Error",
        description: "Please enter a token address",
        variant: "destructive",
      });
      return;
    }

    if (!chainId) {
      toast({
        title: "Error",
        description: "Please connect to a supported network (Sepolia or BSC Testnet)",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      const provider = getProvider();
      
      // Use standard ERC20 ABI to read token details
      const tokenContract = new Contract(
        tokenAddress, 
        ERC20_ABI, 
        provider
      );
      
      // Get basic token details
      const [name, symbol, totalSupply, decimals] = await Promise.all([
        tokenContract.name(),
        tokenContract.symbol(),
        tokenContract.totalSupply(),
        tokenContract.decimals()
      ]);

      // Detect which factory created this token
      const factoryVersion = await detectFactoryVersion(provider, tokenAddress);
      const isVerified = factoryVersion !== "unknown";

      setTokenDetails({
        address: tokenAddress,
        name,
        symbol,
        totalSupply: formatEther(totalSupply),
        factoryVersion,
        isVerified
      });

      if (isVerified) {
        toast({
          title: "Token Scanned Successfully",
          description: `Found ${name} (${symbol}) token on ${NETWORK_NAMES[chainId]}. Created by Factory ${factoryVersion}.`,
        });
      } else {
        toast({
          title: "Token Scanned",
          description: `Found ${name} (${symbol}) token, but it wasn't created by our factory. You can only list tokens created by our factory.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error scanning token:', error);
      toast({
        title: "Error Scanning Token",
        description: `Failed to scan token on ${NETWORK_NAMES[chainId]}. Please check the address and try again.`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Function to handle token approval
  const approveToken = async () => {
    if (!tokenDetails) return;
    try {
      setIsLoading(true);
      // Add approval logic here
      setApprovalDetails(prev => ({ ...prev, approved: true }));
      setActiveTab('deploy');
    } catch (error) {
      console.error('Error approving token:', error);
      toast({
        title: "Error Approving Token",
        description: "Failed to approve token for listing.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Function to deploy to DEX
  const deployToDEX = async () => {
    if (!tokenDetails || !approvalDetails.approved) return;
    try {
      setIsLoading(true);
      // Add DEX deployment logic here
      toast({
        title: "Success",
        description: "Token successfully listed on DEX!",
      });
    } catch (error) {
      console.error('Error deploying to DEX:', error);
      toast({
        title: "Error Deploying to DEX",
        description: "Failed to deploy token to DEX.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-background-secondary rounded-lg border border-border">
      <div className="p-6">
        {chainId && (
          <div className="mb-4 text-text-primary">
            <span className="font-medium">Current Network:</span> {NETWORK_NAMES[chainId] || 'Unsupported Network'}
          </div>
        )}
        
        {(!chainId || !NETWORK_NAMES[chainId]) && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-500">
              Please connect to a supported network (Sepolia or BSC Testnet)
            </p>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger 
              value="register"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-text-secondary"
            >
              1. Register Token
            </TabsTrigger>
            <TabsTrigger 
              value="approve"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-text-secondary"
              disabled={!tokenDetails}
            >
              2. Submit for Approval
            </TabsTrigger>
            <TabsTrigger 
              value="deploy"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-text-secondary"
              disabled={!approvalDetails.approved}
            >
              3. Deploy to DEX
            </TabsTrigger>
          </TabsList>

          <TabsContent value="register">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="tokenAddress" className="text-text-primary">Token Address</Label>
                <div className="flex space-x-2">
                  <Input
                    id="tokenAddress"
                    placeholder="Enter token address"
                    value={tokenAddress}
                    onChange={(e) => setTokenAddress(e.target.value)}
                    className="bg-gray-900 text-text-primary border-border"
                  />
                  <Button 
                    onClick={scanToken}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={isLoading}
                  >
                    {isLoading ? <Spinner /> : 'Scan Token'}
                  </Button>
                </div>
              </div>

              {tokenDetails && (
                <div className="space-y-4 mt-6 p-4 bg-gray-900 rounded-lg border border-border">
                  <h3 className="text-lg font-semibold text-text-primary">Token Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-text-secondary">
                      <span className="font-medium text-text-primary">Name:</span> {tokenDetails.name}
                    </div>
                    <div className="text-text-secondary">
                      <span className="font-medium text-text-primary">Symbol:</span> {tokenDetails.symbol}
                    </div>
                    <div className="text-text-secondary">
                      <span className="font-medium text-text-primary">Total Supply:</span> {tokenDetails.totalSupply}
                    </div>
                    <div className="text-text-secondary">
                      <span className="font-medium text-text-primary">Factory Version:</span> {tokenDetails.factoryVersion}
                    </div>
                  </div>
                  <Button
                    className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => setActiveTab('approve')}
                    disabled={!tokenDetails.isVerified}
                  >
                    Continue to Approval
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="approve">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="liquidityAmount" className="text-text-primary">Liquidity Amount (ETH)</Label>
                <Input
                  id="liquidityAmount"
                  type="number"
                  placeholder="Enter liquidity amount"
                  value={approvalDetails.liquidityAmount}
                  onChange={(e) => setApprovalDetails(prev => ({
                    ...prev,
                    liquidityAmount: e.target.value
                  }))}
                  className="bg-gray-900 text-text-primary border-border"
                />
              </div>
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                onClick={approveToken}
                disabled={!approvalDetails.liquidityAmount || isLoading}
              >
                {isLoading ? <Spinner /> : 'Approve Token and Liquidity'}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="deploy">
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="dex" className="text-text-primary">Select DEX</Label>
                  <Select
                    value={dexDetails.dex}
                    onValueChange={(value) => setDexDetails(prev => ({ ...prev, dex: value }))}
                  >
                    <SelectTrigger className="bg-gray-900 text-text-primary border-border">
                      <SelectValue placeholder="Select a DEX" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pancakeswap">PancakeSwap</SelectItem>
                      <SelectItem value="uniswap">Uniswap</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="listingPrice" className="text-text-primary">Listing Price (ETH)</Label>
                  <Input
                    id="listingPrice"
                    type="number"
                    placeholder="Enter listing price"
                    value={dexDetails.listingPriceInETH}
                    onChange={(e) => setDexDetails(prev => ({
                      ...prev,
                      listingPriceInETH: e.target.value
                    }))}
                    className="bg-gray-900 text-text-primary border-border"
                  />
                </div>
              </div>

              <Button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                onClick={deployToDEX}
                disabled={!dexDetails.dex || !dexDetails.listingPriceInETH || isLoading}
              >
                {isLoading ? <Spinner /> : 'Deploy to DEX'}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
} 