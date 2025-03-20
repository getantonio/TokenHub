import { useEffect, useState, forwardRef, useImperativeHandle, useMemo, useRef, ReactNode } from 'react';
import { Contract, parseEther } from 'ethers';
import { formatEther, parseUnits, formatUnits } from 'viem';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toast/use-toast';
import { Spinner } from '@/components/ui/Spinner';
import { useNetwork } from '@/contexts/NetworkContext';
import { getExplorerUrl } from '@/config/networks';
import { InfoIcon } from '@/components/ui/InfoIcon';
import { shortenAddress } from '@/utils/address';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { getNetworkContractAddress, FACTORY_ADDRESSES } from '@config/contracts';
import { ethers } from 'ethers';
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { useForm, UseFormReturn } from "react-hook-form";
import { TokenTemplate_v3_ABI } from '@/contracts/abi/TokenTemplate_v3';
import { UniswapV2Router02_ABI } from '@/contracts/abi/UniswapV2Router02';
import TokenFactoryV3ABI from '@/contracts/abi/TokenFactory_v3.json';
import TokenV3ABI from '@/contracts/abi/TokenTemplate_v3_Enhanced.json';
import TokenTemplate_v3 from '@/contracts/artifacts/src/contracts/TokenTemplate_v3.sol/TokenTemplate_v3.json';
import IUniswapV2Router02 from '@/contracts/artifacts/@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol/IUniswapV2Router02.json';
import { BrowserProvider } from 'ethers';
import { Log } from 'ethers';
import { TokenFactory_v3_ABI } from '@/contracts/abi/TokenFactory_v3';

// Custom ABI for Token_v3_Updated that includes getRemainingLiquidityAllocation function
const TokenV3UpdatedABI = [
  // Basic ERC20
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
  // Ownership
  "function owner() view returns (address)",
  // Custom functions
  "function burn(uint256 amount) external",
  "function pause() external",
  "function unpause() external",
  "function paused() view returns (bool)",
  "function maxSupply() view returns (uint256)",
  "function blacklistEnabled() view returns (bool)",
  "function timeLockEnabled() view returns (bool)",
  "function isBlacklisted(address) view returns (bool)",
  "function setBlacklist(address, bool) external",
  "function getUnlockTime(address) view returns (uint256)",
  "function setTimeLock(address, uint256) external",
  // Vesting
  "function getVestingInfo(address) view returns (uint256, uint256, uint256, uint256, uint256)",
  "function getClaimableAmount(address) view returns (uint256)",
  "function claimVestedTokens() external",
  // Liquidity
  "function addLiquidityFromContractTokens() external payable returns (uint256)",
  "function getRemainingLiquidityAllocation() external view returns (uint256)",
  // Presale
  "function configurePresale(uint256,uint256,uint256,uint256,uint256,uint256,uint256) external",
  "function configureDistribution(uint256,uint256,uint256,(address,uint256,bool,uint256,uint256,uint256)[]) external payable",
  // Events
  "event LiquidityAdded(address indexed pair, uint256 tokensAdded, uint256 ethAdded)",
  "event TokensClaimed(address indexed wallet, uint256 amount)",
  "event BlacklistUpdated(address indexed account, bool status)",
  "event TimeLockSet(address indexed account, uint256 timestamp)"
];

export interface TCAP_v3Props {
  isConnected: boolean;
  address?: string;
  provider: any;
}

interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  totalSupply: string;
  owner: string;
  pairAddress?: string;
  lpTokenBalance?: string;
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
    totalTokensSold: string;
    contributorCount: number;
    contributors: {
      address: string;
      contribution: string;
      tokenAllocation: string;
      isWhitelisted: boolean;
    }[];
  };
  liquidityInfo?: {
    percentage: string;
    lockDuration: string;
    unlockTime: number;
    locked: boolean;
    hasLiquidity?: boolean;
    lpTokenBalance?: string;
    sharePercentage?: string;
    token0?: string;
    token1?: string;
    reserve0?: string;
    reserve1?: string;
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
  paused: boolean;
  vestingInfo?: {
    hasVesting: boolean;
    totalAmount: string;
    startTime: number;
    cliffDuration: number;
    vestingDuration: number;
    releasedAmount: string;
    revocable: boolean;
    revoked: boolean;
    releasableAmount: string;
  };
  createdAt?: number;
}

interface BlockDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  tokenName: string;
  tokenAddress: string;
}

function BlockDialog({ isOpen, onClose, onConfirm, tokenName, tokenAddress }: BlockDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]" aria-describedby="block-dialog-description">
        <DialogTitle>Block Token</DialogTitle>
        <DialogDescription id="block-dialog-description">
          Are you sure you want to block {tokenName}? This action cannot be undone.
        </DialogDescription>
        <div className="mt-4 flex justify-end gap-3" aria-describedby="block-dialog-description">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={onConfirm}>Block Token</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface AddLiquidityDialog {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: { tokenAmount: string; ethAmount: string; useContractTokens: boolean }) => void;
  tokenSymbol: string;
  tokenTotalSupply?: string;
  selectedToken: TokenInfo;
  externalProvider: any;
}

function AddLiquidityDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  tokenSymbol, 
  tokenTotalSupply, 
  selectedToken,
  externalProvider 
}: AddLiquidityDialog) {
  const [tokenAmount, setTokenAmount] = useState('');
  const [ethAmount, setEthAmount] = useState('');
  const [remainingAllocation, setRemainingAllocation] = useState<string>('0');
  const [walletBalance, setWalletBalance] = useState<string>('0');
  const [useContractTokens, setUseContractTokens] = useState(true);

  // Fetch remaining allocation and wallet balance when dialog opens
  useEffect(() => {
    if (isOpen && selectedToken) {
      const fetchTokenData = async () => {
        try {
          const signer = await externalProvider.getSigner();
          const userAddress = await signer.getAddress();
          const tokenContract = new Contract(selectedToken.address, TokenV3UpdatedABI, signer);
          
          // Get remaining liquidity allocation
          const remaining = await tokenContract.getRemainingLiquidityAllocation();
          setRemainingAllocation(formatEther(remaining));
          
          // Get wallet balance
          const balance = await tokenContract.balanceOf(userAddress);
          setWalletBalance(formatEther(balance));
        } catch (error) {
          console.error('Error fetching token data:', error);
        }
      };
      fetchTokenData();
    }
  }, [isOpen, selectedToken]);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setTokenAmount('');
      setEthAmount('');
    }
  }, [isOpen]);

  const handleConfirm = () => {
    // Validate inputs before confirming
    if (!ethAmount) {
      alert('Please enter ETH amount');
      return;
    }
    
    if (!useContractTokens && !tokenAmount) {
      alert('Please enter token amount');
      return;
    }
    
    onConfirm({ 
      tokenAmount: useContractTokens ? remainingAllocation : tokenAmount, 
      ethAmount,
      useContractTokens
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]" aria-describedby="add-liquidity-description">
        <DialogTitle>Add Liquidity</DialogTitle>
        <DialogDescription id="add-liquidity-description">
          {useContractTokens 
            ? `Add liquidity using contract tokens. Available: ${remainingAllocation} ${tokenSymbol}`
            : `Add liquidity using wallet tokens. Available: ${walletBalance} ${tokenSymbol}`}
        </DialogDescription>
        
        <div className="mt-4 space-y-2" aria-describedby="add-liquidity-description">
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-white mb-2">Liquidity Source</h4>
              <div className="flex flex-col gap-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="contract-tokens"
                    checked={useContractTokens}
                    onChange={() => setUseContractTokens(true)}
                    className="h-4 w-4"
                  />
                  <label htmlFor="contract-tokens" className="text-sm text-white">
                    Use contract tokens ({remainingAllocation} {tokenSymbol} available)
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="wallet-tokens"
                    checked={!useContractTokens}
                    onChange={() => setUseContractTokens(false)}
                    className="h-4 w-4"
                  />
                  <label htmlFor="wallet-tokens" className="text-sm text-white">
                    Use tokens from wallet ({walletBalance} {tokenSymbol} available)
                  </label>
                </div>
              </div>
            </div>
            
            {!useContractTokens && (
              <div>
                <Label htmlFor="tokenAmount" className="text-gray-300">Token Amount</Label>
                <Input
                  id="tokenAmount"
                  type="text"
                  value={tokenAmount}
                  onChange={(e) => setTokenAmount(e.target.value)}
                  placeholder="Enter token amount"
                  className="bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-500"
                />
                <div className="mt-1 flex justify-between">
                  <span className="text-xs text-gray-400">Balance: {walletBalance}</span>
                  <button 
                    onClick={() => setTokenAmount(walletBalance)}
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    Max
                  </button>
                </div>
              </div>
            )}
            
            <div>
              <Label htmlFor="ethAmount" className="text-gray-300">ETH Amount</Label>
              <Input
                id="ethAmount"
                type="text"
                value={ethAmount}
                onChange={(e) => setEthAmount(e.target.value)}
                placeholder="Enter ETH amount"
                className="bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-500"
              />
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="default" onClick={handleConfirm}>Add Liquidity</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export interface TCAP_v3Ref {
  loadTokens: () => void;
}

interface VestingPreset {
  presalePercentage: number;
  liquidityPercentage: number;
  wallets: {
    name: string;
    percentage: number;
    vestingEnabled: boolean;
    vestingDuration: number;
    cliffDuration: number;
    vestingStartTime: number;
  }[];
}

interface ValidationResult {
  category: string;
  message: string;
  details?: string[];
  status: 'success' | 'warning' | 'error';
}

interface FormData {
  presaleEnabled: boolean;
  presalePercentage: number;
  liquidityPercentage: number;
  wallets: {
    name: string;
    address: string;
    percentage: number;
    vestingEnabled: boolean;
    vestingDuration: bigint;
    cliffDuration: bigint;
    vestingStartTime: bigint;
  }[];
}

const VESTING_PRESETS: Record<string, VestingPreset> = {
  standard: {
    presalePercentage: 10,
    liquidityPercentage: 65, // 65% when presale enabled, 75% when disabled
    wallets: [
      { 
        name: 'Team', 
        percentage: 15,
        vestingEnabled: true,
        vestingDuration: 365,
        cliffDuration: 90,
        vestingStartTime: Math.floor(Date.now() / 1000) + (24 * 3600)
      },
      { 
        name: 'Marketing', 
        percentage: 10,
        vestingEnabled: true,
        vestingDuration: 180,
        cliffDuration: 30,
        vestingStartTime: Math.floor(Date.now() / 1000) + (24 * 3600)
      }
    ],
  },
  fair_launch: {
    presalePercentage: 5,
    liquidityPercentage: 85, // 85% when presale enabled, 90% when disabled
    wallets: [
      {
        name: 'Team',
        percentage: 10,
        vestingEnabled: true,
        vestingDuration: 365,
        cliffDuration: 180,
        vestingStartTime: Math.floor(Date.now() / 1000) + (24 * 3600)
      }
    ]
  },
  community: {
    presalePercentage: 15,
    liquidityPercentage: 65, // 65% when presale enabled, 80% when disabled
    wallets: [
      {
        name: 'Community Rewards',
        percentage: 10,
        vestingEnabled: true,
        vestingDuration: 180,
        cliffDuration: 30,
        vestingStartTime: Math.floor(Date.now() / 1000) + (24 * 3600)
      },
      {
        name: 'Team',
        percentage: 10,
        vestingEnabled: true,
        vestingDuration: 365,
        cliffDuration: 90,
        vestingStartTime: Math.floor(Date.now() / 1000) + (24 * 3600)
      }
    ]
  },
  growth: {
    presalePercentage: 20,
    liquidityPercentage: 45, // 45% when presale enabled, 65% when disabled
    wallets: [
      {
        name: 'Team',
        percentage: 15,
        vestingEnabled: true,
        vestingDuration: 365,
        cliffDuration: 90,
        vestingStartTime: Math.floor(Date.now() / 1000) + (24 * 3600)
      },
      {
        name: 'Marketing',
        percentage: 10,
        vestingEnabled: true,
        vestingDuration: 180,
        cliffDuration: 30,
        vestingStartTime: Math.floor(Date.now() / 1000) + (24 * 3600)
      },
      {
        name: 'Development',
        percentage: 10,
        vestingEnabled: true,
        vestingDuration: 365,
        cliffDuration: 60,
        vestingStartTime: Math.floor(Date.now() / 1000) + (24 * 3600)
      }
    ]
  },
  bootstrap: {
    presalePercentage: 25,
    liquidityPercentage: 35, // 35% when presale enabled, 60% when disabled
    wallets: [
      {
        name: 'Team',
        percentage: 20,
        vestingEnabled: true,
        vestingDuration: 365,
        cliffDuration: 90,
        vestingStartTime: Math.floor(Date.now() / 1000) + (24 * 3600)
      },
      {
        name: 'Marketing',
        percentage: 10,
        vestingEnabled: true,
        vestingDuration: 180,
        cliffDuration: 30,
        vestingStartTime: Math.floor(Date.now() / 1000) + (24 * 3600)
      },
      {
        name: 'Development',
        percentage: 10,
        vestingEnabled: true,
        vestingDuration: 365,
        cliffDuration: 60,
        vestingStartTime: Math.floor(Date.now() / 1000) + (24 * 3600)
      }
    ]
  },
  governance: {
    presalePercentage: 30,
    liquidityPercentage: 30, // 30% when presale enabled, 60% when disabled
    wallets: [
      {
        name: 'Governance',
        percentage: 20,
        vestingEnabled: true,
        vestingDuration: 365,
        cliffDuration: 90,
        vestingStartTime: Math.floor(Date.now() / 1000) + (24 * 3600)
      },
      {
        name: 'Team',
        percentage: 10,
        vestingEnabled: true,
        vestingDuration: 365,
        cliffDuration: 180,
        vestingStartTime: Math.floor(Date.now() / 1000) + (24 * 3600)
      },
      {
        name: 'Treasury',
        percentage: 10,
        vestingEnabled: true,
        vestingDuration: 365,
        cliffDuration: 60,
        vestingStartTime: Math.floor(Date.now() / 1000) + (24 * 3600)
      }
    ]
  }
};

const validateDistribution = (form: UseFormReturn<FormData>): ValidationResult => {
  const values = form.getValues();
  const presaleEnabled = values.presaleEnabled;
  const presalePercentage = presaleEnabled ? values.presalePercentage : 0;
  const liquidityPercentage = values.liquidityPercentage || 0;
  const wallets = values.wallets || [];
  const walletPercentages = wallets.reduce((sum: number, w: { percentage: number }) => sum + (w.percentage || 0), 0);
  const totalPercentage = presalePercentage + liquidityPercentage + walletPercentages;

  // Validate presale percentage range
  if (presaleEnabled && (presalePercentage < 1 || presalePercentage > 30)) {
    return {
      category: 'Distribution',
      message: 'Invalid presale percentage',
      details: [
        'Presale percentage must be between 1% and 30%',
        `Current: ${presalePercentage}%`
      ],
      status: 'error'
    };
  }

  // When liquidity is less than 100%, require at least one wallet
  if (liquidityPercentage < 100 && wallets.length === 0) {
    return {
      category: 'Distribution',
      message: 'At least one wallet allocation is required when liquidity is less than 100%',
      details: [
        `Liquidity: ${liquidityPercentage}%`,
        'Add a wallet allocation for the remaining tokens'
      ],
      status: 'error'
    };
  }

  // When there are wallet allocations, total must equal 100%
  if (totalPercentage !== 100) {
    return {
      category: 'Distribution',
      message: 'Total percentage must equal 100%',
      details: [
        `Liquidity: ${liquidityPercentage}%`,
        `Presale: ${presalePercentage}%`,
        `Wallets: ${wallets.map(w => `${w.percentage}%`).join(', ')}`,
        `Total: ${totalPercentage}%`
      ],
      status: 'error'
    };
  }

  // Validate each wallet allocation
  for (const wallet of wallets) {
    if (wallet.vestingEnabled) {
      if (wallet.vestingDuration <= BigInt(0)) {
  return {
    category: 'Distribution',
          message: 'Invalid vesting duration',
          details: [`Wallet ${wallet.name}: Vesting duration must be greater than 0`],
          status: 'error'
        };
      }
      if (wallet.vestingStartTime <= BigInt(0)) {
        return {
          category: 'Distribution',
          message: 'Invalid vesting start time',
          details: [`Wallet ${wallet.name}: Vesting start time must be greater than 0`],
          status: 'error'
        };
      }
    }
  }

  return {
    category: 'Distribution',
    message: 'Valid distribution',
    details: [
      `Liquidity: ${liquidityPercentage}%`,
      `Presale: ${presalePercentage}%`,
      `Wallets: ${wallets.map(w => `${w.percentage}%`).join(', ')}`
    ],
    status: 'success'
  };
};

interface LPInfo {
  hasLiquidity: boolean;
  lpTokenBalance: string;
  sharePercentage: string;
  reserve0: string;
  reserve1: string;
  token0: string;
  token1: string;
}

const verifyPairAddress = async (tokenAddress: string, signer: any) => {
  try {
    console.log('Verifying pair address for token:', tokenAddress);
    
    // Since we're having issues with the factory contract, let's try a different approach
    // We'll use the router directly to check for liquidity
    const ROUTER_ADDRESS = '0xD9Aa0Ca55115900908bd649793D9b8dE11Fb7368';
    const WETH_SEPOLIA = '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14';
    
    console.log('Using Router:', ROUTER_ADDRESS);
    console.log('Using WETH:', WETH_SEPOLIA);

    // Create router contract with minimal interface
    const routerContract = new ethers.Contract(
      ROUTER_ADDRESS,
      [
        'function factory() external view returns (address)',
        'function WETH() external view returns (address)'
      ],
      signer
    );
    
    try {
      // Get factory address from router
      const factoryAddress = await routerContract.factory();
      console.log('Factory address from router:', factoryAddress);
      
      // Now we'll use the factoryAddress to create a minimal factory contract
    const factoryContract = new ethers.Contract(
        factoryAddress,
        [
          'function getPair(address tokenA, address tokenB) external view returns (address pair)'
      ],
      signer
    );

    // Sort tokens to match factory's token ordering
    const [token0, token1] = tokenAddress.toLowerCase() < WETH_SEPOLIA.toLowerCase() 
      ? [tokenAddress, WETH_SEPOLIA] 
      : [WETH_SEPOLIA, tokenAddress];

    // Try to get pair address
      const pairAddress = await factoryContract.getPair(token0, token1);
      console.log('Found pair address:', pairAddress);

    return pairAddress;
    } catch (error) {
      console.log('Error getting pair from factory:', error);
      
      // If we can't get the pair address, return zero address
      return ethers.ZeroAddress;
    }
  } catch (error) {
    console.error('Error in verifyPairAddress:', error);
    return ethers.ZeroAddress;
  }
};

const getLPTokenInfo = async (tokenAddress: string, pairAddress: string, signer: any): Promise<LPInfo | null> => {
  try {
    console.log('Getting LP info for:', { tokenAddress, pairAddress });
    const userAddress = await signer.getAddress();
    console.log('User address:', userAddress);
    
    // Full Uniswap V2 Pair ABI for the essential functions
    const PAIR_ABI = [
      'function token0() external view returns (address)',
      'function token1() external view returns (address)',
      'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
      'function totalSupply() external view returns (uint256)',
      'function balanceOf(address owner) external view returns (uint256)',
      'function decimals() external pure returns (uint8)',
      'function MINIMUM_LIQUIDITY() external pure returns (uint256)'
    ];

    const pairContract = new ethers.Contract(pairAddress, PAIR_ABI, signer);
    console.log('Created pair contract');

    // Get all pair information in parallel
    const [token0, token1, reserves, totalSupply, lpBalance, decimals] = await Promise.all([
      pairContract.token0(),
      pairContract.token1(),
      pairContract.getReserves(),
      pairContract.totalSupply(),
      pairContract.balanceOf(userAddress),
      pairContract.decimals()
    ]);

    console.log('Pair data:', {
      token0,
      token1,
      reserves: reserves.map((r: ethers.BigNumberish) => r.toString()),
      totalSupply: totalSupply.toString(),
      lpBalance: lpBalance.toString(),
      decimals
    });

    // Determine which token is which
    const isToken0 = tokenAddress.toLowerCase() === token0.toLowerCase();
    const tokenReserve = isToken0 ? reserves[0] : reserves[1];
    const ethReserve = isToken0 ? reserves[1] : reserves[0];

    // Calculate share percentage with proper decimal handling
    const lpBalanceFormatted = formatEther(lpBalance);
    const totalSupplyFormatted = formatEther(totalSupply);
    const sharePercentage = totalSupplyFormatted !== '0' 
      ? (Number(lpBalanceFormatted) / Number(totalSupplyFormatted)) * 100
      : 0;

    console.log('Calculated values:', {
      lpBalanceFormatted,
      totalSupplyFormatted,
      sharePercentage
    });

    const hasLiquidity = Number(tokenReserve) > 0 && Number(ethReserve) > 0;

    const lpInfo = {
      hasLiquidity,
      lpTokenBalance: lpBalanceFormatted,
      sharePercentage: sharePercentage.toFixed(2),
      reserve0: formatEther(tokenReserve),
      reserve1: formatEther(ethReserve),
      token0,
      token1
    };

    console.log('Final LP info:', lpInfo);
    return lpInfo;
  } catch (error) {
    console.error('Error in getLPTokenInfo:', error);
    return null;
  }
};

const TCAP_v3 = forwardRef<TCAP_v3Ref, TCAP_v3Props>(({ isConnected, address: factoryAddress, provider: externalProvider }, ref): JSX.Element => {
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedToken, setSelectedToken] = useState<TokenInfo | null>(null);
  const [isAddLiquidityDialogOpen, setIsAddLiquidityDialogOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showOnlyRecent, setShowOnlyRecent] = useState(true);
  const { toast } = useToast();
  const { chainId } = useNetwork();
  const form = useForm<FormData>();

  // Helper function to handle liquidity addition with a router
  const handleAddLiquidityWithRouter = async (
    router: string, 
    tokenContract: Contract, 
    tokenAmountBN: bigint,
    ethAmountBN: bigint,
    userAddress: string,
    contractAddress: string
  ) => {
    // Check if router is approved to spend tokens
    const allowance = await tokenContract.allowance(userAddress, router);
    console.log("Router allowance:", formatEther(allowance));
    
    if (BigInt(allowance) < BigInt(tokenAmountBN)) {
      // Approve router to spend tokens
      console.log("Approving router to spend tokens...");
      
      toast({
        title: "Approval Required",
        description: "Please approve the router to spend your tokens",
      });
      
      const approveTx = await tokenContract.approve(router, tokenAmountBN);
      
      toast({
        title: "Approval Sent",
        description: "Waiting for approval transaction to be confirmed...",
      });
      
      await approveTx.wait();
      console.log("Router approved to spend tokens");
      
      toast({
        title: "Approval Confirmed",
        description: "Router approved to spend tokens. Adding liquidity...",
      });
    }
    
    // Get deadline (30 minutes from now)
    const deadline = Math.floor(Date.now() / 1000) + 30 * 60;
    
    // Create router contract
    const routerContract = new Contract(
      router,
      [
        "function addLiquidityETH(address token, uint256 amountTokenDesired, uint256 amountTokenMin, uint256 amountETHMin, address to, uint256 deadline) external payable returns (uint256 amountToken, uint256 amountETH, uint256 liquidity)"
      ],
      await externalProvider.getSigner()
    );
    
    // Call addLiquidityETH on router
    console.log("Adding liquidity with wallet tokens:", {
      router,
      tokenAddress: contractAddress,
      tokenAmount: tokenAmountBN.toString(),
      ethAmount: ethAmountBN.toString()
    });
    
    // Calculate min amounts (95% of desired amounts to account for slippage)
    const amountTokenMin = BigInt(tokenAmountBN) * BigInt(95) / BigInt(100);
    const amountETHMin = BigInt(ethAmountBN) * BigInt(95) / BigInt(100);
    
    toast({
      title: "Adding Liquidity",
      description: "Waiting for transaction confirmation...",
    });
    
    const liquidityTx = await routerContract.addLiquidityETH(
      contractAddress,
      tokenAmountBN,
      amountTokenMin,
      amountETHMin,
      userAddress,
      deadline,
      {
        value: ethAmountBN,
        gasLimit: 5000000
      }
    );
    
    console.log("Transaction sent:", liquidityTx.hash);
    
    // Wait for transaction to be mined
    const receipt = await liquidityTx.wait();
    console.log("Transaction confirmed:", receipt);
  };

  // Add state for vesting schedules popup
  const [showVestingSchedules, setShowVestingSchedules] = useState(false);
  const [selectedTokenForSchedules, setSelectedTokenForSchedules] = useState<string | null>(null);
  const [vestingSchedules, setVestingSchedules] = useState<any[]>([]);

  // Add these state variables after the existing ones
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [tokenToBlock, setTokenToBlock] = useState<TokenInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Add click-away listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const displayedTokens = useMemo(() => {
    if (showOnlyRecent) {
      return tokens.slice(0, 3);
    }
    return tokens;
  }, [tokens, showOnlyRecent]);

  useEffect(() => {
    console.log('TCAP_v3 useEffect triggered with:', {
      isConnected,
      factoryAddress,
      chainId,
      hasProvider: !!externalProvider
    });
    
    if (isConnected && factoryAddress && externalProvider) {
      // Load tokens initially, but not on every network change
      // The user can click the refresh button to reload after network changes
      loadTokens();
    }
  }, [isConnected, factoryAddress, externalProvider]);
  
  // Don't include chainId in the dependency array to prevent automatic reload on network changes
  // which can cause errors if the page doesn't fully reload

  const getTokenContract = (tokenAddress: string, signer: any) => {
    // Use TokenV3UpdatedABI instead of TokenV3ABI
    return new Contract(tokenAddress, TokenV3UpdatedABI, signer);
  };

  // Add this function to handle blocked tokens
  const getBlockedTokens = (): string[] => {
    const blocked = localStorage.getItem('blockedTokensV3');
    return blocked ? JSON.parse(blocked) : [];
  };

  // Add this function to save blocked tokens
  const saveBlockedToken = (tokenAddress: string) => {
    const blocked = getBlockedTokens();
    blocked.push(tokenAddress);
    localStorage.setItem('blockedTokensV3', JSON.stringify(blocked));
  };

  const loadTokens = async () => {
    if (!externalProvider) {
      console.log('TCAP_v3 loadTokens: Missing provider');
      return;
    }

    try {
      console.log('TCAP_v3 loadTokens: Starting token load');
      setLoading(true);

      // Factory address validation

      const signer = await externalProvider.getSigner();
      const userAddress = await signer.getAddress();
      
      if (!factoryAddress) {
        throw new Error('Factory address is not defined');
      }

      // Validate we're on the correct network - always use the network from the provider
      let signerChainId: number;
      try {
        const network = await signer.provider.getNetwork();
        signerChainId = Number(network.chainId);
        
        // If the network has changed since component mounted
        if (signerChainId !== chainId) {
          console.log(`TCAP_v3 loadTokens: Network changed from ${chainId} to ${signerChainId}`);
          toast({
            title: 'Network Changed',
            description: 'Please refresh the page to sync with your current network',
            variant: 'default',
          });
          setLoading(false);
          return;
        }
      } catch (error) {
        console.error('TCAP_v3 loadTokens: Error getting network:', error);
        toast({
          title: 'Network Error',
          description: 'Unable to determine current network. Please refresh the page.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }
      
      console.log('TCAP_v3 loadTokens: Using factory address:', {
        factoryAddress,
        chainId: signerChainId,
        userAddress,
        hasProvider: !!externalProvider
      });

      const blockedTokens = getBlockedTokens();
      let deployedTokens: string[] = [];
      
      try {
        // Create contract interface with BOTH function names that might be used
        const factory = new ethers.Contract(factoryAddress, [
          "function uniswapV2Router() view returns (address)",
          "function getUserCreatedTokens(address) view returns (address[])",
          "function getUserTokens(address) view returns (address[])",
          "function deploymentFee() view returns (uint256)",
          "function feeRecipient() view returns (address)"
        ], signer);
        
        console.log('TCAP_v3 loadTokens: Getting user created tokens for:', userAddress);
        
        // Try both function names (the contract in Sepolia uses getUserTokens instead of getUserCreatedTokens)
        try {
          deployedTokens = await factory.getUserCreatedTokens(userAddress);
          console.log('TCAP_v3 loadTokens: Successfully called getUserCreatedTokens');
        } catch (e) {
          console.log('TCAP_v3 loadTokens: getUserCreatedTokens failed, trying getUserTokens instead');
          deployedTokens = await factory.getUserTokens(userAddress);
          console.log('TCAP_v3 loadTokens: Successfully called getUserTokens');
        }
        
        console.log('TCAP_v3 loadTokens: Deployed tokens:', deployedTokens);
      } catch (contractError) {
        console.error('Error calling getUserCreatedTokens:', contractError);
        
        toast({
          title: 'Contract Error',
          description: 'Failed to load tokens from the factory contract. Please try again later.',
          variant: 'destructive',
        });
        
        setTokens([]);
        setLoading(false);
        return;
      }
      
      const tokenPromises = deployedTokens
        .filter((token: string) => !blockedTokens.includes(token))
        .map(async (tokenAddress: string) => {
          try {
            const tokenContract = new ethers.Contract(tokenAddress, TokenV3UpdatedABI, signer);

            // Get basic token info
            const [name, symbol, totalSupply, owner, paused] = await Promise.all([
              tokenContract.name(),
              tokenContract.symbol(),
              tokenContract.totalSupply(),
              tokenContract.owner(),
              tokenContract.paused()
            ]);

            // Get pair address and liquidity info
            const pairAddress = await verifyPairAddress(tokenAddress, signer);
            let liquidityInfo = undefined;

            if (pairAddress && pairAddress !== ethers.ZeroAddress) {
              try {
                const lpInfo = await getLPTokenInfo(tokenAddress, pairAddress, signer);
                if (lpInfo) {
                  liquidityInfo = lpInfo;
                }
              } catch (lpError) {
                console.error('Error loading LP info:', lpError);
              }
            }

            return {
              address: tokenAddress,
              name,
              symbol,
              totalSupply: formatEther(totalSupply),
              owner,
              paused,
              pairAddress,
              liquidityInfo,
              createdAt: Date.now()
            };
          } catch (error) {
            console.error(`Error loading token ${tokenAddress}:`, error);
            return null;
          }
        });

      // Process token results
      const results = await Promise.all(tokenPromises);
      const validTokens: TokenInfo[] = [];
      
      // Filter and convert to TokenInfo array
      for (const token of results) {
        if (token !== null) {
          validTokens.push(token as TokenInfo);
        }
      }
      
      // Sort by creation time
      validTokens.sort((a, b) => {
        const timeA = a.createdAt || 0;
        const timeB = b.createdAt || 0;
        return timeB - timeA;
      });

      console.log('TCAP_v3 loadTokens: Successfully loaded tokens:', validTokens);
      setTokens(validTokens);
    } catch (error: any) {
      console.error('TCAP_v3 Error loading tokens:', error);
      toast({
        title: 'Error',
        description: 'Failed to load tokens. Please try again.',
        variant: 'destructive',
      });
      setTokens([]);
    } finally {
      setLoading(false);
    }
  };

  // Update handlePause with better error handling
  const handlePause = async (tokenAddress: string) => {
    try {
      const signer = await externalProvider.getSigner();
      const tokenContract = getTokenContract(tokenAddress, signer);
      
      // First check if the user is the owner
      const owner = await tokenContract.owner();
      const currentUser = await signer.getAddress();
      
      if (owner.toLowerCase() !== currentUser.toLowerCase()) {
        throw new Error('Only the token owner can pause/unpause transfers');
      }

      // Check if user is a pauser
      const isPauser = await tokenContract.isPauser(currentUser);
      if (!isPauser) {
        throw new Error('You do not have pauser role');
      }

      // Check current pause state
      const isPaused = await tokenContract.paused();
      console.log('Current pause state:', isPaused);
      
      // Prepare the transaction
      const method = isPaused ? 'unpause' : 'pause';
      
      // Estimate gas with a buffer
      const gasEstimate = await tokenContract[method].estimateGas();
      const gasLimit = gasEstimate + (gasEstimate / BigInt(5)); // Add 20% buffer
      
      // Send transaction with gas limit
      const tx = await tokenContract[method]({
        gasLimit,
      });
      
      toast({
        title: 'Transaction Pending',
        description: `${isPaused ? 'Unpausing' : 'Pausing'} token transfers...`,
      });
      
      await tx.wait();
      
      toast({
        title: isPaused ? 'Token Unpaused' : 'Token Paused',
        description: `Successfully ${isPaused ? 'unpaused' : 'paused'} token transfers.`
      });
      
      loadTokens();
    } catch (error: any) {
      console.error('Error toggling pause:', error);
      let errorMessage = 'Failed to toggle pause state.';
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.reason) {
        errorMessage = error.reason;
      } else if (error.code === 'CALL_EXCEPTION') {
        errorMessage = 'Transaction failed. You may not have the required permissions or there might be a network issue.';
      }

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    }
  };

  const handleEmergencyWithdraw = async (tokenAddress: string) => {
    try {
      const signer = await externalProvider.getSigner();
      const tokenContract = getTokenContract(tokenAddress, signer);
      
      const tx = await tokenContract.claimRefund();
      await tx.wait();
      
      toast({
        title: 'Emergency Withdraw',
        description: 'Successfully claimed refund.'
      });
      
      loadTokens();
    } catch (error) {
      console.error('Error claiming refund:', error);
      toast({
        title: 'Error',
        description: 'Failed to claim refund. Make sure presale has ended and soft cap was not reached.',
        variant: 'destructive'
      });
    }
  };

  const handleBlacklist = async (tokenAddress: string) => {
    try {
      const addresses = prompt('Enter addresses to blacklist (comma-separated):');
      if (!addresses) return;
      
      const addressList = addresses.split(',').map(addr => addr.trim());
      const signer = await externalProvider.getSigner();
      const tokenContract = getTokenContract(tokenAddress, signer);
      
      const tx = await tokenContract.updateBlacklist(addressList, true);
      await tx.wait();
      
      toast({
        title: 'Addresses Blacklisted',
        description: `Successfully blacklisted ${addressList.length} addresses.`
      });
    } catch (error) {
      console.error('Error updating blacklist:', error);
      toast({
        title: 'Error',
        description: 'Failed to update blacklist.',
        variant: 'destructive'
      });
    }
  };

  const handleTimeLock = async (tokenAddress: string) => {
    try {
      const address = prompt('Enter address to timelock:');
      if (!address) return;
      
      const duration = prompt('Enter lock duration in days:');
      if (!duration) return;
      
      const unlockTime = Math.floor(Date.now() / 1000) + (parseInt(duration) * 24 * 60 * 60);
      
      const signer = await externalProvider.getSigner();
      const tokenContract = getTokenContract(tokenAddress, signer);
      
      const tx = await tokenContract.setTimeLock(address, unlockTime);
      await tx.wait();
      
      toast({
        title: 'Time Lock Set',
        description: `Successfully set time lock for ${address}.`
      });
    } catch (error) {
      console.error('Error setting time lock:', error);
      toast({
        title: 'Error',
        description: 'Failed to set time lock.',
        variant: 'destructive'
      });
    }
  };

  const handleBurn = async (tokenAddress: string) => {
    try {
      const amount = prompt('Enter amount to burn:');
      if (!amount) return;
      
      const signer = await externalProvider.getSigner();
      const tokenContract = getTokenContract(tokenAddress, signer);
      
      const tx = await tokenContract.burn(parseEther(amount));
      await tx.wait();
      
      toast({
        title: 'Tokens Burned',
        description: `Successfully burned ${amount} tokens.`
      });
      
      loadTokens();
    } catch (error) {
      console.error('Error burning tokens:', error);
      toast({
        title: 'Error',
        description: 'Failed to burn tokens.',
        variant: 'destructive'
      });
    }
  };

  // Add new function for minting/transferring tokens
  const handleMintOrTransfer = async (tokenAddress: string) => {
    try {
      const signer = await externalProvider.getSigner();
      const userAddress = await signer.getAddress();
      const tokenContract = getTokenContract(tokenAddress, signer);
      
      // Create dialog for input
      const dialog = await new Promise<{ toAddress: string; amount: string } | null>((resolve) => {
        const dialog = document.createElement('dialog');
        dialog.className = 'bg-gray-900 rounded-lg p-6 max-w-md w-full border border-border';
        dialog.setAttribute('aria-labelledby', 'dialog-title');
        dialog.setAttribute('aria-describedby', 'dialog-description');
        dialog.innerHTML = `
          <h3 id="dialog-title" class="text-lg font-bold text-text-primary mb-4">Mint or Transfer Tokens</h3>
          <p id="dialog-description" class="text-xs text-text-secondary mb-4">Enter the recipient address and amount to mint or transfer tokens.</p>
          <div class="space-y-4">
            <div>
              <label class="text-xs text-text-secondary">Recipient Address</label>
              <input type="text" id="toAddress" class="w-full bg-gray-800 text-text-primary rounded px-2 py-1 text-sm" placeholder="Enter recipient address" />
            </div>
            <div>
              <label class="text-xs text-text-secondary">Amount</label>
              <input type="text" id="amount" class="w-full bg-gray-800 text-text-primary rounded px-2 py-1 text-sm" placeholder="Enter amount" />
            </div>
          </div>
          <div class="flex justify-end gap-3 mt-6">
            <button id="cancelBtn" class="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-text-primary">Cancel</button>
            <button id="confirmBtn" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white">Continue</button>
          </div>
        `;
        
        document.body.appendChild(dialog);
        dialog.showModal();

        const cancelBtn = dialog.querySelector('#cancelBtn');
        const confirmBtn = dialog.querySelector('#confirmBtn');
        const toAddressInput = dialog.querySelector<HTMLInputElement>('#toAddress');
        const amountInput = dialog.querySelector<HTMLInputElement>('#amount');

        if (cancelBtn && confirmBtn && toAddressInput && amountInput) {
          cancelBtn.addEventListener('click', () => {
            dialog.close();
            resolve(null);
          });

          confirmBtn.addEventListener('click', () => {
            dialog.close();
            resolve({
              toAddress: toAddressInput.value,
              amount: amountInput.value
            });
          });
        } else {
          dialog.close();
          resolve(null);
        }
      });

      if (!dialog) return;

      const { toAddress, amount } = dialog;
      if (!toAddress || !amount) {
        throw new Error('Please enter both recipient address and amount');
      }

      // Get token info
      const [decimals, symbol, owner, balance] = await Promise.all([
        tokenContract.decimals(),
        tokenContract.symbol(),
        tokenContract.owner(),
        tokenContract.balanceOf(userAddress)
      ]);

      // Convert amount to proper units
      const amountInWei = parseEther(amount);
      const isOwner = owner.toLowerCase() === userAddress.toLowerCase();

      if (isOwner) {
        // Try to mint first
        try {
          console.log('Attempting to mint tokens...');
          const mintTx = await tokenContract.mint(toAddress, amountInWei);
          await mintTx.wait();
          
          toast({
            title: 'Success',
            description: `Successfully minted ${amount} ${symbol} to ${toAddress}`
          });
          
          loadTokens();
          return;
        } catch (error) {
          console.log('Could not mint tokens, trying transfer instead...');
        }
      }

      // If minting fails or user is not owner, try transfer
      if (balance >= amountInWei) {
        const transferTx = await tokenContract.transfer(toAddress, amountInWei);
        await transferTx.wait();
        
        toast({
          title: 'Success',
          description: `Successfully transferred ${amount} ${symbol} to ${toAddress}`
        });
        
        loadTokens();
      } else {
        throw new Error(`Insufficient balance. You have ${formatEther(balance)} ${symbol}`);
      }

    } catch (error: any) {
      console.error('Error in mint/transfer:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to mint/transfer tokens',
        variant: 'destructive'
      });
    }
  };

  const handleWhitelist = async (tokenAddress: string) => {
    try {
      const addresses = prompt('Enter addresses to whitelist (comma-separated):');
      if (!addresses) return;
      
      const addressList = addresses.split(',').map(addr => addr.trim());
      const signer = await externalProvider.getSigner();
      const tokenContract = getTokenContract(tokenAddress, signer);
      
      const tx = await tokenContract.updateWhitelist(addressList, true);
      await tx.wait();
      
      toast({
        title: 'Addresses Whitelisted',
        description: `Successfully whitelisted ${addressList.length} addresses.`
      });
    } catch (error) {
      console.error('Error updating whitelist:', error);
      toast({
        title: 'Error',
        description: 'Failed to update whitelist.',
        variant: 'destructive'
      });
    }
  };

  const handleFinalize = async (token: TokenInfo) => {
    if (!token) return;
    
    try {
      setLoading(true);
      const signer = await externalProvider.getSigner();
      const tokenContract = new Contract(token.address, TokenV3UpdatedABI, signer);
      
      const tx = await tokenContract.finalize();
      
      toast({
        title: 'Transaction Sent',
        description: 'Finalizing presale...',
      });
      
      await tx.wait();

      toast({
        title: 'Success',
        description: 'Presale finalized successfully',
      });
      
      await loadTokens();
    } catch (err: any) {
      console.error('Error:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to finalize presale',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddLiquidity = async (token: TokenInfo) => {
    try {
      setSelectedToken(token);
      setError(null);
      setIsAddLiquidityDialogOpen(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add liquidity';
      console.error('Error adding liquidity:', err);
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    }
  };

  // Update the minimal ABI to include the addLiquidityFromContract function
  const TokenTemplate_v3_Enhanced_MinimalABI = [
    // ... existing code ...
    "function addLiquidityFromContract(uint256 tokenAmount) external payable",
    "function getRemainingLiquidityAllocation() external view returns (uint256)",
    // ... existing code ...
  ];

  // Update the handleAddLiquidityConfirm function to use addLiquidityFromContract
  const handleAddLiquidityConfirm = async ({ tokenAmount, ethAmount, useContractTokens }: { tokenAmount: string; ethAmount: string; useContractTokens: boolean }): Promise<void> => {
    try {
      setLoading(true);
      
      // Check if token and chain are selected
      if (!selectedToken || !chainId) {
        throw new Error("Please select a token and chain");
      }
      
      const signer = await externalProvider.getSigner();
      const userAddress = await signer.getAddress();
      const tokenContract = new Contract(selectedToken.address, TokenV3UpdatedABI, signer);
      
      // Get the contract address
      const contractAddress = selectedToken.address;
      
      // Check if user is the owner
      const ownerAddress = await tokenContract.owner();
      if (ownerAddress.toLowerCase() !== userAddress.toLowerCase()) {
        throw new Error("Only the token owner can add liquidity");
      }
      
      // Validate ETH amount and convert to BigNumber
      if (!ethAmount || parseFloat(ethAmount) <= 0) {
        throw new Error("Please enter a valid ETH amount");
      }
      
      const ethAmountBN = parseUnits(ethAmount, 18);
      
      // Check user ETH balance
      const ethBalance = await externalProvider.getBalance(userAddress);
      if (ethBalance < ethAmountBN) {
        throw new Error(`Insufficient ETH balance. You have ${formatEther(ethBalance)} ETH`);
      }

      // Use the correct router address from environment variables for Arbitrum Sepolia
      const ROUTER_ADDRESS = '0xD9Aa0Ca55115900908bd649793D9b8dE11Fb7368';
      const WETH_ADDRESS = '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14';
      const FACTORY_ADDRESS = '0x5FdBfd0AfD0788abD85cf42daebbaA9d4d60F038';
      
      console.log("Using router address:", ROUTER_ADDRESS);
      
      if (useContractTokens) {
        console.log("Using contract tokens for liquidity");
        
        try {
          // Parse the token amount from the dialog input
          const tokenAmountBN = parseUnits(tokenAmount, 18);
          console.log("Using token amount from dialog:", formatEther(tokenAmountBN));
          
          if (BigInt(tokenAmountBN) === BigInt(0)) {
            throw new Error("No tokens specified for liquidity");
          }
          
          // Perform a proactive check for locked or unavailable tokens
          console.log("Performing proactive token availability check...");
          try {
            // Try to get token info to determine if tokens might be locked
            const contractBalance = await tokenContract.balanceOf(contractAddress);
            const totalSupply = await tokenContract.totalSupply();
            console.log("Contract balance vs total supply:", {
              contractBalance: formatEther(contractBalance),
              totalSupply: formatEther(totalSupply)
            });
            
            // Check if this token might have locking or vesting mechanics
            let hasLockingMechanics = false;
            
            // Check for common contract functions that indicate locking/vesting
            for (const fnName of [
              'lock', 'unlock', 'locked', 'lockTokens', 'vestingSchedule', 
              'getVestingSchedule', 'isLocked', 'tokenLock', 'releaseTime',
              'presaleStatus', 'getPresaleState', 'finalizePresale'
            ]) {
              if (typeof tokenContract[fnName] === 'function') {
                console.log(`Found locking/vesting function: ${fnName}`);
                hasLockingMechanics = true;
                break;
              }
            }
            
            if (hasLockingMechanics) {
              // Show a warning but continue with the attempt
              toast({
                title: "Token Protection Detected",
                description: "This token may have locking or vesting mechanics. If adding liquidity fails, try using wallet tokens instead.",
                variant: "default"
              });
            }
          } catch (infoError) {
            console.log("Could not check token info:", infoError);
          }
          
          // Specifically check for liquidity allocation issues
          try {
            // Try to detect if liquidity allocation is accessible
            let liquidityAllocation = BigInt(0);
            
            // Try different methods to get liquidity allocation
            if (typeof tokenContract.liquidityAllocation === 'function') {
              liquidityAllocation = await tokenContract.liquidityAllocation();
            } else if (typeof tokenContract.getLiquidityAllocation === 'function') {
              liquidityAllocation = await tokenContract.getLiquidityAllocation();
            } else if (typeof tokenContract.liquidityReserve === 'function') {
              liquidityAllocation = await tokenContract.liquidityReserve();
            }
            
            console.log("Liquidity allocation detected:", formatEther(liquidityAllocation));
            
            // Critical check: if contract has tokens but can't transfer the liquidity allocation
            if (BigInt(liquidityAllocation) > BigInt(0) && BigInt(contractBalance) >= BigInt(liquidityAllocation)) {
              // Try a test approve to see if the liquidity tokens can be moved
              try {
                // Use estimateGas on the contract method, not on BaseContractMethod
                const canApprove = await tokenContract.estimateGas["approve"](userAddress, 1);
                console.log("Contract can approve tokens:", canApprove);
              } catch (approveTestError) {
                console.error("Token cannot approve transfer - critical contract design issue:", approveTestError);
                toast({
                  title: "Critical Contract Issue",
                  description: "The liquidity allocation cannot be transferred. This is a fundamental design issue in the token contract.",
                  variant: "destructive"
                });
              }
            }
          } catch (liquidityCheckError) {
            console.log("Error checking liquidity allocation:", liquidityCheckError);
          }
          
          // Create factory contract
          const factoryContract = new Contract(
            FACTORY_ADDRESS,
            [
              'function createPair(address tokenA, address tokenB) external returns (address pair)',
              'function getPair(address tokenA, address tokenB) external view returns (address pair)'
            ],
            signer
          );
          
          // Check if pair exists
          console.log("Checking if pair exists...");
          const pairCheck = await factoryContract.getPair(
            contractAddress,
            WETH_ADDRESS
          );
          
          console.log("Current pair address:", pairCheck);
          
          // If the contract has a built-in function for adding liquidity, use it
          try {
            console.log("Attempting to call addLiquidityFromContractTokens...");
            
            toast({
              title: "Adding Liquidity",
              description: "Sending transaction to add liquidity using contract tokens",
            });
            
            // First check if we need to add a router parameter
            let tx;
            try {
              // Try with ROUTER_ADDRESS parameter first (some implementations require this)
              tx = await tokenContract.addLiquidityFromContractTokens(ROUTER_ADDRESS, {
                value: ethAmountBN,
                gasLimit: 3000000
              });
            } catch (routerParamError) {
              console.log("Failed with router parameter, trying without parameters");
              
              // Try without parameters (original implementation)
              tx = await tokenContract.addLiquidityFromContractTokens({
                value: ethAmountBN,
                gasLimit: 3000000
              });
            }
            
            console.log("Transaction sent:", tx.hash);
            
            toast({
              title: "Transaction Sent",
              description: "Waiting for transaction to be confirmed...",
            });
            
            // Wait for transaction to be mined
            const receipt = await tx.wait();
            console.log("Transaction confirmed:", receipt);
            
            // Success!
            toast({
              title: "Success",
              description: "Liquidity added successfully!",
            });
            
            await loadTokens();
            setIsAddLiquidityDialogOpen(false);
            return;
          } catch (methodError: any) {
            console.log("addLiquidityFromContractTokens failed:", methodError.message);
            
            // If the first method fails, try a different signature
            try {
              console.log("Attempting direct router liquidity...");
              
              // Create router contract
              const routerContract = new Contract(
                ROUTER_ADDRESS,
                [
                  'function addLiquidityETH(address token, uint256 amountTokenDesired, uint256 amountTokenMin, uint256 amountETHMin, address to, uint256 deadline) external payable returns (uint256 amountToken, uint256 amountETH, uint256 liquidity)'
                ],
                signer
              );
              
              // Get remaining liquidity allocation
              let remainingAllocation;
              try {
                remainingAllocation = await tokenContract.getRemainingLiquidityAllocation();
                console.log("Remaining liquidity allocation:", formatEther(remainingAllocation));
              } catch (e) {
                console.log("getRemainingLiquidityAllocation not available, using contract balance");
                remainingAllocation = await tokenContract.balanceOf(contractAddress);
                console.log("Contract balance as allocation:", formatEther(remainingAllocation));
              }
              
              // Approve the router to spend tokens from the contract
              console.log("Approving router to spend tokens...");
              
              // First check current allowance
              const routerAllowance = await tokenContract.allowance(contractAddress, ROUTER_ADDRESS);
              console.log("Current router allowance:", formatEther(routerAllowance));
              
              if (BigInt(routerAllowance) < BigInt(remainingAllocation)) {
                // Need to approve - try multiple approaches
                try {
                  // Try standard approve from contract to router (if contract supports it)
                  const approveTx = await tokenContract.approve(ROUTER_ADDRESS, remainingAllocation);
                  await approveTx.wait();
                  console.log("Router approved for token spending");
                } catch (approveError: any) {
                  console.log("Standard approve failed:", approveError.message);
                  
                  // Try alternative approval methods
                  try {
                    // Some tokens have a special approveExternal or similar method
                    const alternateTx = await tokenContract.approveExternal(ROUTER_ADDRESS, remainingAllocation);
                    await alternateTx.wait();
                    console.log("Router approved via approveExternal");
                  } catch (alternateApproveError: any) {
                    console.log("Alternative approval methods failed");
                    throw new Error("Could not approve router to spend tokens");
                  }
                }
              }
              
              // Calculate min amounts with 2% slippage
              const amountTokenMin = (BigInt(remainingAllocation) * BigInt(98)) / BigInt(100);
              const amountETHMin = (ethAmountBN * BigInt(98)) / BigInt(100);
              const deadline = Math.floor(Date.now() / 1000) + 1800; // 30 minutes
              
              toast({
                title: "Adding Liquidity via Router",
                description: "Sending transaction to add liquidity",
              });
              
              const directTx = await routerContract.addLiquidityETH(
                tokenContract.address,
                remainingAllocation,
                amountTokenMin,
                amountETHMin,
                userAddress,
                deadline,
                {
                  value: ethAmountBN,
                  gasLimit: 5000000
                }
              );
              
              console.log("Transaction sent:", directTx.hash);
              
              toast({
                title: "Transaction Sent",
                description: "Waiting for transaction to be confirmed...",
              });
              
              const directReceipt = await directTx.wait();
              console.log("Transaction confirmed:", directReceipt);
              
              toast({
                title: "Success",
                description: "Liquidity added successfully!",
              });
              
              await loadTokens();
              setIsAddLiquidityDialogOpen(false);
              return;
            } catch (routerError: any) {
              console.log("Direct router liquidity failed:", routerError.message);
              // Continue to next approach
            }
            
            // If the first method fails, try the alternative method
            try {
              console.log("Attempting to call addLiquidityFromContract with parameter...");
              
              const tx = await tokenContract.addLiquidityFromContract(tokenAmountBN, {
                value: ethAmountBN,
                gasLimit: 3000000
              });
              
              console.log("Transaction sent:", tx.hash);
              
              toast({
                title: "Transaction Sent",
                description: "Waiting for transaction to be confirmed...",
              });
              
              // Wait for transaction to be mined
              const receipt = await tx.wait();
              console.log("Transaction confirmed:", receipt);
              
              // Success!
              toast({
                title: "Success",
                description: "Liquidity added successfully!",
              });
              
              await loadTokens();
              setIsAddLiquidityDialogOpen(false);
              return;
            } catch (alternativeMethodError: any) {
              console.log("addLiquidityFromContract failed:", alternativeMethodError.message);
              
              // If both built-in methods fail, we need to do it manually
              console.log("Built-in liquidity methods failed, trying manual approach...");
            }
          }
          
          // Manual approach - first ensure the token contract has approved the router
          console.log("Using manual approach to add liquidity");
          
          // Check if the token contract has approved the router
          const routerAllowance = await tokenContract.allowance(contractAddress, ROUTER_ADDRESS);
          console.log("Router allowance for contract tokens:", formatEther(routerAllowance));
          
          // If allowance is insufficient, we need to approve
          if (BigInt(routerAllowance) < BigInt(tokenAmountBN)) {
            console.log("Contract doesn't have a direct approval method. Trying alternative approach...");
            
            toast({
              title: "Using Alternative Approach",
              description: "The contract doesn't support direct approval. Trying to transfer tokens first.",
            });
            
            // Try to use a transfer function if available
            try {
              // Check if the contract has a function to transfer tokens from contract to owner
              // Try different possible function names
              let transferTx;
              
              try {
                console.log("Trying withdrawTokens function...");
                transferTx = await tokenContract.withdrawTokens(userAddress, tokenAmountBN);
              } catch (e) {
                console.log("withdrawTokens failed, trying transferTokens...");
                try {
                  transferTx = await tokenContract.transferTokens(userAddress, tokenAmountBN);
                } catch (e) {
                  console.log("transferTokens failed, trying standard transfer...");
                  // Last resort - try standard transfer if contract allows it
                  transferTx = await tokenContract.transfer(userAddress, tokenAmountBN);
                }
              }
              
              toast({
                title: "Transfer Initiated",
                description: "Waiting for tokens to be transferred to your wallet...",
              });
              
              await transferTx.wait();
              console.log("Tokens transferred from contract to owner");
              
              toast({
                title: "Transfer Complete",
                description: "Tokens transferred to your wallet. Proceeding with liquidity addition.",
              });
              
              // Verify the tokens were received
              const newBalance = await tokenContract.balanceOf(userAddress);
              console.log("New wallet balance:", formatEther(newBalance));
              
              if (BigInt(newBalance) < BigInt(tokenAmountBN)) {
                throw new Error("Failed to transfer enough tokens to wallet");
              }
            } catch (transferError: any) {
              console.error("All transfer methods failed:", transferError);
              
              // Check if the error is about exceeding balance
              const isBalanceError = transferError.message && 
                (transferError.message.includes('exceeds balance') || 
                 transferError.message.includes('insufficient balance'));
              
              if (isBalanceError) {
                // Try to get the actual available balance
                try {
                  // Get the actual contract tokens that can be moved
                  const availableBalance = await tokenContract.balanceOf(contractAddress);
                  console.log("Reported contract balance:", formatEther(availableBalance));
                  
                  // NEW: Directly check if the contract appears to have liquidity allocation issues
                  console.log("Checking for liquidity allocation issues...");
                  let liquidityAllocationIssue = false;
                  
                  // Try different methods to check if liquidity allocation is properly set up
                  try {
                    if (typeof tokenContract.liquidityAllocation === 'function') {
                      const allocation = await tokenContract.liquidityAllocation();
                      console.log("Liquidity allocation value:", formatEther(allocation));
                      
                      if (BigInt(allocation) > BigInt(0) && BigInt(availableBalance) >= BigInt(allocation)) {
                        liquidityAllocationIssue = true;
                        console.error("CRITICAL: Contract has tokens but cannot use the liquidity allocation");
                        
                        toast({
                          title: "Critical Contract Design Issue",
                          description: "The token contract has a liquidity allocation that cannot be accessed. This is a fundamental design flaw.",
                          variant: "destructive"
                        });
                      }
                    }
                  } catch (checkError) {
                    console.log("Could not check liquidity allocation:", checkError);
                  }
                  
                  // Check if this is a presale or locked token
                  let isPresaleOrLocked = false;
                  let isVestingToken = false;
                  
                  // Try to detect if this is a presale token
                  try {
                    // Check for common presale functions
                    if (typeof tokenContract.getPresaleState === 'function') {
                      const presaleState = await tokenContract.getPresaleState();
                      isPresaleOrLocked = presaleState !== 2; // Assuming 2 means completed
                      console.log("Presale state detected:", presaleState);
                    } else if (typeof tokenContract.presaleStatus === 'function') {
                      const presaleStatus = await tokenContract.presaleStatus();
                      isPresaleOrLocked = !presaleStatus; // If false, presale not completed
                      console.log("Presale status detected:", presaleStatus);
                    }
                  } catch (presaleCheckError) {
                    console.log("No presale functions detected");
                  }
                  
                  // Try to detect if this is a vesting token
                  try {
                    if (typeof tokenContract.getVestingSchedule === 'function' || 
                        typeof tokenContract.vestingEnabled === 'function' ||
                        typeof tokenContract.isVestingToken === 'function') {
                      isVestingToken = true;
                      console.log("Vesting token detected");
                    }
                  } catch (vestingCheckError) {
                    console.log("No vesting functions detected");
                  }
                  
                  // Get the deployable amount if available
                  let deployableAmount;
                  try {
                    deployableAmount = await tokenContract.getDeployableTokens();
                    console.log("Deployable tokens:", formatEther(deployableAmount));
                  } catch (e) {
                    // Function doesn't exist, use a fraction of the reported balance
                    deployableAmount = BigInt(availableBalance) / BigInt(10); // Try 10%
                    console.log("Using 10% of reported balance:", formatEther(deployableAmount));
                  }
                  
                  if (deployableAmount && BigInt(deployableAmount) > BigInt(0)) {
                    toast({
                      title: "Trying with Available Balance",
                      description: `Using available balance of ${formatEther(deployableAmount)} tokens instead.`,
                    });
                    
                    // Try again with the smaller amount
                    try {
                      // Try the built-in method with the smaller amount
                      console.log("Trying addLiquidityFromContractTokens with smaller amount...");
                      
                      // Sometimes contracts have a parameter-less version that uses the available balance
                      const tx = await tokenContract.addLiquidityWithEth({
                        value: ethAmountBN,
                        gasLimit: 5000000
                      });
                      
                      console.log("Transaction sent:", tx.hash);
                      
                      toast({
                        title: "Transaction Sent",
                        description: "Using contract's built-in liquidity function...",
                      });
                      
                      await tx.wait();
                      console.log("Transaction confirmed successfully");
                      
                      toast({
                        title: "Success",
                        description: "Liquidity added successfully!",
                      });
                      
                      await loadTokens();
                      setIsAddLiquidityDialogOpen(false);
                      return;
                    } catch (smallerAmountError) {
                      console.error("Smaller amount attempt failed:", smallerAmountError);
                    }
                  }
                  
                  // Provide specific guidance based on detected token type
                  if (isPresaleOrLocked) {
                    toast({
                      title: "Presale Not Finalized",
                      description: "This token appears to be in presale state. You may need to finalize the presale before adding liquidity.",
                      variant: "destructive"
                    });
                    
                    throw new Error("Could not add liquidity: Token is in presale state. Please finalize the presale first, then try again.");
                  } else if (isVestingToken) {
                    toast({
                      title: "Vesting Mechanics Detected",
                      description: "This token has vesting mechanics that may prevent direct liquidity addition. Try using wallet tokens instead.",
                      variant: "destructive"
                    });
                    
                    throw new Error("Could not add liquidity: Token has vesting mechanics. Please use tokens from your wallet instead.");
                  } else {
                    // Generic message for other token types
                    toast({
                      title: "Tokens Unavailable",
                      description: "The tokens in the contract cannot be accessed directly. Please try using tokens from your wallet instead.",
                      variant: "destructive"
                    });
                    
                    throw new Error("Could not add liquidity from contract: Token may require using wallet tokens. " + 
                      (transferError.message || "Unknown error"));
                  }
                } catch (balanceCheckError) {
                  console.error("Failed to check available balance:", balanceCheckError);
                }
              }
              
              // If we can't transfer tokens, suggest trying wallet tokens instead
              toast({
                title: "Use Wallet Tokens Instead",
                description: "Many tokens have protection mechanisms that prevent direct use of contract tokens. Please uncheck 'Use Contract Tokens' and try again using tokens from your wallet.",
                variant: "destructive"
              });
              
              throw new Error("Could not add liquidity from contract: Token may require using wallet tokens. " + 
                (transferError.message || "Unknown error"));
            }
          }
          
          // Now transfer tokens from contract to owner
          console.log("Transferring tokens from contract to owner...");
          
          toast({
            title: "Transferring Tokens",
            description: "Transferring tokens from contract to your wallet",
          });
          
          try {
            const transferTx = await tokenContract.transferFromContract(userAddress, tokenAmountBN);
            
            toast({
              title: "Transfer Sent",
              description: "Waiting for transfer transaction to be confirmed...",
            });
            
            await transferTx.wait();
            console.log("Tokens transferred from contract to owner");
            
            toast({
              title: "Transfer Confirmed",
              description: "Tokens transferred to your wallet",
            });
          } catch (transferError: any) {
            console.error("Error transferring tokens:", transferError);
            throw new Error("Failed to transfer tokens: " + (transferError.message || "Unknown error"));
          }
          
          // Now add liquidity using the router directly
          console.log("Adding liquidity via router with wallet tokens...");
          
          // First approve the router to spend tokens from the owner
          const ownerAllowance = await tokenContract.allowance(userAddress, ROUTER_ADDRESS);
          
          if (BigInt(ownerAllowance) < BigInt(tokenAmountBN)) {
            console.log("Approving router to spend owner tokens...");
            
            toast({
              title: "Approval Required",
              description: "Approving router to spend your tokens",
            });
            
            const approveTx = await tokenContract.approve(ROUTER_ADDRESS, tokenAmountBN);
            
            toast({
              title: "Approval Sent",
              description: "Waiting for approval transaction to be confirmed...",
            });
            
            await approveTx.wait();
            console.log("Router approved to spend owner tokens");
            
            toast({
              title: "Approval Confirmed",
              description: "Router approved to spend your tokens",
            });
          }
          
          // Create router contract
          const routerContract = new Contract(
            ROUTER_ADDRESS,
            [
              'function addLiquidityETH(address token, uint256 amountTokenDesired, uint256 amountTokenMin, uint256 amountETHMin, address to, uint256 deadline) external payable returns (uint256 amountToken, uint256 amountETH, uint256 liquidity)'
            ],
            signer
          );
          
          // Calculate min amounts (95% of desired amounts to account for slippage)
          const amountTokenMin = BigInt(tokenAmountBN) * BigInt(95) / BigInt(100);
          const amountETHMin = BigInt(ethAmountBN) * BigInt(95) / BigInt(100);
          
          // 30 minutes from now
          const deadline = Math.floor(Date.now() / 1000) + 1800;
          
          toast({
            title: "Adding Liquidity",
            description: "Sending transaction to add liquidity",
          });
          
          const liquidityTx = await routerContract.addLiquidityETH(
            contractAddress,
            tokenAmountBN,
            amountTokenMin,
            amountETHMin,
            userAddress,
            deadline,
            {
              value: ethAmountBN,
              gasLimit: 3000000
            }
          );
          
          toast({
            title: "Transaction Sent",
            description: "Waiting for transaction to be confirmed...",
          });
          
          await liquidityTx.wait();
          console.log("Liquidity added successfully");
          
          toast({
            title: "Success",
            description: "Liquidity added successfully!",
          });
        } catch (error: any) {
          console.error("Error adding liquidity from contract:", error);
          throw new Error("Failed to add liquidity: " + (error.message || "Unknown error"));
        }
      } else {
        // Using wallet tokens
        console.log("Using wallet tokens for liquidity");
        
        // Convert token amount to wei
        const tokenAmountBN = parseUnits(tokenAmount, 18);
        
        // Check wallet token balance
        const walletBalance = await tokenContract.balanceOf(userAddress);
        console.log("Wallet token balance:", formatEther(walletBalance));
        
        if (BigInt(walletBalance) < BigInt(tokenAmountBN)) {
          throw new Error(`Insufficient token balance in wallet. You have ${formatEther(walletBalance)} tokens`);
        }
        
        // Use minimal UniswapV2Router02 interface
        const uniswapRouter = new Contract(
          ROUTER_ADDRESS,
          [
            'function addLiquidityETH(address token, uint amountTokenDesired, uint amountTokenMin, uint amountETHMin, address to, uint deadline) external payable returns (uint amountToken, uint amountETH, uint liquidity)'
          ],
          signer
        );
        
        // Check and approve router allowance
        const allowance = await tokenContract.allowance(userAddress, ROUTER_ADDRESS);
        console.log("Router allowance:", formatEther(allowance));
        
        if (BigInt(allowance) < BigInt(tokenAmountBN)) {
          console.log("Approving router to spend tokens...");
          
          toast({
            title: "Approval Required",
            description: "Please approve the router to spend your tokens",
          });
          
          const approveTx = await tokenContract.approve(ROUTER_ADDRESS, tokenAmountBN);
          console.log("Approval transaction sent:", approveTx.hash);
          
          toast({
            title: "Approval Sent",
            description: "Waiting for approval transaction to be confirmed...",
          });
          
          const approveReceipt = await approveTx.wait();
          console.log("Approval transaction confirmed:", approveReceipt);
          
          toast({
            title: "Approval Confirmed",
            description: "Router approved to spend tokens. Adding liquidity...",
          });
        }
        
        try {
          // Use higher slippage for first liquidity addition (50% to ensure it goes through)
          // First liquidity is tricky due to price discovery - using higher slippage ensures success
          const slippagePercent = selectedToken.pairAddress && selectedToken.pairAddress !== "0x0000000000000000000000000000000000000000" ? 5 : 50;
          console.log(`Using ${slippagePercent}% slippage for ${selectedToken.pairAddress ? 'existing' : 'new'} liquidity pool`);
          
          // Calculate min amounts based on slippage
          const amountTokenMin = BigInt(tokenAmountBN) * BigInt(100 - slippagePercent) / BigInt(100);
          const amountETHMin = BigInt(ethAmountBN) * BigInt(100 - slippagePercent) / BigInt(100);
          
          // 30 minutes from now
          const deadline = Math.floor(Date.now() / 1000) + 1800;
          
          console.log("Adding liquidity via UniswapV2Router:", {
            router: ROUTER_ADDRESS,
            token: selectedToken.address,
            amountTokenDesired: formatEther(tokenAmountBN),
            amountTokenMin: formatEther(amountTokenMin),
            amountETHMin: formatEther(amountETHMin),
            to: userAddress,
            slippage: `${slippagePercent}%`,
            deadline
          });
          
          toast({
            title: "Adding Liquidity",
            description: "Sending transaction...",
          });
          
          // Execute transaction with high slippage tolerance for first liquidity
          try {
            // Diagnostic check for router
            console.log("Running DEX router diagnostics...");
            
            // Check if we can get the factory from the router
            const routerContract = new Contract(
              ROUTER_ADDRESS,
              [
                'function factory() external view returns (address)',
                'function WETH() external view returns (address)'
              ],
              signer
            );
            
            try {
              const factoryAddress = await routerContract.factory();
              const wethAddress = await routerContract.WETH();
              
              console.log("Router diagnostic results:", {
                routerAddress: ROUTER_ADDRESS,
                factoryAddress,
                wethAddress,
                tokenAddress: selectedToken.address
              });
              
              // Try to get the factory contract to check for pairs
              const factoryContract = new Contract(
                factoryAddress,
                [
                  'function getPair(address tokenA, address tokenB) external view returns (address)',
                  'function createPair(address tokenA, address tokenB) external returns (address)'
                ],
                signer
              );
              
              // Check if pair exists
              const existingPair = await factoryContract.getPair(selectedToken.address, wethAddress);
              console.log("Existing pair:", existingPair);
              
              if (existingPair === "0x0000000000000000000000000000000000000000") {
                // Try manually creating the pair first
                toast({
                  title: "Creating Liquidity Pair",
                  description: "This token doesn't have a liquidity pair yet. Creating one now...",
                });
                
                try {
                  const createPairTx = await factoryContract.createPair(
                    selectedToken.address, 
                    wethAddress,
                    {
                      gasLimit: 3000000
                    }
                  );
                  
                  console.log("Create pair transaction sent:", createPairTx.hash);
                  
                  toast({
                    title: "Creating Pair",
                    description: "Waiting for pair creation to be confirmed...",
                  });
                  
                  await createPairTx.wait();
                  
                  // Check the new pair
                  const newPair = await factoryContract.getPair(selectedToken.address, wethAddress);
                  console.log("New pair created:", newPair);
                  
                  toast({
                    title: "Pair Created",
                    description: "Liquidity pair created successfully. Now adding liquidity...",
                  });
                } catch (pairError) {
                  console.error("Failed to create pair:", pairError);
                  toast({
                    title: "Pair Creation Failed",
                    description: "Could not create liquidity pair. Attempting to continue...",
                    variant: "destructive"
                  });
                }
              }
            } catch (routerError) {
              console.error("Router diagnostics failed:", routerError);
            }
            
            // Proceed with normal liquidity addition attempt
            const tx = await uniswapRouter.addLiquidityETH(
              selectedToken.address,
              tokenAmountBN,
              amountTokenMin,
              amountETHMin,
              userAddress,
              deadline,
              {
                value: ethAmountBN,
                gasLimit: 3000000
              }
            );
            
            console.log("Transaction sent:", tx.hash);
            
            toast({
              title: "Transaction Sent",
              description: "Waiting for confirmation...",
            });
            
            const receipt = await tx.wait();
            console.log("Transaction confirmed:", receipt);
            
            toast({
              title: "Success",
              description: "Liquidity added successfully!",
            });
          } catch (txError: any) {
            console.error("Transaction failed:", txError);
            
            // If the transaction failed due to slippage, try again with higher slippage
            if (txError.message && (
                txError.message.includes("INSUFFICIENT_OUTPUT_AMOUNT") || 
                txError.message.includes("price impact too high") ||
                txError.message.includes("execution reverted"))
            ) {
              toast({
                title: "Initial Transaction Failed",
                description: "Trying with maximum slippage tolerance for first liquidity provision...",
              });
              
              // Use 90% slippage as a last resort for first liquidity
              const emergencyAmountTokenMin = BigInt(tokenAmountBN) * BigInt(10) / BigInt(100);
              const emergencyAmountETHMin = BigInt(ethAmountBN) * BigInt(10) / BigInt(100);
              
              console.log("Retrying with 90% slippage:", {
                amountTokenMin: formatEther(emergencyAmountTokenMin),
                amountETHMin: formatEther(emergencyAmountETHMin)
              });
              
              // Execute without gas estimate
              const emergencyTx = await uniswapRouter.addLiquidityETH(
                selectedToken.address,
                tokenAmountBN,
                emergencyAmountTokenMin,
                emergencyAmountETHMin,
                userAddress,
                deadline,
                {
                  value: ethAmountBN,
                  gasLimit: 3000000
                }
              );
              
              console.log("Emergency transaction sent:", emergencyTx.hash);
              
              toast({
                title: "Transaction Sent",
                description: "Using high slippage tolerance for first liquidity pool creation...",
              });
              
              const emergencyReceipt = await emergencyTx.wait();
              console.log("Emergency transaction confirmed:", emergencyReceipt);
              
              toast({
                title: "Success",
                description: "Liquidity added successfully with high slippage tolerance!",
              });
              
              // Reset form and refresh token data
              setIsAddLiquidityDialogOpen(false);
              await loadTokens();
              return;
            } else {
              // For other errors, provide appropriate guidance
              if (txError.message && txError.message.includes("TRANSFER_FAILED")) {
                toast({
                  title: "Transfer Failed",
                  description: "The token contract rejected the transfer. This may be due to fee mechanics or transfer restrictions.",
                  variant: "destructive"
                });
                throw new Error("Failed to add liquidity: Token transfer failed. Your token may have transfer restrictions.");
              } else {
                toast({
                  title: "Transaction Failed",
                  description: "Failed to add liquidity. Check the console for details.",
                  variant: "destructive"
                });
                throw new Error("Failed to add liquidity: " + (txError.message || "Unknown error"));
              }
            }
          }
        } catch (error: any) {
          console.error("Error adding liquidity:", error);
          
          // Provide specific guidance based on the error
          if (error.message && error.message.includes("INSUFFICIENT_OUTPUT_AMOUNT")) {
            toast({
              title: "Slippage Error",
              description: "Transaction would result in too much slippage. Try using smaller amounts or adjusting parameters.",
              variant: "destructive"
            });
            throw new Error("Failed to add liquidity: Price impact too high. Try smaller amounts.");
          } else if (error.message && error.message.includes("TRANSFER_FAILED")) {
            toast({
              title: "Transfer Failed",
              description: "The token contract rejected the transfer. This may be due to fee mechanics or transfer restrictions.",
              variant: "destructive"
            });
            throw new Error("Failed to add liquidity: Token transfer failed. Your token may have transfer restrictions.");
          } else {
            toast({
              title: "Transaction Failed",
              description: "Failed to add liquidity. Check the console for details.",
              variant: "destructive"
            });
            throw new Error("Failed to add liquidity: " + (error.message || "Unknown error"));
          }
        }
      }
      
      // Reset form and refresh token data
      setIsAddLiquidityDialogOpen(false);
      await loadTokens();
      
    } catch (error: any) {
      console.error("Error adding liquidity:", error);
      
      // Extract a more user-friendly error message
      let errorMessage = 'Failed to add liquidity';
      
      if (error.reason) {
        errorMessage = error.reason;
      } else if (error.message) {
        // Clean up common error messages
        if (error.message.includes('user rejected transaction')) {
          errorMessage = 'Transaction was rejected';
        } else if (error.message.includes('insufficient funds')) {
          errorMessage = 'Insufficient ETH to complete the transaction';
        } else if (error.message.includes('execution reverted')) {
          errorMessage = 'Transaction reverted: Contract requirements not met';
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
      setLoading(false);
      setIsAddLiquidityDialogOpen(false);
    }
  };

  const handleCreateVesting = async (token: TokenInfo) => {
    if (!token) return;
    
    try {
      setLoading(true);
      const signer = await externalProvider.getSigner();
      const tokenContract = new Contract(token.address, TokenV3UpdatedABI, signer);

      const beneficiary = prompt('Enter beneficiary address:');
      if (!beneficiary) return;
      
      const amount = prompt('Enter amount of tokens to vest:');
      if (!amount) return;
      
      const cliffMonths = prompt('Enter cliff period in months:');
      if (!cliffMonths) return;
      
      const vestingMonths = prompt('Enter vesting period in months:');
      if (!vestingMonths) return;
      
      const startTime = Math.floor(Date.now() / 1000);
      const cliffDuration = parseInt(cliffMonths) * 30 * 24 * 60 * 60;
      const vestingDuration = parseInt(vestingMonths) * 30 * 24 * 60 * 60;
      
      const tx = await tokenContract.createVestingSchedule(
        beneficiary,
        parseEther(amount),
        startTime,
        cliffDuration,
        vestingDuration,
        true // revocable
      );
      await tx.wait();

      toast({
        title: 'Vesting Schedule Created',
        description: `Successfully created vesting schedule for ${beneficiary}`
      });
      
      loadTokens();
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create vesting';
      console.error('Error creating vesting:', err);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeVesting = async (token: TokenInfo) => {
    try {
      setLoading(true);
      const signer = await externalProvider.getSigner();
      const tokenContract = getTokenContract(token.address, signer);
      
      // Create minimal ABI for initial token info
      const minimalABI = [
        "function balanceOf(address account) view returns (uint256)"
      ];
      const tokenContractMinimal = new ethers.Contract(token.address, minimalABI, signer);
      
      // Get token balance
      const userAddress = await signer.getAddress();
      const tokenBalance = await tokenContractMinimal.balanceOf(userAddress);
      
      if (tokenBalance <= 0) {
        throw new Error('No tokens available to add liquidity');
      }

      // Show dialog to get amounts
      const dialog = await new Promise<{ tokenAmount: string; bnbAmount: string } | null>((resolve) => {
        const dialog = document.createElement('dialog');
        dialog.className = 'bg-gray-900 rounded-lg p-6 max-w-md w-full border border-border';
        dialog.setAttribute('aria-labelledby', 'add-liquidity-dialog-title');
        dialog.setAttribute('aria-describedby', 'add-liquidity-dialog-description');
        dialog.innerHTML = `
          <h3 id="add-liquidity-dialog-title" class="text-lg font-bold text-text-primary mb-4">Add Back Liquidity</h3>
          <p id="add-liquidity-dialog-description" class="text-xs text-text-secondary mb-4">Specify the amount of tokens and ETH to add to the liquidity pool.</p>
          <div class="space-y-4">
            <div>
              <label class="text-xs text-text-secondary">Token Amount</label>
              <input type="number" id="tokenAmount" class="w-full bg-gray-800 text-text-primary rounded px-2 py-1 text-sm" placeholder="Enter token amount" />
            </div>
            <div>
              <label class="text-xs text-text-secondary">BNB Amount</label>
              <input type="text" id="bnbAmount" class="w-full bg-gray-800 text-text-primary rounded px-2 py-1 text-sm" placeholder="Enter BNB amount" />
            </div>
          </div>
          <div class="flex justify-end gap-3 mt-6">
            <button id="cancelBtn" class="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-text-primary">Cancel</button>
            <button id="confirmBtn" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white">Add Liquidity</button>
          </div>
        `;
        
        document.body.appendChild(dialog);
        dialog.showModal();

        const cancelBtn = dialog.querySelector('#cancelBtn');
        const confirmBtn = dialog.querySelector('#confirmBtn');
        const tokenAmountInput = dialog.querySelector<HTMLInputElement>('#tokenAmount');
        const bnbAmountInput = dialog.querySelector<HTMLInputElement>('#bnbAmount');

        if (cancelBtn && confirmBtn && tokenAmountInput && bnbAmountInput) {
          cancelBtn.addEventListener('click', () => {
            dialog.close();
            resolve(null);
          });

          confirmBtn.addEventListener('click', () => {
            dialog.close();
            resolve({
              tokenAmount: tokenAmountInput.value,
              bnbAmount: bnbAmountInput.value
            });
          });
        } else {
          dialog.close();
          resolve(null);
        }
      });
      
      if (!dialog) return;

      const { tokenAmount, bnbAmount } = dialog;
      if (!tokenAmount || !bnbAmount) {
        throw new Error('Please enter both token and BNB amounts');
      }

      // Add liquidity
      if (selectedToken) {
        await handleAddLiquidity(selectedToken);
      } else {
        throw new Error('No token selected for adding liquidity');
      }

    } catch (error: any) {
      console.error('Error adding back liquidity:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add back liquidity',
        variant: 'destructive'
      });
    }
  };

  const handleBlockToken = async (token: TokenInfo) => {
    if (!token) return;
    try {
      setTokenToBlock(token);
      setBlockDialogOpen(true); // Use blockDialogOpen state instead of showBlockDialog
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to block token';
      console.error('Error blocking token:', err);
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    }
  };

  const confirmBlockToken = async (): Promise<void> => {
    if (!tokenToBlock) return;
    try {
      // Save the token address to blocked tokens list
      saveBlockedToken(tokenToBlock.address);
      
      // Remove token from the state
      setTokens(tokens.filter(t => t.address !== tokenToBlock.address));
      
      // Close dialog and reset state
      setBlockDialogOpen(false);
      setTokenToBlock(null);
      
      toast({
        title: 'Token Blocked',
        description: `Token ${tokenToBlock.name} has been blocked and won't be shown anymore.`,
        variant: 'default'
      });
    } catch (error) {
      console.error('Error blocking token:', error);
      toast({
        title: 'Error',
        description: 'Failed to block token',
        variant: 'destructive'
      });
      // Make sure to close the dialog even in case of error
      setBlockDialogOpen(false);
      setTokenToBlock(null);
    }
  };

  const handleReleaseVested = async (token: TokenInfo) => {
    try {
      setLoading(true);
      const signer = await externalProvider.getSigner();
      const tokenContract = getTokenContract(token.address, signer);
      // ... rest of the function
    } catch (error) {
      console.error('Error releasing vested tokens:', error);
      toast({
        title: 'Error',
        description: 'Failed to release vested tokens',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewVestingSchedules = async (token: TokenInfo) => {
    try {
      setLoading(true);
      const signer = await externalProvider.getSigner();
      const tokenContract = getTokenContract(token.address, signer);
      // ... rest of the function
    } catch (error) {
      console.error('Error viewing vesting schedules:', error);
      toast({
        title: 'Error',
        description: 'Failed to view vesting schedules',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveLiquidity = async (token: TokenInfo) => {
    try {
      setLoading(true);
      const signer = await externalProvider.getSigner();
      const tokenContract = getTokenContract(token.address, signer);
      // ... rest of the function
    } catch (error) {
      console.error('Error removing liquidity:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove liquidity',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBurnLPTokens = async (token: TokenInfo) => {
    try {
      setLoading(true);
      const signer = await externalProvider.getSigner();
      const tokenContract = getTokenContract(token.address, signer);
      // ... rest of the function
    } catch (error) {
      console.error('Error burning LP tokens:', error);
      toast({
        title: 'Error',
        description: 'Failed to burn LP tokens',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useImperativeHandle(ref, () => ({
    loadTokens: () => {
      console.log('TCAP_v3: loadTokens called via ref');
      loadTokens();
    }
  }));

  if (!isConnected) {
    return (
      <div className="p-1 bg-gray-800 rounded-lg shadow-lg">
        <h2 className="text-xs font-medium text-text-primary">Token Management (V3)</h2>
        <p className="text-xs text-text-secondary">Please connect your wallet to manage tokens.</p>
      </div>
    );
  }

  return (
    <div className="form-card" ref={containerRef}>
      <div
        className="flex justify-between items-center cursor-pointer py-2 px-1"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium text-text-primary">Token Creator Admin Controls (V3)</h2>
          <span className="text-xs text-text-secondary">
            {showOnlyRecent ? `${Math.min(tokens.length, 3)}/${tokens.length}` : tokens.length} tokens
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowOnlyRecent(!showOnlyRecent);
            }}
            className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 text-text-primary rounded"
          >
            {showOnlyRecent ? 'Show All' : 'Show Recent'}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              loadTokens();
            }}
            className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 text-text-primary rounded"
          >
            Refresh
          </button>
          <span className="text-text-accent hover:text-blue-400 text-lg p-2 w-8 h-8 flex items-center justify-center">
            {isExpanded ? '▼' : '▶'}
          </span>
        </div>
      </div>

      {isExpanded && (
        loading ? (
            <div className="flex justify-center items-center py-1">
            <Spinner className="w-3 h-3 text-text-primary" />
            </div>
          ) : error ? (
          <div className="text-center py-1 text-red-400 text-xs">
              {error}
            </div>
        ) : tokens.length === 0 ? (
          <div className="mt-1">
            <p className="text-xs text-text-secondary">No V3 tokens found. Deploy a new token to get started.</p>
            </div>
          ) : (
          <div className="space-y-1 mt-1">
            {displayedTokens.map((token) => (
              <div key={token.address} className="border border-border rounded p-2 bg-gray-800">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                    <h3 className="text-xs font-medium text-text-primary">{token.name} ({token.symbol})</h3>
                    <p className="text-xs text-text-secondary">Supply: {Number(token.totalSupply).toLocaleString()} {token.symbol}</p>
                    <p className="text-xs mt-1">
                      Status: {" "}
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        token.paused 
                        ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' 
                        : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      }`}>
                        {token.paused ? 'Paused' : 'Active'}
                      </span>
                    </p>
                    {token.presaleInfo && (
                      <div className="mt-1">
                      <p className="text-xs text-text-secondary">
                          Presale: {Number(token.presaleInfo.totalContributed).toLocaleString()} ETH
                          ({token.presaleInfo.contributorCount} contributors)
                      </p>
                      <p className="text-xs text-text-secondary">
                          Start: {new Date(token.presaleInfo.startTime * 1000).toLocaleString()}
                      </p>
                      <p className="text-xs text-text-secondary">
                          End: {new Date(token.presaleInfo.endTime * 1000).toLocaleString()}
                      </p>
                    </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => setSelectedToken(selectedToken === token ? null : token)}
                      className="text-xs px-2 py-0.5 bg-gray-700 hover:bg-gray-600 text-text-primary rounded"
                    >
                      {selectedToken === token ? 'Hide' : 'Manage'}
                    </button>
                    <button
                      onClick={() => handleBlockToken(token)}
                      className="px-1.5 py-0.5 text-xs bg-red-600/20 hover:bg-red-600/40 border border-red-600/40 rounded text-red-400 hover:text-red-300 transition-colors"
                      title="Permanently remove from management panel"
                    >
                      Block
                    </button>
                  </div>
                </div>

                {selectedToken === token && (
                    <div className="mt-2 pt-2 border-t border-border">
                    <div className="grid grid-cols-2 gap-3">
                      {/* Token Explorer Section */}
                        <div className="flex flex-col gap-1">
                        <h4 className="text-xs font-medium text-text-primary mb-1">Token Explorer</h4>
                        <div className="flex gap-1">
                          <a
                            href={getExplorerUrl(chainId ?? undefined, token.address, 'token')}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs px-2 py-0.5 bg-gray-700 hover:bg-gray-600 text-text-primary rounded"
                          >
                            View on Explorer
                          </a>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(token.address);
                              toast({
                                title: "Address Copied",
                                description: "Token address copied to clipboard"
                              });
                            }}
                            className="text-xs px-2 py-0.5 bg-gray-700 hover:bg-gray-600 text-text-primary rounded"
                          >
                            Copy Address
                          </button>
                        </div>
                        </div>

                      {/* Token Controls Section */}
                          <div className="flex flex-col gap-1">
                        <h4 className="text-xs font-medium text-text-primary mb-1">Token Controls</h4>
                        <div className="grid grid-cols-2 gap-1">
                                  <button
                            onClick={() => handlePause(token.address)}
                            className="text-xs px-2 py-0.5 bg-gray-700 hover:bg-gray-600 text-text-primary rounded"
                                  >
                            {token.paused ? 'Unpause' : 'Pause'}
                                  </button>
                          <button
                            onClick={() => handleMintOrTransfer(token.address)}
                            className="text-xs px-2 py-0.5 bg-gray-700 hover:bg-gray-600 text-text-primary rounded"
                          >
                            Mint/Transfer
                          </button>
                          <button
                            onClick={() => handleBlacklist(token.address)}
                            className="text-xs px-2 py-0.5 bg-gray-700 hover:bg-gray-600 text-text-primary rounded"
                          >
                            Blacklist
                          </button>
                          <button
                            onClick={() => handleTimeLock(token.address)}
                            className="text-xs px-2 py-0.5 bg-gray-700 hover:bg-gray-600 text-text-primary rounded"
                          >
                            Time Lock
                          </button>
                          <button
                            onClick={() => handleBurn(token.address)}
                            className="text-xs px-2 py-0.5 bg-gray-700 hover:bg-gray-600 text-text-primary rounded"
                          >
                            Burn
                          </button>
                              </div>
                            </div>

                      {/* Vesting Management Section */}
                          <div className="flex flex-col gap-1">
                        <h4 className="text-xs font-medium text-text-primary mb-1">Vesting Management</h4>
                        <div className="space-x-2">
                          <button
                            onClick={() => handleCreateVesting(token)}
                            className="text-xs px-2 py-0.5 bg-gray-700 hover:bg-gray-600 text-text-primary rounded"
                          >
                            Create Vesting
                          </button>
                          <button
                            onClick={() => handleRevokeVesting(token)}
                            className="text-xs px-2 py-0.5 bg-gray-700 hover:bg-gray-600 text-text-primary rounded"
                          >
                            Revoke Vesting
                          </button>
                          <button
                            onClick={() => handleReleaseVested(token)}
                            className="text-xs px-2 py-0.5 bg-gray-700 hover:bg-gray-600 text-text-primary rounded"
                          >
                            Release Vested
                          </button>
                          <button
                            onClick={() => handleViewVestingSchedules(token)}
                            className="text-xs px-2 py-0.5 bg-gray-700 hover:bg-gray-600 text-text-primary rounded"
                          >
                            Vesting Schedules
                          </button>
                            </div>
                        
                        {token.vestingInfo?.hasVesting && (
                          <div className="mt-2">
                            <p className="text-xs text-text-secondary">Total Amount: {token.vestingInfo.totalAmount}</p>
                            <p className="text-xs text-text-secondary">Released: {token.vestingInfo.releasedAmount}</p>
                            <p className="text-xs text-text-secondary">Releasable: {token.vestingInfo.releasableAmount}</p>
                            <p className="text-xs text-text-secondary">
                              Start: {new Date(token.vestingInfo.startTime * 1000).toLocaleString()}
                            </p>
                            <p className="text-xs text-text-secondary">
                              Cliff: {Math.floor(Number(token.vestingInfo.cliffDuration) / (24 * 60 * 60))} days
                            </p>
                            <p className="text-xs text-text-secondary">
                              Duration: {Math.floor(Number(token.vestingInfo.vestingDuration) / (24 * 60 * 60))} days
                            </p>
                            {token.vestingInfo.revoked && (
                              <p className="text-xs text-red-500">Vesting Revoked</p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Presale Management Section */}
                      {token.presaleInfo && (
                        <div className="col-span-2">
                          <h4 className="text-xs font-medium text-text-primary mb-1">Presale Management</h4>
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <p className="text-xs text-text-secondary">Soft Cap: {token.presaleInfo.softCap} ETH</p>
                              <p className="text-xs text-text-secondary">Hard Cap: {token.presaleInfo.hardCap} ETH</p>
                              <p className="text-xs text-text-secondary">Min/Max: {token.presaleInfo.minContribution}/{token.presaleInfo.maxContribution} ETH</p>
                              <p className="text-xs text-text-secondary">Rate: {token.presaleInfo.presaleRate} tokens/ETH</p>
                            </div>
                            <div>
                              <p className="text-xs text-text-secondary">Start: {new Date(token.presaleInfo.startTime * 1000).toLocaleString()}</p>
                              <p className="text-xs text-text-secondary">End: {new Date(token.presaleInfo.endTime * 1000).toLocaleString()}</p>
                              <p className="text-xs text-text-secondary">Contributors: {token.presaleInfo.contributorCount}</p>
                              <p className="text-xs text-text-secondary">Total Raised: {token.presaleInfo.totalContributed} ETH</p>
                            </div>
                          <div className="flex flex-col gap-1">
                              <button
                                onClick={() => handleWhitelist(token.address)}
                                className="text-xs px-2 py-0.5 bg-gray-700 hover:bg-gray-600 text-text-primary rounded"
                                disabled={token.presaleInfo.finalized}
                              >
                                Manage Whitelist
                              </button>
                                <button
                                onClick={() => handleFinalize(token)}
                                className="text-xs px-2 py-0.5 bg-gray-700 hover:bg-gray-600 text-text-primary rounded"
                                disabled={token.presaleInfo.finalized || 
                                  Number(token.presaleInfo.totalContributed) < Number(token.presaleInfo.softCap)}
                              >
                                Finalize Presale
                                </button>
                              <button
                                onClick={() => handleEmergencyWithdraw(token.address)}
                                className="text-xs px-2 py-0.5 bg-gray-700 hover:bg-gray-600 text-text-primary rounded"
                                disabled={token.presaleInfo.finalized || 
                                  Number(token.presaleInfo.totalContributed) >= Number(token.presaleInfo.softCap) ||
                                  Date.now() < token.presaleInfo.endTime * 1000}
                              >
                                Emergency Withdraw
                              </button>
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="w-full bg-gray-700 rounded-full h-1.5 mt-2">
                            <div 
                              className="bg-blue-600 h-1.5 rounded-full" 
                              style={{ 
                                width: `${Math.min(
                                  (Number(token.presaleInfo.totalContributed) / Number(token.presaleInfo.hardCap)) * 100, 
                                  100
                                )}%` 
                              }}
                            ></div>
                          </div>

                          {/* Contributors List */}
                          {token.presaleInfo.contributors.length > 0 && (
                            <div className="mt-2">
                              <h5 className="text-xs font-medium text-text-primary mb-1">Contributors</h5>
                              <div className="max-h-32 overflow-y-auto">
                                {token.presaleInfo.contributors.map((contributor, index) => (
                                  <div key={index} className="text-xs text-text-secondary flex justify-between items-center py-0.5">
                                    <span>{shortenAddress(contributor.address)}</span>
                                    <span>{contributor.contribution} ETH = {contributor.tokenAllocation} {token.symbol}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                              )}
                            </div>
                      )}

                      {/* Liquidity Management Section */}
                      <div className="col-span-2">
                        <h4 className="text-xs font-medium text-text-primary mb-1">Liquidity Management</h4>
                        <div className="flex flex-col gap-2">
                          {token.liquidityInfo?.hasLiquidity ? (
                            <div className="space-y-2">
                              <div className="bg-gray-800 rounded p-3">
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div>
                                    <span className="text-gray-400">Your LP Balance:</span>
                                    <span className="text-white ml-1">{token.liquidityInfo.lpTokenBalance} LP</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">Pool Share:</span>
                                    <span className="text-white ml-1">{token.liquidityInfo.sharePercentage}%</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">Token Reserve:</span>
                                    <span className="text-white ml-1">{Number(token.liquidityInfo.reserve0).toFixed(6)} {token.symbol}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">ETH Reserve:</span>
                                    <span className="text-white ml-1">{Number(token.liquidityInfo.reserve1).toFixed(6)} ETH</span>
                                  </div>
                                </div>

                                <div className="mt-3 flex gap-2">
                                  <button
                                    onClick={() => handleAddLiquidity(token)}
                                    className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 text-text-primary rounded"
                                  >
                                    Add More Liquidity
                                  </button>
                                  {Number(token.liquidityInfo.lpTokenBalance) > 0 && (
                                    <>
                                      <button
                                        onClick={() => handleRemoveLiquidity(token)}
                                        className="text-xs px-2 py-1 bg-red-600/20 hover:bg-red-600/40 text-red-400 hover:text-red-300 rounded"
                                      >
                                        Remove Liquidity
                                      </button>
                                      <button
                                        onClick={() => handleBurnLPTokens(token)}
                                        className="text-xs px-2 py-1 bg-red-600/20 hover:bg-red-600/40 text-red-400 hover:text-red-300 rounded"
                                      >
                                        Burn LP
                                      </button>
                                    </>
                                  )}
                                </div>

                                <div className="mt-2">
                                  <p className="text-xs text-text-secondary">
                                    Pair Address: {token.pairAddress}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleAddLiquidity(token)}
                              className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 text-text-primary rounded"
                            >
                              Add Initial Liquidity
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                              </div>
                            )}
                          </div>
            ))}
          </div>
        )
      )}

      {/* Add the vesting schedules popup */}
      <Dialog 
        open={showVestingSchedules} 
        onOpenChange={(open) => setShowVestingSchedules(open)}
      >
        <DialogContent className="bg-gray-800 p-0" aria-describedby="vesting-schedules-description">
          <div className="p-4 border-b border-gray-700">
            <DialogTitle>Vesting Schedules</DialogTitle>
            <DialogDescription id="vesting-schedules-description">
              View and manage token vesting schedules for all recipients.
            </DialogDescription>
          </div>
          <div className="p-4 max-w-2xl w-full" aria-describedby="vesting-schedules-description">
            <div className="space-y-4">
              {vestingSchedules.length > 0 ? (
                vestingSchedules.map((schedule, index) => (
                  <div key={index} className="bg-gray-700/50 rounded-lg p-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-gray-400">Beneficiary</p>
                        <p className="text-white">{shortenAddress(schedule.beneficiary)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Total Amount</p>
                        <p className="text-white">{schedule.totalAmount}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Released Amount</p>
                        <p className="text-white">{schedule.releasedAmount}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Releasable Amount</p>
                        <p className="text-white">{schedule.releasableAmount}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Start Time</p>
                        <p className="text-white">{schedule.startTime}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Cliff Duration</p>
                        <p className="text-white">{Math.floor(Number(schedule.cliffDuration) / (24 * 60 * 60))} days</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Vesting Duration</p>
                        <p className="text-white">{Math.floor(Number(schedule.vestingDuration) / (24 * 60 * 60))} days</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Status</p>
                        <p className="text-white">
                          {schedule.revoked ? 'Revoked' : 'Active'}
                          {schedule.revocable && !schedule.revoked && ' (Revocable)'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-400 text-center">No vesting schedules found</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add the block dialog */}
      <BlockDialog
        isOpen={blockDialogOpen}
        onClose={() => {
          setBlockDialogOpen(false);
          setTokenToBlock(null);
        }}
        onConfirm={confirmBlockToken}
        tokenName={tokenToBlock?.name || ''}
        tokenAddress={tokenToBlock?.address || ''}
      />
      
      {selectedToken && (
        <AddLiquidityDialog
          isOpen={isAddLiquidityDialogOpen}
          onClose={() => {
            setIsAddLiquidityDialogOpen(false);
            setSelectedToken(null);
          }}
          onConfirm={handleAddLiquidityConfirm}
          tokenSymbol={selectedToken.symbol}
          tokenTotalSupply={selectedToken.totalSupply}
          selectedToken={selectedToken}
          externalProvider={externalProvider}
        />
      )}
    </div>
  );
});

export default TCAP_v3; 