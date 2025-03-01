import { useEffect, useState, forwardRef, useImperativeHandle, useMemo, useRef, ReactNode } from 'react';
import { Contract, parseEther } from 'ethers';
import { formatEther, parseUnits } from 'viem';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toast/use-toast';
import TokenV3ABI from '@/contracts/abi/TokenTemplate_v3_Enhanced.json';
import TokenFactoryV3ABI from '@/contracts/abi/TokenFactory_v3.json';
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
      <DialogContent>
        <DialogTitle>Block Token Confirmation</DialogTitle>
        <DialogDescription>
          Are you sure you want to block the token {tokenName} ({tokenAddress})?
          This action cannot be undone.
        </DialogDescription>
        <div className="flex justify-end space-x-4 mt-4">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={onConfirm}>Block Token</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddLiquidityDialog({ isOpen, onClose, onConfirm, tokenSymbol }: AddLiquidityDialog) {
  const [tokenAmount, setTokenAmount] = useState('');
  const [ethAmount, setEthAmount] = useState('');

  // Calculate derived values
  const tokenPrice = useMemo(() => {
    if (!tokenAmount || !ethAmount) return null;
    try {
      const tokenValue = parseFloat(tokenAmount);
      const ethValue = parseFloat(ethAmount);
      if (tokenValue <= 0) return null;
      return ethValue / tokenValue;
    } catch {
      return null;
    }
  }, [tokenAmount, ethAmount]);

  // Calculate tokens per ETH
  const tokensPerEth = useMemo(() => {
    if (!tokenPrice) return null;
    return 1 / tokenPrice;
  }, [tokenPrice]);

  const handleConfirm = () => {
    onConfirm(tokenAmount, ethAmount);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogTitle>Add Liquidity</DialogTitle>
        <DialogDescription>
          Enter the amount of {tokenSymbol} tokens and ETH you want to add to the liquidity pool.
        </DialogDescription>
        <div className="space-y-4 mt-4">
          <div>
            <Label htmlFor="tokenAmount">Token Amount ({tokenSymbol})</Label>
            <Input
              id="tokenAmount"
              type="text"
              value={tokenAmount}
              onChange={(e) => setTokenAmount(e.target.value)}
              placeholder="Enter token amount"
            />
          </div>
          <div>
            <Label htmlFor="ethAmount">ETH Amount</Label>
            <Input
              id="ethAmount"
              type="text"
              value={ethAmount}
              onChange={(e) => setEthAmount(e.target.value)}
              placeholder="Enter ETH amount"
            />
          </div>

          {/* Price Calculator Section */}
          {(tokenAmount && ethAmount) && (
            <div className="mt-4 p-4 bg-gray-800 rounded-lg">
              <h4 className="text-sm font-medium text-text-primary mb-3">Price Information</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Initial Token Price:</span>
                  <span className="text-white">{tokenPrice ? `${tokenPrice.toFixed(8)} ETH per ${tokenSymbol}` : '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Tokens per ETH:</span>
                  <span className="text-white">{tokensPerEth ? `${tokensPerEth.toFixed(2)} ${tokenSymbol}` : '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Value:</span>
                  <span className="text-white">{ethAmount ? `${ethAmount} ETH` : '-'}</span>
                </div>
              </div>
              <div className="mt-3 text-xs text-gray-400">
                <p>• This will set the initial trading price for your token</p>
                <p>• Higher liquidity means less price impact from trades</p>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-4">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button 
              onClick={handleConfirm}
              disabled={!tokenAmount || !ethAmount || parseFloat(tokenAmount) <= 0 || parseFloat(ethAmount) <= 0}
            >
              Add Liquidity
            </Button>
          </div>
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
    
    // Sepolia addresses
    const UNISWAP_V2_FACTORY = '0x7E0987E5b3a30e3f2828572Bb659A548460a3003';
    const WETH_SEPOLIA = '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14';
    
    console.log('Using Factory:', UNISWAP_V2_FACTORY);
    console.log('Using WETH:', WETH_SEPOLIA);

    // Create factory contract with full ABI
    const factoryContract = new ethers.Contract(
      UNISWAP_V2_FACTORY,
      [
        'function getPair(address tokenA, address tokenB) external view returns (address pair)',
        'function allPairs(uint) external view returns (address pair)',
        'function allPairsLength() external view returns (uint)'
      ],
      signer
    );

    // Try both token orderings
    let pairAddress = await factoryContract.getPair(tokenAddress, WETH_SEPOLIA).catch(() => ethers.ZeroAddress);
    console.log('Pair address (token/WETH):', pairAddress);
    
    if (pairAddress === ethers.ZeroAddress) {
      pairAddress = await factoryContract.getPair(WETH_SEPOLIA, tokenAddress).catch(() => ethers.ZeroAddress);
      console.log('Pair address (WETH/token):', pairAddress);
      
      if (pairAddress === ethers.ZeroAddress) {
        console.log('No pair exists yet - this is normal when adding liquidity for the first time');
      }
    }

    return pairAddress;
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

interface AddLiquidityDialog {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (tokenAmount: string, ethAmount: string) => void;
  tokenSymbol: string;
}

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

  // Add state for vesting schedules popup
  const [showVestingSchedules, setShowVestingSchedules] = useState(false);
  const [selectedTokenForSchedules, setSelectedTokenForSchedules] = useState<string | null>(null);
  const [vestingSchedules, setVestingSchedules] = useState<any[]>([]);

  // Add these state variables after the existing ones
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [tokenToBlock, setTokenToBlock] = useState<TokenInfo | null>(null);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
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
    return new Contract(tokenAddress, TokenV3ABI.abi, signer);
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
          "function getUserCreatedTokens(address) view returns (address[])",
          "function getUserTokens(address) view returns (address[])",  // This is the actual function name in the contract
          "function deploymentFee() view returns (uint256)",
          "function feeRecipient() view returns (address)",
          "function uniswapV2Router() view returns (address)"
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
            const tokenContract = new ethers.Contract(tokenAddress, TokenV3ABI.abi, signer);

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
        dialog.innerHTML = `
          <h3 class="text-lg font-bold text-text-primary mb-4">Mint or Transfer Tokens</h3>
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
      const tokenContract = new Contract(token.address, TokenV3ABI.abi, signer);
      
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

  const handleAddLiquidityConfirm = async (tokenAmount: string, ethAmount: string): Promise<void> => {
    try {
        console.log('Adding liquidity...');
        if (!externalProvider || !factoryAddress || !selectedToken) return;

        const signer = await externalProvider.getSigner();
        const tokenContract = new Contract(selectedToken.address, TokenV3ABI.abi, signer);
        const userAddress = await signer.getAddress();

        // Check ownership
        const tokenOwner = await tokenContract.owner();
        console.log('Token owner:', tokenOwner);
        console.log('User address:', userAddress);
        if (tokenOwner.toLowerCase() !== userAddress.toLowerCase()) {
            throw new Error('Not token owner');
        }

        // Check remaining liquidity allocation
        const remainingLiquidityAllocation = await tokenContract.remainingLiquidityAllocation();
        console.log('Remaining liquidity allocation:', remainingLiquidityAllocation.toString());
        const tokenAmountBN = parseEther(tokenAmount);
        if (BigInt(remainingLiquidityAllocation.toString()) < BigInt(tokenAmountBN.toString())) {
            throw new Error('Amount exceeds remaining liquidity allocation');
        }

        // Check contract token balance
        const contractBalance = await tokenContract.balanceOf(selectedToken.address);
        console.log('Contract token balance:', contractBalance.toString());
        console.log('Required token amount:', tokenAmountBN.toString());
        if (BigInt(contractBalance.toString()) < BigInt(tokenAmountBN.toString())) {
            throw new Error('Insufficient contract balance');
        }

        // Get router address and create router contract
        const routerAddress = await tokenContract.uniswapV2Router();
        console.log('Router address:', routerAddress);
        
        // Router ABI - just the functions we need
        const routerAbi = [
            "function addLiquidityETH(address token, uint amountTokenDesired, uint amountTokenMin, uint amountETHMin, address to, uint deadline) external payable returns (uint amountToken, uint amountETH, uint liquidity)"
        ];
        const routerContract = new Contract(routerAddress, routerAbi, signer);

        const currentPairAddress = await tokenContract.uniswapV2Pair();
        console.log('Current pair address:', currentPairAddress);

        // Calculate minimum amounts (1% slippage)
        const minTokenAmount = (BigInt(tokenAmountBN.toString()) * BigInt(99)) / BigInt(100);
        const ethAmountBN = parseEther(ethAmount);
        const minEthAmount = (BigInt(ethAmountBN.toString()) * BigInt(99)) / BigInt(100);
        
        // Set deadline to 20 minutes from now
        const deadline = Math.floor(Date.now() / 1000) + 1200;

        console.log('Calling token contract addLiquidity function...');
        console.log('Transaction parameters:', {
            tokenAmount: tokenAmountBN.toString(),
            ethAmount: ethAmountBN.toString(),
            value: ethAmountBN.toString()
        });

        // Use the token contract's addLiquidity function with properly encoded arguments
        console.log('Sending transaction...');
        
        // Get contract information
        console.log('Getting contract information...');
        const [remainingLiqAlloc, tokenBalance, routerAddr] = await Promise.all([
            tokenContract.remainingLiquidityAllocation(),
            tokenContract.balanceOf(selectedToken.address),
            tokenContract.uniswapV2Router()
        ]);
        
        console.log('Contract details:', {
            remainingLiquidityAllocation: remainingLiqAlloc.toString(),
            tokenBalance: tokenBalance.toString(),
            routerAddress: routerAddr
        });
        
        // Check if contract has the needed tokens
        if (BigInt(tokenBalance.toString()) < BigInt(tokenAmountBN.toString())) {
            throw new Error(`Contract doesn't have enough tokens. Has: ${formatEther(tokenBalance)} Needs: ${formatEther(tokenAmountBN)}`);
        }
        
        // Check if within remaining allocation
        if (BigInt(remainingLiqAlloc.toString()) < BigInt(tokenAmountBN.toString())) {
            throw new Error(`Amount exceeds remaining liquidity allocation. Max: ${formatEther(remainingLiqAlloc)}`);
        }
        
        // First approve the router directly (which may be needed in some implementations)
        console.log('Approving router to spend tokens...');
        const approveTx = await tokenContract.approve(routerAddr, tokenAmountBN);
        await approveTx.wait();
        console.log('Router approval complete');
        const tx = await tokenContract.addLiquidity(
            tokenAmountBN,
            ethAmountBN,
            {
                value: ethAmountBN,
                gasLimit: 5000000 // Increased gas limit to be safe
            }
        );
        console.log('Transaction sent:', tx.hash);
        
        // Wait for confirmation
        const receipt = await tx.wait();
        console.log('Transaction confirmed:', receipt);
        
        // Show success message
        toast({
            title: 'Success',
            description: 'Liquidity added successfully',
            variant: 'default'
        });

        // Reload token data
        await loadTokens();
        
        // Close dialog
        setIsAddLiquidityDialogOpen(false);
        setSelectedToken(null);
    } catch (error: any) {
        console.error('Error adding liquidity:', error);
        toast({
            title: 'Error',
            description: error.message || 'Failed to add liquidity',
            variant: 'destructive'
        });
        throw error;
    }
  };

  const handleCreateVesting = async (token: TokenInfo) => {
    if (!token) return;
    
    try {
      setLoading(true);
      const signer = await externalProvider.getSigner();
      const tokenContract = new Contract(token.address, TokenV3ABI.abi, signer);

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
        dialog.innerHTML = `
          <h3 class="text-lg font-bold text-text-primary mb-4">Add Back Liquidity</h3>
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
      setShowBlockDialog(true);
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
      // ... rest of the function
    } catch (error) {
      console.error('Error blocking token:', error);
      toast({
        title: 'Error',
        description: 'Failed to block token',
        variant: 'destructive'
      });
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
        <DialogContent className="bg-gray-800 p-0">
          <div className="p-4 max-w-2xl w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-white">Vesting Schedules</h3>
              <button
                onClick={() => setShowVestingSchedules(false)}
                className="text-gray-400 hover:text-gray-300"
              >
                ×
              </button>
            </div>
            
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
      {tokenToBlock && (
        <BlockDialog
          isOpen={blockDialogOpen}
          onClose={() => {
            setBlockDialogOpen(false);
            setTokenToBlock(null);
          }}
          onConfirm={confirmBlockToken}
          tokenName={tokenToBlock.name}
          tokenAddress={tokenToBlock.address}
        />
      )}
      
      {selectedToken && (
        <AddLiquidityDialog
          isOpen={isAddLiquidityDialogOpen}
          onClose={() => {
            setIsAddLiquidityDialogOpen(false);
            setSelectedToken(null);
          }}
          onConfirm={handleAddLiquidityConfirm}
          tokenSymbol={selectedToken.symbol}
        />
      )}
    </div>
  );
});

export default TCAP_v3; 