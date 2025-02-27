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
import Image from 'next/image';
import { ChainId } from '@/types/chain';

interface TokenDetails {
  address: string;
  name: string;
  symbol: string;
  totalSupply: string;
  factoryVersion: string;
  isVerified: boolean;
}

interface FeeSettings {
  enabled: boolean;
  marketingFee: string;
  developmentFee: string;
  liquidityFee: string;
}

interface TradingControls {
  enabled: boolean;
  maxTransactionAmount: string;
  maxWalletAmount: string;
  enableTrading: boolean;
  tradingStartTime: number;
  antiBot: boolean;
  blacklist: boolean;
}

interface ApprovalDetails {
  liquidityAmount: string;
  approved: boolean;
  fees: FeeSettings;
  tradingControls: TradingControls;
  marketingWallet?: string;
  developmentWallet?: string;
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
  "function allowance(address owner, address spender) view returns (uint256)",
  "function transfer(address,uint256) returns (bool)",
  "function transferFrom(address,address,uint256) returns (bool)"
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

// Update the TOKEN_V3_ABI to include the addLiquidity function
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
  "function vestingSchedules(address) view returns (tuple(uint256 totalAmount, uint256 startTime, uint256 cliffDuration, uint256 vestingDuration, uint256 releasedAmount, bool revocable, bool revoked))",
  // Add liquidity function
  "function addLiquidityToV2(address router, uint256 tokenAmount, uint256 minTokenAmount, uint256 minEthAmount, address to, uint256 deadline) external payable",
  "function addLiquidityToV3(address router, uint256 tokenAmount, uint256 minTokenAmount, uint256 minEthAmount, address to, uint256 deadline) external payable"
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
    case 80002: // Polygon Amoy
      return 'AMOY';
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
const handleContractError = (error: unknown): string => {
  if (error instanceof Error) {
    if (error.message.includes('execution reverted')) {
      return error.message;
    }
    if (error.message.includes('user rejected')) {
      return 'Transaction was rejected';
    }
    return error.message;
  }
  return 'Unknown error occurred';
};

// Add utility object at the top after imports
const utils = {
  secondsToDays: (seconds: number) => seconds / 86400,
  getExplorerUrl: (chainId: number): string => {
    switch (chainId) {
      case 97:
        return 'https://testnet.bscscan.com';
      case 11155111:
        return 'https://sepolia.etherscan.io';
      case 80002:
        return 'https://www.oklink.com/amoy';
      case 421614:
        return 'https://sepolia.arbiscan.io';
      case 11155420:
        return 'https://sepolia-optimism.etherscan.io';
      default:
        return '';
    }
  },
  getDexUrl: (chainId: number): string => {
    switch (chainId) {
      case 97:
        return 'https://pancake.kiemtienonline360.com/#';
      case 11155111:
        return 'https://app.uniswap.org/#';
      case 80002:
        return 'https://quickswap.exchange/#/swap?chain=polygon_amoy';
      default:
        return '';
    }
  }
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
    fees: {
      enabled: false,
    marketingFee: '2',
    developmentFee: '2',
      liquidityFee: '2'
    },
    tradingControls: {
      enabled: false,
    maxTransactionAmount: '2',
    maxWalletAmount: '5',
    enableTrading: true,
      tradingStartTime: Date.now() + 600000,
    antiBot: true,
      blacklist: true
    },
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
      showToast('error', "Connection Required", "Please connect your wallet first.");
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
        showToast('error', "Configuration Error", "Factory addresses not configured for this network.");
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
      const message = handleContractError(error);
      showToast('error', 'Error', message);
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
        showToast('error', "Warning", "Could not fetch token distribution information. The token may not be properly configured.");
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
      
      // For V3 tokens, we don't need approval
      if (selectedToken.factoryVersion === 'v3') {
        setApprovalDetails(prev => ({ ...prev, approved: true }));
        showToast('success', "Success", "V3 tokens don't require approval. You can proceed to deployment.");
        return;
      }
      
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
        showToast('error', "Error", "Failed to calculate approval amount");
        return;
      }
      
      // Check current allowance
      const currentAllowance = await tokenContract.allowance(await signer.getAddress(), dexRouter);
      console.log('Current allowance:', formatEther(currentAllowance));
      
      if (currentAllowance >= approvalAmount) {
        console.log('Already approved sufficient amount');
        showToast('info', "Already Approved", "Token already has sufficient approval");
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
      
      showToast('info', "Approval Pending", "Please confirm the transaction in your wallet");
      
      // Wait for transaction confirmation
      await tx.wait();
      
      showToast('success', "Success", "Token approved for listing");
      setApprovalDetails(prev => ({ ...prev, approved: true }));
      
    } catch (error) {
      console.error('Error approving token:', error);
      showToast('error', "Error", error instanceof Error ? error.message : "Failed to approve token. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to get DEX router address
  const getDexRouterAddress = (chainId: number): string => {
    const ROUTER_ADDRESSES: { [key: number]: string } = {
      [ChainId.SEPOLIA]: '0xC532a74256D3Db42D0Bf7a0400fEFDbad7694008',
      [ChainId.BSC_TESTNET]: '0xD99D1c33F9fC3444f8101754aBC46c52416550D1',
      [ChainId.OPTIMISM_SEPOLIA]: '0xC532a74256D3Db42D0Bf7a0400fEFDbad7694008'
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
      showToast('error', "Error", "No token address provided");
      return;
    }

    try {
      setIsLoadingPreview(true);
      const provider = getProvider();
      const signer = await provider.getSigner();
      let tokenContract: Contract;

      // Create contract instance with appropriate ABI based on version
      if (selectedToken.factoryVersion === 'v3') {
        tokenContract = new Contract(
          selectedToken.address,
          [
            ...ERC20_ABI,
            ...TOKEN_V3_ABI
          ],
          provider
        );

        // Get basic token info
        const [name, symbol, decimals, totalSupplyBigInt, owner] = await Promise.all([
          tokenContract.name(),
          tokenContract.symbol(),
          tokenContract.decimals(),
          tokenContract.totalSupply(),
          tokenContract.owner()
        ]);

        // For V3 tokens, we don't need maxSupply
        const maxSupplyBigInt = totalSupplyBigInt;

        // Get presale info
        const presaleInfo = await tokenContract.presaleInfo().catch(() => null);
        let formattedPresaleInfo: TokenPreview['presaleInfo'] = undefined;
        if (presaleInfo) {
          formattedPresaleInfo = {
            softCap: formatEther(presaleInfo.softCap),
            hardCap: formatEther(presaleInfo.hardCap),
            minContribution: formatEther(presaleInfo.minContribution),
            maxContribution: formatEther(presaleInfo.maxContribution),
            presaleRate: formatEther(presaleInfo.presaleRate),
            startTime: Number(presaleInfo.startTime),
            endTime: Number(presaleInfo.endTime),
            whitelistEnabled: Boolean(presaleInfo.whitelistEnabled),
            finalized: Boolean(presaleInfo.finalized),
            totalContributed: formatEther(presaleInfo.totalContributed),
            totalPresaleTokens: formatEther(await tokenContract.totalPresaleTokensDistributed().catch(() => BigInt(0))),
            contributorCount: '0',
            contributors: []
          };

          // For V3 tokens, if presale is finalized, automatically set approval to true
          if (presaleInfo.finalized) {
            setApprovalDetails(prev => ({ ...prev, approved: true }));
          }
        }

        // Get V3 distribution info
        let v3Distribution: V3TokenDistribution | undefined;
        try {
          const results = await Promise.all([
            tokenContract.liquidityAllocation().catch(() => BigInt(0)),
            tokenContract.marketingAllocation().catch(() => BigInt(0)),
            tokenContract.developmentAllocation().catch(() => BigInt(0)),
            tokenContract.getBeneficiaryAllocations().catch(() => [])
          ]);

          const [liquidityAlloc, marketingAlloc, developmentAlloc, beneficiaryAllocs] = results;

          v3Distribution = {
            liquidityAllocation: formatEther(liquidityAlloc),
            marketingAllocation: formatEther(marketingAlloc),
            developmentAllocation: formatEther(developmentAlloc),
            beneficiaryAllocations: await Promise.all(
              beneficiaryAllocs.map(async (b: any) => ({
              beneficiary: b.beneficiary,
              amount: formatEther(b.amount),
              vestingStartTime: Number(b.startTime),
              vestingDuration: Number(b.duration),
              isRevocable: b.revocable,
              isRevoked: b.revoked,
                released: formatEther(await tokenContract.getVestingInfo(b.beneficiary).catch(() => BigInt(0)))
              }))
            )
          };

          // Get owner vesting info if available
          const ownerVesting = await tokenContract.vestingSchedules(owner).catch(() => null);
          if (ownerVesting) {
            v3Distribution.ownerVesting = {
              totalAmount: formatEther(ownerVesting.totalAmount),
              startTime: Number(ownerVesting.startTime),
              cliffDuration: Number(ownerVesting.cliffDuration),
              vestingDuration: Number(ownerVesting.vestingDuration),
              releasedAmount: formatEther(ownerVesting.releasedAmount),
              revocable: ownerVesting.revocable,
              revoked: ownerVesting.revoked
            };
          }
        } catch (error) {
          console.error('Error getting V3 distribution:', error);
        }

        // Get liquidity info
        const liquidityInfo = await tokenContract.getLiquidityInfo().catch(() => null);

        setTokenPreview({
          name,
          symbol,
          decimals,
          totalSupply: formatEther(totalSupplyBigInt),
          maxSupply: formatEther(maxSupplyBigInt),
          owner,
          factoryVersion: selectedToken.factoryVersion,
          address: selectedToken.address,
          presaleInfo: formattedPresaleInfo,
          v3Distribution,
          liquidityInfo: liquidityInfo ? {
            amount: formatEther(liquidityInfo.amount),
            lockDuration: Number(liquidityInfo.lockDuration)
          } : undefined
        });

      } else {
        // Handle V1/V2 tokens
        tokenContract = new Contract(
          selectedToken.address,
          [
            ...ERC20_ABI,
            "function maxSupply() view returns (uint256)",
            "function getTokenInfo() view returns (tuple(string name, string symbol, uint256 totalSupply, uint8 decimals, address owner, bool isListed))",
            "function getListingInfo() view returns (tuple(address router, address pair, uint256 listingTime, bool isListed))"
          ],
          provider
        );

        // Get basic token info
        const [name, symbol, decimals, totalSupplyBigInt, owner] = await Promise.all([
          tokenContract.name(),
          tokenContract.symbol(),
          tokenContract.decimals(),
          tokenContract.totalSupply(),
          tokenContract.owner()
        ]);

        // For V1/V2 tokens, try to get maxSupply but fallback to totalSupply
        const maxSupplyBigInt = totalSupplyBigInt;

        // Try to get listing info
        let isListed = false;
        let pairAddress = undefined;
        try {
          const listingInfo = await tokenContract.getListingInfo();
          if (listingInfo) {
            isListed = listingInfo.isListed;
            pairAddress = listingInfo.pair;
          }
        } catch (error) {
          console.log("No listing info available");
        }

        setTokenPreview({
          name,
          symbol,
          decimals,
          totalSupply: formatEther(totalSupplyBigInt),
          maxSupply: formatEther(maxSupplyBigInt),
          owner,
          factoryVersion: selectedToken.factoryVersion,
          address: selectedToken.address,
          isListed,
          pairAddress
        });
      }

      showToast('success', "Success", "Token details refreshed successfully");

    } catch (error) {
      console.error("Error loading token preview:", error);
      showToast('error', "Error", "Failed to load token details. Please try again.");
    } finally {
      setIsLoadingPreview(false);
    }
  };

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
          showToast('error', "Cannot Finalize Presale", `Soft cap not reached. Current: ${Number(totalContributed).toFixed(2)} ETH, Required: ${Number(softCap).toFixed(2)} ETH`);
          return;
        }
        
        if (currentTime < Number(presaleInfo.endTime)) {
          showToast('error', "Cannot Finalize Presale", `Presale is still active. Ends at ${new Date(Number(presaleInfo.endTime) * 1000).toLocaleString()}`);
          return;
        }
      }
      
      const tx = await tokenContract.finalizePresale();
      
      showToast('info', "Finalizing Presale", "Please wait for the transaction to be confirmed");
      
      await tx.wait();
      
      showToast('success', "Success", "Presale has been finalized successfully");
      
      // Refresh token preview
      await loadTokenPreview();
    } catch (error) {
      const message = handleContractError(error);
      showToast('error', 'Error', message);
      if (error instanceof Error && error.message.includes('presale')) {
        showToast('error', 'Presale Error', error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

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
        showToast('error', "Cannot Burn Tokens", "Presale has not ended yet");
        return;
      }
      
      if (Number(formatEther(presaleInfo.totalContributed)) >= Number(formatEther(presaleInfo.softCap))) {
        showToast('error', "Cannot Burn Tokens", "Soft cap was reached, tokens cannot be burned");
        return;
      }
      
      // Get token balance of contract first
      const contractBalance = await tokenContract.balanceOf(tokenAddress);
      console.log('Contract balance:', formatEther(contractBalance));
      
      // Calculate unsold tokens more accurately
      const totalPresaleTokens = await tokenContract.totalPresaleTokensDistributed();
      const unsoldTokens = contractBalance;
      
      if (unsoldTokens <= BigInt(0)) {
        showToast('error', "No Tokens to Burn", "There are no unsold tokens to burn");
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
      
      showToast('info', "Burning Unsold Tokens", "Please wait for the transaction to be confirmed");
      
      await tx.wait();
      
      showToast('success', `Successfully burned ${formatEther(unsoldTokens)} unsold tokens`, "");
      
      // Refresh token preview
      await loadTokenPreview();
    } catch (error) {
      const message = handleContractError(error);
      showToast('error', 'Error', message);
      showToast('error', "Error", error instanceof Error ? error.message : "Failed to burn unsold tokens");
    } finally {
      setIsLoading(false);
    }
  };

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
      
      showToast('info', "Cancelling Presale", "Please wait for the transaction to be confirmed");
      
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
        
        showToast('success', "Success", "Presale cancelled and tokens withdrawn successfully");
      } catch (withdrawError) {
        console.error('Failed to withdraw tokens:', withdrawError);
        showToast('error', "Partial Success", "Presale cancelled but failed to withdraw tokens. Please try withdrawing tokens separately.");
      }
      
      // Refresh token preview
      await loadTokenPreview();
    } catch (error) {
      const message = handleContractError(error);
      showToast('error', 'Error', message);
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
      
      showToast('error', "Error", errorMessage);
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
      
      showToast('info', "Resetting Approval", "Please confirm the transaction in your wallet");
      
      await tx.wait();
      
      showToast('success', "Success", "Token approval has been reset");
      
      setApprovalDetails(prev => ({ ...prev, approved: false }));
    } catch (error) {
      console.error('Error resetting approval:', error);
      showToast('error', "Error", error instanceof Error ? error.message : "Failed to reset approval");
    } finally {
      setIsLoading(false);
    }
  };

  const deployToDEX = async () => {
    if (!selectedToken || !chainId) return;
    
    try {
      setIsLoading(true);
      const provider = getProvider();
      const signer = await provider.getSigner();
      let tokenContract: Contract;
      let deployTokenAmount: bigint;
      
      // Validate initial liquidity amount with strict parsing
      const liquidityAmount = parseFloat(dexDetails.initialLiquidityInETH);
      if (isNaN(liquidityAmount) || liquidityAmount < 0.1) {
        showToast('error', "Error", `Minimum liquidity required is 0.1 ${getNetworkCurrency(chainId)}`);
        return;
      }

      // Convert to exact Wei value
      const ethAmount = parseEther(liquidityAmount.toString());
      console.log('Liquidity amount in ETH:', formatEther(ethAmount));
      
      // Get the DEX router address
      const dexRouter = getDexRouterAddress(chainId);
      console.log('Using DEX router:', dexRouter);
      
      // Create token contract with both ERC20 and V3 ABIs
      tokenContract = new Contract(
        selectedToken.address,
        [
          ...ERC20_ABI,
          ...TOKEN_V3_ABI,
          "function liquidityAllocation() view returns (uint256)",
          "function addLiquidity(address router, uint256 tokenAmount, uint256 minTokenAmount, uint256 minEthAmount, address to, uint256 deadline) external payable",
          "function addLiquidityV2(address router, uint256 tokenAmount, uint256 minTokenAmount, uint256 minEthAmount, address to, uint256 deadline) external payable"
        ],
        signer
      );

      // Check if presale is finalized for V3 tokens
      if (selectedToken.factoryVersion === 'v3') {
        const presaleInfo = await tokenContract.presaleInfo();
        if (!presaleInfo.finalized) {
          throw new Error('Presale must be finalized before deploying to DEX');
        }
      }

      // Get user address
      const userAddress = await signer.getAddress();

      // Check BNB/ETH balance
      const bnbBalance = await provider.getBalance(userAddress);
      if (bnbBalance < ethAmount) {
        throw new Error(`Insufficient ${getNetworkCurrency(chainId)} balance for liquidity`);
      }

      // Get liquidity allocation based on token version
      console.log('Getting token allocation...');
      const totalSupply = await tokenContract.totalSupply();
      console.log('Total supply:', formatEther(totalSupply));
      
      if (selectedToken.factoryVersion === 'v3') {
        try {
          // For V3 tokens, use the predefined liquidity allocation
          const liquidityAlloc = await tokenContract.liquidityAllocation();
          console.log('V3 liquidity allocation:', formatEther(liquidityAlloc));
          
          if (liquidityAlloc > BigInt(0)) {
            deployTokenAmount = liquidityAlloc;
          } else {
            console.log('No predefined liquidity allocation, falling back to 40%');
            deployTokenAmount = (totalSupply * BigInt(40)) / BigInt(100);
          }
        } catch (error) {
          console.log('Error getting liquidity allocation:', error);
          console.log('Falling back to 40% allocation');
          deployTokenAmount = (totalSupply * BigInt(40)) / BigInt(100);
        }
      } else {
        // For V1/V2 tokens, use 40% of total supply
        deployTokenAmount = (totalSupply * BigInt(40)) / BigInt(100);
      }
      
      console.log('Token amount for liquidity:', formatEther(deployTokenAmount));

      // Set deadline 30 minutes from now
      const deadline = Math.floor(Date.now() / 1000) + 1800;
      
      // Calculate minimum amounts (2% slippage tolerance)
      const amountTokenMin = (deployTokenAmount * BigInt(98)) / BigInt(100);
      const amountETHMin = (ethAmount * BigInt(98)) / BigInt(100);

      // For V3 tokens, ensure the contract has the tokens
      if (selectedToken.factoryVersion === 'v3') {
        console.log('Using V3 liquidity addition...');
        
        const contractBalance = await tokenContract.balanceOf(tokenContract.target);
        console.log('Contract balance:', formatEther(contractBalance));
        
        if (contractBalance < deployTokenAmount) {
          throw new Error('Insufficient token balance in contract for liquidity');
        }

        // Log parameters for debugging
        console.log('Liquidity parameters:', {
          router: dexRouter,
          tokenAmount: formatEther(deployTokenAmount),
          minTokenAmount: formatEther(amountTokenMin),
          minEthAmount: formatEther(amountETHMin),
          to: userAddress,
          deadline: deadline,
          value: formatEther(ethAmount)
        });

        let tx;
        try {
          console.log('Attempting addLiquidityV2...');
          tx = await tokenContract.addLiquidityV2(
            dexRouter,
            deployTokenAmount,
            amountTokenMin,
            amountETHMin,
            userAddress,
            deadline,
            { 
              value: ethAmount,
              gasLimit: chainId === 97 ? BigInt(4000000) : BigInt(1000000)
            }
          );

          showToast('info', "Transaction Submitted", "Please wait for confirmation");
          
          try {
            const receipt = await tx.wait();
            if (!receipt || receipt.status === 0) {
              throw new Error('Transaction failed during execution');
            }
            showToast('success', "Success", "Liquidity added successfully");
            return;
          } catch (err) {
            if (err instanceof Error && err.message.includes('Non-200 status code')) {
              showToast('info', "Transaction Status", "Transaction submitted. Please check your wallet or the explorer for confirmation.");
              return;
            }
            throw err;
          }
        } catch (e) {
          const error = e as Error;
          console.error('Error in addLiquidityV2:', error);
          
          // Only try addLiquidity if we get an execution revert
          if (error.message && error.message.includes('execution reverted')) {
            console.log('Execution reverted, trying addLiquidity...');
            showToast('info', "Retrying", "First attempt failed, trying alternative method...");
            
            tx = await tokenContract.addLiquidity(
              dexRouter,
              deployTokenAmount,
              amountTokenMin,
              amountETHMin,
              userAddress,
              deadline,
              { 
                value: ethAmount,
                gasLimit: chainId === 97 ? BigInt(4000000) : BigInt(1000000)
              }
            );

            showToast('info', "Transaction Submitted", "Please wait for confirmation");
            
            try {
              const receipt = await tx.wait();
              if (!receipt || receipt.status === 0) {
                throw new Error('Transaction failed during execution');
              }
              showToast('success', "Success", "Liquidity added successfully");
              return;
            } catch (err) {
              if (err instanceof Error && err.message.includes('Non-200 status code')) {
                showToast('info', "Transaction Status", "Transaction submitted. Please check your wallet or the explorer for confirmation.");
                return;
              }
              throw err;
            }
          } else {
            // If it's not an execution revert, rethrow the error
            throw error;
          }
        }
      } else {
        // For non-V3 tokens, use the router contract directly
        const routerContract = new Contract(dexRouter, routerABI, signer);
        
        const tx = await routerContract.addLiquidityETH(
          selectedToken.address,
          deployTokenAmount,
          amountTokenMin,
          amountETHMin,
          userAddress,
          deadline,
          {
            value: ethAmount,
            gasLimit: chainId === 97 ? BigInt(4000000) : BigInt(1000000)
          }
        );

        showToast('info', "Transaction Submitted", "Please wait for confirmation");
        
        try {
          const receipt = await tx.wait();
          if (!receipt || receipt.status === 0) {
            throw new Error('Transaction failed during execution');
          }
          showToast('success', "Success", "Liquidity added successfully");
        } catch (err) {
          if (err instanceof Error && err.message.includes('Non-200 status code')) {
            showToast('info', "Transaction Status", "Transaction submitted. Please check your wallet or the explorer for confirmation.");
            return;
          }
          throw err;
        }
      }

    } catch (error) {
      console.error('Error deploying to DEX:', error);
      const message = handleContractError(error);
      showToast('error', "Error", message);
    } finally {
      setIsLoading(false);
    }
  };

  // Update the showToast function to use the toast from component scope
  const showToast = (type: 'success' | 'error' | 'info', title: string, description: string) => {
    toast({
      title,
      description,
      variant: type === 'error' ? 'destructive' : 'default'
    });
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
                            onClick={() => chainId && window.open(`${utils.getExplorerUrl(chainId)}/token/${token.address}`, '_blank')}
                            className="flex-1 h-8 text-xs bg-gray-700 hover:bg-gray-600"
                            disabled={!chainId}
                          >
                            View on Explorer
                          </Button>
                          {tokenPreview?.isListed && tokenPreview.address === token.address && (
                            <Button
                              onClick={() => chainId && window.open(`${utils.getDexUrl(chainId)}/swap?outputCurrency=${token.address}`, '_blank')}
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
                                onClick={() => selectedToken && handleFinalizePresale(selectedToken.address)}
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
                                    onClick={() => selectedToken && handleBurnUnsoldTokens(selectedToken.address)}
                                    className="bg-red-600 hover:bg-red-700 text-white h-7 text-xs px-3"
                                    disabled={isLoading}
                                  >
                                    {isLoading ? <Spinner className="h-3 w-3" /> : 'Burn Unsold Tokens'}
                                  </Button>
                                  <Button
                                    onClick={() => selectedToken && handleCancelPresale(selectedToken.address)}
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
                            <p className="text-white">
                              {tokenPreview.presaleInfo ? (
                                (() => {
                                  const rate = tokenPreview.presaleInfo.presaleRate;
                                  if (!rate || rate === '0') return '0 tokens/ETH';

                                  // For V3 tokens, rate is already in ETH/token format
                                  if (selectedToken?.factoryVersion === 'v3') {
                                    const tokensPerEth = 1 / Number(rate);
                                    return `${tokensPerEth.toFixed(2)} tokens/ETH`;
                                  }
                                  
                                  // For V2 tokens, rate is in Wei (1e18)
                                  // Convert the string to BigInt for precise calculation
                                  const rateInWei = BigInt(rate.replace('.', ''));
                                  const oneEthInWei = BigInt('1000000000000000000'); // 1e18
                                  const tokensPerEth = Number(oneEthInWei) / Number(rateInWei);
                                  
                                  return `${tokensPerEth.toFixed(2)} tokens/ETH`;
                                })()
                              ) : '0 tokens/ETH'}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {tokenPreview.presaleInfo ? (
                                (() => {
                                  const rate = tokenPreview.presaleInfo.presaleRate;
                                  if (!rate || rate === '0') return '';

                                  if (selectedToken?.factoryVersion === 'v3') {
                                    return `(${Number(rate).toFixed(8)} ETH/token)`;
                                  }
                                  
                                  // For V2 tokens, convert Wei to ETH
                                  const rateInWei = BigInt(rate.replace('.', ''));
                                  const ethPerToken = Number(rateInWei) / 1e18;
                                  return `(${ethPerToken.toFixed(18)} ETH/token)`;
                                })()
                              ) : ''}
                            </p>
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
                            <p className="text-white">{utils.secondsToDays(Number(tokenPreview.v3Distribution.ownerVesting.vestingDuration))} days</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Cliff Duration</p>
                            <p className="text-white">{utils.secondsToDays(Number(tokenPreview.v3Distribution.ownerVesting.cliffDuration))} days</p>
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
                  <div className="flex items-center justify-between">
                  <h5 className="text-sm text-gray-400">Fee Settings</h5>
                    <Switch
                      checked={approvalDetails.fees.enabled}
                      onCheckedChange={(checked) => setApprovalDetails(prev => ({
                        ...prev,
                        fees: { ...prev.fees, enabled: checked }
                      }))}
                    />
                  </div>
                  {approvalDetails.fees.enabled && (
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
                          value={approvalDetails.fees.marketingFee}
                          onChange={(e) => setApprovalDetails(prev => ({
                            ...prev,
                            fees: { ...prev.fees, marketingFee: e.target.value }
                          }))}
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
                          value={approvalDetails.fees.developmentFee}
                          onChange={(e) => setApprovalDetails(prev => ({
                            ...prev,
                            fees: { ...prev.fees, developmentFee: e.target.value }
                          }))}
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
                          value={approvalDetails.fees.liquidityFee}
                          onChange={(e) => setApprovalDetails(prev => ({
                            ...prev,
                            fees: { ...prev.fees, liquidityFee: e.target.value }
                          }))}
                        className="bg-gray-800 text-text-primary border-gray-700"
                      />
                    </div>
                  </div>
                  )}
                </div>

                {/* Trading Controls */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                  <h5 className="text-sm text-gray-400">Trading Controls</h5>
                    <Switch
                      checked={approvalDetails.tradingControls.enabled}
                      onCheckedChange={(checked) => setApprovalDetails(prev => ({
                        ...prev,
                        tradingControls: { ...prev.tradingControls, enabled: checked }
                      }))}
                    />
                  </div>
                  {approvalDetails.tradingControls.enabled && (
                    <>
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
                            value={approvalDetails.tradingControls.maxTransactionAmount}
                            onChange={(e) => setApprovalDetails(prev => ({
                              ...prev,
                              tradingControls: { ...prev.tradingControls, maxTransactionAmount: e.target.value }
                            }))}
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
                            value={approvalDetails.tradingControls.maxWalletAmount}
                            onChange={(e) => setApprovalDetails(prev => ({
                              ...prev,
                              tradingControls: { ...prev.tradingControls, maxWalletAmount: e.target.value }
                            }))}
                        className="bg-gray-800 text-text-primary border-gray-700"
                      />
                    </div>
                  </div>

                      {/* Additional Controls */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Label className="text-text-primary">Anti-Bot Protection</Label>
                            <InfoTooltip content={TOOLTIP_CONTENT.antiBot} />
                          </div>
                          <Switch
                            checked={approvalDetails.tradingControls.antiBot}
                            onCheckedChange={(checked) => setApprovalDetails(prev => ({
                              ...prev,
                              tradingControls: { ...prev.tradingControls, antiBot: checked }
                            }))}
                          />
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Label className="text-text-primary">Blacklist</Label>
                            <InfoTooltip content={TOOLTIP_CONTENT.blacklist} />
                          </div>
                          <Switch
                            checked={approvalDetails.tradingControls.blacklist}
                            onCheckedChange={(checked) => setApprovalDetails(prev => ({
                              ...prev,
                              tradingControls: { ...prev.tradingControls, blacklist: checked }
                            }))}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Wallet Settings */}
                <div className="space-y-4">
                  <h5 className="text-sm text-gray-400">Wallet Settings</h5>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-text-primary">Marketing Wallet</Label>
                      <Input
                        value={approvalDetails.marketingWallet}
                        onChange={(e) => setApprovalDetails(prev => ({
                          ...prev,
                          marketingWallet: e.target.value
                        }))}
                        className="bg-gray-800 text-text-primary border-gray-700"
                        placeholder="0x..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-text-primary">Development Wallet</Label>
                      <Input
                        value={approvalDetails.developmentWallet}
                        onChange={(e) => setApprovalDetails(prev => ({
                          ...prev,
                          developmentWallet: e.target.value
                        }))}
                        className="bg-gray-800 text-text-primary border-gray-700"
                        placeholder="0x..."
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
                      {chainId === 97 && (
                        <SelectItem value="pancakeswap" className="text-white hover:bg-gray-800">PancakeSwap</SelectItem>
                      )}
                      {chainId === 11155111 && (
                        <SelectItem value="uniswap" className="text-white hover:bg-gray-800">Uniswap</SelectItem>
                      )}
                      {chainId === 80002 && (
                        <SelectItem value="quickswap" className="text-white hover:bg-gray-800">QuickSwap</SelectItem>
                      )}
                      {chainId === 11155420 && (
                        <SelectItem value="uniswap-v2" className="cursor-pointer">
                          <div className="flex items-center">
                            <Image src="/images/uniswap.png" alt="Uniswap" width={24} height={24} className="mr-2" />
                            Uniswap V2
                          </div>
                        </SelectItem>
                      )}
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