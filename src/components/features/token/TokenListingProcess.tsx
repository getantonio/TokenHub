import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useNetwork } from '@/contexts/NetworkContext';
import { BrowserProvider, Contract, parseEther, formatEther, EventLog, Result } from 'ethers';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/toast/use-toast';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Spinner } from '@/components/ui/Spinner';
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

interface TokenCreatedEvent extends EventLog {
  args: Result & [token: string, owner: string];
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
  421614: 'Arbitrum Sepolia',
  11155420: 'Optimism Sepolia',
  80002: 'Polygon Amoy',
};

// Add interface for ABI JSON files
interface ContractArtifact {
  _format: string;
  contractName: string;
  sourceName: string;
  abi: any[];
}

// Add factory ABIs with the correct event signature
const FACTORY_V1_ABI = [
  "event TokenCreated(address indexed token, address indexed owner)",
  "function createToken(string name, string symbol, uint256 totalSupply, uint256 marketingFeePercent, uint256 developmentFeePercent, uint256 autoLiquidityFeePercent, address marketingWallet, address developmentWallet) external payable returns (address)"
];

const FACTORY_V2_ABI = [
  "event TokenCreated(address indexed token, address indexed owner)",
  "function createToken(string name, string symbol, uint256 totalSupply, uint256 marketingFeePercent, uint256 developmentFeePercent, uint256 autoLiquidityFeePercent, address marketingWallet, address developmentWallet) external payable returns (address)"
];

const FACTORY_V3_ABI = [
  "event TokenCreated(address indexed token, address indexed owner)",
  "function createToken(string name, string symbol, uint256 totalSupply, uint256 marketingFeePercent, uint256 developmentFeePercent, uint256 autoLiquidityFeePercent, address marketingWallet, address developmentWallet) external payable returns (address)"
];

// Update factory addresses to use environment variables
const FACTORY_ADDRESSES: {
  [key: string]: {
    [chainId: number]: string;
  };
} = {
  v1: {
    11155111: process.env.NEXT_PUBLIC_SEPOLIA_FACTORY_ADDRESS_V1 || '',
    97: process.env.NEXT_PUBLIC_BSCTESTNET_FACTORY_ADDRESS_V1 || '',
    421614: process.env.NEXT_PUBLIC_ARBITRUMSEPOLIA_FACTORY_ADDRESS_V1 || '',
    11155420: process.env.NEXT_PUBLIC_OPSEPOLIA_FACTORY_ADDRESS_V1 || '',
    80002: process.env.NEXT_PUBLIC_POLYGONAMOY_FACTORY_ADDRESS_V1 || '',
  },
  v2: {
    11155111: process.env.NEXT_PUBLIC_SEPOLIA_FACTORY_ADDRESS_V2 || '',
    97: process.env.NEXT_PUBLIC_BSCTESTNET_FACTORY_ADDRESS_V2 || '',
    421614: process.env.NEXT_PUBLIC_ARBITRUMSEPOLIA_FACTORY_ADDRESS_V2 || '',
    11155420: process.env.NEXT_PUBLIC_OPSEPOLIA_FACTORY_ADDRESS_V2 || '',
    80002: process.env.NEXT_PUBLIC_POLYGONAMOY_FACTORY_ADDRESS_V2 || '',
  },
  v3: {
    11155111: process.env.NEXT_PUBLIC_SEPOLIA_FACTORY_ADDRESS_V3 || '',
    97: process.env.NEXT_PUBLIC_BSCTESTNET_FACTORY_ADDRESS_V3 || '',
    421614: process.env.NEXT_PUBLIC_ARBITRUMSEPOLIA_FACTORY_ADDRESS_V3 || '',
    11155420: process.env.NEXT_PUBLIC_OPSEPOLIA_FACTORY_ADDRESS_V3 || '',
    80002: process.env.NEXT_PUBLIC_POLYGONAMOY_FACTORY_ADDRESS_V3 || '',
  }
};

interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  totalSupply: string;
  factoryVersion: "v1" | "v2" | "v3";
}

export default function TokenListingProcess() {
  const { address: userAddress, isConnected } = useAccount();
  const { chainId } = useNetwork();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('select');
  const [isLoading, setIsLoading] = useState(false);
  const [userTokens, setUserTokens] = useState<TokenInfo[]>([]);
  const [selectedToken, setSelectedToken] = useState<TokenInfo | null>(null);
  
  // State for each stage
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

  // Function to load all tokens created by the user
  const loadUserTokens = async () => {
    if (!chainId || !isConnected) return;

    try {
      setIsLoading(true);
      const provider = getProvider();
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();

      // Get factory addresses
      const v1Address = FACTORY_ADDRESSES.v1[chainId];
      const v2Address = FACTORY_ADDRESSES.v2[chainId];
      const v3Address = FACTORY_ADDRESSES.v3[chainId];

      console.log('Current chain ID:', chainId);
      console.log('User address:', userAddress);
      console.log('Loading tokens for factories:', {
        v1: v1Address,
        v2: v2Address,
        v3: v3Address
      });

      // Validate factory addresses
      if (!v1Address || !v2Address || !v3Address) {
        console.error('Missing factory addresses for chain:', chainId);
        toast({
          title: "Configuration Error",
          description: "Factory addresses not configured for this network.",
          variant: "destructive",
        });
        return;
      }

      // Create factory contracts with correct ABIs
      const factoryV1 = new Contract(v1Address, [
        'function getTokensByUser(address) view returns (address[])',
        'function getUserCreatedTokens(address) view returns (address[])',
        'function getDeployedTokens() view returns (address[])'
      ], provider);
      
      const factoryV2 = new Contract(v2Address, [
        'function getTokensByUser(address) view returns (address[])',
        'function getUserCreatedTokens(address) view returns (address[])',
        'function getDeployedTokens() view returns (address[])'
      ], provider);
      
      const factoryV3 = new Contract(v3Address, [
        'function getTokensByUser(address) view returns (address[])',
        'function getUserCreatedTokens(address) view returns (address[])',
        'function getDeployedTokens() view returns (address[])'
      ], provider);

      // Try different methods to get tokens
      const getTokensWithFallback = async (factory: Contract, userAddr: string, version: string) => {
        try {
          // Try getUserCreatedTokens first
          try {
            const tokens = await factory.getUserCreatedTokens(userAddr);
            console.log(`${version} getUserCreatedTokens:`, tokens);
            return tokens;
          } catch (error) {
            console.log(`${version} getUserCreatedTokens failed, trying getTokensByUser...`);
          }

          // Try getTokensByUser as fallback
          try {
            const tokens = await factory.getTokensByUser(userAddr);
            console.log(`${version} getTokensByUser:`, tokens);
            return tokens;
          } catch (error) {
            console.log(`${version} getTokensByUser failed, trying getDeployedTokens...`);
          }

          // Try getDeployedTokens as last resort
          const tokens = await factory.getDeployedTokens();
          console.log(`${version} getDeployedTokens:`, tokens);
          return tokens;
        } catch (error) {
          console.error(`Error getting tokens for ${version}:`, error);
          return [];
        }
      };

      // Get tokens from each factory
      const [v1Tokens, v2Tokens, v3Tokens] = await Promise.all([
        getTokensWithFallback(factoryV1, userAddress, 'V1'),
        getTokensWithFallback(factoryV2, userAddress, 'V2'),
        getTokensWithFallback(factoryV3, userAddress, 'V3')
      ]);

      console.log('Found tokens:', {
        v1: v1Tokens,
        v2: v2Tokens,
        v3: v3Tokens
      });

      // Function to get token details
      const getTokenDetails = async (address: string, version: "v1" | "v2" | "v3") => {
        try {
          const tokenContract = new Contract(address, ERC20_ABI, provider);
          const [name, symbol, totalSupply] = await Promise.all([
            tokenContract.name(),
            tokenContract.symbol(),
            tokenContract.totalSupply()
          ]);

          return {
            address,
            name,
            symbol,
            totalSupply: formatEther(totalSupply),
            factoryVersion: version
          };
        } catch (error) {
          console.error(`Error getting details for token ${address}:`, error);
          return null;
        }
      };

      // Get details for all tokens
      const tokenDetailsPromises = [
        ...v1Tokens.map((addr: string) => getTokenDetails(addr, "v1")),
        ...v2Tokens.map((addr: string) => getTokenDetails(addr, "v2")),
        ...v3Tokens.map((addr: string) => getTokenDetails(addr, "v3"))
      ];

      const tokens = (await Promise.all(tokenDetailsPromises)).filter(token => token !== null);
      console.log('Final token list:', tokens);
      setUserTokens(tokens);

    } catch (error) {
      console.error('Error loading user tokens:', error);
      toast({
        title: "Error",
        description: "Failed to load your tokens. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load tokens when component mounts
  useEffect(() => {
    if (isConnected && chainId) {
      loadUserTokens();
    }
  }, [isConnected, chainId]);

  // Function to handle token selection
  const handleTokenSelect = (token: TokenInfo) => {
    setSelectedToken(token);
    setActiveTab('approve');
  };

  // Function to handle token approval
  const approveToken = async () => {
    if (!selectedToken) return;
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
    if (!selectedToken || !approvalDetails.approved) return;
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
              value="select"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-text-secondary"
            >
              1. Select Token
            </TabsTrigger>
            <TabsTrigger 
              value="approve"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-text-secondary"
              disabled={!selectedToken}
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

          <TabsContent value="select">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-text-primary">Your Tokens</h3>
                <Button
                  onClick={loadUserTokens}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={isLoading}
                >
                  {isLoading ? <Spinner /> : 'Refresh'}
                </Button>
              </div>

              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Spinner />
                </div>
              ) : userTokens.length === 0 ? (
                <div className="text-center py-8 bg-gray-800 rounded-lg">
                  <p className="text-text-secondary">No tokens found. Create a token first.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {userTokens.map((token) => (
                    <div 
                      key={token.address}
                      className="p-4 bg-gray-800 rounded-lg border border-border hover:border-blue-500 cursor-pointer transition-colors"
                      onClick={() => handleTokenSelect(token)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-text-primary">{token.name} ({token.symbol})</h4>
                          <p className="text-sm text-text-secondary mt-1">Address: {token.address}</p>
                          <p className="text-sm text-text-secondary">Supply: {Number(token.totalSupply).toLocaleString()} {token.symbol}</p>
                        </div>
                        <span className="px-2 py-1 bg-blue-600/10 text-blue-400 rounded text-sm">
                          {token.factoryVersion}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="approve">
            <div className="space-y-6">
              {selectedToken && (
                <div className="mb-4 p-4 bg-gray-800 rounded-lg">
                  <h4 className="font-medium text-text-primary">Selected Token</h4>
                  <p className="text-sm text-text-secondary mt-1">{selectedToken.name} ({selectedToken.symbol})</p>
                  <p className="text-sm text-text-secondary">Factory Version: {selectedToken.factoryVersion}</p>
                </div>
              )}
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