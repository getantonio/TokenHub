import React, { useState, useEffect, useMemo } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { BrowserProvider } from 'ethers';
import { useNetwork } from '@contexts/NetworkContext';
import { useToast } from '@/components/ui/toast/use-toast';
import TokenPreview from '@components/features/token/TokenPreview';
import TokenAdminV3 from '@components/features/token/TCAP_v3';
import { InfoIcon } from '@components/ui/InfoIcon';
import { Spinner } from '@components/ui/Spinner';
import { Card } from '@components/ui/card';
import { useTokenFactory } from '@/hooks/useTokenFactory';
import { useWatchContractEvent } from 'wagmi';
import TokenFactoryV3ABI from '@/contracts/abi/TokenFactory_v3.0.0.json';
import { FACTORY_ADDRESSES } from '@/config/contracts';
import { getAddress } from 'viem';
import * as ethers from 'ethers';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import type { FieldValues } from 'react-hook-form';
import { Button } from '@/components/ui/button';

const formSchema = z.object({
  name: z.string().min(1, 'Token name is required'),
  symbol: z.string().min(1, 'Token symbol is required'),
  initialSupply: z.string().min(1, 'Initial supply is required'),
  maxSupply: z.string().min(1, 'Max supply is required'),
  presaleRate: z.string().min(1, 'Presale rate is required'),
  presaleStartTime: z.string().min(1, 'Presale start time is required'),
  presaleEndTime: z.string().min(1, 'Presale end time is required'),
  minContribution: z.string().min(1, 'Min contribution is required'),
  maxContribution: z.string().min(1, 'Max contribution is required'),
  softCap: z.string().min(1, 'Soft cap is required'),
  hardCap: z.string().min(1, 'Hard cap is required'),
  liquidityPercent: z.string().min(1, 'Liquidity percent is required'),
  liquidityLockPeriod: z.string().min(1, 'Liquidity lock period is required'),
  vestingSchedules: z.array(z.object({
    walletName: z.string(),
    amount: z.string(),
    period: z.string(),
    beneficiary: z.string()
  })),
  enableBlacklist: z.boolean(),
  enableTimeLock: z.boolean(),
  presalePercent: z.string().min(1, "Required"),
  presaleAllocation: z.string().optional(),
  liquidityAllocation: z.string().optional(),
});

interface TokenFormV3Props {
  isConnected: boolean;
}

interface SuccessInfo {
  tokenAddress?: string;
}

interface TokenCreatedEvent {
  token: `0x${string}`;
  name: string;
  symbol: string;
}

interface PresetSchedule {
  amount: string;
  period: string;
  walletName: string;
}

interface Preset {
  schedules: PresetSchedule[];
}

const defaultValues = {
  name: 'Test Token',
  symbol: 'TEST',
  initialSupply: '1000000',
  maxSupply: '2000000',
  presaleRate: '0.0001',
  presaleStartTime: '',
  presaleEndTime: '',
  minContribution: '0.1',
  maxContribution: '10',
  softCap: '1000000',
  hardCap: '2000000',
  liquidityPercent: '60',
  liquidityLockPeriod: '180',
  vestingSchedules: [
    {
      walletName: 'Presale',
      amount: '',
      period: '0',
      beneficiary: ''
    },
    {
      walletName: 'Liquidity',
      amount: '',
      period: '180',
      beneficiary: ''
    }
  ],
  enableBlacklist: false,
  enableTimeLock: false,
  presalePercent: '20',
};

const PRESETS = {
  standard: {
    schedules: [
      { amount: "50", period: "0", walletName: "Presale" },
      { amount: "20", period: "0", walletName: "Liquidity" },
      { amount: "15", period: "180", walletName: "Team" },
      { amount: "10", period: "90", walletName: "Marketing" },
      { amount: "5", period: "30", walletName: "Advisors" }
    ]
  },
  team: {
    schedules: [
      { amount: "40", period: "0", walletName: "Presale" },
      { amount: "15", period: "0", walletName: "Liquidity" },
      { amount: "25", period: "365", walletName: "Team" },
      { amount: "10", period: "180", walletName: "Development" },
      { amount: "10", period: "90", walletName: "Marketing" }
    ]
  },
  investor: {
    schedules: [
      { amount: "60", period: "0", walletName: "Presale" },
      { amount: "25", period: "0", walletName: "Liquidity" },
      { amount: "10", period: "90", walletName: "Team" },
      { amount: "5", period: "30", walletName: "Marketing" }
    ]
  }
};

export function TokenForm_V3({ isConnected }: TokenFormV3Props) {
  const { toast } = useToast();
  const { createToken, isLoading, error } = useTokenFactory('v3');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successInfo, setSuccessInfo] = useState<SuccessInfo>({});
  const { chainId } = useNetwork();
  const [web3Provider, setWeb3Provider] = useState<BrowserProvider | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      setWeb3Provider(new BrowserProvider(window.ethereum));
    }
  }, []);

  // Listen for TokenCreated events
  const contractAddress = chainId && FACTORY_ADDRESSES.v3[chainId] 
    ? getAddress(FACTORY_ADDRESSES.v3[chainId]) 
    : undefined;

  useWatchContractEvent({
    address: contractAddress,
    abi: TokenFactoryV3ABI.abi as unknown as any,
    eventName: 'TokenCreated',
    enabled: !!contractAddress,
    onLogs(logs) {
      const log = logs[0];
      const event = log as unknown as { args: TokenCreatedEvent };
      if (event?.args?.token) {
        setSuccessInfo({ tokenAddress: event.args.token });
        toast({
          title: "Success",
          description: "Token created successfully",
          variant: "default"
        });
      }
    },
  });

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    setValue
  } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'vestingSchedules'
  });

  // Use useWatch for live updates
  const name = useWatch({ control: control, name: 'name' });
  const symbol = useWatch({ control: control, name: 'symbol' });
  const initialSupply = useWatch({ control: control, name: 'initialSupply' });
  const maxSupply = useWatch({ control: control, name: 'maxSupply' });

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    if (!isConnected) {
      toast({
        title: "Error",
        description: "Please connect your wallet first",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Convert form data to contract parameters
      const params = {
        name: data.name,
        symbol: data.symbol,
        initialSupply: ethers.parseUnits(data.initialSupply, 18),
        maxSupply: ethers.parseUnits(data.maxSupply, 18),
        presaleRate: ethers.parseUnits(data.presaleRate, 18),
        presaleStartTime: new Date(data.presaleStartTime).getTime() / 1000,
        presaleEndTime: new Date(data.presaleEndTime).getTime() / 1000,
        minContribution: ethers.parseUnits(data.minContribution, 18),
        maxContribution: ethers.parseUnits(data.maxContribution, 18),
        softCap: ethers.parseUnits(data.softCap, 18),
        hardCap: ethers.parseUnits(data.hardCap, 18),
        liquidityPercent: parseInt(data.liquidityPercent),
        liquidityLockPeriod: parseInt(data.liquidityLockPeriod) * 86400, // Convert days to seconds
        vestingSchedules: data.vestingSchedules.map(schedule => ({
          walletName: schedule.walletName,
          amount: ethers.parseUnits(schedule.amount, 18),
          period: parseInt(schedule.period) * 86400, // Convert days to seconds
          beneficiary: schedule.beneficiary
        })),
        enableBlacklist: data.enableBlacklist,
        enableTimeLock: data.enableTimeLock
      };

      // Call contract to create token
      await createToken(params);
      
      toast({
        title: "Success",
        description: "Token created successfully",
        variant: "default"
      });
    } catch (error) {
      console.error('Error creating token:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create token",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePresetClick = (preset: Preset) => {
    const schedules = preset.schedules;
    setValue('vestingSchedules', schedules.map((s: PresetSchedule) => ({
      amount: s.amount,
      period: s.period,
      walletName: s.walletName,
      beneficiary: ''
    })));
  };

  const handleResetClick = () => {
    setValue('vestingSchedules', [
      {
        walletName: 'Presale',
        amount: '',
        period: '0',
        beneficiary: ''
      },
      {
        walletName: 'Liquidity',
        amount: '',
        period: '180',
        beneficiary: ''
      }
    ]);
  };

  // Calculate total allocation percentage
  const totalAllocation = useMemo(() => {
    return fields.reduce((sum, field) => {
      const amount = parseFloat(field.amount) || 0;
      return sum + amount;
    }, 0);
  }, [fields]);

  // Generate distribution bar segments
  const distributionSegments = useMemo(() => {
    const getRandomColor = (name: string) => {
      const colors = {
        'Presale': '#4F46E5', // Indigo
        'Liquidity': '#10B981', // Emerald
        'Team': '#F59E0B', // Amber
        'Marketing': '#EC4899', // Pink
        'Development': '#6366F1', // Purple
        'Advisors': '#14B8A6', // Teal
      };
      return colors[name as keyof typeof colors] || '#6B7280'; // Gray as default
    };

    if (!fields || fields.length === 0) return [];
    return fields.map((field) => {
      const amount = parseFloat(field.amount) || 0;
      const percentage = totalAllocation > 0 ? (amount / totalAllocation) * 100 : 0;
      return {
        name: field.walletName,
        amount,
        percentage,
        color: getRandomColor(field.walletName)
      };
    });
  }, [fields, totalAllocation]);

  return (
    <Card className="w-full bg-gray-800 border-gray-700">
      <h2 className="text-lg font-semibold mb-1 text-white">Create Token (V3)</h2>
      <p className="text-xs text-white mb-1">
        Create a token with advanced features including vesting schedules and multi-wallet distribution.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-1 p-2">
        {/* Token Info - Single line */}
        <div className="grid grid-cols-4 gap-2">
          <div className="form-group">
            <label htmlFor="name" className="text-xs font-medium text-white">Token Name</label>
            <input
              id="name"
              {...register('name')}
              placeholder="My Token"
              className="mt-1 w-full px-2 py-1 text-sm bg-background-primary rounded border border-border text-white"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="symbol" className="text-xs font-medium text-white">Token Symbol</label>
            <input
              id="symbol"
              {...register('symbol')}
              placeholder="TKN"
              className="mt-1 w-full px-2 py-1 text-sm bg-background-primary rounded border border-border text-white"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="initialSupply" className="text-xs font-medium text-white">Initial Supply</label>
            <input
              id="initialSupply"
              {...register('initialSupply')}
              placeholder="1000000"
              className="mt-1 w-full px-2 py-1 text-sm bg-background-primary rounded border border-border text-white"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="maxSupply" className="text-xs font-medium text-white">Maximum Supply</label>
            <input
              id="maxSupply"
              {...register('maxSupply')}
              placeholder="2000000"
              className="mt-1 w-full px-2 py-1 text-sm bg-background-primary rounded border border-border text-white"
              required
            />
          </div>
        </div>

        {/* Token Features - Minimal spacing */}
        <div className="py-3">
          <h3 className="text-sm font-medium text-white mb-1">Token Features</h3>
          <div className="grid grid-cols-5 gap-2">
            <div className="flex items-center space-x-1">
              <input
                type="checkbox"
                id="enableBlacklist"
                {...register('enableBlacklist')}
                className="form-checkbox"
              />
              <label htmlFor="enableBlacklist" className="text-xs text-white">Enable Blacklist</label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="enableTimeLock"
                {...register('enableTimeLock')}
                className="form-checkbox"
              />
              <label htmlFor="enableTimeLock" className="text-xs text-white">Enable Time Lock</label>
            </div>
          </div>
        </div>

        {/* Presale Settings - Tighter spacing */}
        <div className="py-1">
          <h3 className="text-sm font-medium text-white mb-1">Presale Settings</h3>
          <div className="space-y-1">
            {/* Presale Parameters */}
            <div className="grid grid-cols-2 gap-2">
              <div className="form-group">
                <label className="text-xs text-white">Price (ETH)</label>
                <input
                  {...register('presaleRate')}
                  placeholder="0.0001"
                  className="mt-1 w-full px-2 py-1 text-sm bg-background-primary rounded border border-border text-white"
                  type="number"
                  step="0.0001"
                />
              </div>
              <div className="form-group">
                <label className="text-xs text-white">Lock Period (days)</label>
                <input
                  {...register('liquidityLockPeriod')}
                  placeholder="180"
                  className="mt-1 w-full px-2 py-1 text-sm bg-background-primary rounded border border-border text-white"
                  type="number"
                />
              </div>
            </div>

            {/* Contribution Limits */}
            <div className="grid grid-cols-4 gap-2">
              <div className="form-group">
                <label className="text-xs text-white">Min Contribution (ETH)</label>
                <input
                  {...register('minContribution')}
                  placeholder="0.1"
                  className="mt-1 w-full px-2 py-1 text-sm bg-background-primary rounded border border-border text-white"
                  type="number"
                  step="0.1"
                />
              </div>
              <div className="form-group">
                <label className="text-xs text-white">Max Contribution (ETH)</label>
                <input
                  {...register('maxContribution')}
                  placeholder="10"
                  className="mt-1 w-full px-2 py-1 text-sm bg-background-primary rounded border border-border text-white"
                  type="number"
                  step="0.1"
                />
              </div>
              <div className="form-group">
                <label className="text-xs text-white">Soft Cap (ETH)</label>
                <input
                  {...register('softCap')}
                  placeholder="50"
                  className="mt-1 w-full px-2 py-1 text-sm bg-background-primary rounded border border-border text-white"
                  type="number"
                  step="0.1"
                />
              </div>
              <div className="form-group">
                <label className="text-xs text-white">Hard Cap (ETH)</label>
                <input
                  {...register('hardCap')}
                  placeholder="100"
                  className="mt-1 w-full px-2 py-1 text-sm bg-background-primary rounded border border-border text-white"
                  type="number"
                  step="0.1"
                />
              </div>
            </div>

            {/* Presale Timeline */}
            <div className="grid grid-cols-2 gap-2">
              <div className="form-group">
                <div className="flex items-center gap-1">
                  <label className="text-xs text-white">Start Time</label>
                  <InfoIcon content="The date and time when the presale will begin. The presale will automatically end after the lock period." />
                </div>
                <input
                  {...register('presaleStartTime')}
                  type="datetime-local"
                  className="mt-1 w-full px-2 py-1 text-sm bg-background-primary rounded border border-border text-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Vesting & Distribution */}
        <div className="py-1">
          <h3 className="text-sm font-medium text-white mb-1">Vesting & Distribution</h3>
          
          {/* Preset Dropdown */}
          <div className="flex items-center mb-2">
            <select
              onChange={(e) => {
                if (e.target.value === 'reset') {
                  handleResetClick();
                } else {
                  handlePresetClick(PRESETS[e.target.value as keyof typeof PRESETS]);
                }
              }}
              className="w-[200px] text-xs py-1 bg-gray-700 text-white border-gray-600 rounded"
            >
              <option value="">Presets</option>
              <option value="standard">Standard</option>
              <option value="team">Team</option>
              <option value="investor">Investor</option>
              <option value="reset">Reset</option>
            </select>
          </div>

          {/* Vesting Schedules */}
          <div className="space-y-1">
            {fields.map((field, index) => {
              const isPresaleOrLiquidity = field.walletName === 'Presale' || field.walletName === 'Liquidity';
              
              if (index === 0 && fields[0]?.walletName === 'Presale' && fields[1]?.walletName === 'Liquidity') {
                return (
                  <div key={field.id} className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-white font-medium w-16">Presale</span>
                        <InfoIcon content="Percentage of total supply allocated for presale. This amount will be automatically added to the vesting schedules." />
                      </div>
                      <div className="relative">
                        <input
                          {...register(`vestingSchedules.${index}.amount`)}
                          placeholder="%"
                          type="number"
                          className="w-20 px-2 py-1 text-sm bg-background-primary rounded border border-border text-white pr-6"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">%</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-white font-medium w-16">Liquidity</span>
                        <InfoIcon content="Percentage of total supply allocated for liquidity pool. This amount will be automatically added to the vesting schedules." />
                      </div>
                      <div className="relative">
                        <input
                          {...register(`vestingSchedules.${index + 1}.amount`)}
                          placeholder="%"
                          type="number"
                          className="w-20 px-2 py-1 text-sm bg-background-primary rounded border border-border text-white pr-6"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">%</span>
                      </div>
                    </div>
                  </div>
                );
              }
              
              if (index === 1 && fields[0]?.walletName === 'Presale' && field.walletName === 'Liquidity') {
                return null;
              }

              if (!isPresaleOrLiquidity) {
                return (
                  <div key={field.id} className="grid grid-cols-5 gap-2">
                    <div className="form-group">
                      <input
                        {...register(`vestingSchedules.${index}.walletName`)}
                        placeholder="Wallet Name"
                        className="mt-1 w-full px-2 py-1 text-sm bg-background-primary rounded border border-border text-white"
                      />
                    </div>
                    <div className="form-group">
                      <input
                        {...register(`vestingSchedules.${index}.amount`)}
                        placeholder="Amount (%)"
                        type="number"
                        className="mt-1 w-full px-2 py-1 text-sm bg-background-primary rounded border border-border text-white"
                      />
                    </div>
                    <div className="form-group">
                      <input
                        {...register(`vestingSchedules.${index}.period`)}
                        placeholder="Period (days)"
                        type="number"
                        className="mt-1 w-full px-2 py-1 text-sm bg-background-primary rounded border border-border text-white"
                      />
                    </div>
                    <div className="form-group">
                      <input
                        {...register(`vestingSchedules.${index}.beneficiary`)}
                        placeholder="Wallet Address (0x...)"
                        className="mt-1 w-full px-2 py-1 text-sm bg-background-primary rounded border border-border text-white"
                      />
                    </div>
                    <div className="flex items-center">
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="text-red-500 hover:text-red-600"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              }
              return null;
            })}
          </div>

          <button
            type="button"
            onClick={() => append({ walletName: '', amount: '', period: '', beneficiary: '' })}
            className="mt-2 text-sm text-blue-500 hover:text-blue-600"
          >
            + Add Vesting Schedule
          </button>
        </div>

        {error && (
          <div className="text-red-800 text-sm">{error}</div>
        )}

        <div className="flex justify-end items-center space-x-2 pt-2">
          <div className="flex items-center">
            <InfoIcon content="Deployment fee will be charged in ETH. Make sure you have enough ETH to cover the fee and gas costs." />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-40 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isSubmitting ? 'Creating Token...' : 'Create Token'}
          </button>
        </div>
      </form>

      {/* Preview Section */}
      <div className="space-y-1">
        <TokenPreview
          name={name}
          symbol={symbol}
          initialSupply={initialSupply}
          maxSupply={maxSupply}
          distributionSegments={distributionSegments}
          totalAllocation={totalAllocation}
        />
        
        <Card className="p-2 bg-gray-800">
          <h2 className="text-lg font-semibold mb-2 text-white">Token Creator Admin Panel</h2>
          <TokenAdminV3
            isConnected={isConnected}
            address={successInfo?.tokenAddress}
            provider={web3Provider}
          />
        </Card>
      </div>
    </Card>
  );
} 