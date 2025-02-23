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
    liquidityPercentage: 65, // 65% when presale enabled, 70% when disabled
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
    liquidityPercentage: 60, // 60% when presale enabled, 65% when disabled
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
    liquidityPercentage: 60, // 60% when presale enabled, 65% when disabled
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
    .refine(
      (name) => name.length >= 3 && name.length <= 32,
      "Name must be between 3 and 32 characters"
    )
    .refine(
      (name) => /^[a-zA-Z0-9\s]+$/.test(name),
      "Name can only contain letters, numbers, and spaces"
    ),
  symbol: z.string()
    .min(1, "Symbol is required")
    .refine(
      (symbol) => /^[A-Z]{2,6}$/.test(symbol),
      "Symbol must be 2-6 uppercase letters"
    )
    .refine(
      (symbol) => !['ETH', 'BTC', 'BNB', 'USDT', 'USDC'].includes(symbol),
      "Symbol is already in use by a major token"
    ),
  initialSupply: z.string().min(1, "Initial supply is required"),
  maxSupply: z.string().min(1, "Max supply is required"),
  owner: z.string().min(42, "Invalid owner address"),
  enableBlacklist: z.boolean(),
  enableTimeLock: z.boolean(),
  presaleEnabled: z.boolean().default(false),
  maxActivePresales: z.number().min(0).optional(),
  presaleRate: z.string().optional().nullable(),
  softCap: z.string().optional().nullable(),
  hardCap: z.string().optional().nullable(),
  minContribution: z.string().optional().nullable(),
  maxContribution: z.string().optional().nullable(),
  startTime: z.number().optional().nullable(),
  endTime: z.number().optional().nullable(),
  presalePercentage: z.number().min(0).max(100),
  liquidityPercentage: z.number().min(0).max(100),
  liquidityLockDuration: z.number().min(1),
  wallets: z.array(z.object({
    name: z.string().min(1, "Name is required"),
    address: z.string().min(42, "Invalid address"),
    percentage: z.number().min(0).max(100),
    vestingEnabled: z.boolean(),
    vestingDuration: z.number().min(0),
    cliffDuration: z.number().min(0),
    vestingStartTime: z.number().min(0)
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
  console.log('Validating presale times:', {
    presaleEnabled: data.presaleEnabled,
    startTime: data.startTime,
    endTime: data.endTime
  });
  
  // Only validate presale times if presale is enabled
  if (data.presaleEnabled && data.startTime && data.endTime) {
    const startDate = new Date(data.startTime);
    const endDate = new Date(data.endTime);
    return endDate > startDate;
  }
  return true;
}, {
  message: "End time must be after start time",
  path: ["endTime"]
})
.refine((data) => {
  console.log('Validating presale configuration:', {
    presaleEnabled: data.presaleEnabled,
    presaleRate: data.presaleRate,
    softCap: data.softCap,
    hardCap: data.hardCap,
    minContribution: data.minContribution,
    maxContribution: data.maxContribution
  });
  
  // Only validate presale configuration if presale is enabled
  if (data.presaleEnabled) {
    if (!data.presaleRate || !data.softCap || !data.hardCap || !data.minContribution || !data.maxContribution) {
      return false;
    }
    const softCap = Number(data.softCap);
    const hardCap = Number(data.hardCap);
    const minContribution = Number(data.minContribution);
    const maxContribution = Number(data.maxContribution);
    
    if (softCap >= hardCap || minContribution >= maxContribution) {
      return false;
    }
  }
  return true;
}, {
  message: "Invalid presale configuration",
  path: ["presaleRate"]
})
.refine((data) => {
  // Calculate total percentage based on presale state
  const totalPercentage = data.presaleEnabled ? 
    (data.presalePercentage + data.liquidityPercentage) :
    data.liquidityPercentage;
  const totalWithWallets = totalPercentage + 
    data.wallets.reduce((sum, wallet) => sum + wallet.percentage, 0);
  
  return totalWithWallets === 100;
}, {
  message: "Total allocation must be 100%",
  path: ["liquidityPercentage"]
});

type FormData = z.infer<typeof formSchema>;

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
  presaleRate: null,
  softCap: null,
  hardCap: null,
  minContribution: null,
  maxContribution: null,
  startTime: null,
  endTime: null,
  presalePercentage: 0,
  liquidityPercentage: 95,
  liquidityLockDuration: 365,
  wallets: [{
    name: "Owner",
    address: "",
    percentage: 5,
    vestingEnabled: false,
    vestingDuration: 0,
    cliffDuration: 0,
    vestingStartTime: 0
  }],
  multiPresaleConfig: {
    presales: []
  }
};

function getDefaultTimes() {
  const now = new Date();
  const startTime = new Date(now.getTime() + 3600000); // 1 hour from now
  const endTime = new Date(now.getTime() + 86400000);  // 24 hours from now
  
  return {
    startTime: Math.floor(startTime.getTime() / 1000),
    endTime: Math.floor(endTime.getTime() / 1000),
    startTimeFormatted: startTime.toISOString().slice(0, 16),
    endTimeFormatted: endTime.toISOString().slice(0, 16)
  };
}

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

  // Add handler for presale toggle
  useEffect(() => {
    const presaleEnabled = form.watch('presaleEnabled');
    const currentWallets = form.watch('wallets');
    const totalWalletPercentage = currentWallets.reduce((sum, w) => sum + w.percentage, 0);

    // Set presale percentage and maxActivePresales based on toggle
    form.setValue('presalePercentage', presaleEnabled ? 5 : 0, { shouldValidate: true });
    form.setValue('maxActivePresales', presaleEnabled ? 1 : 0);

    // Adjust liquidity percentage based on presale state and wallets
    const newLiquidity = presaleEnabled ? 
      Math.min(95 - totalWalletPercentage, 90) : // Cap at 90% with presale
      100 - totalWalletPercentage;  // Allow up to 100% without presale
    
    form.setValue('liquidityPercentage', Math.max(0, newLiquidity), { shouldValidate: true });

    // Force form validation
    form.trigger(['presalePercentage', 'liquidityPercentage']);
  }, [form.watch('presaleEnabled'), form.watch('wallets')]);

  const onSubmit = async (data: FormData) => {
    try {
      console.log('Form submission started', { data });
      console.log('Form validation errors:', form.formState.errors);
      console.log('Form values:', data);

      // Add supply validation
      if (Number(data.initialSupply) > 1e9 || Number(data.maxSupply) > 1e9) {
        throw new Error('Token supply is too large. Please use a supply less than 1 billion.');
      }

      // Validate total percentage
      const validationResult = validateDistribution(form);
      if (validationResult.status === 'error') {
        throw new Error(validationResult.message);
      }

      // Convert values to BigInt with proper decimals (reduce from 18 to 9 decimals for large supplies)
      const decimals = Number(data.initialSupply) > 1e6 ? 9 : 18;
      const initialSupply = parseUnits(data.initialSupply, decimals);
      const maxSupply = parseUnits(data.maxSupply, decimals);
      
      // Prepare wallet allocations
      const walletAllocations = data.wallets.map(wallet => ({
        wallet: wallet.address as `0x${string}`,
        percentage: wallet.percentage,
        vestingEnabled: wallet.vestingEnabled,
        vestingDuration: wallet.vestingEnabled ? BigInt(wallet.vestingDuration) : BigInt(0),
        cliffDuration: wallet.vestingEnabled ? BigInt(wallet.cliffDuration) : BigInt(0),
        vestingStartTime: wallet.vestingEnabled ? BigInt(Math.floor(Date.now() / 1000) + (24 * 3600)) : BigInt(0)
      }));

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
        presaleRate: data.presaleEnabled ? parseUnits(data.presaleRate?.toString() || '0', 18) : BigInt(0),
        softCap: data.presaleEnabled ? parseUnits(data.softCap?.toString() || '0', 18) : BigInt(0),
        hardCap: data.presaleEnabled ? parseUnits(data.hardCap?.toString() || '0', 18) : BigInt(0),
        minContribution: data.presaleEnabled ? parseUnits(data.minContribution?.toString() || '0', 18) : BigInt(0),
        maxContribution: data.presaleEnabled ? parseUnits(data.maxContribution?.toString() || '0', 18) : BigInt(0),
        startTime: data.presaleEnabled ? BigInt(data.startTime || 0) : BigInt(0),
        endTime: data.presaleEnabled ? BigInt(data.endTime || 0) : BigInt(0),
        presalePercentage: data.presaleEnabled ? 5 : 0,
        liquidityPercentage: data.liquidityPercentage,
        liquidityLockDuration: BigInt(Math.min(data.liquidityLockDuration, 365)), // Cap at 365 days
        walletAllocations
      };

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
    const defaultTimes = getDefaultTimes();
    const newWallet = {
      name: '',
      address: '',
      percentage: 0,
      vestingEnabled: false,
      vestingDuration: 365,
      cliffDuration: 90,
      vestingStartTime: Math.floor(Date.now() / 1000) + (24 * 3600) // 24 hours from now
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
    
    // Set liquidity percentage based on presale state
    const liquidityPercentage = presaleEnabled ? 
      presetConfig.liquidityPercentage : // Use preset liquidity if presale enabled
      presetConfig.liquidityPercentage + 5; // Add presale's 5% to liquidity if disabled
    
    form.setValue('liquidityPercentage', liquidityPercentage);
    
    // Set wallets with correct percentages
    form.setValue('wallets', presetConfig.wallets.map(wallet => ({
      name: wallet.name,
      address: address || '0x0000000000000000000000000000000000000000',
      percentage: wallet.percentage,
      vestingEnabled: wallet.vestingEnabled,
      vestingDuration: wallet.vestingDuration,
      cliffDuration: wallet.cliffDuration,
      vestingStartTime: Math.floor(Date.now() / 1000) + (24 * 3600)
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
    const presaleEnabled = form.getValues('presaleEnabled');
    const presalePercentage = presaleEnabled ? 5 : 0;
    const liquidityPercentage = form.getValues('liquidityPercentage') || 0;
    const wallets = form.getValues('wallets') || [];
    const walletPercentages = wallets.reduce((sum: number, w: { percentage?: number }) => sum + (w.percentage || 0), 0);
    const totalPercentage = presalePercentage + liquidityPercentage + walletPercentages;

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
      } as ValidationResult;
    }

    // When there are wallet allocations, total must equal 100%
    if (totalPercentage !== 100) {
      return {
        category: 'Distribution',
        message: 'Total allocation must be 100%',
        details: [
          `Presale: ${presalePercentage}%`,
          `Liquidity: ${liquidityPercentage}%`,
          `Additional Wallets: ${walletPercentages}%`,
          `Total: ${totalPercentage}%`
        ],
        status: 'error'
      } as ValidationResult;
    }

    return {
      category: 'Distribution',
      message: 'Distribution percentages are valid',
      status: 'success'
    } as ValidationResult;
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
    setShowResults(true);
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

          {/* Hide presale configuration if presale is disabled */}
          {form.watch("presaleEnabled") && (
            <div className="form-section bg-gray-800/50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-white mb-2">Presale Configuration</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <label htmlFor="presaleRate" className="text-sm text-white">Presale Rate</label>
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.0000000001"
                      placeholder="0.001"
                      {...form.register("presaleRate", {
                        required: "Presale rate is required",
                        min: { value: 0.000000001, message: "Minimum rate is 0.000000001" },
                        max: { value: 1, message: "Maximum rate is 1" },
                        validate: {
                          validNumber: (value) => value ? !isNaN(Number(value)) || "Please enter a valid number" : "Value is required",
                          notZero: (value) => value ? Number(value) > 0 || "Rate must be greater than 0" : "Value is required"
                        }
                      })}
                      className="form-input h-8 text-sm bg-gray-700 pr-16"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-2">
                      <span className="text-xs text-gray-400">
                        {form.watch("presaleRate") && Number(form.watch("presaleRate")) > 0 
                          ? `≈ ${(1 / Number(form.watch("presaleRate"))).toLocaleString(undefined, {maximumFractionDigits: 2})} tokens/ETH` 
                          : ''}
                      </span>
                    </div>
                  </div>
                  {form.formState.errors.presaleRate && (
                    <p className="text-xs text-red-400 mt-1">{form.formState.errors.presaleRate.message}</p>
                  )}
                </div>
                
                <div className="relative">
                  <label htmlFor="softCap" className="text-sm text-white">Soft Cap (ETH)</label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="1"
                    {...form.register("softCap", {
                      required: "Soft cap is required",
                      min: { value: 0.01, message: "Minimum soft cap is 0.01 ETH" },
                      validate: {
                        validNumber: (value) => value ? !isNaN(Number(value)) || "Please enter a valid number" : "Value is required",
                        notZero: (value) => value ? Number(value) > 0 || "Soft cap must be greater than 0" : "Value is required",
                        lessThanHardCap: (value) => {
                          if (!value) return "Value is required";
                          const hardCap = form.watch("hardCap");
                          return !hardCap || Number(value) <= Number(hardCap) || "Soft cap must be less than hard cap";
                        }
                      }
                    })}
                    className="form-input h-8 text-sm bg-gray-700"
                  />
                  {form.formState.errors.softCap && (
                    <p className="text-xs text-red-400 mt-1">{form.formState.errors.softCap.message}</p>
                  )}
                </div>
                
                <div className="relative">
                  <label htmlFor="hardCap" className="text-sm text-white">Hard Cap (ETH)</label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="10"
                    {...form.register("hardCap", {
                      required: "Hard cap is required",
                      min: { value: 0.01, message: "Minimum hard cap is 0.01 ETH" },
                      validate: {
                        validNumber: (value) => value ? !isNaN(Number(value)) || "Please enter a valid number" : "Value is required",
                        notZero: (value) => value ? Number(value) > 0 || "Hard cap must be greater than 0" : "Value is required",
                        greaterThanSoftCap: (value) => {
                          if (!value) return "Value is required";
                          const softCap = form.watch("softCap");
                          return !softCap || Number(value) >= Number(softCap) || "Hard cap must be greater than soft cap";
                        }
                      }
                    })}
                    className="form-input h-8 text-sm bg-gray-700"
                  />
                  {form.formState.errors.hardCap && (
                    <p className="text-xs text-red-400 mt-1">{form.formState.errors.hardCap.message}</p>
                  )}
                </div>
                
                <div className="relative">
                  <label htmlFor="minContribution" className="text-sm text-white">Min Contribution (ETH)</label>
                  <Input
                    type="number"
                    step="0.001"
                    placeholder="0.01"
                    {...form.register("minContribution", {
                      required: "Minimum contribution is required",
                      min: { value: 0.001, message: "Minimum contribution must be at least 0.001 ETH" },
                      validate: {
                        validNumber: (value) => value ? !isNaN(Number(value)) || "Please enter a valid number" : "Value is required",
                        notZero: (value) => value ? Number(value) > 0 || "Minimum contribution must be greater than 0" : "Value is required",
                        lessThanMax: (value) => {
                          if (!value) return "Value is required";
                          const maxContribution = form.watch("maxContribution");
                          return !maxContribution || Number(value) <= Number(maxContribution) || "Minimum contribution must be less than maximum contribution";
                        }
                      }
                    })}
                    className="form-input h-8 text-sm bg-gray-700"
                  />
                  {form.formState.errors.minContribution && (
                    <p className="text-xs text-red-400 mt-1">{form.formState.errors.minContribution.message}</p>
                  )}
                </div>
                
                <div className="relative">
                  <label htmlFor="maxContribution" className="text-sm text-white">Max Contribution (ETH)</label>
                  <Input
                    type="number"
                    step="0.001"
                    placeholder="1"
                    {...form.register("maxContribution", {
                      required: "Maximum contribution is required",
                      min: { value: 0.001, message: "Maximum contribution must be at least 0.001 ETH" },
                      validate: {
                        validNumber: (value) => value ? !isNaN(Number(value)) || "Please enter a valid number" : "Value is required",
                        notZero: (value) => value ? Number(value) > 0 || "Maximum contribution must be greater than 0" : "Value is required",
                        greaterThanMin: (value) => {
                          if (!value) return "Value is required";
                          const minContribution = form.watch("minContribution");
                          return !minContribution || Number(value) >= Number(minContribution) || "Maximum contribution must be greater than minimum contribution";
                        },
                        lessThanHardCap: (value) => {
                          if (!value) return "Value is required";
                          const hardCap = form.watch("hardCap");
                          return !hardCap || Number(value) <= Number(hardCap) || "Maximum contribution must be less than hard cap";
                        }
                      }
                    })}
                    className="form-input h-8 text-sm bg-gray-700"
                  />
                  {form.formState.errors.maxContribution && (
                    <p className="text-xs text-red-400 mt-1">{form.formState.errors.maxContribution.message}</p>
                  )}
                </div>
              </div>

              {/* Date/Time inputs in their own row */}
              <div className="col-span-2 space-y-2">
                <div>
                  <label htmlFor="startTime" className="text-sm text-white">Start Time</label>
                  <Input
                    type="datetime-local"
                    {...form.register("startTime", {
                      required: "Start time is required",
                      validate: {
                        futureDate: (value) => {
                          if (!value) return "Start time is required";
                          const date = new Date(value);
                          return date > new Date() || "Start time must be in the future";
                        }
                      }
                    })}
                    className="form-input h-8 text-sm bg-gray-700"
                  />
                  {form.formState.errors.startTime && (
                    <p className="text-xs text-red-400 mt-1">{form.formState.errors.startTime.message}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="endTime" className="text-sm text-white">End Time</label>
                  <Input
                    type="datetime-local"
                    {...form.register("endTime", {
                      required: "End time is required",
                      validate: {
                        afterStart: (value) => {
                          if (!value) return "End time is required";
                          const startTime = form.watch("startTime");
                          if (!startTime) return true;
                          const start = new Date(startTime);
                          const end = new Date(value);
                          return end > start || "End time must be after start time";
                        }
                      }
                    })}
                    className="form-input h-8 text-sm bg-gray-700"
                  />
                  {form.formState.errors.endTime && (
                    <p className="text-xs text-red-400 mt-1">{form.formState.errors.endTime.message}</p>
                  )}
                </div>
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
                      // Using the Dialog component to show tokenomics info
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
                    <div className="absolute -top-4 left-0 text-xs text-gray-400">Mandatory Presale</div>
                    <Input
                      type="number"
                      value="5"
                      disabled
                      className="form-input h-7 text-sm bg-gray-700/50 pr-8 w-full opacity-50"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center">
                      <span className="text-sm text-gray-400 mr-3">%</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">Fixed 5% allocation when presale enabled</div>
                  </div>
                )}
                
                {/* Liquidity */}
                <div className="relative">
                  <div className="absolute -top-4 left-0 text-xs text-gray-400">
                    Liquidity
                    <InfoIcon content="Percentage of tokens allocated for DEX liquidity. Must be less than 100% to leave tokens for owner." />
                  </div>
                  <Input
                    {...form.register("liquidityPercentage", {
                      valueAsNumber: true,
                      min: { value: 25, message: "Minimum liquidity is 25%" },
                      max: { value: 95, message: "Maximum liquidity is 95% to leave tokens for owner" }
                    })}
                    type="number"
                    placeholder="95"
                    className="form-input h-7 text-sm bg-gray-700 pr-8 w-full"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center">
                    <span className="text-sm text-gray-400 mr-3">%</span>
                  </div>
                  {form.formState.errors.liquidityPercentage && (
                    <p className="text-xs text-red-400 mt-1">{form.formState.errors.liquidityPercentage.message}</p>
                  )}
                  <div className="text-xs text-gray-400 mt-1">
                    Remaining allocation: {95 - (Number(form.watch("liquidityPercentage")) + form.watch('wallets').reduce((sum, w) => sum + Number(w.percentage), 0))}%
                  </div>
                </div>
              </div>

              <div className="text-xs text-gray-400 mt-2 p-2 bg-gray-800/50 rounded">
                <p>Distribution Guide:</p>
                <ul className="list-disc list-inside mt-1">
                  {form.watch("presaleEnabled") ? (
                    <>
                      <li>5% is reserved for presale</li>
                      <li>Distribute the remaining 95% between liquidity and wallets</li>
                      <li>Recommended: 65% liquidity, 30% wallets</li>
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
                    <input
                      type="number"
                      {...form.register(`wallets.${index}.percentage`)}
                      placeholder="%"
                      className="w-full bg-gray-700 text-text-primary rounded px-2 py-1 text-xs h-7 pr-5"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      {...form.register(`wallets.${index}.vestingEnabled`)}
                      className="w-2.5 h-2.5 bg-gray-700 rounded"
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

                <div className="flex gap-2 mt-0.5">
                  <input
                    {...form.register(`wallets.${index}.address`)}
                    placeholder="Address (0x...)"
                    className="flex-1 bg-gray-700 text-text-primary rounded px-2 py-1 text-xs h-7"
                  />
                </div>

                {form.watch(`wallets.${index}.vestingEnabled`) && (
                  <div className="flex gap-2 mt-0.5">
                    <div className="flex-1 relative">
                      <input
                        type="number"
                        {...form.register(`wallets.${index}.vestingDuration`)}
                        placeholder="Vesting"
                        className="w-full bg-gray-700 text-text-primary rounded px-2 py-1 text-xs h-7 pr-12"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">days</span>
                    </div>
                    <div className="flex-1 relative">
                      <input
                        type="number"
                        {...form.register(`wallets.${index}.cliffDuration`)}
                        placeholder="Cliff"
                        className="w-full bg-gray-700 text-text-primary rounded px-2 py-1 text-xs h-7 pr-12"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">days</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="form-actions mt-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center mr-2">
                <InfoIcon content="Deployment fee will be charged in ETH. Make sure you have enough ETH to cover the fee and gas costs." />
              </div>
              <Button
                type="button"
                onClick={simulateDeployment}
                disabled={isSimulating || !isConnected}
                variant="secondary"
                className="bg-blue-600/20 hover:bg-blue-700/20 text-blue-400"
              >
                {isSimulating ? (
                  <>
                    <span className="animate-spin mr-2">⟳</span>
                    Analyzing...
                  </>
                ) : (
                  'Test Deployment'
                )}
              </Button>
              <Button 
                type="submit"
                disabled={!isConnected || loading || form.formState.isSubmitting}
                className="form-button-primary"
                onClick={() => {
                  console.log('Submit button clicked');
                  console.log('Form state:', {
                    isDirty: form.formState.isDirty,
                    isValid: form.formState.isValid,
                    errors: form.formState.errors,
                    isSubmitting: form.formState.isSubmitting,
                    submitCount: form.formState.submitCount
                  });
                }}
              >
                {loading ? (
                  <>
                    <Spinner className="w-4 h-4 mr-2" />
                    Creating Token...
                  </>
                ) : (
                  'Create Token'
                )}
              </Button>
            </div>
          </div>

          <div className="mt-8">
            <TokenPreview
              name={form.watch("name")}
              symbol={form.watch("symbol")}
              initialSupply={form.watch("initialSupply").toString()}
              maxSupply={form.watch("maxSupply").toString()}
              distributionSegments={[
                ...(form.watch("presaleEnabled") ? [{ name: 'Presale', amount: 5, percentage: 5, color: '#0088FE' }] : []),
                { name: 'Liquidity', amount: Number(form.watch("liquidityPercentage")), percentage: Number(form.watch("liquidityPercentage")), color: '#00C49F' },
                ...form.watch('wallets').map((wallet, index) => ({
                  name: wallet.name,
                  amount: Number(wallet.percentage),
                  percentage: Number(wallet.percentage),
                  color: COLORS[index % COLORS.length]
                }))
              ]}
              totalAllocation={form.watch("presaleEnabled") ? 
                (5 + Number(form.watch("liquidityPercentage")) + form.watch('wallets').reduce((sum, wallet) => sum + Number(wallet.percentage), 0)) :
                (Number(form.watch("liquidityPercentage")) + form.watch('wallets').reduce((sum, wallet) => sum + Number(wallet.percentage), 0))
              }
            />
          </div>
        </form>
      </Form>

      {/* Dialogs */}
      <Dialog open={showResults} onOpenChange={setShowResults}>
        <DialogContent className="bg-gray-800 p-0">
          <div className="p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Deployment Analysis</h3>
            <div className="space-y-4">
              {simulationResults.map((result, index) => (
                <div key={index} className={`p-4 rounded-lg ${
                  result.status === 'error' ? 'bg-red-900/20 border border-red-800/50' :
                  result.status === 'warning' ? 'bg-yellow-900/20 border border-yellow-800/50' :
                  'bg-green-900/20 border border-green-800/50'
                }`}>
                  <div className="flex items-start gap-3">
                    <div className={`rounded-full p-1 ${
                      result.status === 'error' ? 'bg-red-500/20 text-red-400' :
                      result.status === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-green-500/20 text-green-400'
                    }`}>
                      {result.status === 'error' ? '✕' :
                       result.status === 'warning' ? '!' : '✓'}
                    </div>
                    <div>
                      <h4 className="font-medium text-white">{result.category}</h4>
                      <p className="text-gray-300 mt-1">{result.message}</p>
                      {result.details && (
                        <ul className="mt-2 space-y-1">
                          {result.details.map((detail, i) => (
                            <li key={i} className="text-sm text-gray-400">• {detail}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showTokenomicsInfo} onOpenChange={setShowTokenomicsInfo}>
        <DialogContent className="bg-gray-800 p-0">
          <div className="p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Token Distribution Guide</h3>
            {/* Add tokenomics guide content here */}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const COLORS = [
  '#0088FE',
  '#00C49F',
  '#FFBB28',
  '#FF8042',
  '#8884D8',
  '#82CA9D',
  '#F66D44',
  '#FABE0F',
];