import { useState } from 'react';
import { useNetwork } from '@contexts/NetworkContext';
import { useToast } from '@/components/ui/toast/use-toast';
import TokenPreview from '@components/features/token/TokenPreview';
import { InfoIcon } from '@components/ui/InfoIcon';
import { Spinner } from '@components/ui/Spinner';
import { useTokenFactory } from '@/hooks/useTokenFactory';
import { useAccount } from 'wagmi';
import TokenFactory_v3 from '@contracts/abi/TokenFactory_v3_clone.json';
import { FACTORY_ADDRESSES } from '@config/contracts';
import * as z from 'zod';
import { addDays } from 'date-fns';
import { parseEther } from 'viem';
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Trash2, Plus } from 'lucide-react';

interface TokenFormV3Props {
  isConnected: boolean;
  onSuccess?: (hash: `0x${string}`) => void;
}

// Vesting schedule type
interface VestingSchedule {
  cliff: number;      // Cliff period in days
  vesting: number;    // Vesting period in days
  percentage: number; // Percentage of tokens
}

// Predefined vesting presets
const vestingPresets = {
  marketing: {
    cliff: 30,    // 1 month cliff
    vesting: 180, // 6 months vesting
    percentage: 10
  },
  team: {
    cliff: 90,    // 3 months cliff
    vesting: 360, // 12 months vesting
    percentage: 10
  },
  advisor: {
    cliff: 60,    // 2 months cliff
    vesting: 270, // 9 months vesting
    percentage: 5
  }
};

const walletSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid wallet address"),
  percentage: z.number().min(1, "Percentage must be greater than 0"),
  vestingType: z.enum(['none', 'marketing', 'team', 'advisor', 'custom']),
  cliff: z.number().min(0, "Cliff period must be non-negative").optional(),
  vesting: z.number().min(0, "Vesting period must be non-negative").optional()
});

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  symbol: z.string().min(1, "Symbol is required"),
  initialSupply: z.string().min(1, "Initial supply is required"),
  maxSupply: z.string().min(1, "Max supply is required"),
  enableBlacklist: z.boolean(),
  enableTimeLock: z.boolean(),
  presaleRate: z.string().min(1, "Presale rate is required"),
  minContribution: z.string().min(1, "Min contribution is required"),
  maxContribution: z.string().min(1, "Max contribution is required"),
  presaleCap: z.string().min(1, "Presale cap is required"),
  startTime: z.date(),
  endTime: z.date(),
  presalePercentage: z.number().min(1, "Presale percentage must be greater than 0"),
  liquidityPercentage: z.number().min(1, "Liquidity percentage must be greater than 0"),
  liquidityLockDuration: z.number().min(1, "Liquidity lock duration must be greater than 0"),
  wallets: z.array(walletSchema)
}).refine((data) => {
  const totalWalletPercentage = data.wallets.reduce((sum, wallet) => sum + wallet.percentage, 0);
  const total = data.presalePercentage + data.liquidityPercentage + totalWalletPercentage;
  return total === 95;
}, {
  message: "Total percentage must equal 95% (5% platform fee)",
  path: ["presalePercentage"]
});

type FormData = z.infer<typeof formSchema>;

const getDefaultTimes = () => {
  const now = new Date();
  const startTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow
  const endTime = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days from now
  
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

const defaultValues = {
  name: "",
  symbol: "",
  initialSupply: "",
  maxSupply: "",
  enableBlacklist: false,
  enableTimeLock: false,
  presaleRate: "",
  minContribution: "",
  maxContribution: "",
  presaleCap: "",
  startTime: getDefaultTimes().startTime,
  endTime: getDefaultTimes().endTime,
  presalePercentage: 35,
  liquidityPercentage: 40,
  liquidityLockDuration: 180,
  wallets: [
    {
      address: "",
      percentage: 10,
      vestingType: "marketing",
      cliff: vestingPresets.marketing.cliff,
      vesting: vestingPresets.marketing.vesting
    },
    {
      address: "",
      percentage: 10,
      vestingType: "team",
      cliff: vestingPresets.team.cliff,
      vesting: vestingPresets.team.vesting
    }
  ]
};

export default function TokenForm_V3({ isConnected, onSuccess }: TokenFormV3Props) {
  const { chainId } = useNetwork();
  const { address } = useAccount();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { createToken } = useTokenFactory();

  const { register, control, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "wallets"
  });

  const onSubmit = async (values: FormData) => {
    try {
      setLoading(true);
      setError(null);

      if (!chainId || !address) {
        throw new Error('Please connect your wallet');
      }

      // Validate all required values are present
      if (!values.initialSupply || !values.maxSupply || !values.presaleRate || 
          !values.minContribution || !values.maxContribution || !values.presaleCap ||
          !values.startTime || !values.endTime || !values.presalePercentage || 
          !values.liquidityPercentage || !values.liquidityLockDuration) {
        throw new Error('All form fields must be filled');
      }

      // Process wallets and their vesting schedules
      const wallets = values.wallets.map(wallet => ({
        address: wallet.address as `0x${string}`,
        percentage: BigInt(wallet.percentage),
        cliff: BigInt(wallet.cliff || 0),
        vesting: BigInt(wallet.vesting || 0)
      }));

      // Create params with explicit BigInt conversions
      const params = {
        name: values.name,
        symbol: values.symbol,
        initialSupply: parseEther(values.initialSupply),
        maxSupply: parseEther(values.maxSupply),
        owner: address as `0x${string}`,
        enableBlacklist: values.enableBlacklist,
        enableTimeLock: values.enableTimeLock,
        presaleRate: parseEther(values.presaleRate),
        minContribution: parseEther(values.minContribution),
        maxContribution: parseEther(values.maxContribution),
        presaleCap: parseEther(values.presaleCap),
        startTime: BigInt(Math.floor(values.startTime.getTime() / 1000)),
        endTime: BigInt(Math.floor(values.endTime.getTime() / 1000)),
        presalePercentage: BigInt(values.presalePercentage),
        liquidityPercentage: BigInt(values.liquidityPercentage),
        liquidityLockDuration: BigInt(values.liquidityLockDuration),
        wallets
      };

      // Debug log parameters
      console.log('Creating token with params:', {
        ...params,
        initialSupply: params.initialSupply.toString(),
        maxSupply: params.maxSupply.toString(),
        presaleRate: params.presaleRate.toString(),
        minContribution: params.minContribution.toString(),
        maxContribution: params.maxContribution.toString(),
        presaleCap: params.presaleCap.toString(),
        startTime: params.startTime.toString(),
        endTime: params.endTime.toString(),
        wallets: params.wallets.map(w => ({
          ...w,
          percentage: w.percentage.toString(),
          cliff: w.cliff.toString(),
          vesting: w.vesting.toString()
        }))
      });

      const hash = await createToken(params);
      if (hash && onSuccess) {
        onSuccess(hash);
      }

      toast({
        title: "Success",
        description: "Token created successfully!",
        variant: "default"
      });

    } catch (err) {
      console.error('Error creating token:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create token';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddWallet = () => {
    append({
      address: "",
      percentage: 5,
      vestingType: "custom",
      cliff: 30,
      vesting: 180
    });
  };

  const handleVestingTypeChange = (index: number, type: string) => {
    const preset = vestingPresets[type as keyof typeof vestingPresets];
    if (preset) {
      fields[index].cliff = preset.cliff;
      fields[index].vesting = preset.vesting;
      fields[index].percentage = preset.percentage;
    }
  };

  return (
    <div className="form-container form-compact">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Basic Token Info */}
        <Card className="p-4">
          <h3 className="text-lg font-medium mb-4">Basic Token Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <Label>Token Name</Label>
              <Input {...register("name")} placeholder="My Token" />
              {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
            </div>

            <div className="form-group">
              <Label>Token Symbol</Label>
              <Input {...register("symbol")} placeholder="MTK" />
              {errors.symbol && <p className="text-red-500 text-sm">{errors.symbol.message}</p>}
            </div>

            <div className="form-group">
              <Label>Initial Supply</Label>
              <Input {...register("initialSupply")} placeholder="1000000" />
              {errors.initialSupply && <p className="text-red-500 text-sm">{errors.initialSupply.message}</p>}
            </div>

            <div className="form-group">
              <Label>Max Supply</Label>
              <Input {...register("maxSupply")} placeholder="2000000" />
              {errors.maxSupply && <p className="text-red-500 text-sm">{errors.maxSupply.message}</p>}
            </div>
          </div>
        </Card>

        {/* Presale Configuration */}
        <Card className="p-4">
          <h3 className="text-lg font-medium mb-4">Presale Configuration</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <Label>Tokens per ETH</Label>
              <Input {...register("presaleRate")} placeholder="1000" />
              {errors.presaleRate && <p className="text-red-500 text-sm">{errors.presaleRate.message}</p>}
            </div>

            <div className="form-group">
              <Label>Min Contribution (ETH)</Label>
              <Input {...register("minContribution")} placeholder="0.1" />
              {errors.minContribution && <p className="text-red-500 text-sm">{errors.minContribution.message}</p>}
            </div>

            <div className="form-group">
              <Label>Max Contribution (ETH)</Label>
              <Input {...register("maxContribution")} placeholder="10" />
              {errors.maxContribution && <p className="text-red-500 text-sm">{errors.maxContribution.message}</p>}
            </div>

            <div className="form-group">
              <Label>Presale Cap (ETH)</Label>
              <Input {...register("presaleCap")} placeholder="100" />
              {errors.presaleCap && <p className="text-red-500 text-sm">{errors.presaleCap.message}</p>}
            </div>

            <div className="form-group">
              <Label>Start Time</Label>
              <Input
                type="datetime-local"
                {...register("startTime", {
                  setValueAs: (value: string) => value ? new Date(value) : null
                })}
                defaultValue={getDefaultTimes().startTimeFormatted}
              />
              {errors.startTime && <p className="text-red-500 text-sm">{errors.startTime.message}</p>}
            </div>

            <div className="form-group">
              <Label>End Time</Label>
              <Input
                type="datetime-local"
                {...register("endTime", {
                  setValueAs: (value: string) => value ? new Date(value) : null
                })}
                defaultValue={getDefaultTimes().endTimeFormatted}
              />
              {errors.endTime && <p className="text-red-500 text-sm">{errors.endTime.message}</p>}
            </div>
          </div>
        </Card>

        {/* Token Distribution */}
        <Card className="p-4">
          <h3 className="text-lg font-medium mb-4">Token Distribution</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="form-group">
              <Label>Presale Percentage</Label>
              <Input {...register("presalePercentage")} type="number" />
              {errors.presalePercentage && <p className="text-red-500 text-sm">{errors.presalePercentage.message}</p>}
            </div>

            <div className="form-group">
              <Label>Liquidity Percentage</Label>
              <Input {...register("liquidityPercentage")} type="number" />
              {errors.liquidityPercentage && <p className="text-red-500 text-sm">{errors.liquidityPercentage.message}</p>}
            </div>

            <div className="form-group">
              <Label>Liquidity Lock Duration (days)</Label>
              <Input {...register("liquidityLockDuration")} type="number" />
              {errors.liquidityLockDuration && <p className="text-red-500 text-sm">{errors.liquidityLockDuration.message}</p>}
            </div>
          </div>
        </Card>

        {/* Wallet Allocation */}
        <Card className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Wallet Allocation</h3>
            <Button type="button" onClick={handleAddWallet} variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Wallet
            </Button>
          </div>

          <div className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-6 gap-4 items-start border p-4 rounded-lg">
                <div className="col-span-2">
                  <Label>Wallet Address</Label>
                  <Input {...register(`wallets.${index}.address`)} placeholder="0x..." />
                  {errors.wallets?.[index]?.address && (
                    <p className="text-red-500 text-sm">{errors.wallets[index].address?.message}</p>
                  )}
                </div>

                <div>
                  <Label>Percentage</Label>
                  <Input {...register(`wallets.${index}.percentage`)} type="number" />
                  {errors.wallets?.[index]?.percentage && (
                    <p className="text-red-500 text-sm">{errors.wallets[index].percentage?.message}</p>
                  )}
                </div>

                <div>
                  <Label>Vesting Type</Label>
                  <select
                    {...register(`wallets.${index}.vestingType`)}
                    onChange={(e) => handleVestingTypeChange(index, e.target.value)}
                    className="w-full p-2 border rounded"
                  >
                    <option value="none">No Vesting</option>
                    <option value="marketing">Marketing</option>
                    <option value="team">Team</option>
                    <option value="advisor">Advisor</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>

                <div>
                  <Label>Cliff (days)</Label>
                  <Input {...register(`wallets.${index}.cliff`)} type="number" />
                  {errors.wallets?.[index]?.cliff && (
                    <p className="text-red-500 text-sm">{errors.wallets[index].cliff?.message}</p>
                  )}
                </div>

                <div className="flex items-end space-x-2">
                  <div className="flex-1">
                    <Label>Vesting (days)</Label>
                    <Input {...register(`wallets.${index}.vesting`)} type="number" />
                    {errors.wallets?.[index]?.vesting && (
                      <p className="text-red-500 text-sm">{errors.wallets[index].vesting?.message}</p>
                    )}
                  </div>
                  <Button
                    type="button"
                    onClick={() => remove(index)}
                    variant="destructive"
                    size="icon"
                    className="mb-6"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Token Features */}
        <Card className="p-4">
          <h3 className="text-lg font-medium mb-4">Token Features</h3>
          <div className="flex space-x-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                {...register("enableBlacklist")}
                className="form-checkbox"
              />
              <Label>Enable Blacklist</Label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                {...register("enableTimeLock")}
                className="form-checkbox"
              />
              <Label>Enable Time Lock</Label>
            </div>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={loading}>
            {loading ? <Spinner /> : 'Create Token'}
          </Button>
        </div>
      </form>
    </div>
  );
}