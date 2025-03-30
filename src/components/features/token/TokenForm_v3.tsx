import { useState, useEffect, useRef, forwardRef, ReactNode } from 'react';
import { useChainId, useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { useToast } from '@/components/ui/use-toast';
import TokenPreview from '@components/features/token/TokenPreview';
import { InfoIcon } from '@/components/ui/InfoIcon';
import { Spinner } from '@/components/ui/Spinner';
import { useTokenFactory } from '@/hooks/useTokenFactory';
import { FACTORY_ADDRESSES, getNetworkContractAddress } from '@config/contracts';
import * as z from 'zod';
import { addDays } from 'date-fns';
import { parseEther, parseUnits, formatEther } from 'ethers';
import { useForm, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import TokenDeploymentTest from './TokenDeploymentTest';
import { Alert } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription } from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { getNetworkCurrency } from '@/utils/network';
import { ethers } from 'ethers';
import { TokenFactory_v3_ABI } from '@/contracts/abi/TokenFactory_v3';
import { TokenTemplate_v3_ABI } from '@/contracts/abi/TokenTemplate_v3';
import { Contract, BrowserProvider, Log, BaseContract, ContractTransactionResponse, LogDescription } from 'ethers';
import TokenFormTabs from './TokenFormTabs';

interface TokenFactoryV3Interface extends BaseContract {
  createToken(params: {
    name: string;
    symbol: string;
    initialSupply: bigint;
    maxSupply: bigint;
    owner: `0x${string}`;
    enableBlacklist: boolean;
    enableTimeLock: boolean;
    presaleEnabled: boolean;
    maxActivePresales: number;
    presaleRate: bigint;
    softCap: bigint;
    hardCap: bigint;
    minContribution: bigint;
    maxContribution: bigint;
    startTime: bigint;
    endTime: bigint;
    presalePercentage: number;
    liquidityPercentage: number;
    liquidityLockDuration: bigint;
    wallets: {
      wallet: `0x${string}`;
      percentage: number;
      vestingEnabled: boolean;
      vestingDuration: bigint;
      cliffDuration: bigint;
      vestingStartTime: bigint;
    }[];
  }, overrides?: { value?: bigint }): Promise<ContractTransactionResponse>;
}

interface TokenFormV3Props {
  isConnected: boolean;
  onSuccess?: (tokenAddress: string) => void;
  onError?: (error: any) => void;
  externalProvider?: any;
}

interface ValidationResult {
  category: string;
  message: string;
  details?: string[];
  status: 'success' | 'warning' | 'error';
}

interface TokenParams {
  name: string;
  symbol: string;
  initialSupply: bigint;
  maxSupply: bigint;
  owner: `0x${string}`;
  enableBlacklist: boolean;
  enableTimeLock: boolean;
  presaleEnabled: boolean;
  maxActivePresales: number;
  presaleRate: bigint;
  softCap: bigint;
  hardCap: bigint;
  minContribution: bigint;
  maxContribution: bigint;
  startTime: bigint;
  endTime: bigint;
  presalePercentage: number;
  liquidityPercentage: number;
  liquidityLockDuration: bigint;
  wallets: {
    wallet: `0x${string}`;
    percentage: number;
    vestingEnabled: boolean;
    vestingDuration: bigint;
    cliffDuration: bigint;
    vestingStartTime: bigint;
  }[];
}

interface WalletPreset {
  name: string;
  percentage: string;
  vestingEnabled: boolean;
  vestingDuration: string;
  cliffDuration: string;
  vestingStartTime: number;
}

interface VestingPreset {
  presalePercentage: string;
  liquidityPercentage: string;
  wallets: WalletPreset[];
}

const VESTING_PRESETS: Record<string, VestingPreset> = {
  standard: {
    presalePercentage: "5",
    liquidityPercentage: "70", // 70% when presale enabled, 75% when disabled
    wallets: [
      { 
        name: 'Team', 
        percentage: "15",
        vestingEnabled: true,
        vestingDuration: "365",
        cliffDuration: "90",
        vestingStartTime: Math.floor(Date.now() / 1000) + (24 * 3600)
      },
      { 
        name: 'Marketing', 
        percentage: "10",
        vestingEnabled: true,
        vestingDuration: "180",
        cliffDuration: "30",
        vestingStartTime: Math.floor(Date.now() / 1000) + (24 * 3600)
      }
    ],
  },
  fair_launch: {
    presalePercentage: "5",
    liquidityPercentage: "85", // 85% when presale enabled, 90% when disabled
    wallets: [
      {
        name: 'Team',
        percentage: "10",
        vestingEnabled: true,
        vestingDuration: "365",
        cliffDuration: "180",
        vestingStartTime: Math.floor(Date.now() / 1000) + (24 * 3600)
      }
    ]
  },
  community: {
    presalePercentage: "5",
    liquidityPercentage: "75", // 75% when presale enabled, 80% when disabled
    wallets: [
      {
        name: 'Community Rewards',
        percentage: "10",
        vestingEnabled: true,
        vestingDuration: "180",
        cliffDuration: "30",
        vestingStartTime: Math.floor(Date.now() / 1000) + (24 * 3600)
      },
      {
        name: 'Team',
        percentage: "10",
        vestingEnabled: true,
        vestingDuration: "365",
        cliffDuration: "90",
        vestingStartTime: Math.floor(Date.now() / 1000) + (24 * 3600)
      }
    ]
  },
  growth: {
    presalePercentage: "5",
    liquidityPercentage: "60", // Reduced from 65% to 60%
    wallets: [
      {
        name: 'Team',
        percentage: "15",
        vestingEnabled: true,
        vestingDuration: "365",
        cliffDuration: "90",
        vestingStartTime: Math.floor(Date.now() / 1000) + (24 * 3600)
      },
      {
        name: 'Marketing',
        percentage: "10",
        vestingEnabled: true,
        vestingDuration: "180",
        cliffDuration: "30",
        vestingStartTime: Math.floor(Date.now() / 1000) + (24 * 3600)
      },
      {
        name: 'Development',
        percentage: "10",
        vestingEnabled: true,
        vestingDuration: "365",
        cliffDuration: "60",
        vestingStartTime: Math.floor(Date.now() / 1000) + (24 * 3600)
      }
    ]
  },
  bootstrap: {
    presalePercentage: "5",
    liquidityPercentage: "55", // Reduced from 60% to 55%
    wallets: [
      {
        name: 'Team',
        percentage: "20",
        vestingEnabled: true,
        vestingDuration: "365",
        cliffDuration: "90",
        vestingStartTime: Math.floor(Date.now() / 1000) + (24 * 3600)
      },
      {
        name: 'Marketing',
        percentage: "10",
        vestingEnabled: true,
        vestingDuration: "180",
        cliffDuration: "30",
        vestingStartTime: Math.floor(Date.now() / 1000) + (24 * 3600)
      },
      {
        name: 'Development',
        percentage: "10",
        vestingEnabled: true,
        vestingDuration: "365",
        cliffDuration: "60",
        vestingStartTime: Math.floor(Date.now() / 1000) + (24 * 3600)
      }
    ]
  },
  governance: {
    presalePercentage: "5",
    liquidityPercentage: "55", // Reduced from 60% to 55%
    wallets: [
      {
        name: 'Governance',
        percentage: "20",
        vestingEnabled: true,
        vestingDuration: "365",
        cliffDuration: "90",
        vestingStartTime: Math.floor(Date.now() / 1000) + (24 * 3600)
      },
      {
        name: 'Team',
        percentage: "10",
        vestingEnabled: true,
        vestingDuration: "365",
        cliffDuration: "180",
        vestingStartTime: Math.floor(Date.now() / 1000) + (24 * 3600)
      },
      {
        name: 'Treasury',
        percentage: "10",
        vestingEnabled: true,
        vestingDuration: "365",
        cliffDuration: "60",
        vestingStartTime: Math.floor(Date.now() / 1000) + (24 * 3600)
      }
    ]
  }
};

// Types
type Stage = 'Private' | 'Public' | 'Final';
const stages: Stage[] = ['Private', 'Public', 'Final'];

interface PresaleRound {
  presaleRate: string;
  softCap: string;
  hardCap: string;
  minContribution: string;
  maxContribution: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  whitelistEnabled: boolean;
  isActive: boolean;
}

interface RecommendedConfig {
  softCap: string;
  hardCap: string;
  rate: string;
  desc: string;
  minContribution: string;
  maxContribution: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
}

interface MultiPresaleConfig {
  presales: PresaleRound[];
}

// Schema
const presaleRoundSchema = z.object({
  presaleRate: z.string(),
  softCap: z.string(),
  hardCap: z.string(),
  minContribution: z.string(),
  maxContribution: z.string(),
  startDate: z.string(),
  startTime: z.string(),
  endDate: z.string(),
  endTime: z.string(),
  whitelistEnabled: z.boolean(),
  isActive: z.boolean()
});

const formSchema = z.object({
  name: z.string().min(1).max(32),
  symbol: z.string().min(1).max(10),
  initialSupply: z.string().min(1)
    .refine((val) => !isNaN(Number(val)), "Must be a valid number")
    .refine((val) => Number(val) > 0, "Initial supply must be greater than 0"),
  maxSupply: z.string().min(1)
    .refine((val) => !isNaN(Number(val)), "Must be a valid number")
    .refine((val) => Number(val) > 0, "Max supply must be greater than 0"),
  enableBlacklist: z.boolean().default(false),
  enableTimeLock: z.boolean().default(false),
  presaleEnabled: z.boolean().default(false),
  maxActivePresales: z.number().min(0).default(1),
  presaleRate: z.string().optional(),
  softCap: z.string().optional(),
  hardCap: z.string().optional(),
  minContribution: z.string().optional(),
  maxContribution: z.string().optional(),
  startTime: z.number().optional(),
  endTime: z.number().optional(),
  presalePercentage: z.string()
    .refine((val) => !isNaN(Number(val)), "Must be a valid number")
    .refine((val) => Number(val) >= 0, "Presale percentage must be at least 0%")
    .refine((val) => Number(val) <= 95, "Presale percentage cannot exceed 95%"),
  liquidityPercentage: z.string()
    .refine((val) => !isNaN(Number(val)), "Must be a valid number")
    .refine((val) => Number(val) >= 0, "Liquidity percentage must be at least 0%")
    .refine((val) => Number(val) <= 100, "Liquidity percentage cannot exceed 100%"),
  liquidityLockDuration: z.number(),
  wallets: z.array(z.object({
    name: z.string(),
    address: z.string()
      .min(1, "Wallet address is required")
      .refine(value => /^0x[a-fA-F0-9]{40}$/.test(value), "Invalid address format"),
    percentage: z.string()
      .refine((val) => !isNaN(Number(val)), "Must be a valid number")
      .refine((val) => Number(val) >= 1, "Percentage must be at least 1%")
      .refine((val) => Number(val) <= 60, "Percentage cannot exceed 60%"),
    vestingEnabled: z.boolean(),
    vestingDuration: z.string(),
    cliffDuration: z.string(),
    vestingStartTime: z.number()
  })),
  multiPresaleConfig: z.object({
    presales: z.array(presaleRoundSchema)
  }).optional()
}).refine((data) => {
  // Validate presale configuration
  if (data.presaleEnabled) {
    if (!data.startTime || !data.endTime || data.startTime >= data.endTime) {
      return false;
    }
    // Validate presale percentage when enabled
    if (Number(data.presalePercentage) < 1 || Number(data.presalePercentage) > 95) {
      return false;
    }
  } else {
    // Validate presale percentage is 0 when disabled
    if (Number(data.presalePercentage) !== 0) {
      return false;
    }
  }
  return true;
}, {
  message: "Invalid presale configuration",
  path: ["presalePercentage"]
});

type FormData = z.infer<typeof formSchema>;

function getDefaultTimes() {
  const now = new Date();
  const startTime = new Date(now.getTime() + 3600000); // 1 hour from now
  const endTime = new Date(now.getTime() + 86400000);  // 24 hours from now
  
  return {
    startTime: Math.floor(startTime.getTime() / 1000),
    endTime: Math.floor(endTime.getTime() / 1000)
  };
}

const defaultTimes = getDefaultTimes();

const defaultValues: FormData = {
  name: "Anthony",
  symbol: "ANT",
  initialSupply: "1000000",
  maxSupply: "2000000",
  enableBlacklist: false,
  enableTimeLock: false,
  presaleEnabled: false,
  maxActivePresales: 0,
  presaleRate: "1000", // Default: 1000 tokens per network currency
  softCap: "1", // Default: 1 network currency
  hardCap: "10", // Default: 10 network currency
  minContribution: "0.1", // Default: 0.1 network currency
  maxContribution: "2", // Default: 2 network currency
  startTime: defaultTimes.startTime,
  endTime: defaultTimes.endTime,
  presalePercentage: "0",
  liquidityPercentage: "65",
  liquidityLockDuration: 365,
  wallets: [{
    name: "Team",
    address: "",
    percentage: "10",
    vestingEnabled: true,
    vestingDuration: "365",
    cliffDuration: "90",
    vestingStartTime: Math.floor(Date.now() / 1000) + (24 * 3600)
  }, {
    name: "Marketing",
    address: "",
    percentage: "10",
    vestingEnabled: true,
    vestingDuration: "180",
    cliffDuration: "30",
    vestingStartTime: Math.floor(Date.now() / 1000) + (24 * 3600)
  }, {
    name: "Development",
    address: "",
    percentage: "10",
    vestingEnabled: true,
    vestingDuration: "365",
    cliffDuration: "60",
    vestingStartTime: Math.floor(Date.now() / 1000) + (24 * 3600)
  }],
  multiPresaleConfig: {
    presales: stages.map((stage: Stage, index: number) => ({
      presaleRate: '',
      softCap: '',
      hardCap: '',
      minContribution: '',
      maxContribution: '',
      startDate: new Date().toISOString().split('T')[0],
      startTime: '00:00',
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endTime: '23:59',
      whitelistEnabled: index === 0,
      isActive: true
    }))
  }
};

const TokenForm_v3: React.FC<TokenFormV3Props> = ({ 
  isConnected, 
  onSuccess, 
  onError,
  externalProvider 
}) => {
  const chainId = useChainId();
  const { address: account } = useAccount();
  const publicClient = usePublicClient();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { createToken } = useTokenFactory();
  const [isSimulating, setIsSimulating] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [simulationResults, setSimulationResults] = useState<ValidationResult[]>([]);
  const [showTokenomicsInfo, setShowTokenomicsInfo] = useState(false);
  const [showSimulationDialog, setShowSimulationDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "Anthony",
      symbol: "ANT",
      initialSupply: "1000000",
      maxSupply: "2000000",
      enableBlacklist: false,
      enableTimeLock: false,
      presaleEnabled: false,
      maxActivePresales: 1,
      presaleRate: "1000",
      softCap: "5",
      hardCap: "10",
      minContribution: "0.1",
      maxContribution: "2",
      startTime: defaultTimes.startTime,
      endTime: defaultTimes.endTime,
      presalePercentage: "0",
      liquidityPercentage: "75",
      liquidityLockDuration: 365,
      wallets: [
        {
          name: "Team",
          address: account || "",
          percentage: "15",
          vestingEnabled: false,
          vestingDuration: "365",
          cliffDuration: "90",
          vestingStartTime: Number(Math.floor(Date.now() / 1000) + (24 * 3600))
        },
        {
          name: "Marketing",
          address: account || "",
          percentage: "10",
          vestingEnabled: false,
          vestingDuration: "180",
          cliffDuration: "30",
          vestingStartTime: Number(Math.floor(Date.now() / 1000) + (24 * 3600))
        }
      ]
    },
    mode: "onChange"
  });

  useEffect(() => {
    if (mounted) {
      // Mark required fields as touched to trigger validation
      form.trigger([
        'name',
        'symbol',
        'initialSupply',
        'maxSupply',
        'liquidityPercentage',
        'wallets'  // Add wallets to validation
      ]);
    }
  }, [mounted, form]);

  useEffect(() => {
    console.log('Form mounted with values:', form.getValues());
    console.log('Form validation state:', {
      isValid: form.formState.isValid,
      errors: form.formState.errors,
      isDirty: form.formState.isDirty,
      dirtyFields: form.formState.dirtyFields,
      touchedFields: form.formState.touchedFields
    });
    setMounted(true);
  }, [form]);

  useEffect(() => {
    if (account) {
      const currentWallets = form.getValues('wallets');
      form.setValue('wallets', currentWallets.map(wallet => ({
        ...wallet,
        address: account
      })));
    }
  }, [account, form]);

  // Watch for presale toggle changes
  useEffect(() => {
    const presaleEnabled = form.watch('presaleEnabled');
    
    if (presaleEnabled) {
      // When presale is enabled, set presalePercentage to 5 as required by the contract
      form.setValue('presalePercentage', "5");
      
      // Default to 1 sequential presale round
      const maxActivePresales = form.watch('maxActivePresales');
      if (!maxActivePresales || maxActivePresales < 1) {
        form.setValue('maxActivePresales', 1);
      }
      
      // Set base presale defaults with valid values
      form.setValue('softCap', '5');
      form.setValue('hardCap', '10');
      form.setValue('minContribution', '0.1');
      form.setValue('maxContribution', '2');
      form.setValue('presaleRate', '1000');
      
      // Set start and end times to valid values (1 hour from now and 24 hours from now)
      const now = new Date();
      const startTime = Math.floor(new Date(now.getTime() + 3600000).getTime() / 1000); // 1 hour from now
      const endTime = Math.floor(new Date(now.getTime() + 86400000).getTime() / 1000);  // 24 hours from now
      
      form.setValue('startTime', startTime);
      form.setValue('endTime', endTime);
      
      // Initialize multi-presale config if needed
      const maxRounds = form.getValues('maxActivePresales');
      if (maxRounds > 1) {
        // Create default presale rounds
        const stages = ["Private", "Seed", "Public"];
        const baseRate = Number(form.getValues('presaleRate') || 1000);
        
        const defaultPresales = Array.from({ length: Math.min(maxRounds, 3) }).map((_, index) => {
          const stage = stages[Math.min(index, 2)];
          
          // Default values based on stage
          const presaleConfig = {
            softCap: "5",
            hardCap: "10",
            minContribution: "0.1",
            maxContribution: "2",
            presaleRate: baseRate.toString(),
            startTime: startTime + (index * 86400 * 3), // Each round 3 days apart
            endTime: endTime + (index * 86400 * 3),
            whitelistEnabled: index === 0, // Whitelist enabled by default for private round
            isActive: index === 0 // Only first round active initially
          };
          
          // Adjust values based on stage
          if (stage === "Private") {
            presaleConfig.presaleRate = (baseRate * 1.3).toFixed(0); // 30% discount
            presaleConfig.hardCap = "10";
          } else if (stage === "Seed") {
            presaleConfig.presaleRate = (baseRate * 1.15).toFixed(0); // 15% discount
            presaleConfig.softCap = "10";
            presaleConfig.hardCap = "25";
          } else if (stage === "Public") {
            presaleConfig.presaleRate = baseRate.toString();
            presaleConfig.softCap = "20";
            presaleConfig.hardCap = "50";
            presaleConfig.whitelistEnabled = false;
          }
          
          return presaleConfig;
        });
        
        form.setValue('multiPresaleConfig', { presales: defaultPresales });
      }
      
      // Adjust wallet allocations to not exceed 60% total
      const wallets = form.getValues('wallets');
      let totalWalletPercentage = wallets.reduce((sum, w) => sum + (Number(w.percentage) || 0), 0);
      
      if (totalWalletPercentage > 60) {
        // Reduce wallet allocations proportionally to fit within 60%
        const reductionFactor = 60 / totalWalletPercentage;
        const updatedWallets = wallets.map(wallet => ({
          ...wallet,
          percentage: Math.floor(Number(wallet.percentage) * reductionFactor)
        }));
        
        form.setValue('wallets', updatedWallets);
      }
    } else {
      // When presale is disabled, reset presale values
      form.setValue('presalePercentage', "0");
      form.setValue('maxActivePresales', 0);
      form.setValue('liquidityPercentage', "75"); // Set a reasonable default for liquidity
    }
  }, [form.watch('presaleEnabled')]);

  // Add new effect to watch for changes to maxActivePresales
  useEffect(() => {
    const presaleEnabled = form.watch('presaleEnabled');
    if (!presaleEnabled) return;
    
    const maxRounds = form.watch('maxActivePresales');
    if (maxRounds > 1) {
      // Update multi-presale config when maxActivePresales changes
      const currentConfig = form.getValues('multiPresaleConfig')?.presales || [];
      const baseRate = Number(form.getValues('presaleRate') || 1000);
      const now = new Date();
      const startTime = Math.floor(new Date(now.getTime() + 3600000).getTime() / 1000);
      const endTime = Math.floor(new Date(now.getTime() + 86400000).getTime() / 1000);
      
      // Create or update presale rounds
      const stages = ["Private", "Seed", "Public"];
      const updatedPresales = Array.from({ length: Math.min(maxRounds, 3) }).map((_, index) => {
        const stage = stages[Math.min(index, 2)];
        
        // Use existing values if available
        if (currentConfig[index]) {
          return currentConfig[index];
        }
        
        // Create new defaults
        const presaleConfig = {
          softCap: "5",
          hardCap: "10",
          minContribution: "0.1",
          maxContribution: "2",
          presaleRate: baseRate.toString(),
          startTime: startTime + (index * 86400 * 3), // Each round 3 days apart
          endTime: endTime + (index * 86400 * 3),
          whitelistEnabled: index === 0,
          isActive: index === 0
        };
        
        // Adjust values based on stage
        if (stage === "Private") {
          presaleConfig.presaleRate = (baseRate * 1.3).toFixed(0);
          presaleConfig.hardCap = "10";
        } else if (stage === "Seed") {
          presaleConfig.presaleRate = (baseRate * 1.15).toFixed(0);
          presaleConfig.softCap = "10";
          presaleConfig.hardCap = "25";
        } else if (stage === "Public") {
          presaleConfig.presaleRate = baseRate.toString();
          presaleConfig.softCap = "20";
          presaleConfig.hardCap = "50";
          presaleConfig.whitelistEnabled = false;
        }
        
        return presaleConfig;
      });
      
      form.setValue('multiPresaleConfig', { presales: updatedPresales });
    }
  }, [form.watch('maxActivePresales'), form]);

  // Add a new validation effect for wallet allocations
  useEffect(() => {
    const validateWalletAllocations = () => {
      const liquidityPercentage = Number(form.getValues('liquidityPercentage'));
      const presaleEnabled = form.getValues('presaleEnabled');
      const presalePercentage = presaleEnabled ? Number(form.getValues('presalePercentage')) : 0;
      const wallets = form.getValues('wallets');
      
      // Check if wallet allocations needed but missing
      if (liquidityPercentage < 100 && (!wallets || wallets.length === 0)) {
        const defaultWallet = {
          name: "Owner",
          address: form.getValues('owner') || account || "",
          percentage: (100 - liquidityPercentage - presalePercentage).toString(),
          vestingEnabled: false,
          vestingDuration: "365",
          cliffDuration: "0",
          vestingStartTime: Math.floor(Date.now() / 1000) + (24 * 3600)
        };
        
        console.log('Adding default wallet allocation:', defaultWallet);
        form.setValue('wallets', [defaultWallet]);
      }
    };
    
    validateWalletAllocations();
  }, [form.watch('liquidityPercentage'), form.watch('presaleEnabled'), form.watch('presalePercentage'), form, account]);

  // Add special configurations for Polygon Amoy
  useEffect(() => {
    // Special config for Polygon Amoy network
    if (chainId === 80002) {
      console.log('Configuring form for Polygon Amoy network');
      
      // Ensure wallets have proper vesting parameters
      const wallets = form.getValues('wallets');
      if (wallets && wallets.length > 0) {
        const updatedWallets = wallets.map(wallet => ({
          ...wallet,
          vestingEnabled: Boolean(wallet.vestingEnabled),
          vestingDuration: wallet.vestingEnabled ? wallet.vestingDuration : 0,
          cliffDuration: wallet.vestingEnabled ? wallet.cliffDuration : 0,
          vestingStartTime: wallet.vestingEnabled ? wallet.vestingStartTime : 0
        }));
        form.setValue('wallets', updatedWallets);
      }
    }
  }, [chainId, form]);

  // Special handling for polygon Amoy testnet - initialize with wallets
  useEffect(() => {
    if (chainId === 80002) {
      console.log('Initializing wallets for Polygon Amoy');
      const now = Math.floor(Date.now() / 1000);
      const defaultWallets = [
        {
          name: 'Team',
          address: account || '',
          percentage: "15",
          vestingEnabled: false,
          vestingDuration: "365",
          cliffDuration: "90",
          vestingStartTime: now + (24 * 3600)
        },
        {
          name: 'Marketing',
          address: account || '',
          percentage: "10",
          vestingEnabled: false,
          vestingDuration: "180",
          cliffDuration: "30",
          vestingStartTime: now + (24 * 3600)
        }
      ];
      form.setValue('wallets', defaultWallets);
    }
  }, [chainId, account, form]);

  const onSubmit = async (data: FormData) => {
    try {
      console.log('Form submission started', { data });

      if (!account || typeof chainId !== 'number') {
        toast({
          title: 'Error',
          description: 'Please connect your wallet first',
          variant: 'destructive',
        });
        return;
      }

      setLoading(true);

      // Create ethers provider and signer
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // For Polygon Amoy testnet, we use a hardcoded address
      const tokenFactoryAddress = chainId === 80002 
        ? '0xc9dE01F826649bbB1A54d2A00Ce91D046791AdE1'
        : getNetworkContractAddress(chainId, 'factoryAddressV3');
      
      console.log('Using factory address:', tokenFactoryAddress);

      const factory = new Contract(tokenFactoryAddress, TokenFactory_v3_ABI, signer);
      
      // Get deployment fee - ensure we're getting the actual value
      let deploymentFee;
      try {
        deploymentFee = await factory.deploymentFee();
        console.log('Deployment fee from contract:', deploymentFee.toString(), 'wei');
        
        // If the deployment fee is too small or zero, use a default value of 0.001 ETH
        if (deploymentFee === BigInt(0)) {
          console.log('Deployment fee is zero, using default value of 0.001 ETH');
          deploymentFee = parseEther("0.001"); // Default to 0.001 ETH
        }
      } catch (error) {
        console.error('Error fetching deployment fee:', error);
        // Default to 0.001 ETH if we can't fetch it
        deploymentFee = parseEther("0.001");
        console.log('Using default deployment fee of 0.001 ETH');
      }

      // Prepare token parameters
      const tokenParams = {
        name: data.name,
        symbol: data.symbol,
        initialSupply: parseEther(data.initialSupply || "0"),
        maxSupply: parseEther(data.maxSupply || "0"),
        owner: account as `0x${string}`,
        enableBlacklist: data.enableBlacklist,
        enableTimeLock: data.enableTimeLock,
        presaleEnabled: data.presaleEnabled,
        maxActivePresales: data.presaleEnabled ? data.maxActivePresales : 0,
        presaleRate: data.presaleEnabled ? parseEther(data.presaleRate || "0") : BigInt(0),
        softCap: data.presaleEnabled ? parseEther(data.softCap || "0") : BigInt(0),
        hardCap: data.presaleEnabled ? parseEther(data.hardCap || "0") : BigInt(0),
        minContribution: data.presaleEnabled ? parseEther(data.minContribution || "0") : BigInt(0),
        maxContribution: data.presaleEnabled ? parseEther(data.maxContribution || "0") : BigInt(0),
        startTime: data.presaleEnabled ? BigInt(data.startTime || 0) : BigInt(0),
        endTime: data.presaleEnabled ? BigInt(data.endTime || 0) : BigInt(0),
        presalePercentage: data.presaleEnabled ? Number(data.presalePercentage) : 0,
        liquidityPercentage: Number(data.liquidityPercentage),
        liquidityLockDuration: BigInt(data.liquidityLockDuration * 24 * 60 * 60), // Convert days to seconds
        walletAllocations: data.wallets.map(wallet => ({
          wallet: wallet.address as `0x${string}`,
          percentage: Number(wallet.percentage),
          vestingEnabled: wallet.vestingEnabled,
          vestingDuration: wallet.vestingEnabled ? BigInt(Number(wallet.vestingDuration) * 24 * 60 * 60) : BigInt(0), // Convert days to seconds
          cliffDuration: wallet.vestingEnabled ? BigInt(Number(wallet.cliffDuration) * 24 * 60 * 60) : BigInt(0), // Convert days to seconds
          vestingStartTime: wallet.vestingEnabled ? BigInt(wallet.vestingStartTime) : BigInt(0)
        }))
      };

      // Ensure at least one wallet allocation if none are provided but needed
      if (tokenParams.walletAllocations.length === 0 && tokenParams.liquidityPercentage < 100) {
        // Add default allocation to owner if liquidityPercentage < 100%
        tokenParams.walletAllocations.push({
          wallet: tokenParams.owner,
          percentage: 100 - tokenParams.liquidityPercentage - tokenParams.presalePercentage,
          vestingEnabled: false,
          vestingDuration: BigInt(0),
          cliffDuration: BigInt(0),
          vestingStartTime: BigInt(0)
        });
      }

      // Additional validation for single wallet allocations - known edge case on Polygon Amoy
      if (tokenParams.walletAllocations.length === 1) {
        console.log('Single wallet allocation detected - applying special handling');
        
        // Ensure the single wallet allocation has all required fields explicitly set
        const wallet = tokenParams.walletAllocations[0];
        
        // Explicitly set vesting params
        wallet.vestingEnabled = Boolean(wallet.vestingEnabled);
        if (!wallet.vestingEnabled) {
          wallet.vestingDuration = BigInt(0);
          wallet.cliffDuration = BigInt(0);
          wallet.vestingStartTime = BigInt(0);
        }
        
        // Verify percentage and address
        if (wallet.percentage <= 0 || wallet.percentage > 90) {
          console.warn('Fixing invalid percentage for single wallet:', wallet.percentage);
          wallet.percentage = 100 - tokenParams.liquidityPercentage - tokenParams.presalePercentage;
        }
        
        if (!wallet.wallet || wallet.wallet === '0x0000000000000000000000000000000000000000') {
          console.warn('Invalid wallet address, using owner address instead');
          wallet.wallet = tokenParams.owner;
        }
      }

      // Validate total percentages add up to 100%
      const totalPercentage = Number(data.liquidityPercentage) + 
                            (data.presaleEnabled ? Number(data.presalePercentage) : 0) +
                            data.wallets.reduce((sum, w) => sum + Number(w.percentage), 0);
      
      if (totalPercentage !== 100) {
        toast({
          title: 'Invalid allocation',
          description: `Total allocation must be 100%, but got ${totalPercentage}%`,
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      console.log('Creating token with parameters:', tokenParams);

      // Special handling for Arbitrum Sepolia
      const isArbitrumSepolia = chainId === 421614;
      
      try {
      // Get the signer and provider
      const ethProvider = new BrowserProvider(window.ethereum);
      const ethSigner = await ethProvider.getSigner();
      
      // Create a new contract instance with the signer
        const factory = new ethers.Contract(tokenFactoryAddress, TokenFactory_v3_ABI, ethSigner);

        // Prepare the token parameters as a struct matching TokenTemplate_v3.InitParams
        const tokenParamsForContract = {
          name: data.name,
          symbol: data.symbol,
          initialSupply: parseEther(data.initialSupply || "0"),
          maxSupply: parseEther(data.maxSupply || "0"),
          owner: account as `0x${string}`,
          enableBlacklist: data.enableBlacklist,
          enableTimeLock: data.enableTimeLock,
          presaleRate: data.presaleEnabled && data.presaleRate ? parseEther(data.presaleRate.toString()) : BigInt(0),
          softCap: data.presaleEnabled && data.softCap ? parseEther(data.softCap.toString()) : BigInt(0),
          hardCap: data.presaleEnabled && data.hardCap ? parseEther(data.hardCap.toString()) : BigInt(0),
          minContribution: data.presaleEnabled && data.minContribution ? parseEther(data.minContribution.toString()) : BigInt(0),
          maxContribution: data.presaleEnabled && data.maxContribution ? parseEther(data.maxContribution.toString()) : BigInt(0),
          startTime: data.presaleEnabled && data.startTime ? BigInt(data.startTime) : BigInt(0),
          endTime: data.presaleEnabled && data.endTime ? BigInt(data.endTime) : BigInt(0),
          presalePercentage: data.presaleEnabled ? Number(data.presalePercentage) : 0,
          liquidityPercentage: Number(data.liquidityPercentage), // Always send the actual liquidityPercentage
          liquidityLockDuration: BigInt(Number(data.liquidityLockDuration)),
          walletAllocations: data.wallets.map(wallet => ({
            wallet: wallet.address as `0x${string}`,
            percentage: Number(wallet.percentage),
            vestingEnabled: wallet.vestingEnabled,
            vestingDuration: wallet.vestingEnabled ? BigInt(Number(wallet.vestingDuration)) : BigInt(0),
            cliffDuration: wallet.vestingEnabled ? BigInt(Number(wallet.cliffDuration)) : BigInt(0),
            vestingStartTime: wallet.vestingEnabled ? BigInt(wallet.vestingStartTime) : BigInt(0)
          })),
          maxActivePresales: data.presaleEnabled ? data.maxActivePresales : 0,
          presaleEnabled: data.presaleEnabled
        };

        console.log('Creating token with parameters:', tokenParamsForContract);

        // Special handling for Arbitrum Sepolia
        const isArbitrumSepolia = chainId === 421614;
        
        // Ensure we're sending the correct deployment fee
        // For Arbitrum Sepolia, we'll use a higher value to ensure it's enough
        const deploymentFeeToUse = isArbitrumSepolia ? parseEther("0.01") : deploymentFee;
        
        // Set gas options for the transaction
        const gasOptions = {
          value: deploymentFeeToUse,
          gasLimit: isArbitrumSepolia ? BigInt(10000000) : undefined
        };

        console.log('Using factory address:', tokenFactoryAddress);
        console.log('Sending transaction with deployment fee:', formatEther(deploymentFeeToUse), 'ETH');
        console.log('Gas options:', gasOptions);

        try {
          // Call the contract method directly
          const tx = await factory.createToken(tokenParamsForContract, gasOptions);
          console.log('Transaction sent:', tx);

          // Wait for the transaction to be mined with more confirmations
          const receipt = await tx.wait(2); // Wait for 2 confirmations
          if (receipt) {
            console.log('Transaction receipt:', receipt);

            // Extract the token address from the event logs
            const tokenCreatedEvent = receipt.logs.find((log: any) => {
              try {
                const parsedLog = factory.interface.parseLog(log);
                return parsedLog?.name === 'TokenCreated';
              } catch {
                return false;
              }
            });

            if (tokenCreatedEvent) {
              const parsedLog = factory.interface.parseLog(tokenCreatedEvent);
              if (parsedLog) {
                const tokenAddress = parsedLog.args.tokenAddress;
                console.log('New token deployed at:', tokenAddress);
                
                // Automatically add liquidity if liquidityPercentage is set
                if (Number(data.liquidityPercentage) > 0 && !data.presaleEnabled) {
                  try {
                    console.log('Automatically adding liquidity for token:', tokenAddress);
                    
                    // Create token contract instance
                    const tokenContract = new Contract(
                      tokenAddress,
                      [
                        'function addLiquidityFromContract(uint256 tokenAmount) external payable',
                        'function getRemainingLiquidityAllocation() external view returns (uint256)',
                        'function balanceOf(address) view returns (uint256)'
                      ],
                      signer
                    );
                    
                    // Get remaining liquidity allocation
                    let tokenAmount;
                    try {
                      tokenAmount = await tokenContract.getRemainingLiquidityAllocation();
                      console.log('Remaining liquidity allocation:', formatEther(tokenAmount));
                    } catch (e) {
                      console.log('getRemainingLiquidityAllocation not available, using contract balance');
                      tokenAmount = await tokenContract.balanceOf(tokenAddress);
                      console.log('Contract balance:', formatEther(tokenAmount));
                    }
                    
                    if (tokenAmount && BigInt(tokenAmount) > BigInt(0)) {
                      // Calculate ETH amount based on desired ratio (0.5% of token value by default)
                      // This is a simplified calculation and might need adjustment
                      const ethAmount = parseEther('0.01'); // Start with 0.01 ETH
                      
                      console.log('Adding liquidity with ETH:', formatEther(ethAmount));
                      
                      // Add liquidity with contract tokens
                      const addLiquidityTx = await tokenContract.addLiquidityFromContract(tokenAmount, {
                        value: ethAmount,
                        gasLimit: BigInt(3000000)
                      });
                      
                      console.log('Add liquidity transaction sent:', addLiquidityTx.hash);
                      
                      // Wait for the transaction to be confirmed
                      await addLiquidityTx.wait();
                      console.log('Liquidity added successfully');
                      
                      toast({
                        title: 'Liquidity Added',
                        description: 'Liquidity has been automatically added for your token',
                      });
                    }
                  } catch (error) {
                    console.error('Error adding liquidity:', error);
                    toast({
                      title: 'Liquidity Addition Failed',
                      description: 'Automatic liquidity addition failed. You can add liquidity manually later.',
                      variant: 'destructive',
                    });
                  }
                }
                
                if (onSuccess) {
                  onSuccess(tokenAddress);
                }
              } else {
                console.error('Failed to parse log');
                toast({
                  title: 'Error',
                  description: 'Failed to extract token address from transaction logs',
                  variant: 'destructive',
                });
              }
            }
          }
        } catch (error: unknown) {
          console.error('Error creating token:', error);
          
          // Check if it's a revert error
          const errorMessage = error instanceof Error ? error.message : String(error);
          
          if (errorMessage.includes('execution reverted')) {
            // Try to extract more specific error information
            console.log('Transaction reverted. Checking for specific error...');
            
            if (errorMessage.includes('Insufficient deployment fee')) {
      toast({
                title: "Error",
                description: "Insufficient deployment fee. Please increase the fee.",
                variant: "destructive",
              });
            } else if (errorMessage.includes('Total percentage must be 100')) {
              toast({
                title: "Error",
                description: "Total allocation percentage must equal 100%",
                variant: "destructive",
              });
            } else if (errorMessage.includes('Liquidity percentage must be 0 when presale is enabled')) {
              toast({
                title: "Error",
                description: "Liquidity percentage must be 0 when presale is enabled",
                variant: "destructive",
              });
            } else {
              toast({
                title: "Error",
                description: "Transaction reverted. Please check your parameters and try again.",
                variant: "destructive",
              });
            }
          } else {
            toast({
              title: "Error",
              description: errorMessage.substring(0, 100),
              variant: "destructive",
            });
          }
          
          if (onError) {
            onError(error);
          }
        }

      } catch (error: any) {
        console.error('Error creating token:', error);
        
        // Special error handling for Polygon Amoy
        if (chainId === 80002) {
          // Check if it's a gas-related error
          const errorMessage = error.message || '';
          if (errorMessage.includes('gas') || errorMessage.includes('Gas') || 
              errorMessage.includes('execution reverted') || errorMessage.includes('Internal JSON-RPC error')) {
            
            toast({
              title: 'Polygon Amoy Error',
              description: 'Transaction failed. This might be due to gas issues on Polygon Amoy. Try adding more wallets (2-3) or adjusting the gas limit in your wallet.',
              variant: 'destructive',
            });
          } else {
            toast({
              title: 'Error',
              description: errorMessage || 'Failed to create token',
              variant: 'destructive',
            });
          }
        } else {
          // Default error handling for other networks
          toast({
            title: 'Error',
            description: error.message || 'Failed to create token',
            variant: 'destructive',
          });
        }
      } finally {
        setLoading(false);
      }

    } catch (error: any) {
      console.error('Error creating token:', error);
      
      // Special error handling for Polygon Amoy
      if (chainId === 80002) {
        // Check if it's a gas-related error
        const errorMessage = error.message || '';
        if (errorMessage.includes('gas') || errorMessage.includes('Gas') || 
            errorMessage.includes('execution reverted') || errorMessage.includes('Internal JSON-RPC error')) {
          
          toast({
            title: 'Polygon Amoy Error',
            description: 'Transaction failed. This might be due to gas issues on Polygon Amoy. Try adding more wallets (2-3) or adjusting the gas limit in your wallet.',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Error',
            description: errorMessage || 'Failed to create token',
            variant: 'destructive',
          });
        }
      } else {
        // Default error handling for other networks
        toast({
          title: 'Error',
          description: error.message || 'Failed to create token',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const addWallet = () => {
    if (!account) {
      toast({
        title: "Error",
        description: "Please connect your wallet first",
        variant: "destructive"
      });
      return;
    }

    const now = Math.floor(Date.now() / 1000);
    const newWallet = {
      name: '',
      address: account,
      percentage: "0",
      vestingEnabled: false,
      vestingDuration: "365",
      cliffDuration: "90",
      vestingStartTime: now + (24 * 3600)
    };
    
    form.setValue('wallets', [...form.getValues('wallets'), newWallet]);
  };

  const removeWallet = (index: number) => {
    const wallets = form.getValues('wallets');
    form.setValue('wallets', wallets.filter((_, i) => i !== index));
  };

  const applyPreset = (presetKey: string) => {
    // Get the preset configuration
    const presetConfig = VESTING_PRESETS[presetKey];
    if (!presetConfig) return;
    
    const presaleEnabled = form.getValues('presaleEnabled');
    
    // Set presale percentage if presale is enabled
    if (presaleEnabled) {
      // Convert number to string if needed
      const presalePercentageAsString = typeof presetConfig.presalePercentage === 'number' 
        ? presetConfig.presalePercentage.toString() 
        : presetConfig.presalePercentage;
      form.setValue('presalePercentage', presalePercentageAsString);
    }
    
    // Calculate liquidity percentage based on presale status
    // Convert to number for calculation
    let liquidityPercentage = typeof presetConfig.liquidityPercentage === 'number' 
      ? presetConfig.liquidityPercentage 
      : Number(presetConfig.liquidityPercentage);
    
    // If presale is disabled, add the presale percentage to liquidity
    if (!presaleEnabled) {
      const presalePercentageValue = typeof presetConfig.presalePercentage === 'number' 
        ? presetConfig.presalePercentage 
        : Number(presetConfig.presalePercentage);
      liquidityPercentage += presalePercentageValue;
    }
    
    // Set as string
    form.setValue('liquidityPercentage', liquidityPercentage.toString());
    
    // Set wallets with correct percentages and vesting schedules
    const walletsWithStringValues = presetConfig.wallets.map(wallet => {
      // Ensure percentage is a string
      const percentageAsString = typeof wallet.percentage === 'number' 
        ? wallet.percentage.toString() 
        : wallet.percentage;
      
      // Ensure vesting duration and cliff duration are strings
      const vestingDurationAsString = typeof wallet.vestingDuration === 'number' 
        ? wallet.vestingDuration.toString() 
        : wallet.vestingDuration;
      
      const cliffDurationAsString = typeof wallet.cliffDuration === 'number' 
        ? wallet.cliffDuration.toString() 
        : wallet.cliffDuration;
      
      return {
        name: wallet.name,
        address: account || '0x0000000000000000000000000000000000000000',
        percentage: percentageAsString,
        vestingEnabled: wallet.vestingEnabled,
        vestingDuration: vestingDurationAsString,
        cliffDuration: cliffDurationAsString,
        vestingStartTime: wallet.vestingStartTime
      };
    });
    
    form.setValue('wallets', walletsWithStringValues);
  };

  const validateTokenName = (name: string) => {
    const nameLength = name.length;
    const hasSpecialChars = /[^a-zA-Z0-9\s]/.test(name);
    const commonWords = ['token', 'coin', 'finance', 'defi', 'swap'];
    const containsCommonWord = commonWords.some(word => 
      name.toLowerCase().includes(word)
    );

    if (nameLength < 3 || nameLength > 32) {
      return {
        category: 'Token Name',
        status: 'error' as const,
        message: 'Invalid name length',
        details: ['Name should be between 3 and 32 characters']
      };
    }

    if (hasSpecialChars) {
      return {
        category: 'Token Name',
        status: 'warning' as const,
        message: 'Contains special characters',
        details: ['Consider using only letters, numbers, and spaces']
      };
    }

    if (containsCommonWord) {
      return {
        category: 'Token Name',
        status: 'warning' as const,
        message: 'Contains common token terms',
        details: ['Consider a more unique and memorable name']
      };
    }

    return {
      category: 'Token Name',
      status: 'success' as const,
      message: 'Valid token name',
      details: ['Unique and appropriate length']
    };
  };

  const validateSymbol = (symbol: string) => {
    const isValid = /^[A-Z]{2,6}$/.test(symbol);
    const isCommon = ['ETH', 'BTC', 'BNB', 'USDT', 'USDC'].includes(symbol);

    if (!isValid) {
      return {
        category: 'Token Symbol',
        status: 'error' as const,
        message: 'Invalid symbol format',
        details: [
          'Should be 2-6 uppercase letters',
          'No numbers or special characters'
        ]
      };
    }

    if (isCommon) {
      return {
        category: 'Token Symbol',
        status: 'error' as const,
        message: 'Reserved symbol',
        details: ['This symbol is already in use by a major token']
      };
    }

    return {
      category: 'Token Symbol',
      status: 'success' as const,
      message: 'Valid symbol',
      details: ['Follows standard format']
    };
  };

  const validateSupply = (initialSupply: string, maxSupply: string) => {
    const initial = Number(initialSupply);
    const max = Number(maxSupply);

    if (initial <= 0 || max <= 0) {
      return {
        category: 'Token Supply',
        status: 'error' as const,
        message: 'Invalid supply values',
        details: ['Supply values must be greater than 0']
      };
    }

    if (initial > max) {
      return {
        category: 'Token Supply',
        status: 'error' as const,
        message: 'Initial supply exceeds max supply',
        details: ['Initial supply should be less than or equal to max supply']
      };
    }

    // Add warning for very large supplies
    if (initial > 1e9 || max > 1e9) {
      return {
        category: 'Token Supply',
        status: 'warning' as const,
        message: 'Very large supply',
        details: [
          'Consider reducing supply to less than 1 billion',
          'Large supplies may cause transaction issues',
          'Recommended: 1M-100M total supply'
        ]
      };
    }

    return {
      category: 'Token Supply',
      status: 'success' as const,
      message: 'Valid supply configuration',
      details: ['Supply values are within reasonable ranges']
    };
  };

  const validatePresale = (): ValidationResult => {
    const formValues = form.getValues();
    const softCap = Number(formValues.softCap);
    const hardCap = Number(formValues.hardCap);
    const minContribution = Number(formValues.minContribution);
    const maxContribution = Number(formValues.maxContribution);

    if (softCap >= hardCap) {
      return {
        category: 'Presale Configuration',
        status: 'error',
        message: 'Invalid caps',
        details: ['Soft cap must be less than hard cap']
      };
    }

    if (minContribution >= maxContribution) {
      return {
        category: 'Presale Configuration',
        status: 'error',
        message: 'Invalid contribution limits',
        details: ['Minimum contribution must be less than maximum contribution']
      };
    }

    if (softCap < hardCap * 0.5) {
      return {
        category: 'Presale Configuration',
        status: 'warning',
        message: 'Low soft cap',
        details: ['Consider setting soft cap to at least 50% of hard cap']
      };
    }

    const validationMessages = {
      category: 'Presale Configuration',
      status: 'success' as const,
      message: 'Valid presale configuration',
      details: [
        `Soft Cap: ${softCap} ${chainId ? getNetworkCurrency(chainId) : 'ETH'}`,
        `Hard Cap: ${hardCap} ${chainId ? getNetworkCurrency(chainId) : 'ETH'}`,
        `Min Contribution: ${minContribution} ${chainId ? getNetworkCurrency(chainId) : 'ETH'}`,
        `Max Contribution: ${maxContribution} ${chainId ? getNetworkCurrency(chainId) : 'ETH'}`
      ]
    };

    return validationMessages;
  };

  const validateVesting = (): ValidationResult => {
    const formValues = form.getValues();
    const teamWallet = formValues.wallets.find(w => 
      w.name.toLowerCase().includes('team') || 
      w.name.toLowerCase().includes('founder')
    );

    if (!teamWallet) {
      return {
        category: 'Vesting',
        status: 'warning',
        message: 'No team wallet found',
        details: ['Consider adding a team wallet with vesting']
      };
    }

    if (!teamWallet.vestingEnabled) {
      return {
        category: 'Vesting',
        status: 'warning',
        message: 'Team tokens not vested',
        details: ['Consider enabling vesting for team tokens']
      };
    }

    if (!teamWallet.vestingDuration || teamWallet.vestingDuration < 180) {
      return {
        category: 'Vesting',
        status: 'warning',
        message: 'Short vesting duration',
        details: [
          'Team tokens should be vested for at least 6 months',
          'Consider adding a cliff period'
        ]
      };
    }

    return {
      category: 'Vesting',
      status: 'success',
      message: 'Good vesting configuration',
      details: formValues.wallets
        .filter(w => w.vestingEnabled)
        .map(w => `${w.name}: ${w.vestingDuration}d vesting, ${w.cliffDuration || 0}d cliff`)
    };
  };

  const validateDistribution = (form: UseFormReturn<FormData>): ValidationResult => {
    const values = form.getValues();
    const presaleEnabled = values.presaleEnabled;
    const presalePercentage = presaleEnabled ? Number(values.presalePercentage) || 0 : 0;
    const liquidityPercentage = Number(values.liquidityPercentage) || 0;
    const wallets = values.wallets || [];
    const walletPercentages = wallets.reduce((sum: number, w: { percentage: number }) => sum + (Number(w.percentage) || 0), 0);
    const totalPercentage = presalePercentage + liquidityPercentage + walletPercentages;

    // When presale is enabled, validate presale configuration
    if (presaleEnabled) {
      if (presalePercentage <= 0) {
        return {
          category: 'Distribution',
          message: 'Invalid presale percentage',
          details: [
            'Presale percentage must be greater than 0 when presale is enabled',
            `Current: ${presalePercentage}%`
          ],
          status: 'error'
        };
      }
    }

    // Validate liquidity percentage
    if (!presaleEnabled && liquidityPercentage < 25) {
      return {
        category: 'Distribution',
        message: 'Low liquidity percentage',
        details: [
          'Recommended minimum liquidity is 25%',
          `Current: ${liquidityPercentage}%`
        ],
        status: 'warning'
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

    // Total percentage must equal 100%
    if (totalPercentage !== 100) {
      return {
        category: 'Distribution',
        message: 'Total distribution must equal 100%',
        details: [
          ...(presaleEnabled ? [`Presale: ${presalePercentage}%`] : []),
          `Liquidity: ${liquidityPercentage}%`,
          `Wallets: ${walletPercentages}%`,
          `Total: ${totalPercentage}%`,
          'Required: 100%'
        ],
        status: 'error'
      };
    }

    return {
      category: 'Distribution',
      message: 'Distribution percentages are valid',
      details: [
        ...(presaleEnabled ? [`Presale: ${presalePercentage}%`] : []),
        `Liquidity: ${liquidityPercentage}%`,
        `Wallets: ${walletPercentages}%`,
        'Total: 100%'
      ],
      status: 'success'
    };
  };

  const validateLiquidity = (): ValidationResult => {
    const formValues = form.getValues();
    const liquidityPercentage = Number(formValues.liquidityPercentage);
    const lockDuration = Number(formValues.liquidityLockDuration);

    if (liquidityPercentage < 25) {
      return {
        category: 'Liquidity',
        status: 'warning',
        message: 'Low liquidity allocation',
        details: [
          'Recommend at least 25% for liquidity',
          'Higher liquidity helps reduce price impact'
        ]
      };
    }

    if (lockDuration < 180) {
      return {
        category: 'Liquidity',
        status: 'warning',
        message: 'Short lock duration',
        details: [
          'Recommend locking liquidity for at least 180 days',
          'Longer locks build more trust'
        ]
      };
    }

    return {
      category: 'Liquidity',
      status: 'success',
      message: 'Good liquidity configuration',
      details: [
        `Liquidity allocation: ${liquidityPercentage}%`,
        `Lock duration: ${lockDuration} days`
      ]
    };
  };

  const simulateDeployment = async () => {
    setIsSimulating(true);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const formValues = form.getValues();
    const validations = [
      validateTokenName(formValues.name),
      validateSymbol(formValues.symbol),
      validateSupply(formValues.initialSupply.toString(), formValues.maxSupply.toString()),
      validatePresale(),
      validateVesting(),
      validateDistribution(form),
      validateLiquidity()
    ];
    
    setSimulationResults(validations);
    setShowSimulationDialog(true);
    setIsSimulating(false);
  };

  const defaultPresaleRound: PresaleRound = {
    presaleRate: '',
    softCap: '',
    hardCap: '',
    minContribution: '',
    maxContribution: '',
    startDate: new Date().toISOString().split('T')[0],
    startTime: '00:00',
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endTime: '23:59',
    whitelistEnabled: false,
    isActive: true
  };

  const defaultRecommendedConfig: RecommendedConfig = {
    softCap: '10',
    hardCap: '50',
    rate: '1000',
    desc: '',
    minContribution: '0.1',
    maxContribution: '5',
    startDate: new Date().toISOString().split('T')[0],
    startTime: '00:00',
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endTime: '23:59'
  };

  const recommendedConfigs: RecommendedConfig[] = stages.map((stage, index) => ({
    ...defaultRecommendedConfig,
    desc: `Recommended settings for ${stage} presale round`
  }));

                    return (
    <div className="w-full">
      <TokenFormTabs 
        form={form} 
        isConnected={isConnected}
        chainId={chainId}
        account={account || undefined}
        loading={loading}
        onSimulate={simulateDeployment}
        onSubmit={onSubmit}
      />
      
      {/* Keep existing dialogs */}
      {showSimulationDialog && (
      <Dialog open={showSimulationDialog} onOpenChange={setShowSimulationDialog}>
          <DialogContent className="max-w-2xl bg-gray-900 text-white border-gray-700">
            <h2 className="text-xl font-bold mb-4 text-white">Deployment Simulation Results</h2>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto text-white">
              {simulationResults.map((result, index) => (
                <div key={index} className={`p-3 rounded-lg border ${
                  result.status === 'success' ? 'border-green-600 bg-green-950/20' : 
                  result.status === 'warning' ? 'border-yellow-600 bg-yellow-950/20' : 
                  'border-red-600 bg-red-950/20'
                }`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      result.status === 'success' ? 'bg-green-500' : 
                      result.status === 'warning' ? 'bg-yellow-500' : 
                      'bg-red-500'
                    }`}></div>
                    <h3 className="font-semibold text-white">{result.category}</h3>
                  </div>
                  <p className="mt-1 text-sm text-gray-200">{result.message}</p>
                  {result.details && result.details.length > 0 && (
                    <ul className="mt-2 space-y-1 text-xs text-gray-300">
                      {result.details.map((detail, i) => (
                        <li key={i}>{detail}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
            
            <div className="flex justify-between mt-4">
              <div>
                {simulationResults.some(r => r.status === 'error') ? (
                  <span className="text-red-400">❌ Issues detected that will prevent deployment</span>
                ) : simulationResults.some(r => r.status === 'warning') ? (
                  <span className="text-yellow-400">⚠️ Warnings detected, but deployment is possible</span>
                ) : (
                  <span className="text-green-400">✅ All checks passed</span>
                )}
              </div>
              <Button onClick={() => setShowSimulationDialog(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
      )}
    </div>
  );
};

export default TokenForm_v3;