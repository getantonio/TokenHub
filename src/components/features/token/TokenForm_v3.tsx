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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface TokenFormV3Props {
  isConnected: boolean;
  onSuccess?: (hash: `0x${string}`) => void;
}

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
  marketingWallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid wallet address"),
  marketingPercentage: z.number().min(1, "Marketing percentage must be greater than 0"),
  teamWallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid wallet address"),
  teamPercentage: z.number().min(1, "Team percentage must be greater than 0")
}).refine((data) => {
  const total = data.presalePercentage + data.liquidityPercentage + data.marketingPercentage + data.teamPercentage;
  return total == 95;
}, {
  message: "Total percentage must equal 95% (5% platform fee)",
  path: ["presalePercentage"]
});

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
  marketingWallet: "",
  marketingPercentage: 10,
  teamWallet: "",
  teamPercentage: 10
};

export default function TokenForm_V3({ isConnected, onSuccess }: TokenFormV3Props) {
  const { chainId } = useNetwork();
  const { address } = useAccount();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { createToken } = useTokenFactory();

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues
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
          !values.liquidityPercentage || !values.liquidityLockDuration ||
          !values.marketingWallet || !values.marketingPercentage || !values.teamWallet || !values.teamPercentage) {
        throw new Error('All form fields must be filled');
      }

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
        marketingWallet: values.marketingWallet as `0x${string}`,
        marketingPercentage: BigInt(values.marketingPercentage),
        teamWallet: values.teamWallet as `0x${string}`,
        teamPercentage: BigInt(values.teamPercentage)
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
        endTime: params.endTime.toString()
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

  return (
    <div className="form-container form-compact">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="name" className="form-label">Token Name</label>
            <Input
              {...register("name")}
              placeholder="My Token"
              className="form-input"
            />
            {errors.name && (
              <p className="form-error">{errors.name.message}</p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="symbol" className="form-label">Token Symbol</label>
            <Input
              {...register("symbol")}
              placeholder="MTK"
              className="form-input"
            />
            {errors.symbol && (
              <p className="form-error">{errors.symbol.message}</p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="initialSupply" className="form-label">Initial Supply</label>
            <Input
              {...register("initialSupply")}
              placeholder="1000000"
              className="form-input"
            />
            {errors.initialSupply && (
              <p className="form-error">{errors.initialSupply.message}</p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="maxSupply" className="form-label">Max Supply</label>
            <Input
              {...register("maxSupply")}
              placeholder="2000000"
              className="form-input"
            />
            {errors.maxSupply && (
              <p className="form-error">{errors.maxSupply.message}</p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="presaleRate" className="form-label">
              Tokens per ETH
              <InfoIcon content="Number of tokens per ETH during presale" />
            </label>
            <Input
              {...register("presaleRate")}
              placeholder="1000"
              className="form-input"
            />
            <div className="mt-1 text-sm text-gray-400">
              Price per Token: {register("presaleRate") ? `${1 / Number(register("presaleRate"))} ETH` : 'N/A'}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="minContribution" className="form-label">Min Contribution (ETH)</label>
            <Input
              {...register("minContribution")}
              placeholder="0.1"
              className="form-input"
            />
            {errors.minContribution && (
              <p className="form-error">{errors.minContribution.message}</p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="maxContribution" className="form-label">Max Contribution (ETH)</label>
            <Input
              {...register("maxContribution")}
              placeholder="10"
              className="form-input"
            />
            {errors.maxContribution && (
              <p className="form-error">{errors.maxContribution.message}</p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="presaleCap" className="form-label">Presale Cap (ETH)</label>
            <Input
              {...register("presaleCap")}
              placeholder="100"
              className="form-input"
            />
            {errors.presaleCap && (
              <p className="form-error">{errors.presaleCap.message}</p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="startTime" className="form-label">Start Time</label>
            <Input
              {...register("startTime", {
                setValueAs: (value: string) => value ? new Date(value) : null
              })}
              type="datetime-local"
              defaultValue={getDefaultTimes().startTimeFormatted}
              className="form-input"
            />
            {errors.startTime && (
              <p className="form-error">{errors.startTime.message}</p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="endTime" className="form-label">End Time</label>
            <Input
              {...register("endTime", {
                setValueAs: (value: string) => value ? new Date(value) : null
              })}
              type="datetime-local"
              defaultValue={getDefaultTimes().endTimeFormatted}
              className="form-input"
            />
            {errors.endTime && (
              <p className="form-error">{errors.endTime.message}</p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="liquidityLockDuration" className="form-label">
              Liquidity Lock Duration (days)
              <InfoIcon content="Number of days the liquidity will be locked" />
            </label>
            <Input
              {...register("liquidityLockDuration")}
              placeholder="180"
              className="form-input"
            />
            {errors.liquidityLockDuration && (
              <p className="form-error">{errors.liquidityLockDuration.message}</p>
            )}
          </div>
        </div>

        <div className="form-section">
          <h3 className="text-lg font-medium text-white mb-4">Token Features</h3>
          <div className="form-grid">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                {...register("enableBlacklist")}
                className="form-checkbox"
              />
              <label htmlFor="enableBlacklist" className="form-label">Enable Blacklist</label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                {...register("enableTimeLock")}
                className="form-checkbox"
              />
              <label htmlFor="enableTimeLock" className="form-label">Enable Time Lock</label>
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3 className="text-lg font-medium text-white mb-4">
            Token Distribution
            <InfoIcon content="Configure token distribution percentages" />
          </h3>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="form-group">
              <label htmlFor="presalePercentage" className="form-label">
                Presale Allocation (%)
                <InfoIcon content="Percentage of tokens allocated for presale" />
              </label>
              <Input
                {...register("presalePercentage")}
                placeholder="35"
                className="form-input"
              />
              {errors.presalePercentage && (
                <p className="form-error">{errors.presalePercentage.message}</p>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="liquidityPercentage" className="form-label">
                Liquidity Allocation (%)
                <InfoIcon content="Percentage of tokens allocated for liquidity" />
              </label>
              <Input
                {...register("liquidityPercentage")}
                placeholder="40"
                className="form-input"
              />
              {errors.liquidityPercentage && (
                <p className="form-error">{errors.liquidityPercentage.message}</p>
              )}
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3 className="text-lg font-medium text-white mb-4">Marketing and Team Allocation</h3>
          <div className="form-grid">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="marketingWallet">Marketing Wallet</Label>
                <Input
                  id="marketingWallet"
                  placeholder="0x..."
                  {...register("marketingWallet")}
                />
                {errors.marketingWallet && (
                  <p className="text-sm text-red-500">{errors.marketingWallet.message}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="marketingPercentage">Marketing Percentage</Label>
                <Input
                  id="marketingPercentage"
                  type="number"
                  {...register("marketingPercentage", { valueAsNumber: true })}
                />
                {errors.marketingPercentage && (
                  <p className="text-sm text-red-500">{errors.marketingPercentage.message}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="teamWallet">Team Wallet</Label>
                <Input
                  id="teamWallet"
                  placeholder="0x..."
                  {...register("teamWallet")}
                />
                {errors.teamWallet && (
                  <p className="text-sm text-red-500">{errors.teamWallet.message}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="teamPercentage">Team Percentage</Label>
                <Input
                  id="teamPercentage"
                  type="number"
                  {...register("teamPercentage", { valueAsNumber: true })}
                />
                {errors.teamPercentage && (
                  <p className="text-sm text-red-500">{errors.teamPercentage.message}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="form-actions">
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? <Spinner /> : 'Create Token'}
          </Button>
        </div>
      </form>
    </div>
  );
}