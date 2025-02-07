import { useState } from 'react';
import { useNetwork } from '@contexts/NetworkContext';
import { useToast } from '@/components/ui/toast/use-toast';
import TokenPreview from '@components/features/token/TokenPreview';
import { InfoIcon } from '@components/ui/InfoIcon';
import { Spinner } from '@components/ui/Spinner';
import { useTokenFactory } from '@/hooks/useTokenFactory';
import { useAccount } from 'wagmi';
import TokenFactory_v3 from '@contracts/abi/TokenFactory_v3.json';
import { FACTORY_ADDRESSES } from '@config/contracts';
import * as z from 'zod';
import { addDays } from 'date-fns';
import { parseEther } from 'viem';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface TokenFormV3Props {
  isConnected: boolean;
  onSuccess?: (hash: `0x${string}`) => void;
}

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  symbol: z.string().min(1, "Symbol is required"),
  initialSupply: z.string().min(1, "Initial supply is required"),
  maxSupply: z.string().min(1, "Max supply is required"),
  tokensPerEth: z.string().min(1, "Tokens per ETH is required"),
  minContribution: z.string().min(1, "Min contribution is required"),
  maxContribution: z.string().min(1, "Max contribution is required"),
  presaleCap: z.string().min(1, "Presale cap is required"),
  startTime: z.date().min(new Date(), "Start time must be in the future"),
  endTime: z.date().min(new Date(), "End time must be in the future"),
  enableBlacklist: z.boolean(),
  enableTimeLock: z.boolean(),
  presalePercentage: z.coerce.number(),
  liquidityPercentage: z.coerce.number(),
  liquidityLockDuration: z.coerce.number(),
  vestingSchedules: z.array(z.object({
    walletName: z.string().min(1, "Wallet name is required"),
    amount: z.coerce.number(),
    period: z.coerce.number(),
    beneficiary: z.string().min(1, "Beneficiary address is required")
  }))
}).refine((data) => {
  try {
    // Convert all percentage values to basis points (multiply by 100)
    const presale = BigInt(data.presalePercentage * 100);
    const liquidity = BigInt(data.liquidityPercentage * 100);
    
    // Safely handle potentially undefined vesting schedules
    const teamSchedule = data.vestingSchedules.find(s => s.walletName === "Team");
    const marketingSchedule = data.vestingSchedules.find(s => s.walletName === "Marketing");
    const developmentSchedule = data.vestingSchedules.find(s => s.walletName === "Development");
    
    const team = BigInt((teamSchedule?.amount || 0) * 100);
    const marketing = BigInt((marketingSchedule?.amount || 0) * 100);
    const development = BigInt((developmentSchedule?.amount || 0) * 100);
    const platformFee = BigInt(500); // 5% platform fee
    
    const total = presale + liquidity + team + marketing + development + platformFee;
    
    if (total !== BigInt(10000)) {
      console.log("Invalid allocation:", {
        presale: presale.toString(),
        liquidity: liquidity.toString(),
        team: team.toString(),
        marketing: marketing.toString(),
        development: development.toString(),
        platformFee: platformFee.toString(),
        total: total.toString()
      });
      return false;
    }
    
    // Validate supplies
    const initialSupply = parseEther(data.initialSupply || "0");
    const maxSupply = parseEther(data.maxSupply || "0");
    return maxSupply > initialSupply;
  } catch (e) {
    console.error("Validation error:", e);
    return false;
  }
}, "Total allocation must equal 10000 basis points (100%): 35% presale + 30% liquidity + 15% team + 10% marketing + 5% development + 5% platform fee");

type FormData = z.infer<typeof formSchema>;

const getDefaultTimes = () => {
  const now = new Date();
  const startTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow
  const endTime = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days from now
  
  // Format dates to match datetime-local input format (yyyy-MM-ddThh:mm)
  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  return {
    startTime,
    endTime,
    startTimeFormatted: formatDate(startTime),
    endTimeFormatted: formatDate(endTime)
  };
};

const defaultValues: FormData = {
  name: "",
  symbol: "",
  initialSupply: "",
  maxSupply: "",
  tokensPerEth: "",
  minContribution: "",
  maxContribution: "",
  presaleCap: "",
  ...getDefaultTimes(),
  enableBlacklist: false,
  enableTimeLock: false,
  presalePercentage: 35,
  liquidityPercentage: 30,
  liquidityLockDuration: 180,
  vestingSchedules: [
    {
      walletName: "Team",
      amount: 15,
      period: 365,
      beneficiary: ""
    },
    {
      walletName: "Marketing",
      amount: 10,
      period: 180,
      beneficiary: ""
    },
    {
      walletName: "Development",
      amount: 5,
      period: 365,
      beneficiary: ""
    }
  ]
};

export default function TokenForm_V3({ isConnected, onSuccess }: TokenFormV3Props) {
  const { chainId } = useNetwork();
  const { address } = useAccount();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const { createToken, error } = useTokenFactory('v3');

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues
  });

  const onSubmit = async (values: FormData) => {
    try {
      setLoading(true);

      if (!chainId || !address) {
        throw new Error('Please connect your wallet');
      }

      const factoryAddress = FACTORY_ADDRESSES.v3[chainId];
      if (!factoryAddress) {
        throw new Error('Token Factory not deployed on this network');
      }

      // Validate all required values are present
      if (!values.initialSupply || !values.maxSupply || !values.tokensPerEth || 
          !values.minContribution || !values.maxContribution || !values.presaleCap ||
          !values.startTime || !values.endTime || !values.presalePercentage || 
          !values.liquidityPercentage || !values.liquidityLockDuration) {
        throw new Error('All form fields must be filled');
      }

      // Find vesting schedules
      const teamSchedule = values.vestingSchedules.find(s => s.walletName === "Team");
      const marketingSchedule = values.vestingSchedules.find(s => s.walletName === "Marketing");
      const developmentSchedule = values.vestingSchedules.find(s => s.walletName === "Development");

      if (!teamSchedule || !marketingSchedule || !developmentSchedule) {
        throw new Error('All vesting schedules (Team, Marketing, Development) must be present');
      }

      // Create params with explicit BigInt conversions and null checks
      const params = {
        name: values.name,
        symbol: values.symbol,
        initialSupply: BigInt(parseEther(values.initialSupply)),
        maxSupply: BigInt(parseEther(values.maxSupply)),
        owner: address as `0x${string}`,
        enableBlacklist: values.enableBlacklist,
        enableTimeLock: values.enableTimeLock,
        tokensPerEth: BigInt(parseEther(values.tokensPerEth)),
        minContribution: BigInt(parseEther(values.minContribution)),
        maxContribution: BigInt(parseEther(values.maxContribution)),
        presaleCap: BigInt(parseEther(values.presaleCap)),
        startTime: BigInt(Math.floor(values.startTime.getTime() / 1000)),
        endTime: BigInt(Math.floor(values.endTime.getTime() / 1000)),
        presalePercentage: BigInt(Math.floor(values.presalePercentage * 100)), // Convert to basis points
        liquidityPercentage: BigInt(Math.floor(values.liquidityPercentage * 100)), // Convert to basis points
        liquidityLockDuration: BigInt(values.liquidityLockDuration),
        teamPercentage: BigInt(Math.floor(teamSchedule.amount * 100)), // Convert to basis points
        marketingPercentage: BigInt(Math.floor(marketingSchedule.amount * 100)), // Convert to basis points
        developmentPercentage: BigInt(Math.floor(developmentSchedule.amount * 100)) // Convert to basis points
      };

      // Additional validation to ensure all BigInt conversions were successful
      Object.entries(params).forEach(([key, value]) => {
        if (key !== 'name' && key !== 'symbol' && key !== 'owner' && 
            key !== 'enableBlacklist' && key !== 'enableTimeLock' && 
            value === undefined) {
          throw new Error(`Invalid value for ${key}`);
        }
      });

      // Validate total percentage equals 100%
      const totalPercentage = Number(values.presalePercentage) + 
                            Number(values.liquidityPercentage) + 
                            Number(teamSchedule.amount) + 
                            Number(marketingSchedule.amount) + 
                            Number(developmentSchedule.amount) + 
                            5; // Platform fee

      if (totalPercentage !== 100) {
        throw new Error(`Total allocation must equal 100%. Current total: ${totalPercentage}%`);
      }

      // Debug log all parameters with their types
      console.log('Token Creation Parameters with Types:', {
        name: params.name,
        symbol: params.symbol,
        initialSupply: params.initialSupply.toString(),
        maxSupply: params.maxSupply.toString(),
        owner: params.owner,
        enableBlacklist: params.enableBlacklist,
        enableTimeLock: params.enableTimeLock,
        tokensPerEth: params.tokensPerEth.toString(),
        minContribution: params.minContribution.toString(),
        maxContribution: params.maxContribution.toString(),
        presaleCap: params.presaleCap.toString(),
        startTime: params.startTime.toString(),
        endTime: params.endTime.toString(),
        presalePercentage: params.presalePercentage.toString(),
        liquidityPercentage: params.liquidityPercentage.toString(),
        liquidityLockDuration: params.liquidityLockDuration.toString(),
        teamPercentage: params.teamPercentage.toString(),
        marketingPercentage: params.marketingPercentage.toString(),
        developmentPercentage: params.developmentPercentage.toString()
      });

      await createToken(params);
      
      if (onSuccess) {
        onSuccess(factoryAddress as `0x${string}`);
      }

    } catch (err) {
      console.error('Error creating token:', err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : 'Failed to create token',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container form-compact">
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
            <label htmlFor="tokensPerEth" className="form-label">
              Tokens per ETH
              <InfoIcon content="Number of tokens per ETH during presale" />
            </label>
            <Input
              {...form.register("tokensPerEth")}
              placeholder="1000"
              className="form-input"
            />
            <div className="mt-1 text-sm text-gray-400">
              Price per Token: {form.watch("tokensPerEth") ? `${1 / Number(form.watch("tokensPerEth"))} ETH` : 'N/A'}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="minContribution" className="form-label">Min Contribution (ETH)</label>
            <Input
              {...form.register("minContribution")}
              placeholder="0.1"
              className="form-input"
            />
            {form.formState.errors.minContribution && (
              <p className="form-error">{form.formState.errors.minContribution.message}</p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="maxContribution" className="form-label">Max Contribution (ETH)</label>
            <Input
              {...form.register("maxContribution")}
              placeholder="10"
              className="form-input"
            />
            {form.formState.errors.maxContribution && (
              <p className="form-error">{form.formState.errors.maxContribution.message}</p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="presaleCap" className="form-label">Presale Cap (ETH)</label>
            <Input
              {...form.register("presaleCap")}
              placeholder="100"
              className="form-input"
            />
            {form.formState.errors.presaleCap && (
              <p className="form-error">{form.formState.errors.presaleCap.message}</p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="startTime" className="form-label">Start Time</label>
            <Input
              {...form.register("startTime", {
                setValueAs: (value: string) => value ? new Date(value) : null
              })}
              type="datetime-local"
              defaultValue={getDefaultTimes().startTimeFormatted}
              className="form-input"
            />
            {form.formState.errors.startTime && (
              <p className="form-error">{form.formState.errors.startTime.message}</p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="endTime" className="form-label">End Time</label>
            <Input
              {...form.register("endTime", {
                setValueAs: (value: string) => value ? new Date(value) : null
              })}
              type="datetime-local"
              defaultValue={getDefaultTimes().endTimeFormatted}
              className="form-input"
            />
            {form.formState.errors.endTime && (
              <p className="form-error">{form.formState.errors.endTime.message}</p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="liquidityLockPeriod" className="form-label">
              Liquidity Lock Period (days)
              <InfoIcon content="Number of days the liquidity will be locked" />
            </label>
            <Input
              {...form.register("liquidityLockDuration")}
              placeholder="180"
              className="form-input"
            />
            {form.formState.errors.liquidityLockDuration && (
              <p className="form-error">{form.formState.errors.liquidityLockDuration.message}</p>
            )}
          </div>
        </div>

        <div className="form-section">
          <h3 className="text-lg font-medium text-white mb-4">Token Features</h3>
          <div className="form-grid">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                {...form.register("enableBlacklist")}
                className="form-checkbox"
              />
              <label htmlFor="enableBlacklist" className="form-label">Enable Blacklist</label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                {...form.register("enableTimeLock")}
                className="form-checkbox"
              />
              <label htmlFor="enableTimeLock" className="form-label">Enable Time Lock</label>
            </div>
          </div>
        </div>

        <div className="form-section col-span-2">
          <h3 className="text-lg font-medium text-white mb-4">
            Distribution & Vesting
            <InfoIcon content="Configure token distribution and vesting schedules" />
          </h3>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="form-group">
              <label htmlFor="presalePercentage" className="form-label">
                Presale Allocation (%)
                <InfoIcon content="Percentage of tokens allocated for presale" />
              </label>
              <Input
                {...form.register("presalePercentage")}
                placeholder="35"
                className="form-input"
              />
              {form.formState.errors.presalePercentage && (
                <p className="form-error">{form.formState.errors.presalePercentage.message}</p>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="liquidityPercentage" className="form-label">
                Liquidity Allocation (%)
                <InfoIcon content="Percentage of tokens allocated for liquidity" />
              </label>
              <Input
                {...form.register("liquidityPercentage")}
                placeholder="30"
                className="form-input"
              />
              {form.formState.errors.liquidityPercentage && (
                <p className="form-error">{form.formState.errors.liquidityPercentage.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => {
                  const currentValues = form.getValues();
                  form.reset({
                    ...currentValues,
                    vestingSchedules: VESTING_PRESETS.standard
                  });
                }}
                className="form-button-secondary"
              >
                Standard (30% Distribution)
              </button>
              <button
                type="button"
                onClick={() => {
                  const currentValues = form.getValues();
                  form.reset({
                    ...currentValues,
                    vestingSchedules: VESTING_PRESETS.fair_launch
                  });
                }}
                className="form-button-secondary"
              >
                Fair Launch (20% Distribution)
              </button>
              <button
                type="button"
                onClick={() => {
                  const currentValues = form.getValues();
                  form.reset({
                    ...currentValues,
                    vestingSchedules: VESTING_PRESETS.community
                  });
                }}
                className="form-button-secondary"
              >
                Community (20% Distribution)
              </button>
            </div>

            <div className="bg-gray-800 rounded-lg p-4">
              <div className="grid grid-cols-[2fr,1fr,1fr,2fr,auto] gap-4 mb-2">
                <div className="text-sm font-medium text-gray-400">Wallet Name</div>
                <div className="text-sm font-medium text-gray-400">Amount (%)</div>
                <div className="text-sm font-medium text-gray-400">Period (Days)</div>
                <div className="text-sm font-medium text-gray-400">Beneficiary Address</div>
                <div></div>
              </div>

              <div className="space-y-2">
                {form.watch("vestingSchedules").map((schedule, index) => (
                  <div key={index} className="grid grid-cols-[2fr,1fr,1fr,2fr,auto] gap-4 items-center">
                    <Input
                      {...form.register(`vestingSchedules.${index}.walletName`)}
                      placeholder="Wallet Name"
                      className="form-input"
                    />
                    <Input
                      {...form.register(`vestingSchedules.${index}.amount`)}
                      placeholder="%"
                      className="form-input"
                    />
                    <Input
                      {...form.register(`vestingSchedules.${index}.period`)}
                      placeholder="Days"
                      className="form-input"
                    />
                    <Input
                      {...form.register(`vestingSchedules.${index}.beneficiary`)}
                      placeholder="0x..."
                      className="form-input"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newSchedules = form.watch("vestingSchedules").filter((_, i) => i !== index);
                        form.reset({ ...form.watch(), vestingSchedules: newSchedules });
                      }}
                      className="form-button-danger px-2 py-1"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={() => {
                  form.reset({
                    ...form.watch(),
                    vestingSchedules: [...form.watch("vestingSchedules"), { walletName: '', amount: 0, period: 0, beneficiary: '' }]
                  });
                }}
                className="form-button-secondary w-full mt-4"
              >
                Add Vesting Schedule
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="form-error">
            <p className="text-red-500">{error}</p>
          </div>
        )}

        <div className="form-actions">
          <div className="flex items-center mr-2">
            <InfoIcon content="Deployment fee will be charged in ETH. Make sure you have enough ETH to cover the fee and gas costs." />
          </div>
          <Button 
            type="submit"
            disabled={
              !isConnected || 
              loading || 
              form.formState.isSubmitting
            }
            className="form-button-primary"
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
        
        {/* Debug information */}
        <div className="mt-4 text-sm text-gray-400">
          <p>Form State:</p>
          <ul>
            <li>Is Valid: {form.formState.isValid ? 'Yes' : 'No'}</li>
            <li>Is Submitting: {form.formState.isSubmitting ? 'Yes' : 'No'}</li>
            <li>Is Connected: {isConnected ? 'Yes' : 'No'}</li>
            <li>Loading: {loading ? 'Yes' : 'No'}</li>
            {form.formState.errors.root && (
              <li>Root Error: {form.formState.errors.root.message}</li>
            )}
          </ul>
        </div>
      </form>

      <div className="mt-8">
        <TokenPreview
          name={form.watch("name")}
          symbol={form.watch("symbol")}
          initialSupply={form.watch("initialSupply")}
          maxSupply={form.watch("maxSupply")}
          distributionSegments={[
            { name: 'Platform Fee', amount: 5, percentage: 5, color: '#FF0000' }, // Platform fee (5%)
            { name: 'Presale', amount: Number(form.watch("presalePercentage")), percentage: Number(form.watch("presalePercentage")), color: '#0088FE' },
            { name: 'Liquidity', amount: Number(form.watch("liquidityPercentage")), percentage: Number(form.watch("liquidityPercentage")), color: '#00C49F' },
            ...form.watch("vestingSchedules").map((schedule, index) => ({
              name: schedule.walletName,
              amount: Number(schedule.amount),
              percentage: Number(schedule.amount),
              color: COLORS[index + 3] || '#FF8042' // Shifted by 3 to account for platform fee, presale, and liquidity
            }))
          ]}
          totalAllocation={5 + Number(form.watch("presalePercentage")) + Number(form.watch("liquidityPercentage")) + form.watch("vestingSchedules").reduce((sum, schedule) => sum + Number(schedule.amount), 0)}
        />
      </div>
    </div>
  );
}

const COLORS = [
  '#0088FE', // Blue
  '#00C49F', // Green
  '#FFBB28', // Yellow
  '#FF8042', // Orange
  '#8884d8', // Purple
  '#82ca9d', // Light Green
  '#ffc658', // Light Yellow
  '#ff7300', // Dark Orange
];

// Define vesting presets with mandatory presale and liquidity allocations
const VESTING_PRESETS = {
  standard: [
    // Mandatory allocations (handled by contract)
    // - Presale: 35%
    // - Liquidity: 30%
    // Remaining 30% distribution:
    { walletName: 'Team', amount: 15, period: 365, beneficiary: '' },
    { walletName: 'Marketing', amount: 10, period: 180, beneficiary: '' },
    { walletName: 'Development', amount: 5, period: 365, beneficiary: '' }
  ],
  fair_launch: [
    // Mandatory allocations (handled by contract)
    // - Presale: 35%
    // - Liquidity: 30%
    // Remaining 20% distribution:
    { walletName: 'Team', amount: 10, period: 365, beneficiary: '' },
    { walletName: 'Marketing', amount: 5, period: 180, beneficiary: '' },
    { walletName: 'Development', amount: 5, period: 365, beneficiary: '' }
  ],
  community: [
    // Mandatory allocations (handled by contract)
    // - Presale: 35%
    // - Liquidity: 30%
    // Remaining 20% distribution:
    { walletName: 'Team', amount: 5, period: 365, beneficiary: '' },
    { walletName: 'Marketing', amount: 10, period: 180, beneficiary: '' },
    { walletName: 'Development', amount: 5, period: 365, beneficiary: '' }
  ]
}; 