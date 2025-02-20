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
import { CopyIcon } from "lucide-react";
import { Switch } from '@/components/ui/switch';

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

// Update the ERC20_ABI to include approve and allowance functions
const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function owner() view returns (address)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)"
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

// Update the TOKEN_V3_ABI to include the correct presale info structure
const TOKEN_V3_ABI = [
  // Basic ERC20
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function owner() view returns (address)",
  "function burn(uint256 amount) external",
  // V3 Specific functions
  "function liquidityAllocation() view returns (uint256)",
  "function marketingAllocation() view returns (uint256)",
  "function developmentAllocation() view returns (uint256)",
  "function getBeneficiaryAllocations() view returns (tuple(address beneficiary, uint256 amount, uint256 startTime, uint256 duration, bool revocable, bool revoked)[])",
  "function getTokenDistribution() view returns (tuple(uint256 liquidityAmount, uint256 marketingAmount, uint256 developmentAmount))",
  "function getVestingInfo(address) view returns (tuple(uint256 released))",
  "function getLiquidityInfo() view returns (tuple(uint256 amount, uint256 lockDuration))",
  "function finalizePresale() external",
  "function cancelPresale() external",
  "function withdrawTokens() external",
  "function presaleInfo() view returns (tuple(uint256 softCap, uint256 hardCap, uint256 minContribution, uint256 maxContribution, uint256 startTime, uint256 endTime, uint256 presaleRate, bool whitelistEnabled, bool finalized, uint256 totalContributed))",
  "function totalPresaleTokensDistributed() view returns (uint256)",
  "function vestingSchedules(address) view returns (tuple(uint256 totalAmount, uint256 startTime, uint256 cliffDuration, uint256 vestingDuration, uint256 releasedAmount, bool revocable, bool revoked))"
];

// Add this interface for V3 token distribution
interface V3TokenDistribution {
  liquidityAllocation: string;
  marketingAllocation: string;
  developmentAllocation: string;
  beneficiaryAllocations: Array<{
    beneficiary: string;
    amount: string;
    vestingStartTime: number;
    vestingDuration: number;
    isRevocable: boolean;
    isRevoked: boolean;
    released: string;
  }>;
  ownerVesting?: {
    totalAmount: string;
    startTime: number;
    cliffDuration: number;
    vestingDuration: number;
    releasedAmount: string;
    revocable: boolean;
    revoked: boolean;
  };
}

// Update TokenPreview interface
interface TokenPreview {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  maxSupply: string;
  owner: string;
  factoryVersion: string;
  isListed?: boolean;
  address?: string;
  pairAddress?: string;
  paused?: boolean;
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
    totalPresaleTokens: string;
    contributorCount: string;
    contributors: Array<{
      address: string;
      contribution: string;
      tokens: string;
    }>;
  };
  v3Distribution?: V3TokenDistribution;
  liquidityInfo?: {
    amount: string;
    lockDuration: number;
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

// Add this helper function near the top with other utility functions
const handleContractError = (error: any): string => {
  if (!error) return "Unknown error occurred";
  
  // Handle ethers contract errors
  if (error.code === 'CALL_EXCEPTION') {
    const revertReason = error.revert?.args?.[0] || error.reason || error.message;
    return revertReason;
  }
  
  // Handle MetaMask errors
  if (error.code === -32000) {
    return error.message.includes("execution reverted:") 
      ? error.message.split("execution reverted:")[1].trim()
      : error.message;
  }
  
  return error.message || "Unknown error occurred";
};

function TokenListingProcess() {
  const { address: userAddress, isConnected } = useAccount();
  const { chainId } = useNetwork();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('select');
  const [isLoading, setIsLoading] = useState(false);
  const [userTokens, setUserTokens] = useState<TokenInfo[]>([]);
  const [selectedToken, setSelectedToken] = useState<TokenInfo | null>(null);
  const [manualTokenAddress, setManualTokenAddress] = useState('');
  
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

      if (!v1Address || !v2Address || !v3Address) {
        toast({
          title: "Configuration Error",
          description: "Factory addresses not configured for this network.",
          variant: "destructive",
        });
        return;
      }

      // Create factory contracts with error handling
      const getTokensWithErrorHandling = async (factory: Contract, userAddr: string, version: string) => {
        try {
          // Try getUserCreatedTokens first
          try {
            const tokens = await factory.getUserCreatedTokens(userAddr);
            return tokens;
          } catch (error) {
            console.log(`${version} getUserCreatedTokens failed:`, handleContractError(error));
          }

          // Try getTokensByUser as fallback
          try {
            const tokens = await factory.getTokensByUser(userAddr);
            return tokens;
          } catch (error) {
            console.log(`${version} getTokensByUser failed:`, handleContractError(error));
          }

          // Try getDeployedTokens as last resort
          const tokens = await factory.getDeployedTokens();
          return tokens;
        } catch (error) {
          console.error(`Error getting tokens for ${version}:`, handleContractError(error));
          return [];
        }
      };

      // Get tokens from each factory with improved error handling
      const [v1Tokens, v2Tokens, v3Tokens] = await Promise.all([
        getTokensWithErrorHandling(new Contract(v1Address, [
          'function getTokensByUser(address) view returns (address[])',
          'function getUserCreatedTokens(address) view returns (address[])',
          'function getDeployedTokens() view returns (address[])'
        ], provider), userAddress, 'V1'),
        getTokensWithErrorHandling(new Contract(v2Address, [
          'function getTokensByUser(address) view returns (address[])',
          'function getUserCreatedTokens(address) view returns (address[])',
          'function getDeployedTokens() view returns (address[])'
        ], provider), userAddress, 'V2'),
        getTokensWithErrorHandling(new Contract(v3Address, [
          'function getTokensByUser(address) view returns (address[])',
          'function getUserCreatedTokens(address) view returns (address[])',
          'function getDeployedTokens() view returns (address[])'
        ], provider), userAddress, 'V3')
      ]);

      // Function to get token details with error handling
      const getTokenDetails = async (address: string, version: "v1" | "v2" | "v3") => {
        try {
          const tokenContract = new Contract(address, ERC20_ABI, provider);
          const [name, symbol, totalSupply] = await Promise.all([
            tokenContract.name().catch(() => 'Unknown'),
            tokenContract.symbol().catch(() => 'Unknown'),
            tokenContract.totalSupply().catch(() => BigInt(0))
          ]);

          return {
            address,
            name,
            symbol,
            totalSupply: formatEther(totalSupply),
            factoryVersion: version
          };
        } catch (error) {
          console.error(`Error getting details for token ${address}:`, handleContractError(error));
          return null;
        }
      };

      const tokenDetailsPromises = [
        ...v1Tokens.map((addr: string) => getTokenDetails(addr, "v1")),
        ...v2Tokens.map((addr: string) => getTokenDetails(addr, "v2")),
        ...v3Tokens.map((addr: string) => getTokenDetails(addr, "v3"))
      ];

      const tokens = (await Promise.all(tokenDetailsPromises)).filter(token => token !== null);
      setUserTokens(tokens);

    } catch (error) {
      console.error('Error loading user tokens:', handleContractError(error));
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
        const [distribution, beneficiaryAllocs] = await Promise.all([
          tokenContract.getTokenDistribution().catch(() => ({ 
            liquidityAmount: BigInt(0), 
            marketingAmount: BigInt(0), 
            developmentAmount: BigInt(0) 
          })),
          tokenContract.getBeneficiaryAllocations().catch(() => [])
        ]);

        const tokenDist: TokenDistribution = {
          liquidityAllocation: formatEther(distribution.liquidityAmount),
          marketingAllocation: formatEther(distribution.marketingAmount),
          developmentAllocation: formatEther(distribution.developmentAmount),
          beneficiaryAllocations: beneficiaryAllocs.map((b: any) => ({
            beneficiary: b.beneficiary,
            amount: formatEther(b.amount),
            vestingStartTime: Number(b.startTime),
            vestingDuration: Number(b.duration),
            isRevocable: b.revocable,
            isRevoked: b.revoked
          }))
        };

        // Update UI to show allocations
        setTokenDistribution(tokenDist);
        
        // If there's a predefined liquidity allocation, use it
        if (tokenDist.liquidityAllocation !== '0') {
          setApprovalDetails(prev => ({
            ...prev,
            liquidityAmount: tokenDist.liquidityAllocation
          }));
        }

        console.log('Token distribution loaded:', tokenDist);
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
      
      // Create token contract instance with the full ABI
      const tokenContract = new Contract(
        selectedToken.address,
        ERC20_ABI,
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

  // Update loadTokenPreview function
  const loadTokenPreview = async () => {
    if (!selectedToken?.address) {
      toast({
        title: "Error",
        description: "No token address provided",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoadingPreview(true);
      const provider = new BrowserProvider(window.ethereum);

      // Enhanced V3 ABI with additional functions from check-distribution.ts
      const TOKEN_V3_ABI = [
        // Basic ERC20 functions
        "function name() view returns (string)",
        "function symbol() view returns (string)",
        "function decimals() view returns (uint8)",
        "function totalSupply() view returns (uint256)",
        "function owner() view returns (address)",
        // V3 specific functions
        "function presaleInfo() view returns (tuple(uint256 softCap, uint256 hardCap, uint256 minContribution, uint256 maxContribution, uint256 startTime, uint256 endTime, uint256 presaleRate, bool whitelistEnabled, bool finalized, uint256 totalContributed))",
        "function getContributors() view returns (address[])",
        "function getContributorCount() view returns (uint256)",
        "function presaleContributorTokens(address) view returns (uint256)",
        "function contributions(address) view returns (uint256)",
        "function vestingSchedules(address) view returns (tuple(uint256 totalAmount, uint256 startTime, uint256 cliffDuration, uint256 vestingDuration, uint256 releasedAmount, bool revocable, bool revoked))",
        "function hasVestingSchedule(address) view returns (bool)",
        "function maxSupply() view returns (uint256)",
        "function totalPresaleTokensDistributed() view returns (uint256)",
        "function paused() view returns (bool)",
        "function isListed() view returns (bool)",
        "function getTokenDistribution() view returns (tuple(uint256 liquidityAmount, uint256 marketingAmount, uint256 developmentAmount))",
        "function getBeneficiaryAllocations() view returns (tuple(address beneficiary, uint256 amount, uint256 startTime, uint256 duration, bool revocable, bool revoked)[])",
        "function getVestingInfo(address) view returns (tuple(uint256 released))",
        "function getLiquidityInfo() view returns (tuple(uint256 amount, uint256 lockDuration))",
        "function finalizePresale() external"
      ];

      if (selectedToken.factoryVersion === 'v3') {
        // Use V3 specific contract
        const tokenContract = new Contract(selectedToken.address, TOKEN_V3_ABI, provider);
        
        // Get all token information in parallel
        const [
          name,
          symbol,
          decimals,
          totalSupply,
          owner,
          maxSupply,
          paused,
          presaleInfo,
          contributors,
          contributorCount,
          totalPresaleTokens,
          distribution,
          beneficiaryAllocs,
          isListed
        ] = await Promise.all([
          tokenContract.name(),
          tokenContract.symbol(),
          tokenContract.decimals(),
          tokenContract.totalSupply(),
          tokenContract.owner(),
          tokenContract.maxSupply(),
          tokenContract.paused(),
          tokenContract.presaleInfo().catch(() => null),
          tokenContract.getContributors().catch(() => []),
          tokenContract.getContributorCount().catch(() => 0),
          tokenContract.totalPresaleTokensDistributed().catch(() => 0),
          tokenContract.getTokenDistribution().catch(() => ({ liquidityAmount: BigInt(0), marketingAmount: BigInt(0), developmentAmount: BigInt(0) })),
          tokenContract.getBeneficiaryAllocations().catch(() => []),
          tokenContract.isListed().catch(() => false)
        ]);

        // Get vesting info for owner
        let ownerVestingInfo = null;
        try {
          const hasVesting = await tokenContract.hasVestingSchedule(owner);
          if (hasVesting) {
            ownerVestingInfo = await tokenContract.vestingSchedules(owner);
          }
        } catch (error) {
          console.log('No owner vesting info available');
        }

        // Format beneficiary allocations with vesting info
        const beneficiaryDetails = await Promise.all(
          beneficiaryAllocs.map(async (b: any) => {
            const vestingInfo = await tokenContract.getVestingInfo(b.beneficiary).catch(() => null);
            return {
              beneficiary: b.beneficiary,
              amount: formatEther(b.amount),
              vestingStartTime: Number(b.startTime),
              vestingDuration: Number(b.duration),
              isRevocable: b.revocable,
              isRevoked: b.revoked,
              released: vestingInfo ? formatEther(vestingInfo.released) : '0'
            };
          })
        );

        // Get contributor details
        const contributorDetails = await Promise.all(
          contributors.map(async (contributor: string) => {
            const [contribution, tokens] = await Promise.all([
              tokenContract.contributions(contributor),
              tokenContract.presaleContributorTokens(contributor)
            ]);
            return {
              address: contributor,
              contribution: formatEther(contribution),
              tokens: formatEther(tokens)
            };
          })
        );

        const tokenInfo: TokenPreview = {
          name,
          symbol,
          decimals,
          totalSupply: formatEther(totalSupply),
          maxSupply: formatEther(maxSupply),
          owner,
          factoryVersion: 'v3',
          address: selectedToken.address,
          isListed,
          paused,
          presaleInfo: presaleInfo ? {
            softCap: formatEther(presaleInfo.softCap),
            hardCap: formatEther(presaleInfo.hardCap),
            minContribution: formatEther(presaleInfo.minContribution),
            maxContribution: formatEther(presaleInfo.maxContribution),
            presaleRate: presaleInfo.presaleRate.toString(),
            startTime: Number(presaleInfo.startTime),
            endTime: Number(presaleInfo.endTime),
            whitelistEnabled: presaleInfo.whitelistEnabled,
            finalized: presaleInfo.finalized,
            totalContributed: formatEther(presaleInfo.totalContributed),
            totalPresaleTokens: formatEther(totalPresaleTokens),
            contributorCount: contributorCount.toString(),
            contributors: contributorDetails
          } : undefined,
          v3Distribution: {
            liquidityAllocation: formatEther(distribution.liquidityAmount),
            marketingAllocation: formatEther(distribution.marketingAmount),
            developmentAllocation: formatEther(distribution.developmentAmount),
            beneficiaryAllocations: beneficiaryDetails,
            ownerVesting: ownerVestingInfo ? {
              totalAmount: formatEther(ownerVestingInfo.totalAmount),
              startTime: Number(ownerVestingInfo.startTime),
              cliffDuration: Number(ownerVestingInfo.cliffDuration),
              vestingDuration: Number(ownerVestingInfo.vestingDuration),
              releasedAmount: formatEther(ownerVestingInfo.releasedAmount),
              revocable: ownerVestingInfo.revocable,
              revoked: ownerVestingInfo.revoked
            } : undefined
          }
        };

        // Get liquidity info if available
        try {
          const liquidityInfo = await tokenContract.getLiquidityInfo();
          tokenInfo.liquidityInfo = {
            amount: formatEther(liquidityInfo.amount),
            lockDuration: Number(liquidityInfo.lockDuration)
          };
        } catch (error) {
          console.log('No liquidity info available');
        }

        setTokenPreview(tokenInfo);
      } else {
        // Use standard contract for v1/v2
        const tokenContract = new Contract(
          selectedToken.address,
          [
            "function name() view returns (string)",
            "function symbol() view returns (string)",
            "function decimals() view returns (uint8)",
            "function totalSupply() view returns (uint256)",
            "function owner() view returns (address)",
            "function maxSupply() view returns (uint256)",
            "function getTokenInfo() view returns (tuple(string name, string symbol, uint256 totalSupply, uint8 decimals, address owner, bool isListed))",
            "function getListingInfo() view returns (tuple(address router, address pair, uint256 listingTime, bool isListed))"
          ],
          provider
        );

        // Get basic token info
        const [name, symbol, decimals, totalSupply, owner] = await Promise.all([
          tokenContract.name(),
          tokenContract.symbol(),
          tokenContract.decimals(),
          tokenContract.totalSupply(),
          tokenContract.owner()
        ]);

        // Get maxSupply separately with fallback
        let maxSupply = totalSupply;
        try {
          maxSupply = await tokenContract.maxSupply();
        } catch {
          // No maxSupply function available, using totalSupply as fallback
        }

        const tokenInfo: TokenPreview = {
          name,
          symbol,
          decimals,
          totalSupply: formatEther(totalSupply),
          maxSupply: formatEther(maxSupply),
          owner,
          factoryVersion: selectedToken.factoryVersion,
          address: selectedToken.address,
          isListed: false
        };

        try {
          // Try to get additional listing info
          const listingInfo = await tokenContract.getListingInfo();
          if (listingInfo) {
            tokenInfo.isListed = listingInfo.isListed;
            tokenInfo.pairAddress = listingInfo.pair;
          }
        } catch (error) {
          console.log("No listing info available");
        }

        setTokenPreview(tokenInfo);
      }

      toast({
        title: "Success",
        description: "Token details refreshed successfully"
      });
    } catch (error) {
      console.error("Error loading token preview:", error);
      toast({
        title: "Error",
        description: "Failed to load token details. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // Update deployToDEX function to handle V3 tokens differently
  const deployToDEX = async () => {
    if (!selectedToken || !chainId) return;
    
    try {
      setIsLoading(true);
      const provider = getProvider();
      const signer = await provider.getSigner();
      
      // Validate initial liquidity amount with strict parsing
      const liquidityAmount = parseFloat(dexDetails.initialLiquidityInETH);
      if (isNaN(liquidityAmount) || liquidityAmount < 0.1) {
        toast({
          title: "Error",
          description: `Minimum liquidity required is 0.1 ${getNetworkCurrency(chainId)}`,
          variant: "destructive",
        });
        return;
      }

      // Convert to exact Wei value and store in ethAmount
      const ethAmount = parseEther(liquidityAmount.toString());
      console.log('Liquidity amount in ETH:', formatEther(ethAmount));
      
      // Get the DEX router address
      const dexRouter = getDexRouterAddress(chainId);
      console.log('Using DEX router:', dexRouter);
      
      let tokenContract;
      let tokenAmount;

      if (selectedToken.factoryVersion === 'v3') {
        // Use V3 specific contract
        tokenContract = new Contract(
          selectedToken.address,
          TOKEN_V3_ABI,
          signer
        );

        // Get liquidity info for V3 tokens
        const distribution = await tokenContract.getTokenDistribution();
        tokenAmount = distribution.liquidityAmount;
        console.log('V3 Token liquidity allocation:', formatEther(tokenAmount));
      } else {
        // Use standard contract for v1/v2
        tokenContract = new Contract(
          selectedToken.address,
          [...ERC20_ABI, ...TOKEN_APPROVAL_ABI],
          signer
        );

        // Get total supply and calculate token amount (40% for v1/v2)
        const totalSupply = await tokenContract.totalSupply();
        tokenAmount = (totalSupply * BigInt(40)) / BigInt(100);
      }

      // Check token balance
      const userAddress = await signer.getAddress();
      const balance = await tokenContract.balanceOf(userAddress);
      console.log('User token balance:', formatEther(balance));
      console.log('Token amount for liquidity:', formatEther(tokenAmount));
      
      if (balance < tokenAmount) {
        toast({
          title: "Error",
          description: "Insufficient token balance for liquidity",
          variant: "destructive",
        });
        return;
      }

      // Use ethAmount from earlier validation
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
      
      // Check presale conditions before attempting to finalize
      const presaleInfo = await tokenContract.presaleInfo().catch(() => null);
      if (presaleInfo) {
        const currentTime = Math.floor(Date.now() / 1000);
        const totalContributed = formatEther(presaleInfo.totalContributed);
        const softCap = formatEther(presaleInfo.softCap);
        
        if (Number(totalContributed) < Number(softCap)) {
          toast({
            title: "Cannot Finalize Presale",
            description: `Soft cap not reached. Current: ${Number(totalContributed).toFixed(2)} ETH, Required: ${Number(softCap).toFixed(2)} ETH`,
            variant: "destructive",
          });
          return;
        }
        
        if (currentTime < Number(presaleInfo.endTime)) {
          toast({
            title: "Cannot Finalize Presale",
            description: `Presale is still active. Ends at ${new Date(Number(presaleInfo.endTime) * 1000).toLocaleString()}`,
            variant: "destructive",
          });
          return;
        }
      }
      
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
      let errorMessage = "Failed to finalize presale";
      
      if (error instanceof Error) {
        if (error.message.includes("Soft cap not reached")) {
          errorMessage = "Cannot finalize: Soft cap not reached";
        } else if (error.message.includes("Presale not ended")) {
          errorMessage = "Cannot finalize: Presale is still active";
        } else if (error.message.includes("Already finalized")) {
          errorMessage = "Presale has already been finalized";
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
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

  // Add this component for displaying token distribution
  const TokenDistributionInfo = ({ distribution }: { distribution: any }) => {
    if (!distribution) return null;

    const formatPercentage = (amount: string, totalSupply: string) => {
      const percentage = (Number(amount) / Number(totalSupply)) * 100;
      return percentage.toFixed(2) + '%';
    };

    return (
      <div className="mt-4 space-y-2">
        <h4 className="font-medium text-sm text-gray-300">Token Distribution</h4>
        <div className="bg-gray-800 rounded-md p-3 space-y-3">
          <div>
            <p className="text-sm text-gray-400">Liquidity Allocation:</p>
            <p className="text-sm">
              {Number(distribution.liquidityAllocation).toLocaleString()} tokens 
              ({formatPercentage(distribution.liquidityAllocation, tokenPreview?.totalSupply || '0')})
            </p>
          </div>

          {Number(distribution.marketingAllocation) > 0 && (
            <div>
              <p className="text-sm text-gray-400">Marketing Allocation:</p>
              <p className="text-sm">
                {Number(distribution.marketingAllocation).toLocaleString()} tokens
                ({formatPercentage(distribution.marketingAllocation, tokenPreview?.totalSupply || '0')})
              </p>
            </div>
          )}

          {Number(distribution.developmentAllocation) > 0 && (
            <div>
              <p className="text-sm text-gray-400">Development Allocation:</p>
              <p className="text-sm">
                {Number(distribution.developmentAllocation).toLocaleString()} tokens
                ({formatPercentage(distribution.developmentAllocation, tokenPreview?.totalSupply || '0')})
              </p>
            </div>
          )}
          
          {distribution.beneficiaryAllocations?.length > 0 && (
            <div>
              <p className="text-sm text-gray-400 mb-2">Beneficiary Allocations:</p>
              <div className="space-y-2">
                {distribution.beneficiaryAllocations.map((allocation: any, index: number) => (
                  <div key={index} className="text-sm bg-gray-700/50 p-2 rounded">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Address:</span>
                      <span className="text-xs">{allocation.beneficiary}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Amount:</span>
                      <span>
                        {Number(allocation.amount).toLocaleString()} tokens
                        ({formatPercentage(allocation.amount, tokenPreview?.totalSupply || '0')})
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Vesting Duration:</span>
                      <span className="text-xs">{secondsToDays(allocation.vestingDuration)} days</span>
                    </div>
                    {allocation.released && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Released:</span>
                        <span>{Number(allocation.released).toLocaleString()} tokens</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Add helper function for converting seconds to days
  const secondsToDays = (seconds: number): number => {
    return Math.floor(seconds / (60 * 60 * 24));
  };

  // Add this helper function near the top with other utility functions
  const formatTimeDisplay = (seconds: number): string => {
    const days = Math.floor(seconds / (24 * 60 * 60));
    return `${days} days`;
  };

  // Update the handleBurnUnsoldTokens function
  const handleBurnUnsoldTokens = async (tokenAddress: string) => {
    if (!tokenAddress || !chainId) return;
    
    try {
      setIsLoading(true);
      const provider = getProvider();
      const signer = await provider.getSigner();
      
      // Verify contract exists
      const code = await provider.getCode(tokenAddress);
      if (code === '0x') {
        throw new Error('Invalid contract address');
      }
      
      const tokenContract = new Contract(tokenAddress, TOKEN_V3_ABI, signer);
      
      // Get presale info and check conditions
      const presaleInfo = await tokenContract.presaleInfo();
      const currentTime = Math.floor(Date.now() / 1000);
      
      if (currentTime <= Number(presaleInfo.endTime)) {
        toast({
          title: "Cannot Burn Tokens",
          description: "Presale has not ended yet",
          variant: "destructive",
        });
        return;
      }
      
      if (Number(formatEther(presaleInfo.totalContributed)) >= Number(formatEther(presaleInfo.softCap))) {
        toast({
          title: "Cannot Burn Tokens",
          description: "Soft cap was reached, tokens cannot be burned",
          variant: "destructive",
        });
        return;
      }
      
      // Get token balance of contract first
      const contractBalance = await tokenContract.balanceOf(tokenAddress);
      console.log('Contract balance:', formatEther(contractBalance));
      
      // Calculate unsold tokens more accurately
      const totalPresaleTokens = await tokenContract.totalPresaleTokensDistributed();
      const unsoldTokens = contractBalance;
      
      if (unsoldTokens <= BigInt(0)) {
        toast({
          title: "No Tokens to Burn",
          description: "There are no unsold tokens to burn",
          variant: "destructive",
        });
        return;
      }
      
      console.log('Attempting to burn:', formatEther(unsoldTokens), 'tokens');
      
      // Estimate gas with higher limit
      const gasEstimate = await tokenContract.burn.estimateGas(unsoldTokens, {
        gasLimit: 500000 // Higher initial estimate
      }).catch((error: any) => {
        console.error('Gas estimation failed:', error);
        return BigInt(500000); // Fallback gas limit
      });
      
      // Add 20% buffer to gas estimate
      const gasLimit = (gasEstimate * BigInt(120)) / BigInt(100);
      
      console.log('Estimated gas:', gasEstimate.toString(), 'Using gas limit:', gasLimit.toString());
      
      // Burn the unsold tokens
      const tx = await tokenContract.burn(unsoldTokens, {
        gasLimit
      });
      
      toast({
        title: "Burning Unsold Tokens",
        description: "Please wait for the transaction to be confirmed",
      });
      
      await tx.wait();
      
      toast({
        title: "Success",
        description: `Successfully burned ${formatEther(unsoldTokens)} unsold tokens`,
      });
      
      // Refresh token preview
      await loadTokenPreview();
    } catch (error) {
      console.error('Error burning unsold tokens:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to burn unsold tokens",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Update the handleCancelPresale function
  const handleCancelPresale = async (tokenAddress: string) => {
    if (!tokenAddress || !chainId) return;
    
    try {
      setIsLoading(true);
      const provider = getProvider();
      const signer = await provider.getSigner();
      
      // Verify contract exists
      const code = await provider.getCode(tokenAddress);
      if (code === '0x') {
        throw new Error('Invalid contract address');
      }
      
      const tokenContract = new Contract(tokenAddress, [
        ...TOKEN_V3_ABI,
        "function balanceOf(address) view returns (uint256)"
      ], signer);
      
      // Check if presale exists and can be cancelled
      const [presaleInfo, owner] = await Promise.all([
        tokenContract.presaleInfo(),
        tokenContract.owner()
      ]);

      // Verify caller is owner
      const signerAddress = await signer.getAddress();
      if (signerAddress.toLowerCase() !== owner.toLowerCase()) {
        throw new Error('Only owner can cancel presale');
      }

      const currentTime = Math.floor(Date.now() / 1000);
      
      // Check presale conditions
      if (presaleInfo.finalized) {
        throw new Error('Presale is already finalized');
      }

      if (Number(formatEther(presaleInfo.totalContributed)) >= Number(formatEther(presaleInfo.softCap))) {
        throw new Error('Soft cap was reached, presale cannot be cancelled');
      }

      // Get contract balance first
      const contractBalance = await tokenContract.balanceOf(tokenAddress);
      if (contractBalance <= BigInt(0)) {
        throw new Error('No tokens available to cancel');
      }

      // Prepare transaction with manual gas limit
      const tx = await tokenContract.cancelPresale({
        gasLimit: BigInt(500000) // Set fixed gas limit since estimation is failing
      });
      
      toast({
        title: "Cancelling Presale",
        description: "Please wait for the transaction to be confirmed",
      });
      
      const receipt = await tx.wait();
      
      if (!receipt || receipt.status === 0) {
        throw new Error('Transaction failed. Please check your wallet for details.');
      }

      // Try to withdraw tokens in a separate transaction
      try {
        const withdrawTx = await tokenContract.withdrawTokens({
          gasLimit: BigInt(300000)
        });
        
        await withdrawTx.wait();
        
        toast({
          title: "Success",
          description: "Presale cancelled and tokens withdrawn successfully",
        });
      } catch (withdrawError) {
        console.error('Failed to withdraw tokens:', withdrawError);
        toast({
          title: "Partial Success",
          description: "Presale cancelled but failed to withdraw tokens. Please try withdrawing tokens separately.",
          variant: "destructive",
        });
      }
      
      // Refresh token preview
      await loadTokenPreview();
    } catch (error) {
      console.error('Error cancelling presale:', error);
      
      let errorMessage = "Failed to cancel presale";
      if (error instanceof Error) {
        if (error.message.includes("Only owner")) {
          errorMessage = "Only the owner can cancel the presale";
        } else if (error.message.includes("already finalized")) {
          errorMessage = "Presale has already been finalized";
        } else if (error.message.includes("Soft cap")) {
          errorMessage = "Cannot cancel: Soft cap was reached";
        } else if (error.message.includes("No tokens")) {
          errorMessage = "No tokens available to cancel";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-background-secondary rounded-lg border border-border">
      <div className="p-6">
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
                      onClick={() => handleTokenSelect(token)}
                      className={`p-4 bg-gray-800 rounded-lg border ${
                        selectedToken?.address === token.address 
                          ? 'border-blue-500' 
                          : 'border-border hover:border-blue-500'
                      } transition-colors cursor-pointer`}
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
            <div className="space-y-6">
              {selectedToken && (
                <div className="p-4 bg-gray-900 rounded-lg">
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

              {/* Token Preview Section */}
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
                
                {tokenPreview && selectedToken ? (
                  <div className="space-y-4">
                    {/* Basic Token Info - Compact Grid */}
                    <div className="grid grid-cols-3 gap-3 bg-gray-800 p-3 rounded-lg">
                      <div>
                        <p className="text-xs text-gray-400">Name/Symbol</p>
                        <p className="text-sm text-white">{tokenPreview.name} ({tokenPreview.symbol})</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Supply</p>
                        <p className="text-sm text-white">{Number(tokenPreview.totalSupply).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Status</p>
                        <p className="text-sm text-white">{tokenPreview.paused ? 'Paused' : 'Active'}</p>
                      </div>
                    </div>

                    {/* Presale Info - Compact Display */}
                    {tokenPreview.presaleInfo && (
                      <div className="bg-gray-800 p-3 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="text-sm font-medium text-white">Presale Status</h4>
                          {tokenPreview?.presaleInfo && !tokenPreview.presaleInfo.finalized && (
                            <div className="flex gap-2">
                              <Button
                                onClick={() => handleFinalizePresale(tokenPreview.address!)}
                                className="bg-green-600 hover:bg-green-700 text-white h-7 text-xs px-3"
                                disabled={isLoading || (
                                  Number(tokenPreview.presaleInfo.totalContributed) < Number(tokenPreview.presaleInfo.softCap) && 
                                  Date.now() < tokenPreview.presaleInfo.endTime * 1000
                                )}
                                title={
                                  Number(tokenPreview.presaleInfo.totalContributed) < Number(tokenPreview.presaleInfo.softCap) && 
                                  Date.now() < tokenPreview.presaleInfo.endTime * 1000 
                                    ? "Cannot finalize - Soft cap not reached and presale still active" 
                                    : ""
                                }
                              >
                                {isLoading ? <Spinner className="h-3 w-3" /> : 'Finalize Presale'}
                              </Button>
                              {Date.now() > tokenPreview.presaleInfo.endTime * 1000 && 
                               Number(tokenPreview.presaleInfo.totalContributed) < Number(tokenPreview.presaleInfo.softCap) && (
                                <>
                                  <Button
                                    onClick={() => handleBurnUnsoldTokens(tokenPreview.address!)}
                                    className="bg-red-600 hover:bg-red-700 text-white h-7 text-xs px-3"
                                    disabled={isLoading}
                                  >
                                    {isLoading ? <Spinner className="h-3 w-3" /> : 'Burn Unsold Tokens'}
                                  </Button>
                                  <Button
                                    onClick={() => handleCancelPresale(tokenPreview.address!)}
                                    className="bg-yellow-600 hover:bg-yellow-700 text-white h-7 text-xs px-3"
                                    disabled={isLoading}
                                  >
                                    {isLoading ? <Spinner className="h-3 w-3" /> : 'Cancel & List Directly'}
                                  </Button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-xs text-gray-400">Progress</p>
                            <p className="text-white">{tokenPreview.presaleInfo.totalContributed}/{tokenPreview.presaleInfo.hardCap} ETH</p>
                            <p className="text-xs text-gray-400 mt-1">Soft Cap: {tokenPreview.presaleInfo.softCap} ETH</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Rate</p>
                            <p className="text-white">{tokenPreview.presaleInfo.presaleRate}/ETH</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm mt-3">
                          <div>
                            <p className="text-xs text-gray-400">Start Date</p>
                            <p className="text-white">{new Date(tokenPreview.presaleInfo.startTime * 1000).toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">End Date</p>
                            <p className="text-white">{new Date(tokenPreview.presaleInfo.endTime * 1000).toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="mt-2">
                          <p className="text-xs text-gray-400">Status</p>
                          <p className="text-white">
                            {tokenPreview.presaleInfo.finalized ? 'Finalized' : 
                             Date.now() > tokenPreview.presaleInfo.endTime * 1000 ? 'Ended (Not Finalized)' : 'Active'}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Distribution Info - Compact Display */}
                    {tokenPreview.v3Distribution && (
                      <div className="bg-gray-800 p-3 rounded-lg">
                        <h4 className="text-sm font-medium text-white mb-2">Token Distribution</h4>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-xs text-gray-400">Liquidity</p>
                            <p className="text-white">{Number(tokenPreview.v3Distribution.liquidityAllocation).toLocaleString()}</p>
                          </div>
                          {Number(tokenPreview.v3Distribution.marketingAllocation) > 0 && (
                            <div>
                              <p className="text-xs text-gray-400">Marketing</p>
                              <p className="text-white">{Number(tokenPreview.v3Distribution.marketingAllocation).toLocaleString()}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Vesting Info - Compact Display */}
                    {tokenPreview.v3Distribution?.ownerVesting && (
                      <div className="bg-gray-800 p-3 rounded-lg">
                        <h4 className="text-sm font-medium text-white mb-2">Vesting Schedule</h4>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-xs text-gray-400">Amount</p>
                            <p className="text-white">{Number(tokenPreview.v3Distribution.ownerVesting.totalAmount).toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Duration</p>
                            <p className="text-white">{secondsToDays(Number(tokenPreview.v3Distribution.ownerVesting.vestingDuration))} days</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Cliff Duration</p>
                            <p className="text-white">{secondsToDays(Number(tokenPreview.v3Distribution.ownerVesting.cliffDuration))} days</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Start Date</p>
                            <p className="text-white">{new Date(Number(tokenPreview.v3Distribution.ownerVesting.startTime) * 1000).toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-400">
                    Select a token to view details
                  </div>
                )}
              </div>

              {/* Approval Form */}
              <div className="space-y-6 p-4 bg-gray-900 rounded-lg">
                <h4 className="text-sm font-medium text-white">Listing Configuration</h4>

                {/* Fee Settings */}
                <div className="space-y-4">
                  <h5 className="text-sm text-gray-400">Fee Settings</h5>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-text-primary flex items-center gap-2">
                        Marketing Fee (%)
                        <InfoTooltip content={TOOLTIP_CONTENT.marketingFee} />
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        max="10"
                        value={approvalDetails.marketingFee}
                        onChange={(e) => setApprovalDetails(prev => ({ ...prev, marketingFee: e.target.value }))}
                        className="bg-gray-800 text-text-primary border-gray-700"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-text-primary flex items-center gap-2">
                        Development Fee (%)
                        <InfoTooltip content={TOOLTIP_CONTENT.developmentFee} />
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        max="10"
                        value={approvalDetails.developmentFee}
                        onChange={(e) => setApprovalDetails(prev => ({ ...prev, developmentFee: e.target.value }))}
                        className="bg-gray-800 text-text-primary border-gray-700"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-text-primary flex items-center gap-2">
                        Liquidity Fee (%)
                        <InfoTooltip content={TOOLTIP_CONTENT.liquidityFee} />
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        max="10"
                        value={approvalDetails.liquidityFee}
                        onChange={(e) => setApprovalDetails(prev => ({ ...prev, liquidityFee: e.target.value }))}
                        className="bg-gray-800 text-text-primary border-gray-700"
                      />
                    </div>
                  </div>
                </div>

                {/* Trading Controls */}
                <div className="space-y-4">
                  <h5 className="text-sm text-gray-400">Trading Controls</h5>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-text-primary flex items-center gap-2">
                        Max Transaction (%)
                        <InfoTooltip content={TOOLTIP_CONTENT.maxTransaction} />
                      </Label>
                      <Input
                        type="number"
                        min="0.1"
                        max="100"
                        value={approvalDetails.maxTransactionAmount}
                        onChange={(e) => setApprovalDetails(prev => ({ ...prev, maxTransactionAmount: e.target.value }))}
                        className="bg-gray-800 text-text-primary border-gray-700"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-text-primary flex items-center gap-2">
                        Max Wallet (%)
                        <InfoTooltip content={TOOLTIP_CONTENT.maxWallet} />
                      </Label>
                      <Input
                        type="number"
                        min="0.1"
                        max="100"
                        value={approvalDetails.maxWalletAmount}
                        onChange={(e) => setApprovalDetails(prev => ({ ...prev, maxWalletAmount: e.target.value }))}
                        className="bg-gray-800 text-text-primary border-gray-700"
                      />
                    </div>
                  </div>
                </div>

                {/* Wallet Settings */}
                <div className="space-y-4">
                  <h5 className="text-sm text-gray-400">Wallet Settings</h5>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-text-primary">Marketing Wallet</Label>
                      <Input
                        value={approvalDetails.marketingWallet}
                        onChange={(e) => setApprovalDetails(prev => ({ ...prev, marketingWallet: e.target.value }))}
                        className="bg-gray-800 text-text-primary border-gray-700"
                        placeholder="0x..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-text-primary">Development Wallet</Label>
                      <Input
                        value={approvalDetails.developmentWallet}
                        onChange={(e) => setApprovalDetails(prev => ({ ...prev, developmentWallet: e.target.value }))}
                        className="bg-gray-800 text-text-primary border-gray-700"
                        placeholder="0x..."
                      />
                    </div>
                  </div>
                </div>

                {/* Additional Controls */}
                <div className="space-y-4">
                  <h5 className="text-sm text-gray-400">Additional Controls</h5>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Label className="text-text-primary">Anti-Bot Protection</Label>
                        <InfoTooltip content={TOOLTIP_CONTENT.antiBot} />
                      </div>
                      <Switch
                        checked={approvalDetails.antiBot}
                        onCheckedChange={(checked) => setApprovalDetails(prev => ({ ...prev, antiBot: checked }))}
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Label className="text-text-primary">Blacklist</Label>
                        <InfoTooltip content={TOOLTIP_CONTENT.blacklist} />
                      </div>
                      <Switch
                        checked={approvalDetails.blacklist}
                        onCheckedChange={(checked) => setApprovalDetails(prev => ({ ...prev, blacklist: checked }))}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {approvalDetails.approved ? (
                <div className="space-y-2">
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => setActiveTab('deploy')}
                    disabled={isLoading}
                  >
                    Continue to Deployment
                  </Button>
                  <Button
                    className="w-full bg-red-600 hover:bg-red-700 text-white"
                    onClick={resetApproval}
                    disabled={isLoading}
                  >
                    Reset Token Approval
                  </Button>
                </div>
              ) : (
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={approveToken}
                  disabled={isLoading || (tokenPreview?.presaleInfo && !tokenPreview.presaleInfo.finalized)}
                >
                  {isLoading ? <Spinner /> : 
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

// Add seconds to days conversion utility
const secondsToDays = (seconds: number): number => {
  return Number((seconds / 86400).toFixed(2)); // Round to 2 decimal places
};