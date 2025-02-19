import { useState, useEffect, useCallback } from 'react';
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
import { InfoIcon } from "lucide-react";

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
  marketingFee: string;
  developmentFee: string;
  liquidityFee: string;
  maxTransactionAmount: string;
  maxWalletAmount: string;
  enableTrading: boolean;
  tradingStartTime: number;
  antiBot: boolean;
  blacklist: boolean;
  maxBuyAmount: string;
  maxSellAmount: string;
  marketingWallet?: string;
  developmentWallet?: string;
  liquidityWallet?: string;
}

interface PriceCalculation {
  tokenAmount: string;
  usdAmount: string;
  ethPerToken: string;
}

interface DEXDeploymentDetails {
  dex: string;
  initialLiquidityInETH: string;
  listingPriceInETH: string;
  enableTrading: boolean;
  tradingStartTime: number;
  tokenAmount: string;
  usdPrice: string;
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
  "function balanceOf(address) view returns (uint256)",
  "function owner() view returns (address)"
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

interface TokenFeatures {
  hasFees: boolean;
  hasAntiBot: boolean;
  hasBlacklist: boolean;
  hasMaxWallet: boolean;
  hasMaxTransaction: boolean;
  hasTradingControl: boolean;
  hasBuySellLimits: boolean;
}

const TOKEN_VERSION_FEATURES: { [key: string]: TokenFeatures } = {
  v1: {
    hasFees: true,
    hasAntiBot: false,
    hasBlacklist: false,
    hasMaxWallet: true,
    hasMaxTransaction: true,
    hasTradingControl: false,
    hasBuySellLimits: false
  },
  v2: {
    hasFees: true,
    hasAntiBot: true,
    hasBlacklist: true,
    hasMaxWallet: true,
    hasMaxTransaction: true,
    hasTradingControl: true,
    hasBuySellLimits: false
  },
  v3: {
    hasFees: true,
    hasAntiBot: true,
    hasBlacklist: true,
    hasMaxWallet: true,
    hasMaxTransaction: true,
    hasTradingControl: true,
    hasBuySellLimits: true
  }
};

// Add approval ABI
const TOKEN_APPROVAL_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)"
];

// Add tooltip content
const TOOLTIP_CONTENT = {
  marketingFee: "Percentage of each transaction sent to marketing wallet",
  developmentFee: "Percentage of each transaction sent to development wallet",
  liquidityFee: "Percentage of each transaction automatically added to liquidity",
  liquidityAmount: "Initial liquidity amount in ETH to be added to the pool",
  maxTransaction: "Maximum amount of tokens that can be bought/sold in a single transaction",
  maxWallet: "Maximum amount of tokens that can be held in a single wallet",
  tradingStart: "When trading will be enabled for this token",
  antiBot: "Prevents bot manipulation during launch",
  blacklist: "Ability to block malicious addresses from trading"
};

// Replace tooltip sections with simpler hover elements
const InfoTooltip = ({ content }: { content: string }) => (
  <div className="group relative inline-block">
    <InfoIcon className="h-3 w-3 text-gray-400" />
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block">
      <div className="bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
        {content}
      </div>
    </div>
  </div>
);

// Update TokenDistribution interface
interface TokenDistribution {
  liquidityAllocation: string;
  marketingAllocation: string;
  developmentAllocation: string;
  beneficiaryAllocations: {
    beneficiary: string;
    amount: string;
    vestingStartTime: number;
    vestingDuration: number;
    isRevocable: boolean;
    isRevoked: boolean;
  }[];
}

// Update checkTokenDistribution function
const checkTokenDistribution = async (tokenContract: Contract): Promise<TokenDistribution | undefined> => {
  try {
    // Get predefined allocations
    const [
      liquidityAllocation,
      marketingAllocation,
      developmentAllocation,
      beneficiaries
    ] = await Promise.all([
      tokenContract.liquidityAllocation(),
      tokenContract.marketingAllocation(),
      tokenContract.developmentAllocation(),
      tokenContract.getBeneficiaryAllocations().catch(() => [])
    ]);

    // Format beneficiary allocations
    const beneficiaryAllocations = beneficiaries.map((b: any) => ({
      beneficiary: b.beneficiary,
      amount: formatEther(b.amount),
      vestingStartTime: Number(b.startTime),
      vestingDuration: Number(b.duration),
      isRevocable: b.revocable,
      isRevoked: b.revoked
    }));

    return {
      liquidityAllocation: formatEther(liquidityAllocation),
      marketingAllocation: formatEther(marketingAllocation),
      developmentAllocation: formatEther(developmentAllocation),
      beneficiaryAllocations
    };
  } catch (error) {
    console.error('Error checking token distribution:', error);
    return undefined;
  }
};

// Update TOKEN_V3_ABI to include the correct functions for distributions
const TOKEN_V3_ABI = [
  ...ERC20_ABI,
  ...TOKEN_APPROVAL_ABI,
  "function owner() view returns (address)",
  "function presaleInfo() view returns (tuple(uint256 softCap, uint256 hardCap, uint256 minContribution, uint256 maxContribution, uint256 startTime, uint256 endTime, uint256 presaleRate, bool whitelistEnabled, bool finalized, uint256 totalContributed))",
  "function liquidityInfo() view returns (tuple(uint256 percentage, uint256 lockDuration, uint256 unlockTime, bool locked))",
  "function platformFee() view returns (tuple(address recipient, uint256 totalTokens, bool vestingEnabled, uint256 vestingDuration, uint256 cliffDuration, uint256 vestingStart, uint256 tokensClaimed))",
  "function getVestingSchedule(address) view returns (tuple(uint256 totalAmount, uint256 startTime, uint256 cliffDuration, uint256 vestingDuration, uint256 releasedAmount, bool revocable, bool revoked, uint256 releasableAmount))",
  "function hasVestingSchedule(address) view returns (bool)",
  "function finalize() external",
  "function finalizePresale() external",
  "function presalePercentage() view returns (uint256)",
  "function liquidityPercentage() view returns (uint256)",
  "function getTokenDistribution() view returns (tuple(uint256 presaleTokens, uint256 liquidityTokens, uint256 platformTokens))"
];

// Update TokenPreview interface
interface TokenPreview {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  owner: string;
  factoryVersion: string;
  isListed?: boolean;
  pairAddress?: string;
  address?: string;
  tokenDistribution?: {
    presaleTokens: string;
    liquidityTokens: string;
    platformTokens: string;
    presalePercentage: number;
    liquidityPercentage: number;
  };
  presaleInfo?: {
    softCap: string;
    hardCap: string;
    minContribution: string;
    maxContribution: string;
    presaleRate: string;
    startTime: number;
    endTime: number;
    whitelistEnabled: boolean;
    finalized: boolean;
    totalContributed: string;
  };
  liquidityInfo?: {
    percentage: string;
    lockDuration: string;
    unlockTime: number;
    locked: boolean;
  };
  platformFee?: {
    recipient: string;
    totalTokens: string;
    vestingEnabled: boolean;
    vestingDuration: number;
    cliffDuration: number;
    vestingStart: number;
    tokensClaimed: string;
  };
  vestingSchedule?: {
    totalAmount: string;
    startTime: number;
    cliffDuration: number;
    vestingDuration: number;
    releasedAmount: string;
    revocable: boolean;
    revoked: boolean;
    releasableAmount: string;
  };
}

// Add this helper function near the top of the file with other helper functions
const getNetworkCurrency = (chainId: number): string => {
  switch (chainId) {
    case 97: // BSC Testnet
      return 'BNB';
    case 11155111: // Sepolia
      return 'ETH';
    default:
      return 'ETH';
  }
};

// Router ABI for PancakeSwap/Uniswap
const routerABI = [
  "function addLiquidityETH(address token, uint256 amountTokenDesired, uint256 amountTokenMin, uint256 amountETHMin, address to, uint256 deadline) external payable returns (uint256 amountToken, uint256 amountETH, uint256 liquidity)",
  "function WETH() external pure returns (address)",
  "function factory() external pure returns (address)"
];

function TokenListingProcess() {
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
    approved: false,
    marketingFee: '2',
    developmentFee: '2',
    liquidityFee: '2',
    maxTransactionAmount: '2',
    maxWalletAmount: '5',
    enableTrading: true,
    tradingStartTime: Date.now() + 600000, // 10 minutes in the future
    antiBot: true,
    blacklist: true,
    maxBuyAmount: '2',
    maxSellAmount: '2',
    marketingWallet: '0x10C8c279c6b381156733ec160A89Abb260bfcf0C',
    developmentWallet: '0x991Ed392F033B2228DC55A1dE2b706ef8D9d9DcD'
  });
  const [dexDetails, setDexDetails] = useState<DEXDeploymentDetails>({
    dex: '',
    initialLiquidityInETH: '',
    listingPriceInETH: '',
    enableTrading: true,
    tradingStartTime: 0,
    tokenAmount: '',
    usdPrice: ''
  });
  const [tokenDistribution, setTokenDistribution] = useState<TokenDistribution | null>(null);
  const [tokenPreview, setTokenPreview] = useState<TokenPreview | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

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
    if (!chainId || !isConnected) {
      toast({
        title: "Connection Required",
        description: "Please connect your wallet first.",
        variant: "destructive",
      });
      return;
    }

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

  // Function to handle token selection
  const handleTokenSelect = async (token: TokenInfo) => {
    setSelectedToken(token);
    setActiveTab('approve');
    
    if (token.factoryVersion === 'v3') {
      try {
        const provider = getProvider();
        const tokenContract = new Contract(token.address, TOKEN_V3_ABI, provider);
        
        // Get token distribution
        const [
          liquidityAllocation,
          marketingAllocation,
          developmentAllocation,
          beneficiaryAllocations
        ] = await Promise.all([
          tokenContract.liquidityAllocation().then(formatEther).catch(() => '0'),
          tokenContract.marketingAllocation().then(formatEther).catch(() => '0'),
          tokenContract.developmentAllocation().then(formatEther).catch(() => '0'),
          tokenContract.getBeneficiaryAllocations().catch(() => [])
        ]);

        const distribution: TokenDistribution = {
          liquidityAllocation,
          marketingAllocation,
          developmentAllocation,
          beneficiaryAllocations: beneficiaryAllocations.map((b: any) => ({
            beneficiary: b.beneficiary,
            amount: formatEther(b.amount),
            vestingStartTime: Number(b.startTime),
            vestingDuration: Number(b.duration),
            isRevocable: b.revocable,
            isRevoked: b.revoked
          }))
        };

        // Update UI to show allocations
        setTokenDistribution(distribution);
        
        // If there's a predefined liquidity allocation, use it
        if (distribution.liquidityAllocation !== '0') {
          setApprovalDetails(prev => ({
            ...prev,
            liquidityAmount: distribution.liquidityAllocation
          }));
        }

        console.log('Token distribution loaded:', distribution);
      } catch (error) {
        console.error('Error getting token distribution:', error);
        toast({
          title: "Warning",
          description: "Could not fetch token distribution information. The token may not be properly configured.",
          variant: "destructive",
        });
      }
    }
  };

  // Add this function after the resetApproval function
  const checkApprovalStatus = async (tokenAddress: string, spenderAddress: string) => {
    try {
      const provider = getProvider();
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();
      
      const tokenContract = new Contract(tokenAddress, TOKEN_APPROVAL_ABI, provider);
      const allowance = await tokenContract.allowance(userAddress, spenderAddress);
      
      return allowance > BigInt(0);
    } catch (error) {
      console.error('Error checking approval status:', error);
      return false;
    }
  };

  // Update the approveToken function
  const approveToken = async () => {
    if (!selectedToken || !chainId) return;
    
    try {
      setIsLoading(true);
      const provider = getProvider();
      const signer = await provider.getSigner();
      const dexRouter = getDexRouterAddress(chainId);
      
      // Create token contract instance with appropriate ABI
      const tokenContract = new Contract(
        selectedToken.address,
        selectedToken.factoryVersion === 'v3' ? TOKEN_V3_ABI : [...ERC20_ABI, ...TOKEN_APPROVAL_ABI],
        signer
      );
      
      let approvalAmount;
      try {
        // Get total supply first
        const totalSupply = await tokenContract.totalSupply();
        console.log('Total supply:', formatEther(totalSupply));
        
        // Calculate 40% of total supply for all token versions
        approvalAmount = (totalSupply * BigInt(40)) / BigInt(100);
        console.log('Calculated 40% approval amount:', formatEther(approvalAmount));
        
      } catch (error) {
        console.error('Error getting approval amount:', error);
        toast({
          title: "Error",
          description: "Failed to calculate approval amount",
          variant: "destructive",
        });
        return;
      }
      
      // Check current allowance
      const currentAllowance = await tokenContract.allowance(await signer.getAddress(), dexRouter);
      console.log('Current allowance:', formatEther(currentAllowance));
      
      if (currentAllowance >= approvalAmount) {
        console.log('Already approved sufficient amount');
        toast({
          title: "Already Approved",
          description: "Token already has sufficient approval",
        });
        setApprovalDetails(prev => ({ ...prev, approved: true }));
        return;
      }
      
      // Estimate gas for the approval
      const gasEstimate = await tokenContract.approve.estimateGas(dexRouter, approvalAmount)
        .catch(() => BigInt(60000)); // Fallback gas limit if estimation fails
      
      // Add 20% buffer to gas estimate
      const gasLimit = gasEstimate * BigInt(120) / BigInt(100);
      
      console.log('Estimated gas:', gasEstimate.toString(), 'Using gas limit:', gasLimit.toString());
      
      // Create approval transaction
      const tx = await tokenContract.approve(dexRouter, approvalAmount, {
        gasLimit
      });
      
      toast({
        title: "Approval Pending",
        description: "Please confirm the transaction in your wallet",
      });
      
      // Wait for transaction confirmation
      await tx.wait();
      
      toast({
        title: "Success",
        description: "Token approved for listing",
      });
      setApprovalDetails(prev => ({ ...prev, approved: true }));
      
    } catch (error) {
      console.error('Error approving token:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to approve token. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to get DEX router address
  const getDexRouterAddress = (chainId: number): string => {
    const ROUTER_ADDRESSES: { [key: number]: string } = {
      11155111: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', // Uniswap V2 Router on Sepolia
      97: '0xD99D1c33F9fC3444f8101754aBC46c52416550D1', // PancakeSwap Router on BSC Testnet
    };
    
    const address = ROUTER_ADDRESSES[chainId];
    if (!address) {
      throw new Error(`No router address configured for chain ID ${chainId}`);
    }
    return address;
  };

  // Add loadTokenPreview function before the deployToDEX function
  const loadTokenPreview = async () => {
    if (!selectedToken || !chainId) return;
    
    try {
      setIsLoadingPreview(true);
      const provider = getProvider();
      const signer = await provider.getSigner();
      
      // Get DEX router and factory addresses
      const dexRouter = getDexRouterAddress(chainId);
      const routerContract = new Contract(dexRouter, routerABI, provider);
      const factoryAddress = await routerContract.factory();
      const factoryContract = new Contract(factoryAddress, [
        "function getPair(address tokenA, address tokenB) view returns (address)"
      ], provider);
      
      // Check if pair exists with WETH
      const wethAddress = await routerContract.WETH();
      const pairAddress = await factoryContract.getPair(selectedToken.address, wethAddress);
      const isListed = pairAddress !== "0x0000000000000000000000000000000000000000";
      
      // Create contract with appropriate ABI based on version
      const tokenContract = new Contract(
        selectedToken.address,
        selectedToken.factoryVersion === 'v3' ? TOKEN_V3_ABI : ERC20_ABI,
        provider
      );
      
      // Get basic token info with proper error handling
      const [name, symbol, decimals, totalSupply, owner] = await Promise.all([
        tokenContract.name().catch(() => 'Unknown'),
        tokenContract.symbol().catch(() => 'Unknown'),
        tokenContract.decimals().catch(() => 18),
        tokenContract.totalSupply().catch(() => BigInt(0)),
        tokenContract.owner().catch(() => 'Not available')
      ]);

      const preview: TokenPreview = {
        name,
        symbol,
        decimals,
        totalSupply: formatEther(totalSupply),
        owner,
        factoryVersion: selectedToken.factoryVersion,
        isListed,
        pairAddress: isListed ? pairAddress : undefined,
        address: selectedToken.address
      };
      
      setTokenPreview(preview);

      if (isListed) {
        toast({
          title: "Token Already Listed",
          description: "This token is already listed on DEX. You cannot list it again.",
          variant: "destructive",
        });
        setApprovalDetails(prev => ({ ...prev, approved: false }));
      } else {
        toast({
          title: "Success",
          description: "Token details loaded successfully",
        });
      }
    } catch (error) {
      console.error('Error loading token preview:', error);
      toast({
        title: "Error",
        description: "Failed to load token details. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // Function to deploy to DEX
  const deployToDEX = async () => {
    if (!selectedToken || !chainId) return;
    
    try {
      setIsLoading(true);
      const provider = getProvider();
      const signer = await provider.getSigner();
      
      // Validate initial liquidity amount with network-specific currency
      if (!dexDetails.initialLiquidityInETH || Number(dexDetails.initialLiquidityInETH) < 0.1) {
        toast({
          title: "Error",
          description: `Minimum liquidity required is 0.1 ${getNetworkCurrency(chainId)}`,
          variant: "destructive",
        });
        return;
      }

      // Validate token price
      if (!dexDetails.listingPriceInETH || Number(dexDetails.listingPriceInETH) <= 0) {
        toast({
          title: "Error",
          description: "Please enter a valid token price",
          variant: "destructive",
        });
        return;
      }
      
      // Get the DEX router address
      const dexRouter = getDexRouterAddress(chainId);
      console.log('Using DEX router:', dexRouter);
      
      // Create token contract instance
      const tokenContract = new Contract(
        selectedToken.address,
        [...ERC20_ABI, ...TOKEN_APPROVAL_ABI],
        signer
      );

      // Check token balance
      const userAddress = await signer.getAddress();
      const balance = await tokenContract.balanceOf(userAddress);
      console.log('User token balance:', formatEther(balance));

      // Get total supply and calculate token amount (40% for all versions)
      const totalSupply = await tokenContract.totalSupply();
      const tokenAmount = (totalSupply * BigInt(40)) / BigInt(100);
      console.log('Token amount for liquidity:', formatEther(tokenAmount));
      
      if (balance < tokenAmount) {
        toast({
          title: "Error",
          description: "Insufficient token balance for liquidity",
          variant: "destructive",
        });
        return;
      }
      
      // Calculate ETH/BNB amount from listing price
      const ethAmount = parseEther(dexDetails.listingPriceInETH);
      console.log('ETH/BNB amount for liquidity:', formatEther(ethAmount));
      
      // Check BNB balance
      const bnbBalance = await provider.getBalance(userAddress);
      console.log('User BNB balance:', formatEther(bnbBalance));
      
      if (bnbBalance < ethAmount) {
        toast({
          title: "Error",
          description: `Insufficient ${getNetworkCurrency(chainId)} balance for liquidity`,
          variant: "destructive",
        });
        return;
      }
      
      // Check current allowance
      const currentAllowance = await tokenContract.allowance(userAddress, dexRouter);
      console.log('Current allowance:', formatEther(currentAllowance));
      console.log('Required token amount:', formatEther(tokenAmount));
      
      if (currentAllowance < tokenAmount) {
        toast({
          title: "Error",
          description: "Insufficient token approval. Please approve tokens first.",
          variant: "destructive",
        });
        setActiveTab('approve');
        return;
      }

      // Create router contract with full ABI for PancakeSwap
      const routerContract = new Contract(dexRouter, routerABI, signer);
      
      // Set deadline 30 minutes from now (increased from 20)
      const deadline = Math.floor(Date.now() / 1000) + 1800;
      
      // Calculate minimum amounts (2% slippage tolerance - increased from 1%)
      const amountTokenMin = (tokenAmount * BigInt(98)) / BigInt(100);
      const amountETHMin = (ethAmount * BigInt(98)) / BigInt(100);
      
      console.log('Deployment parameters:', {
        token: selectedToken.address,
        tokenAmount: formatEther(tokenAmount),
        ethAmount: formatEther(ethAmount),
        amountTokenMin: formatEther(amountTokenMin),
        amountETHMin: formatEther(amountETHMin),
        deadline,
        router: dexRouter
      });

      // Prepare transaction parameters with higher gas for BSC
      const txParams = {
        value: ethAmount,
        gasLimit: chainId === 97 ? BigInt(4000000) : BigInt(1000000), // Increased gas limit for BSC
        gasPrice: chainId === 97 ? BigInt(12000000000) : undefined // 12 Gwei for BSC Testnet
      };
      
      console.log('Transaction parameters:', txParams);
      
      // Estimate gas first with a try-catch
      try {
        const gasEstimate = await routerContract.addLiquidityETH.estimateGas(
          selectedToken.address,
          tokenAmount,
          amountTokenMin,
          amountETHMin,
          userAddress,
          deadline,
          { value: ethAmount }
        );
        console.log('Estimated gas:', gasEstimate.toString());
        // Add 50% buffer instead of 20%
        txParams.gasLimit = gasEstimate * BigInt(150) / BigInt(100);
        console.log('Adjusted gas limit:', txParams.gasLimit.toString());
      } catch (error) {
        console.error('Gas estimation failed:', error);
        // Continue with default gas limit
      }
      
      console.log('Sending transaction with parameters:', {
        token: selectedToken.address,
        tokenAmount: formatEther(tokenAmount),
        amountTokenMin: formatEther(amountTokenMin),
        amountETHMin: formatEther(amountETHMin),
        to: userAddress,
        deadline,
        value: formatEther(ethAmount),
        gasLimit: txParams.gasLimit.toString(),
        gasPrice: txParams.gasPrice ? txParams.gasPrice.toString() : 'auto'
      });

      // Add liquidity
      const tx = await routerContract.addLiquidityETH(
        selectedToken.address,
        tokenAmount,
        amountTokenMin,
        amountETHMin,
        userAddress,
        deadline,
        txParams
      );
      
      console.log('Transaction submitted:', tx.hash);
      
      toast({
        title: "Transaction Submitted",
        description: "Please wait while your transaction is being processed",
      });
      
      const receipt = await tx.wait();
      console.log('Transaction receipt:', receipt);
      
      if (!receipt || receipt.status === 0) {
        throw new Error("Transaction failed. Please check your token approval and BNB balance.");
      }
      
      toast({
        title: "Success",
        description: "Token successfully listed on DEX!",
      });
      
    } catch (error) {
      console.error('Error deploying to DEX:', error);
      
      let errorMessage = "Failed to deploy token to DEX.";
      if (error instanceof Error) {
        if (error.message.includes("insufficient allowance")) {
          errorMessage = "Insufficient token approval. Please approve more tokens.";
        } else if (error.message.includes("insufficient balance")) {
          errorMessage = `Insufficient ${getNetworkCurrency(chainId)} balance for liquidity.`;
        } else if (error.message.includes("TRANSFER_FROM_FAILED")) {
          errorMessage = "Token transfer failed. Please check your token approval.";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Error Deploying to DEX",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Add these functions before the deployToDEX function
  const handleFinalizePresale = async (tokenAddress: string) => {
    if (!tokenAddress || !chainId) return;
    
    try {
      setIsLoading(true);
      const provider = getProvider();
      const signer = await provider.getSigner();
      
      const tokenContract = new Contract(tokenAddress, TOKEN_V3_ABI, signer);
      
      const tx = await tokenContract.finalizePresale();
      
      toast({
        title: "Finalizing Presale",
        description: "Please wait for the transaction to be confirmed",
      });
      
      await tx.wait();
      
      toast({
        title: "Success",
        description: "Presale has been finalized successfully",
      });
      
      // Refresh token preview
      await loadTokenPreview();
    } catch (error) {
      console.error('Error finalizing presale:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to finalize presale",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetApproval = async () => {
    if (!selectedToken || !chainId) return;
    
    try {
      setIsLoading(true);
      const provider = getProvider();
      const signer = await provider.getSigner();
      
      // Get the DEX router address
      const dexRouter = getDexRouterAddress(chainId);
      
      // Create token contract instance
      const tokenContract = new Contract(selectedToken.address, [
        ...ERC20_ABI,
        ...TOKEN_APPROVAL_ABI
      ], signer);
      
      // Set allowance to 0
      const tx = await tokenContract.approve(dexRouter, 0);
      
      toast({
        title: "Resetting Approval",
        description: "Please confirm the transaction in your wallet",
      });
      
      await tx.wait();
      
      toast({
        title: "Success",
        description: "Token approval has been reset",
      });
      
      setApprovalDetails(prev => ({ ...prev, approved: false }));
    } catch (error) {
      console.error('Error resetting approval:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reset approval",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-background-secondary rounded-lg border border-border">
      <div className="p-6">
        <h1 className="text-4xl font-black mb-6 bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent" style={{ fontFamily: "'Roboto', monospace" }}>
          TokenHub<span className="text-gray-400">.dev</span>
        </h1>
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
              Created Tokens
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
                <h3 className="text-lg font-semibold text-text-primary">Created Tokens</h3>
                <Button
                  onClick={loadUserTokens}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={isLoading || !isConnected}
                >
                  {isLoading ? <Spinner /> : userTokens.length === 0 ? 'Load Tokens' : 'Refresh'}
                </Button>
              </div>

              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Spinner />
                </div>
              ) : userTokens.length === 0 ? (
                <div className="text-center py-8 bg-gray-800 rounded-lg">
                  <p className="text-text-secondary">
                    {!isConnected 
                      ? "Please connect your wallet first"
                      : "Click 'Load Tokens' to view your listed tokens"}
                  </p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {userTokens.map((token) => (
                    <div 
                      key={token.address}
                      className="p-4 bg-gray-800 rounded-lg border border-border hover:border-blue-500 transition-colors"
                    >
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium text-text-primary">{token.name} ({token.symbol})</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-sm text-text-secondary break-all">{token.address}</p>
                              <button 
                                onClick={() => navigator.clipboard.writeText(token.address)}
                                className="text-blue-400 hover:text-blue-300"
                              >
                                <InfoIcon className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className="px-2 py-1 bg-blue-600/10 text-blue-400 rounded text-sm">
                              {token.factoryVersion}
                            </span>
                            {tokenPreview?.isListed && tokenPreview.address === token.address && (
                              <span className="px-2 py-1 bg-green-600/10 text-green-400 rounded text-sm">
                                Listed
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-text-secondary">Total Supply:</p>
                            <p className="text-text-primary">{Number(token.totalSupply).toLocaleString()} {token.symbol}</p>
                          </div>
                          {tokenPreview?.isListed && tokenPreview.address === token.address && (
                            <div>
                              <p className="text-text-secondary">Liquidity Pair:</p>
                              <p className="text-text-primary break-all">{tokenPreview.pairAddress}</p>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2 pt-2">
                          <Button
                            onClick={() => chainId && window.open(`${getExplorerUrl(chainId)}/token/${token.address}`, '_blank')}
                            className="flex-1 h-8 text-xs bg-gray-700 hover:bg-gray-600"
                            disabled={!chainId}
                          >
                            View on Explorer
                          </Button>
                          {tokenPreview?.isListed && tokenPreview.address === token.address && (
                            <Button
                              onClick={() => chainId && window.open(`${getDexUrl(chainId)}/swap?outputCurrency=${token.address}`, '_blank')}
                              className="flex-1 h-8 text-xs bg-blue-600 hover:bg-blue-700"
                              disabled={!chainId}
                            >
                              Trade on DEX
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="approve">
            <div className="space-y-3">
              {selectedToken && (
                <div className="p-2 bg-gray-900 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-medium text-white">{selectedToken.name} ({selectedToken.symbol})</h4>
                      <p className="text-xs text-gray-400 mt-0.5">Factory Version: {selectedToken.factoryVersion}</p>
                    </div>
                    <span className="px-2 py-0.5 bg-blue-600/10 text-blue-400 rounded text-xs">
                      {selectedToken.factoryVersion}
                    </span>
                  </div>
                </div>
              )}

              {selectedToken && (
                <div className="p-4 bg-gray-900 rounded-lg space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-medium text-white">Token Preview</h4>
                    <Button
                      onClick={loadTokenPreview}
                      className="bg-blue-600 hover:bg-blue-700 text-white h-7 text-xs px-3"
                      disabled={isLoadingPreview}
                    >
                      {isLoadingPreview ? <Spinner className="h-3 w-3" /> : 'Refresh Token Details'}
                    </Button>
                  </div>
                  
                  {tokenPreview ? (
                    <div className="space-y-3 text-sm">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-gray-400">Name:</p>
                          <p className="text-white font-medium">{tokenPreview.name}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Symbol:</p>
                          <p className="text-white font-medium">{tokenPreview.symbol}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Total Supply:</p>
                          <p className="text-white font-medium">{Number(tokenPreview.totalSupply).toLocaleString()} {tokenPreview.symbol}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Decimals:</p>
                          <p className="text-white font-medium">{tokenPreview.decimals}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-gray-400">Owner:</p>
                          <p className="text-white font-medium break-all">{tokenPreview.owner}</p>
                        </div>
                      </div>
                      
                      {tokenPreview.factoryVersion === 'v3' && (
                        <div className="border-t border-gray-800 pt-3">
                          <h5 className="text-sm font-medium text-white mb-2">Token Distribution</h5>
                          <div className="grid grid-cols-2 gap-4">
                            {tokenPreview.presaleInfo && (
                              <div className="col-span-2">
                                <p className="text-gray-400 mb-2">Presale Info:</p>
                                <div className="grid grid-cols-2 gap-4 bg-gray-800 p-3 rounded-lg">
                                  <div>
                                    <p className="text-gray-400">Soft Cap:</p>
                                    <p className="text-white font-medium">
                                      {Number(tokenPreview.presaleInfo.softCap).toLocaleString()} ETH
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-gray-400">Hard Cap:</p>
                                    <p className="text-white font-medium">
                                      {Number(tokenPreview.presaleInfo.hardCap).toLocaleString()} ETH
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-gray-400">Rate:</p>
                                    <p className="text-white font-medium">
                                      {Number(tokenPreview.presaleInfo.presaleRate).toLocaleString()} tokens/ETH
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-gray-400">Status:</p>
                                    <p className="text-white font-medium">
                                      {tokenPreview.presaleInfo.finalized ? 'Finalized' : 'Active'}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-gray-400">Total Contributed:</p>
                                    <p className="text-white font-medium">
                                      {Number(tokenPreview.presaleInfo.totalContributed).toLocaleString()} ETH
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-gray-400">Whitelist:</p>
                                    <p className="text-white font-medium">
                                      {tokenPreview.presaleInfo.whitelistEnabled ? 'Enabled' : 'Disabled'}
                                    </p>
                                  </div>
                                  <div className="col-span-2 mt-2 flex gap-2">
                                    <Button
                                      onClick={() => handleFinalizePresale(selectedToken.address)}
                                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-7 text-xs"
                                      disabled={
                                        tokenPreview.presaleInfo.finalized || 
                                        Number(tokenPreview.presaleInfo.totalContributed) < Number(tokenPreview.presaleInfo.softCap)
                                      }
                                    >
                                      Finalize Presale
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            )}
                            {tokenPreview.liquidityInfo && (
                              <div className="col-span-2 mt-4">
                                <p className="text-gray-400 mb-2">Distribution Info:</p>
                                <div className="grid grid-cols-2 gap-4 bg-gray-800 p-3 rounded-lg">
                                  <div>
                                    <p className="text-gray-400">Liquidity Amount:</p>
                                    <p className="text-white font-medium">
                                      {Number(tokenPreview.liquidityInfo.percentage).toLocaleString()} {tokenPreview.symbol}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-gray-400">Lock Duration:</p>
                                    <p className="text-white font-medium">
                                      {Number(tokenPreview.liquidityInfo.lockDuration) / 86400} days
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-gray-400">Presale Amount:</p>
                                    <p className="text-white font-medium">
                                      {tokenPreview.presaleInfo ? (Number(tokenPreview.presaleInfo.hardCap) * Number(tokenPreview.presaleInfo.presaleRate)).toLocaleString() : '0'} {tokenPreview.symbol}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-gray-400">Developer Amount:</p>
                                    <p className="text-white font-medium">
                                      {Number(tokenPreview.platformFee?.totalTokens || 0).toLocaleString()} {tokenPreview.symbol}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {tokenPreview.vestingSchedule && (
                            <div className="mt-4">
                              <h5 className="text-sm font-medium text-white mb-2">Your Vesting Schedule</h5>
                              <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-gray-400">Total Amount:</p>
                                    <p className="text-white font-medium">
                                      {Number(tokenPreview.vestingSchedule.totalAmount).toLocaleString()} {tokenPreview.symbol}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-gray-400">Released Amount:</p>
                                    <p className="text-white font-medium">
                                      {Number(tokenPreview.vestingSchedule.releasedAmount).toLocaleString()} {tokenPreview.symbol}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-gray-400">Releasable Amount:</p>
                                    <p className="text-white font-medium">
                                      {Number(tokenPreview.vestingSchedule.releasableAmount).toLocaleString()} {tokenPreview.symbol}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-gray-400">Start Time:</p>
                                    <p className="text-white font-medium">
                                      {new Date(tokenPreview.vestingSchedule.startTime * 1000).toLocaleString()}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-gray-400">Cliff Duration:</p>
                                    <p className="text-white font-medium">
                                      {Math.floor(Number(tokenPreview.vestingSchedule.cliffDuration) / 86400)} days
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-gray-400">Vesting Duration:</p>
                                    <p className="text-white font-medium">
                                      {Math.floor(Number(tokenPreview.vestingSchedule.vestingDuration) / 86400)} days
                                    </p>
                                  </div>

                                  <div className="col-span-2">
                                    <p className="text-gray-400">Status:</p>
                                    <p className="text-white font-medium">
                                      {tokenPreview.vestingSchedule.revoked ? 'Revoked' : 'Active'}
                                      {tokenPreview.vestingSchedule.revocable && !tokenPreview.vestingSchedule.revoked && ' (Revocable)'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-400">
                      Click 'Refresh Token Details' to load token information
                    </div>
                  )}
                </div>
              )}

              {selectedToken && TOKEN_VERSION_FEATURES[selectedToken.factoryVersion].hasFees && (
                <div className="p-2 bg-gray-900 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-sm font-medium text-white">Fees</h4>
                    <InfoTooltip content={TOOLTIP_CONTENT.marketingFee} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-32">
                        <div className="flex items-center gap-1 mb-1">
                          <Label htmlFor="marketingFee" className="text-xs text-gray-400">Marketing (%)</Label>
                          <InfoTooltip content={TOOLTIP_CONTENT.marketingFee} />
                        </div>
                        <Input
                          id="marketingFee"
                          type="number"
                          min="0"
                          max="10"
                          value={approvalDetails.marketingFee}
                          onChange={(e) => setApprovalDetails(prev => ({
                            ...prev,
                            marketingFee: e.target.value
                          }))}
                          className="h-7 text-sm bg-gray-800 border-gray-700 text-white"
                        />
                      </div>
                      <div className="flex-1">
                        <Label htmlFor="marketingWallet" className="text-xs text-gray-400">Wallet Address</Label>
                        <Input
                          id="marketingWallet"
                          type="text"
                          placeholder="0x000...000"
                          value={approvalDetails.marketingWallet || ''}
                          onChange={(e) => setApprovalDetails(prev => ({
                            ...prev,
                            marketingWallet: e.target.value
                          }))}
                          className="h-7 text-sm bg-gray-800 border-gray-700 text-white"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="w-32">
                        <div className="flex items-center gap-1 mb-1">
                          <Label htmlFor="developmentFee" className="text-xs text-gray-400">Dev (%)</Label>
                          <InfoTooltip content={TOOLTIP_CONTENT.developmentFee} />
                        </div>
                        <Input
                          id="developmentFee"
                          type="number"
                          min="0"
                          max="10"
                          value={approvalDetails.developmentFee}
                          onChange={(e) => setApprovalDetails(prev => ({
                            ...prev,
                            developmentFee: e.target.value
                          }))}
                          className="h-7 text-sm bg-gray-800 border-gray-700 text-white"
                        />
                      </div>
                      <div className="flex-1">
                        <Label htmlFor="developmentWallet" className="text-xs text-gray-400">Wallet Address</Label>
                        <Input
                          id="developmentWallet"
                          type="text"
                          placeholder="0x000...000"
                          value={approvalDetails.developmentWallet || ''}
                          onChange={(e) => setApprovalDetails(prev => ({
                            ...prev,
                            developmentWallet: e.target.value
                          }))}
                          className="h-7 text-sm bg-gray-800 border-gray-700 text-white"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="w-full">
                        <div className="flex items-center gap-1 mb-1">
                          <Label htmlFor="liquidityFee" className="text-xs text-gray-400">Liquidity (%)</Label>
                          <InfoTooltip content={TOOLTIP_CONTENT.liquidityFee} />
                        </div>
                        <Input
                          id="liquidityFee"
                          type="number"
                          min="0"
                          max="10"
                          value={approvalDetails.liquidityFee}
                          onChange={(e) => setApprovalDetails(prev => ({
                            ...prev,
                            liquidityFee: e.target.value
                          }))}
                          className="h-7 text-sm bg-gray-800 border-gray-700 text-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-2 bg-gray-900 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="text-sm font-medium text-white">Token Approval</h4>
                  <InfoTooltip content="Approve tokens for DEX listing (40% of total supply)" />
                </div>
                <div className="space-y-2">
                  <div>
                    <Label className="text-xs text-gray-400">Tokens for Liquidity</Label>
                    <div className="p-2 bg-gray-800 rounded border border-gray-700">
                      <div className="text-sm text-white">
                        {selectedToken ? `${Number(selectedToken.totalSupply) * 0.4} ${selectedToken.symbol}` : '0'}
                      </div>
                      <div className="text-xs text-gray-400">40% of total supply</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-2 bg-gray-900 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="text-sm font-medium text-white">Liquidity</h4>
                  <InfoTooltip content="Configure initial liquidity and trading settings" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      <Label htmlFor="liquidityAmount" className="text-xs text-gray-400">
                        Initial ({chainId ? getNetworkCurrency(chainId) : 'ETH'})
                      </Label>
                      <InfoTooltip content={TOOLTIP_CONTENT.liquidityAmount} />
                    </div>
                    <Input
                      id="liquidityAmount"
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder={`Enter amount in ${chainId ? getNetworkCurrency(chainId) : 'ETH'}`}
                      value={approvalDetails.liquidityAmount}
                      onChange={(e) => setApprovalDetails(prev => ({
                        ...prev,
                        liquidityAmount: e.target.value
                      }))}
                      className="h-7 text-sm bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                  {TOKEN_VERSION_FEATURES[selectedToken?.factoryVersion || 'v1'].hasTradingControl && (
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <Label htmlFor="tradingStartTime" className="text-xs text-gray-400">Start Time</Label>
                        <InfoTooltip content={TOOLTIP_CONTENT.tradingStart} />
                      </div>
                      <Input
                        id="tradingStartTime"
                        type="datetime-local"
                        value={new Date(approvalDetails.tradingStartTime).toISOString().slice(0, 16)}
                        onChange={(e) => setApprovalDetails(prev => ({
                          ...prev,
                          tradingStartTime: new Date(e.target.value).getTime()
                        }))}
                        className="h-7 text-sm bg-gray-800 border-gray-700 text-white"
                        min={new Date().toISOString().slice(0, 16)}
                      />
                    </div>
                  )}
                </div>
              </div>

              {selectedToken && (TOKEN_VERSION_FEATURES[selectedToken.factoryVersion].hasMaxTransaction || 
                                TOKEN_VERSION_FEATURES[selectedToken.factoryVersion].hasMaxWallet) && (
                <div className="p-2 bg-gray-900 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-sm font-medium text-white">Limits</h4>
                    <InfoTooltip content="Set maximum transaction and wallet limits" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {TOKEN_VERSION_FEATURES[selectedToken.factoryVersion].hasMaxTransaction && (
                      <div>
                        <div className="flex items-center gap-1 mb-1">
                          <Label htmlFor="maxTransactionAmount" className="text-xs text-gray-400">Max Tx (%)</Label>
                          <InfoTooltip content={TOOLTIP_CONTENT.maxTransaction} />
                        </div>
                        <Input
                          id="maxTransactionAmount"
                          type="number"
                          min="0.1"
                          max="100"
                          value={approvalDetails.maxTransactionAmount}
                          onChange={(e) => setApprovalDetails(prev => ({
                            ...prev,
                            maxTransactionAmount: e.target.value
                          }))}
                          className="h-7 text-sm bg-gray-800 border-gray-700 text-white"
                        />
                      </div>
                    )}
                    {TOKEN_VERSION_FEATURES[selectedToken.factoryVersion].hasMaxWallet && (
                      <div>
                        <div className="flex items-center gap-1 mb-1">
                          <Label htmlFor="maxWalletAmount" className="text-xs text-gray-400">Max Wallet (%)</Label>
                          <InfoTooltip content={TOOLTIP_CONTENT.maxWallet} />
                        </div>
                        <Input
                          id="maxWalletAmount"
                          type="number"
                          min="0.1"
                          max="100"
                          value={approvalDetails.maxWalletAmount}
                          onChange={(e) => setApprovalDetails(prev => ({
                            ...prev,
                            maxWalletAmount: e.target.value
                          }))}
                          className="h-7 text-sm bg-gray-800 border-gray-700 text-white"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedToken && (TOKEN_VERSION_FEATURES[selectedToken.factoryVersion].hasAntiBot || 
                                TOKEN_VERSION_FEATURES[selectedToken.factoryVersion].hasBlacklist) && (
                <div className="p-2 bg-gray-900 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-sm font-medium text-white">Protection</h4>
                    <InfoTooltip content="Enable protection features for your token" />
                  </div>
                  <div className="flex gap-4">
                    {TOKEN_VERSION_FEATURES[selectedToken.factoryVersion].hasAntiBot && (
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={approvalDetails.antiBot}
                            onChange={(e) => setApprovalDetails(prev => ({
                              ...prev,
                              antiBot: e.target.checked
                            }))}
                            className="w-3.5 h-3.5 rounded border-gray-700 bg-gray-800"
                          />
                          <span className="text-xs text-white">Anti-Bot</span>
                        </label>
                        <InfoTooltip content={TOOLTIP_CONTENT.antiBot} />
                      </div>
                    )}
                    {TOKEN_VERSION_FEATURES[selectedToken.factoryVersion].hasBlacklist && (
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={approvalDetails.blacklist}
                            onChange={(e) => setApprovalDetails(prev => ({
                              ...prev,
                              blacklist: e.target.checked
                            }))}
                            className="w-3.5 h-3.5 rounded border-gray-700 bg-gray-800"
                          />
                          <span className="text-xs text-white">Blacklist</span>
                        </label>
                        <InfoTooltip content={TOOLTIP_CONTENT.blacklist} />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedToken && selectedToken.factoryVersion === 'v3' && tokenDistribution && (
                <div className="p-2 bg-gray-900 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-sm font-medium text-white">Token Distribution</h4>
                    <InfoTooltip content="Predefined token allocations and vesting schedules" />
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Liquidity Allocation:</span>
                      <span className="text-white">{Number(tokenDistribution.liquidityAllocation).toLocaleString()} {selectedToken.symbol}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Marketing Allocation:</span>
                      <span className="text-white">{Number(tokenDistribution.marketingAllocation).toLocaleString()} {selectedToken.symbol}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Development Allocation:</span>
                      <span className="text-white">{Number(tokenDistribution.developmentAllocation).toLocaleString()} {selectedToken.symbol}</span>
                    </div>
                    {tokenDistribution.beneficiaryAllocations.length > 0 && (
                      <div className="mt-4 border-t border-gray-800 pt-3">
                        <h5 className="text-sm font-medium text-white mb-2">Beneficiary Allocations</h5>
                        <div className="space-y-3">
                          {tokenDistribution.beneficiaryAllocations.map((allocation, index) => (
                            <div key={index} className="bg-gray-800 p-2 rounded">
                              <div className="grid gap-1">
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Address:</span>
                                  <span className="text-white font-mono text-xs">{allocation.beneficiary}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Amount:</span>
                                  <span className="text-white">{Number(allocation.amount).toLocaleString()} {selectedToken.symbol}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Vesting Start:</span>
                                  <span className="text-white">{new Date(allocation.vestingStartTime * 1000).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Duration:</span>
                                  <span className="text-white">{Math.floor(allocation.vestingDuration / 86400)} days</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Status:</span>
                                  <span className="text-white">
                                    {allocation.isRevoked ? 'Revoked' : 'Active'}
                                    {allocation.isRevocable && !allocation.isRevoked && ' (Revocable)'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {tokenPreview && selectedToken && tokenPreview.tokenDistribution && (
                <div className="col-span-2">
                  <p className="text-gray-400 mb-2">Token Distribution:</p>
                  <div className="grid grid-cols-2 gap-4 bg-gray-800 p-3 rounded-lg">
                    <div>
                      <p className="text-gray-400">Presale Allocation:</p>
                      <p className="text-white font-medium">
                        {Number(tokenPreview.tokenDistribution.presaleTokens).toLocaleString()} {selectedToken.symbol} ({tokenPreview.tokenDistribution.presalePercentage}%)
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400">Liquidity Allocation:</p>
                      <p className="text-white font-medium">
                        {Number(tokenPreview.tokenDistribution.liquidityTokens).toLocaleString()} {selectedToken.symbol} ({tokenPreview.tokenDistribution.liquidityPercentage}%)
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400">Platform Allocation:</p>
                      <p className="text-white font-medium">
                        {Number(tokenPreview.tokenDistribution.platformTokens).toLocaleString()} {selectedToken.symbol}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {tokenPreview && selectedToken && tokenPreview.presaleInfo && !tokenPreview.presaleInfo.finalized && (
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg mb-4">
                  <p className="text-yellow-500 text-sm">
                    This token is currently in presale stage. You must wait for the presale to be finalized before listing on DEX.
                    The liquidity allocation is {tokenPreview.tokenDistribution?.liquidityPercentage}% of total supply.
                  </p>
                </div>
              )}

              {approvalDetails.approved ? (
                <div className="space-y-2">
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white h-8 text-xs font-medium"
                    onClick={() => setActiveTab('deploy')}
                    disabled={isLoading}
                  >
                    Continue to Deployment
                  </Button>
                  <Button
                    className="w-full bg-red-600 hover:bg-red-700 text-white h-8 text-xs font-medium"
                    onClick={resetApproval}
                    disabled={isLoading}
                  >
                    Reset Token Approval
                  </Button>
                </div>
              ) : (
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white h-8 text-xs font-medium"
                  onClick={approveToken}
                  disabled={!approvalDetails.liquidityAmount || isLoading || (tokenPreview?.presaleInfo && !tokenPreview.presaleInfo.finalized)}
                >
                  {isLoading ? <Spinner className="h-3 w-3" /> : 
                   tokenPreview?.presaleInfo && !tokenPreview.presaleInfo.finalized ? 
                   'Cannot List - Presale Active' : 
                   'Approve Token for Listing'}
                </Button>
              )}
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
                    <SelectTrigger className="bg-gray-900 text-white border-gray-700">
                      <SelectValue placeholder="Select a DEX" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-700">
                      <SelectItem value="pancakeswap" className="text-white hover:bg-gray-800">PancakeSwap</SelectItem>
                      <SelectItem value="uniswap" className="text-white hover:bg-gray-800">Uniswap</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="p-4 bg-gray-900 rounded-lg space-y-4">
                  <h4 className="text-sm font-medium text-white mb-2">Liquidity and Price Settings</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="initialLiquidity" className="text-text-primary">
                        Initial Liquidity ({chainId ? getNetworkCurrency(chainId) : 'ETH'})
                      </Label>
                      <Input
                        id="initialLiquidity"
                        type="number"
                        min="0.1"
                        step="0.01"
                        placeholder={`Min. 0.1 ${chainId ? getNetworkCurrency(chainId) : 'ETH'}`}
                        value={dexDetails.initialLiquidityInETH}
                        onChange={(e) => {
                          setDexDetails(prev => ({
                            ...prev,
                            initialLiquidityInETH: e.target.value
                          }));
                        }}
                        className="bg-gray-800 text-text-primary border-gray-700"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="listingPrice" className="text-text-primary">
                        Token Price ({chainId ? getNetworkCurrency(chainId) : 'ETH'})
                      </Label>
                      <Input
                        id="listingPrice"
                        type="number"
                        min="0.000000001"
                        step="0.000000001"
                        placeholder="Enter price per token"
                        value={dexDetails.listingPriceInETH}
                        onChange={(e) => {
                          const tokenPrice = Number(e.target.value);
                          const tokenAmount = selectedToken ? Number(selectedToken.totalSupply) * 0.4 : 0;
                          const ethUsdPrice = 3000; // You can replace this with real ETH price
                          const usdPrice = (tokenPrice * ethUsdPrice).toFixed(6);
                          
                          setDexDetails(prev => ({
                            ...prev,
                            listingPriceInETH: e.target.value,
                            tokenAmount: tokenAmount.toString(),
                            usdPrice: usdPrice
                          }));
                        }}
                        className="bg-gray-800 text-text-primary border-gray-700"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-text-primary">Price per Token</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-2 bg-gray-800 rounded border border-gray-700">
                          <div className="text-xs text-gray-400">{chainId ? getNetworkCurrency(chainId) : 'ETH'}</div>
                          <div className="text-sm text-white">
                            {dexDetails.listingPriceInETH || '0.00000000'}
                          </div>
                        </div>
                        <div className="p-2 bg-gray-800 rounded border border-gray-700">
                          <div className="text-xs text-gray-400">USD</div>
                          <div className="text-sm text-white">
                            ${dexDetails.usdPrice || '0.000000'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {selectedToken && (
                    <div className="mt-4 p-3 bg-gray-800 rounded-lg">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-400">Tokens for Liquidity:</span>
                          <span className="text-white ml-2">
                            {Number(selectedToken.totalSupply) * 0.4} {selectedToken.symbol}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400">Required {chainId ? getNetworkCurrency(chainId) : 'ETH'}:</span>
                          <span className="text-white ml-2">
                            {dexDetails.initialLiquidityInETH || '0'} {chainId ? getNetworkCurrency(chainId) : 'ETH'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {Number(dexDetails.initialLiquidityInETH) < 0.1 && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-red-500 text-sm">
                      Minimum liquidity required is 0.1 {chainId ? getNetworkCurrency(chainId) : 'ETH'}
                    </p>
                  </div>
                )}
              </div>

              <Button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                onClick={deployToDEX}
                disabled={!dexDetails.dex || !dexDetails.initialLiquidityInETH || Number(dexDetails.initialLiquidityInETH) < 0.1 || isLoading}
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

// Keep only this export at the end of the file
export default TokenListingProcess; 

// Add these helper functions at the top with other utility functions
const getExplorerUrl = (chainId: number): string => {
  switch (chainId) {
    case 97:
      return 'https://testnet.bscscan.com';
    case 11155111:
      return 'https://sepolia.etherscan.io';
    default:
      return '';
  }
};

const getDexUrl = (chainId: number): string => {
  switch (chainId) {
    case 97:
      return 'https://pancake.kiemtienonline360.com/#';
    case 11155111:
      return 'https://app.uniswap.org/#';
    default:
      return '';
  }
};