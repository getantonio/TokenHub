import { useState, useEffect } from 'react';
import { useNetwork } from '@contexts/NetworkContext';
import { useToast } from '@/components/ui/use-toast';
import TokenPreview from '@components/features/token/TokenPreview';
import { InfoIcon } from '@/components/ui/InfoIcon';
import { Spinner } from '@/components/ui/Spinner';
import { useTokenFactory } from '@/hooks/useTokenFactory';
import { useAccount, usePublicClient } from 'wagmi';
import TokenFactory_v3 from '@contracts/abi/TokenFactory_v3.json';
import { FACTORY_ADDRESSES } from '@config/contracts';
import * as z from 'zod';
import { addDays } from 'date-fns';
import { parseEther, parseUnits } from 'viem';
import { useForm, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import TokenDeploymentTest from './TokenDeploymentTest';
import { Alert } from "@/components/ui/alert";
import { Dialog, DialogContent } from '@/components/ui/dialog';
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

interface TokenFormV3Props {
  isConnected: boolean;
  onSuccess?: () => void;
  onError?: (error: any) => void;
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
  walletAllocations: {
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
  percentage: number;
  vestingEnabled: boolean;
  vestingDuration: number;
  cliffDuration: number;
  vestingStartTime: number;
}

interface VestingPreset {
  presalePercentage: number;
  liquidityPercentage: number;
  wallets: WalletPreset[];
}

const VESTING_PRESETS: Record<string, VestingPreset> = {
  standard: {
    presalePercentage: 5,
    liquidityPercentage: 70, // 70% when presale enabled, 75% when disabled
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
    presalePercentage: 5,
    liquidityPercentage: 75, // 75% when presale enabled, 80% when disabled
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
    presalePercentage: 5,
    liquidityPercentage: 60, // Reduced from 65% to 60%
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
    presalePercentage: 5,
    liquidityPercentage: 55, // Reduced from 60% to 55%
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
    presalePercentage: 5,
    liquidityPercentage: 55, // Reduced from 60% to 55%
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

const formSchema = z.object({
  name: z.string()
    .min(1, "Name is required")
    .max(50, "Name must be less than 50 characters"),
  symbol: z.string()
    .min(1, "Symbol is required")
    .max(10, "Symbol must be less than 10 characters")
    .refine(value => /^[A-Z0-9]+$/.test(value), "Symbol must be uppercase letters and numbers only"),
  initialSupply: z.string()
    .refine((val) => !isNaN(Number(val)), "Must be a valid number")
    .refine((val) => Number(val) > 0, "Initial supply must be greater than 0"),
  maxSupply: z.string()
    .refine((val) => !isNaN(Number(val)), "Must be a valid number")
    .refine((val) => Number(val) > 0, "Max supply must be greater than 0"),
  owner: z.string()
    .min(1, "Owner address is required")
    .refine(value => /^0x[a-fA-F0-9]{40}$/.test(value), "Invalid address format"),
  enableBlacklist: z.boolean(),
  enableTimeLock: z.boolean(),
  presaleEnabled: z.boolean(),
  maxActivePresales: z.number(),
  presaleRate: z.string().optional(),
  softCap: z.string().optional(),
  hardCap: z.string().optional(),
  minContribution: z.string().optional(),
  maxContribution: z.string().optional(),
  startTime: z.number().optional(),
  endTime: z.number().optional(),
  presalePercentage: z.number()
    .min(0, "Presale percentage must be at least 0%")
    .max(95, "Presale percentage cannot exceed 95%"),
  liquidityPercentage: z.number()
    .min(0, "Liquidity percentage must be at least 0%")
    .max(100, "Liquidity percentage cannot exceed 100%"),
  liquidityLockDuration: z.number(),
  wallets: z.array(z.object({
    name: z.string(),
    address: z.string(),
    percentage: z.number(),
    vestingEnabled: z.boolean(),
    vestingDuration: z.number(),
    cliffDuration: z.number(),
    vestingStartTime: z.number()
  })),
  multiPresaleConfig: z.object({
    presales: z.array(z.object({
      softCap: z.string(),
      hardCap: z.string(),
      minContribution: z.string(),
      maxContribution: z.string(),
      presaleRate: z.string(),
      startTime: z.number(),
      endTime: z.number(),
      whitelistEnabled: z.boolean(),
      isActive: z.boolean()
    }))
  }).optional()
}).refine((data) => {
  // Validate presale configuration
  if (data.presaleEnabled) {
    if (!data.startTime || !data.endTime || data.startTime >= data.endTime) {
      return false;
    }
    // Validate presale percentage when enabled
    if (data.presalePercentage < 1 || data.presalePercentage > 95) {
      return false;
    }
  } else {
    // Validate presale percentage is 0 when disabled
    if (data.presalePercentage !== 0) {
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
  name: "",
  symbol: "",
  initialSupply: "",
  maxSupply: "",
  owner: "",
  enableBlacklist: false,
  enableTimeLock: false,
  presaleEnabled: false,
  maxActivePresales: 0,
  presaleRate: "1000", // Default: 1000 tokens per BNB
  softCap: "1", // Default: 1 BNB
  hardCap: "10", // Default: 10 BNB
  minContribution: "0.1", // Default: 0.1 BNB
  maxContribution: "2", // Default: 2 BNB
  startTime: defaultTimes.startTime,
  endTime: defaultTimes.endTime,
  presalePercentage: 5,
  liquidityPercentage: 65, // Increased from 35% to 65%
  liquidityLockDuration: 365,
  wallets: [{
    name: "Team",
    address: "",
    percentage: 10,
    vestingEnabled: true,
    vestingDuration: 365,
    cliffDuration: 90,
    vestingStartTime: Math.floor(Date.now() / 1000) + (24 * 3600)
  }, {
    name: "Marketing",
    address: "",
    percentage: 10,
    vestingEnabled: true,
    vestingDuration: 180,
    cliffDuration: 30,
    vestingStartTime: Math.floor(Date.now() / 1000) + (24 * 3600)
  }, {
    name: "Development",
    address: "",
    percentage: 10,
    vestingEnabled: true,
    vestingDuration: 365,
    cliffDuration: 60,
    vestingStartTime: Math.floor(Date.now() / 1000) + (24 * 3600)
  }],
  multiPresaleConfig: {
    presales: []
  }
};

export default function TokenForm_V3({ isConnected, onSuccess, onError }: TokenFormV3Props) {
  const { chainId } = useNetwork();
  const { address } = useAccount();
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

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues,
    mode: "onChange",
    shouldUnregister: false
  });

  useEffect(() => {
    if (mounted) {
      // Mark required fields as touched to trigger validation
      form.trigger([
        'name',
        'symbol',
        'initialSupply',
        'maxSupply',
        'liquidityPercentage'
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
    if (address) {
      console.log('Setting owner address:', address);
      form.setValue('owner', address);
      const currentWallets = form.getValues('wallets');
      form.setValue('wallets', currentWallets.map(wallet => ({
        ...wallet,
        address
      })));
    }
  }, [address, form]);

  // Update the useEffect for presale toggle
  useEffect(() => {
    const presaleEnabled = form.watch('presaleEnabled');
    
    // Set presale percentage to 0 when disabled, but don't force it to 5% when enabled
    if (!presaleEnabled) {
      form.setValue('presalePercentage', 0, { 
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true 
      });
    }
    
    // Set other presale defaults
    if (presaleEnabled) {
      form.setValue('maxActivePresales', 1);
      form.setValue('presaleRate', '1000');
      form.setValue('softCap', '1');
      form.setValue('hardCap', '10');
      form.setValue('minContribution', '0.1');
      form.setValue('maxContribution', '2');
      form.setValue('startTime', defaultTimes.startTime);
      form.setValue('endTime', defaultTimes.endTime);
    }
  }, [form.watch('presaleEnabled')]);

  const onSubmit = async (data: FormData) => {
    try {
      console.log('Form submission started', { data });

      // Convert supply values to BigInt with 18 decimals
      const initialSupply = parseUnits(data.initialSupply.toString(), 18);
      const maxSupply = parseUnits(data.maxSupply.toString(), 18);

      // Convert wallet allocations to contract format
      const walletAllocations = data.wallets.map(wallet => {
        // Calculate vesting start time as Unix timestamp in seconds
        const vestingStartTime = wallet.vestingEnabled ? 
          // If vesting is enabled, use the specified start time or default to 24 hours from now
          BigInt(wallet.vestingStartTime || Math.floor(Date.now() / 1000) + (24 * 3600)) :
          // If vesting is disabled, use 0
          BigInt(0);

        // Convert durations from days to seconds
        const vestingDuration = wallet.vestingEnabled ?
          BigInt(wallet.vestingDuration * 24 * 60 * 60) : // Convert days to seconds
          BigInt(0);

        const cliffDuration = wallet.vestingEnabled ?
          BigInt(wallet.cliffDuration * 24 * 60 * 60) : // Convert days to seconds
          BigInt(0);

        return {
          wallet: wallet.address as `0x${string}`,
          percentage: wallet.percentage,
          vestingEnabled: wallet.vestingEnabled,
          vestingDuration,
          cliffDuration,
          vestingStartTime
        };
      });

      const params = {
        name: data.name,
        symbol: data.symbol,
        initialSupply,
        maxSupply,
        owner: data.owner as `0x${string}`,
        enableBlacklist: data.enableBlacklist,
        enableTimeLock: data.enableTimeLock,
        presaleEnabled: data.presaleEnabled,
        maxActivePresales: data.presaleEnabled ? 1 : 0,
        presaleRate: data.presaleEnabled ? parseUnits(data.presaleRate?.toString() || '1000', 18) : BigInt(0),
        softCap: data.presaleEnabled ? parseUnits(data.softCap?.toString() || '1', 18) : BigInt(0),
        hardCap: data.presaleEnabled ? parseUnits(data.hardCap?.toString() || '10', 18) : BigInt(0),
        minContribution: data.presaleEnabled ? parseUnits(data.minContribution?.toString() || '0.1', 18) : BigInt(0),
        maxContribution: data.presaleEnabled ? parseUnits(data.maxContribution?.toString() || '2', 18) : BigInt(0),
        startTime: data.presaleEnabled ? BigInt(data.startTime || Math.floor(Date.now() / 1000) + 3600) : BigInt(0),
        endTime: data.presaleEnabled ? BigInt(data.endTime || Math.floor(Date.now() / 1000) + 86400) : BigInt(0),
        presalePercentage: data.presaleEnabled ? data.presalePercentage : 0,
        liquidityPercentage: data.liquidityPercentage,
        liquidityLockDuration: BigInt(Math.min(data.liquidityLockDuration, 365) * 24 * 60 * 60), // Convert days to seconds
        walletAllocations
      };

      // Validate total percentage equals 100%
      const totalPercentage = params.presalePercentage + params.liquidityPercentage + 
        walletAllocations.reduce((sum, w) => sum + w.percentage, 0);
      
      if (totalPercentage !== 100) {
        throw new Error(`Total percentage must be 100%. Current total: ${totalPercentage}%`);
      }

      console.log('Submitting with params:', params);
      const tx = await createToken(params);
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error creating token:', error);
      if (onError) {
        onError(error);
      }
    }
  };

  const addWallet = () => {
    const now = Math.floor(Date.now() / 1000);
    const newWallet = {
      name: '',
      address: address || '',
      percentage: 0,
      vestingEnabled: false,
      vestingDuration: 365, // Default to 1 year
      cliffDuration: 90, // Default to 3 months
      vestingStartTime: now + (24 * 3600) // Start 24 hours from now
    };
    
    form.setValue('wallets', [...form.getValues('wallets'), newWallet]);
  };

  const removeWallet = (index: number) => {
    const wallets = form.getValues('wallets');
    form.setValue('wallets', wallets.filter((_, i) => i !== index));
  };

  const applyPreset = (preset: keyof typeof VESTING_PRESETS) => {
    const presetConfig = VESTING_PRESETS[preset];
    const presaleEnabled = form.getValues("presaleEnabled");
    const now = Math.floor(Date.now() / 1000);
    
    // Set presale percentage if presale is enabled
    if (presaleEnabled) {
      form.setValue('presalePercentage', presetConfig.presalePercentage);
    }
    
    // Set liquidity percentage based on presale state
    const liquidityPercentage = presaleEnabled ? 
      presetConfig.liquidityPercentage : // Use preset liquidity if presale enabled
      presetConfig.liquidityPercentage + presetConfig.presalePercentage; // Add presale's percentage to liquidity if disabled
    
    form.setValue('liquidityPercentage', liquidityPercentage);
    
    // Set wallets with correct percentages and vesting schedules
    form.setValue('wallets', presetConfig.wallets.map(wallet => ({
      name: wallet.name,
      address: address || '0x0000000000000000000000000000000000000000',
      percentage: wallet.percentage,
      vestingEnabled: wallet.vestingEnabled,
      vestingDuration: wallet.vestingDuration,
      cliffDuration: wallet.cliffDuration,
      vestingStartTime: now + (24 * 3600) // Start 24 hours from now
    })));
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

    return {
      category: 'Presale Configuration',
      status: 'success',
      message: 'Valid presale configuration',
      details: [
        `Soft Cap: ${softCap} ETH`,
        `Hard Cap: ${hardCap} ETH`,
        `Min Contribution: ${minContribution} ETH`,
        `Max Contribution: ${maxContribution} ETH`
      ]
    };
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
    let totalPercentage = 0;

    // Add presale percentage if enabled
    if (values.presaleEnabled) {
      totalPercentage += values.presalePercentage;
    }

    // Add liquidity percentage
    totalPercentage += values.liquidityPercentage;

    // Add wallet percentages
    const walletPercentages = values.wallets?.reduce((sum, wallet) => sum + (wallet.percentage || 0), 0) || 0;
    totalPercentage += walletPercentages;

    // Validate total equals 100%
    if (totalPercentage !== 100) {
      return {
        category: 'distribution',
        message: `Total allocation must equal 100%. Current total: ${totalPercentage}%`,
        details: [
          `Presale: ${values.presaleEnabled ? values.presalePercentage : 0}%`,
          `Liquidity: ${values.liquidityPercentage}%`,
          `Wallets: ${walletPercentages}%`
        ],
        status: 'error'
      };
    }

    // Validate liquidity percentage
    if (values.liquidityPercentage < 25) {
      return {
        category: 'distribution',
        message: 'Liquidity percentage must be at least 25%',
        status: 'error'
      };
    }

    // Validate presale percentage if enabled
    if (values.presaleEnabled && (values.presalePercentage < 1 || values.presalePercentage > 95)) {
      return {
        category: 'distribution',
        message: 'Presale percentage must be between 1% and 95% when enabled',
        status: 'error'
      };
    }

    // Validate each wallet percentage
    if (values.wallets?.length > 0) {
      for (const wallet of values.wallets) {
        if (!wallet.percentage || wallet.percentage < 1 || wallet.percentage > 60) {
          return {
            category: 'distribution',
            message: 'Each wallet allocation must be between 1% and 60%',
            status: 'error'
          };
        }
      }
    }

    return {
      category: 'distribution',
      message: 'Distribution percentages are valid',
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

  return (
    <div className="form-container form-compact">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="name" className="form-label">Token Name</label>
              <Input
                {...form.register("name")}
                placeholder="My Token"
                className="form-input"
              />
              {form.formState.errors.name && (
                <p className="form-error">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="symbol" className="form-label">Token Symbol</label>
              <Input
                {...form.register("symbol")}
                placeholder="MTK"
                className="form-input"
              />
              {form.formState.errors.symbol && (
                <p className="form-error">{form.formState.errors.symbol.message}</p>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="initialSupply" className="form-label">Initial Supply</label>
              <Input
                {...form.register("initialSupply")}
                placeholder="1000000"
                className="form-input"
              />
              {form.formState.errors.initialSupply && (
                <p className="form-error">{form.formState.errors.initialSupply.message}</p>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="maxSupply" className="form-label">Max Supply</label>
              <Input
                {...form.register("maxSupply")}
                placeholder="2000000"
                className="form-input"
              />
              {form.formState.errors.maxSupply && (
                <p className="form-error">{form.formState.errors.maxSupply.message}</p>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="liquidityLockPeriod" className="form-label">
                Liquidity Lock Period (days)
                <InfoIcon content="Duration the initial liquidity will be locked in the DEX" />
              </label>
              <Input
                type="number"
                min="30"
                {...form.register("liquidityLockDuration", {
                  valueAsNumber: true,
                  min: {
                    value: 30,
                    message: "Minimum lock period is 30 days"
                  }
                })}
                placeholder="180"
                className="form-input"
              />
              {form.formState.errors.liquidityLockDuration && (
                <p className="form-error">{form.formState.errors.liquidityLockDuration.message}</p>
              )}
              <p className="text-xs text-gray-400 mt-1">
                Recommended: 180+ days for better trust and token stability
              </p>
            </div>
          </div>

          <div className="form-section">
            <h3 className="text-lg font-medium text-white mb-2">Token Features</h3>
            <div className="grid grid-cols-2 gap-2">
              <FormField
                control={form.control}
                name="presaleEnabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-2 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel className="text-white">Enable Presale</FormLabel>
                      <FormDescription className="text-gray-400 text-xs">
                        Enable token presale functionality
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="enableBlacklist"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-2 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel className="text-white">Enable Blacklist</FormLabel>
                      <FormDescription className="text-gray-400 text-xs">
                        Allow blocking malicious addresses
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="enableTimeLock"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-2 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel className="text-white">Enable Time Lock</FormLabel>
                      <FormDescription className="text-gray-400 text-xs">
                        Lock tokens for a specific time period
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {form.watch("presaleEnabled") && (
              <div className="mt-2">
                <FormField
                  control={form.control}
                  name="maxActivePresales"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Max Active Presales</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          placeholder="1"
                          className="w-full h-8 text-sm bg-gray-700"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription className="text-gray-400 text-xs">
                        Maximum number of concurrent active presales
                      </FormDescription>
                    </FormItem>
                  )}
                />
              </div>
            )}
          </div>

          {/* Presale Configuration */}
          {form.watch("presaleEnabled") && (
            <div className="form-section bg-gray-800/50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-white mb-2">Presale Configuration</h3>
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="presalePercentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Presale Allocation (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          max="95"
                          className="h-8 text-sm bg-gray-700"
                          {...field}
                          onChange={(e) => {
                            const value = Math.min(Math.max(Number(e.target.value) || 0, 1), 95);
                            field.onChange(value);
                            
                            // Recalculate total and adjust liquidity if needed
                            const liquidityPercentage = form.getValues('liquidityPercentage');
                            const wallets = form.getValues('wallets');
                            const walletPercentages = wallets.reduce((sum, w) => sum + (Number(w.percentage) || 0), 0);
                            const total = value + liquidityPercentage + walletPercentages;
                            
                            if (total > 100) {
                              // Adjust liquidity to maintain valid total
                              const newLiquidity = Math.max(25, 100 - value - walletPercentages);
                              form.setValue('liquidityPercentage', newLiquidity);
                            }
                          }}
                        />
                      </FormControl>
                      <FormDescription className="text-gray-400 text-xs">
                        Set presale allocation between 1-95%
                      </FormDescription>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="presaleRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Presale Rate (Tokens per BNB)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="1000"
                          className="h-8 text-sm bg-gray-700"
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormDescription className="text-gray-400 text-xs">
                        Number of tokens per BNB in presale
                      </FormDescription>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="softCap"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Soft Cap (BNB)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="1"
                          className="h-8 text-sm bg-gray-700"
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormDescription className="text-gray-400 text-xs">
                        Minimum amount to raise
                      </FormDescription>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hardCap"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Hard Cap (BNB)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="10"
                          className="h-8 text-sm bg-gray-700"
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormDescription className="text-gray-400 text-xs">
                        Maximum amount to raise
                      </FormDescription>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="minContribution"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Min Contribution (BNB)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0.1"
                          className="h-8 text-sm bg-gray-700"
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormDescription className="text-gray-400 text-xs">
                        Minimum contribution per wallet
                      </FormDescription>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="maxContribution"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Max Contribution (BNB)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="2"
                          className="h-8 text-sm bg-gray-700"
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormDescription className="text-gray-400 text-xs">
                        Maximum contribution per wallet
                      </FormDescription>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Start Time</FormLabel>
                      <FormControl>
                        <div className="flex gap-2">
                          <Input
                            type="date"
                            className="h-8 text-sm bg-gray-700 flex-1"
                            value={field.value ? new Date(field.value * 1000).toISOString().split('T')[0] : ''}
                            onChange={(e) => {
                              const currentValue = field.value ? new Date(field.value * 1000) : new Date();
                              const [year, month, day] = e.target.value.split('-').map(Number);
                              const newDate = new Date(currentValue);
                              newDate.setFullYear(year, month - 1, day);
                              const timestamp = Math.floor(newDate.getTime() / 1000);
                              field.onChange(timestamp);
                              
                              // Update end time if necessary
                              const endTime = form.getValues('endTime');
                              if (!endTime || timestamp >= endTime) {
                                form.setValue('endTime', timestamp + 86400);
                              }
                            }}
                            min={new Date(Date.now() + 300000).toISOString().split('T')[0]}
                          />
                          <Input
                            type="time"
                            className="h-8 text-sm bg-gray-700 w-32"
                            value={field.value ? new Date(field.value * 1000).toTimeString().slice(0, 5) : ''}
                            onChange={(e) => {
                              const currentValue = field.value ? new Date(field.value * 1000) : new Date();
                              const [hours, minutes] = e.target.value.split(':').map(Number);
                              const newDate = new Date(currentValue);
                              newDate.setHours(hours, minutes);
                              const timestamp = Math.floor(newDate.getTime() / 1000);
                              field.onChange(timestamp);
                              
                              // Update end time if necessary
                              const endTime = form.getValues('endTime');
                              if (!endTime || timestamp >= endTime) {
                                form.setValue('endTime', timestamp + 86400);
                              }
                            }}
                          />
                        </div>
                      </FormControl>
                      <FormDescription className="text-gray-400 text-xs">
                        When the presale starts (must be at least 5 minutes in the future)
                      </FormDescription>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">End Time</FormLabel>
                      <FormControl>
                        <div className="flex gap-2">
                          <Input
                            type="date"
                            className="h-8 text-sm bg-gray-700 flex-1"
                            value={field.value ? new Date(field.value * 1000).toISOString().split('T')[0] : ''}
                            onChange={(e) => {
                              const currentValue = field.value ? new Date(field.value * 1000) : new Date();
                              const [year, month, day] = e.target.value.split('-').map(Number);
                              const newDate = new Date(currentValue);
                              newDate.setFullYear(year, month - 1, day);
                              const timestamp = Math.floor(newDate.getTime() / 1000);
                              
                              const startTime = form.getValues('startTime');
                              if (startTime && timestamp <= startTime) {
                                field.onChange(startTime + 86400);
                              } else {
                                field.onChange(timestamp);
                              }
                            }}
                            min={(() => {
                              const startTime = form.watch('startTime');
                              return startTime ? new Date((startTime + 3600) * 1000).toISOString().split('T')[0] : '';
                            })()}
                          />
                          <Input
                            type="time"
                            className="h-8 text-sm bg-gray-700 w-32"
                            value={field.value ? new Date(field.value * 1000).toTimeString().slice(0, 5) : ''}
                            onChange={(e) => {
                              const currentValue = field.value ? new Date(field.value * 1000) : new Date();
                              const [hours, minutes] = e.target.value.split(':').map(Number);
                              const newDate = new Date(currentValue);
                              newDate.setHours(hours, minutes);
                              const timestamp = Math.floor(newDate.getTime() / 1000);
                              
                              const startTime = form.getValues('startTime');
                              if (startTime && timestamp <= startTime) {
                                field.onChange(startTime + 86400);
                              } else {
                                field.onChange(timestamp);
                              }
                            }}
                          />
                        </div>
                      </FormControl>
                      <FormDescription className="text-gray-400 text-xs">
                        When the presale ends (must be at least 1 hour after start time)
                      </FormDescription>
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}

          {/* Multiple Presale Configuration */}
          {form.watch("presaleEnabled") && (form.watch("maxActivePresales") || 1) > 1 && (
            <div className="form-section bg-gray-800/50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-white mb-2">Multiple Presale Configuration</h3>
              <div className="space-y-3">
                {Array.from({ length: Math.max(1, form.watch("maxActivePresales") || 1) }).map((_, index) => (
                  <div key={index} className="p-3 bg-gray-800 rounded-lg">
                    <h4 className="text-sm font-medium text-white mb-2">Presale #{index + 1}</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-gray-400">Soft Cap</label>
                          <Input
                            {...form.register(`multiPresaleConfig.presales.${index}.softCap`)}
                            type="number"
                            placeholder="50"
                            className="h-7 text-sm bg-gray-700"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400">Hard Cap</label>
                          <Input
                            {...form.register(`multiPresaleConfig.presales.${index}.hardCap`)}
                            type="number"
                            placeholder="100"
                            className="h-7 text-sm bg-gray-700"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-gray-400">Rate</label>
                          <Input
                            {...form.register(`multiPresaleConfig.presales.${index}.presaleRate`)}
                            type="number"
                            step="0.0000000001"
                            placeholder="0.001"
                            className="h-7 text-sm bg-gray-700"
                          />
                        </div>
                        <div className="flex items-end">
                          <FormField
                            control={form.control}
                            name={`multiPresaleConfig.presales.${index}.whitelistEnabled`}
                            render={({ field }) => (
                              <FormItem className="flex items-center gap-2">
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <FormLabel className="text-xs text-gray-400">Whitelist</FormLabel>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="form-section col-span-2 bg-gray-900/50 rounded-lg p-2">
            <div className="mb-2">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div>
                    <h3 className="text-lg font-medium text-white">Distribution & Vesting</h3>
                    <p className="text-sm text-gray-400">Configure token allocations and vesting schedules</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-8 px-2 text-sm text-blue-400 hover:text-blue-300"
                    onClick={() => {
                      setShowTokenomicsInfo(true);
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                      <circle cx="12" cy="12" r="10"></circle>
                      <path d="M12 16v-4"></path>
                      <path d="M12 8h.01"></path>
                    </svg>
                    Tokenomics Guide
                  </Button>
                </div>
                <select
                  onChange={(e) => applyPreset(e.target.value as keyof typeof VESTING_PRESETS)}
                  className="h-8 px-2 text-sm bg-gray-800 border border-gray-700 rounded-md text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-32"
                  defaultValue=""
                >
                  <option value="" disabled>Select Preset</option>
                  <option value="standard">Standard</option>
                  <option value="fair_launch">Fair</option>
                  <option value="community">Community</option>
                  <option value="growth">Growth</option>
                  <option value="bootstrap">Bootstrap</option>
                  <option value="governance">Gov</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-1 mb-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-medium text-white">Token Distribution</h4>
                <div className="text-sm font-medium">
                  {(() => {
                    const total = Number(form.watch("presalePercentage")) + Number(form.watch("liquidityPercentage")) + form.watch('wallets').reduce((sum, wallet) => sum + Number(wallet.percentage), 0);
                    return (
                      <span className={total > 100 ? 'text-red-400' : 'text-white'}>
                        Total: {total}%
                        {total > 100 && ' (exceeds 100%)'}
                      </span>
                    );
                  })()}
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-2 mt-2">
                {/* Presale - Only show when enabled */}
                {form.watch("presaleEnabled") && (
                  <div className="relative">
                    <div className="absolute -top-4 left-0 text-xs text-gray-400">Presale</div>
                    <FormField
                      control={form.control}
                      name="presalePercentage"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              max="95"
                              className="form-input h-7 text-sm bg-gray-700 pr-8 w-full"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center">
                      <span className="text-sm text-gray-400 mr-3">%</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">Allocation for presale (1-95%)</div>
                  </div>
                )}
                
                {/* Liquidity */}
                <div className="relative">
                  <div className="absolute -top-4 left-0 text-xs text-gray-400">
                    Liquidity
                    <InfoIcon content="Percentage of tokens allocated for DEX liquidity. Must be at least 25% and should make total allocation equal 100%." />
                  </div>
                  <Input
                    {...form.register("liquidityPercentage", {
                      valueAsNumber: true,
                      min: { value: 25, message: "Minimum liquidity is 25%" },
                      max: { value: 95, message: "Maximum liquidity is 95%" },
                      validate: (value) => {
                        const presaleEnabled = form.getValues("presaleEnabled");
                        const presalePercentage = presaleEnabled ? 5 : 0;
                        const wallets = form.getValues("wallets");
                        const walletPercentages = wallets.reduce((sum, w) => sum + (Number(w.percentage) || 0), 0);
                        const total = presalePercentage + value + walletPercentages;
                        return total === 100 || "Total allocation must equal 100%";
                      }
                    })}
                    type="number"
                    placeholder="65"
                    className="form-input h-7 text-sm bg-gray-700 pr-8 w-full"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center">
                    <span className="text-sm text-gray-400 mr-3">%</span>
                  </div>
                  {form.formState.errors.liquidityPercentage && (
                    <p className="text-xs text-red-400 mt-1">{form.formState.errors.liquidityPercentage.message}</p>
                  )}
                  <div className="text-xs text-gray-400 mt-1">
                    Set to 65% to achieve 100% total allocation with current presale (5%) and wallet (30%) percentages
                  </div>
                </div>
              </div>

              <div className="text-xs text-gray-400 mt-2 p-2 bg-gray-800/50 rounded">
                <p>Distribution Guide:</p>
                <ul className="list-disc list-inside mt-1">
                  {form.watch("presaleEnabled") ? (
                    <>
                      <li>Presale allocation can be set between 1-95%</li>
                      <li>Distribute the remaining tokens between liquidity and wallets</li>
                      <li>Recommended: 65% liquidity, remaining % for wallets</li>
                    </>
                  ) : (
                    <>
                      <li>Distribute 100% between liquidity and wallets</li>
                      <li>At least one wallet is required when liquidity is less than 100%</li>
                      <li>Recommended: 95% liquidity, 5% owner wallet</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
            
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-white">Additional Wallets</h4>
                <Button
                  type="button"
                  onClick={addWallet}
                  variant="secondary"
                  className="h-6 text-xs px-3"
                >
                  Add Wallet
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            {form.watch('wallets').map((_, index) => (
              <div key={index} className="p-2 bg-gray-800 rounded-lg">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1">
                    <input
                      {...form.register(`wallets.${index}.name`)}
                      placeholder="Wallet Name"
                      className="w-full bg-gray-700 text-text-primary rounded px-2 py-1 text-xs h-7"
                    />
                  </div>
                  <div className="w-20 relative">
                    <FormField
                      control={form.control}
                      name={`wallets.${index}.percentage`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              max={60}
                              placeholder="Enter percentage"
                              {...field}
                              onChange={(e) => {
                                const value = Math.min(Math.max(Number(e.target.value) || 0, 1), 60);
                                field.onChange(value);
                                
                                // Recalculate total and validate
                                const presaleEnabled = form.getValues('presaleEnabled');
                                const presalePercentage = presaleEnabled ? 5 : 0;
                                const liquidityPercentage = form.getValues('liquidityPercentage');
                                const total = presalePercentage + liquidityPercentage + value;
                                
                                if (total > 100) {
                                  // Adjust liquidity to maintain valid total
                                  const newLiquidity = Math.max(25, 100 - presalePercentage - value);
                                  form.setValue('liquidityPercentage', newLiquidity);
                                }
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        {...form.register(`wallets.${index}.vestingEnabled`)}
                        className="w-5 h-5 bg-gray-700 rounded"
                      />
                      <span className="text-xs text-gray-400">Vest</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeWallet(index)}
                      className="text-xs px-1 py-0.5 bg-red-900/50 hover:bg-red-800 text-red-100 rounded"
                    >
                      ×
                    </button>
                  </div>
                </div>

                <div className="flex gap-2 mt-2">
                  <input
                    {...form.register(`wallets.${index}.address`)}
                    placeholder="Wallet Address"
                    className="flex-1 bg-gray-700 text-text-primary rounded px-2 py-1 text-xs h-7"
                  />
                </div>

                {/* Vesting Configuration - Only show when vesting is enabled */}
                {form.watch(`wallets.${index}.vestingEnabled`) && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                      <label className="text-xs text-gray-400">Vesting Duration (days)</label>
                      <input
                        type="number"
                        {...form.register(`wallets.${index}.vestingDuration`, {
                          valueAsNumber: true,
                          min: 1
                        })}
                        placeholder="365"
                        className="w-full bg-gray-700 text-text-primary rounded px-2 py-1 text-xs h-7"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400">Cliff Duration (days)</label>
                      <input
                        type="number"
                        {...form.register(`wallets.${index}.cliffDuration`, {
                          valueAsNumber: true,
                          min: 0
                        })}
                        placeholder="90"
                        className="w-full bg-gray-700 text-text-primary rounded px-2 py-1 text-xs h-7"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Add Create Token Button */}
          <div className="mt-6 flex justify-end gap-4">
            <Button
              type="button"
              variant="secondary"
              onClick={simulateDeployment}
              className="w-40"
              disabled={!isConnected || loading || isSimulating}
            >
              {isSimulating ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Simulating...
                </>
              ) : (
                'Simulate'
              )}
            </Button>
            
            <Button
              type="submit"
              variant="primary"
              className="w-40 bg-blue-600 hover:bg-blue-700"
              disabled={!isConnected || loading || !form.formState.isValid}
            >
              {loading ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Creating...
                </>
              ) : (
                'Create Token'
              )}
            </Button>
          </div>
        </form>
      </Form>

      {/* Add Dialog for simulation results */}
      <Dialog open={showSimulationDialog} onOpenChange={setShowSimulationDialog}>
        <DialogContent className="max-w-2xl">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white">Deployment Simulation Results</h2>
            <div className="space-y-2">
              {simulationResults.map((result, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg ${
                    result.status === 'success'
                      ? 'bg-green-900/50'
                      : result.status === 'warning'
                      ? 'bg-yellow-900/50'
                      : 'bg-red-900/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-white">{result.category}</span>
                    <span
                      className={
                        result.status === 'success'
                          ? 'text-green-400'
                          : result.status === 'warning'
                          ? 'text-yellow-400'
                          : 'text-red-400'
                      }
                    >
                      {result.message}
                    </span>
                  </div>
                  {result.details && (
                    <ul className="mt-1 list-disc list-inside text-sm text-gray-300">
                      {result.details.map((detail, i) => (
                        <li key={i}>{detail}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="secondary" onClick={() => setShowSimulationDialog(false)}>
                Close
              </Button>
              <Button 
                variant="primary" 
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => {
                  setShowSimulationDialog(false);
                  form.handleSubmit(onSubmit)();
                }}
                disabled={simulationResults.some(r => r.status === 'error')}
              >
                Deploy Token
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}