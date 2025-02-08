import { useState, useEffect } from 'react';
import { useNetwork } from '@contexts/NetworkContext';
import { useToast } from '@/components/ui/toast/use-toast';
import TokenPreview from '@components/features/token/TokenPreview';
import { InfoIcon } from '@components/ui/InfoIcon';
import { Spinner } from '@components/ui/Spinner';
import { useTokenFactory } from '@/hooks/useTokenFactory';
import { useAccount, usePublicClient } from 'wagmi';
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
  onSuccess?: (tokenAddress: `0x${string}`) => void;
  onError?: (error: any) => void;
}

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  symbol: z.string().min(1, "Symbol is required"),
  initialSupply: z.string().min(1, "Initial supply is required"),
  maxSupply: z.string().min(1, "Max supply is required"),
  owner: z.string().min(1, "Owner address is required"),
  enableBlacklist: z.boolean(),
  enableTimeLock: z.boolean(),
  presaleRate: z.string().min(1, "Presale rate is required"),
  minContribution: z.string().min(1, "Min contribution is required"),
  maxContribution: z.string().min(1, "Max contribution is required"),
  presaleCap: z.string().min(1, "Presale cap is required"),
  startTime: z.string().min(1, "Start time is required")
    .refine((val) => {
      const date = new Date(val);
      return date > new Date();
    }, "Start time must be in the future"),
  endTime: z.string().min(1, "End time is required")
    .refine((val) => {
      const date = new Date(val);
      return date > new Date();
    }, "End time must be in the future"),
  presalePercentage: z.coerce.number(),
  liquidityPercentage: z.coerce.number(),
  liquidityLockDuration: z.coerce.number(),
  marketingWallet: z.string().min(1, "Marketing wallet address is required"),
  marketingPercentage: z.coerce.number(),
  teamWallet: z.string().min(1, "Team wallet address is required"),
  teamPercentage: z.coerce.number()
}).refine((data) => {
  try {
    const startDate = new Date(data.startTime);
    const endDate = new Date(data.endTime);
    return endDate > startDate;
  } catch (e) {
    return false;
  }
}, "End time must be after start time")
.refine((data) => {
  try {
    // Convert all percentage values to basis points (multiply by 100)
    const presale = data.presalePercentage;
    const liquidity = data.liquidityPercentage;
    const team = data.teamPercentage;
    const marketing = data.marketingPercentage;
    const platformFee = 5; // 5% platform fee
    
    const total = presale + liquidity + team + marketing + platformFee;
    
    if (total !== 100) {
      console.log("Invalid allocation:", {
        presale,
        liquidity,
        team,
        marketing,
        platformFee,
        total
      });
      return false;
    }
    
    // Validate supplies
    const initialSupply = parseEther(data.initialSupply || "0");
    const maxSupply = parseEther(data.maxSupply || "0");
    return maxSupply >= initialSupply;
  } catch (e) {
    console.error("Validation error:", e);
    return false;
  }
}, "Total allocation must equal 100%: presale + liquidity + team + marketing + 5% platform fee");

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
  name: 'Test Token',
  symbol: 'TEST',
  initialSupply: '1000000',
  maxSupply: '2000000',
  owner: '',
  enableBlacklist: false,
  enableTimeLock: false,
  presaleRate: '1000',
  minContribution: '0.1',
  maxContribution: '5',
  presaleCap: '100',
  startTime: getDefaultTimes().startTimeFormatted,
  endTime: getDefaultTimes().endTimeFormatted,
  presalePercentage: 35,
  liquidityPercentage: 30,
  liquidityLockDuration: 180,
  marketingWallet: '0x0000000000000000000000000000000000000000',
  marketingPercentage: 20,
  teamWallet: '0x0000000000000000000000000000000000000000',
  teamPercentage: 10
};

export default function TokenForm_V3({ isConnected, onSuccess, onError }: TokenFormV3Props) {
  const { chainId } = useNetwork();
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { createToken } = useTokenFactory();

  useEffect(() => {
    setMounted(true);
  }, []);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ...defaultValues,
      owner: address || '',
      marketingWallet: address || '0x0000000000000000000000000000000000000000',
      teamWallet: address || '0x0000000000000000000000000000000000000000'
    }
  });

  useEffect(() => {
    if (address) {
      form.setValue('owner', address);
      form.setValue('marketingWallet', address);
      form.setValue('teamWallet', address);
    }
  }, [address, form]);

  const onSubmit = async (data: FormData) => {
    try {
      console.log('Form submission started');
      console.log('Wallet address:', address);
      console.log('Chain ID:', chainId);
      console.log('Is Connected:', isConnected);

      if (!address) {
        console.log('No wallet address found');
        toast({
          title: "Error",
          description: "Please connect your wallet first",
          variant: "destructive"
        });
        return;
      }

      if (!isConnected) {
        console.log('Wallet not connected');
        toast({
          title: "Error",
          description: "Please connect your wallet first",
          variant: "destructive"
        });
        return;
      }

      if (!publicClient) {
        throw new Error('Failed to get public client');
      }

      setLoading(true);
      console.log('Token Creation Parameters:', data);

      const params = {
        name: data.name,
        symbol: data.symbol,
        initialSupply: parseEther(data.initialSupply),
        maxSupply: parseEther(data.maxSupply),
        owner: address as `0x${string}`,
        enableBlacklist: data.enableBlacklist,
        enableTimeLock: data.enableTimeLock,
        presaleRate: BigInt(data.presaleRate),
        minContribution: parseEther(data.minContribution),
        maxContribution: parseEther(data.maxContribution),
        presaleCap: parseEther(data.presaleCap),
        startTime: BigInt(Math.floor(new Date(data.startTime).getTime() / 1000)),
        endTime: BigInt(Math.floor(new Date(data.endTime).getTime() / 1000)),
        presalePercentage: data.presalePercentage,
        liquidityPercentage: data.liquidityPercentage,
        liquidityLockDuration: data.liquidityLockDuration,
        marketingWallet: data.marketingWallet as `0x${string}`,
        marketingPercentage: data.marketingPercentage,
        teamWallet: data.teamWallet as `0x${string}`,
        teamPercentage: data.teamPercentage
      };

      console.log('Submitting parameters:', params);
      console.log('Calling createToken function...');
      const hash = await createToken(params);
      console.log('Transaction hash:', hash);
      
      // Wait for transaction receipt to get the token address
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log('Transaction receipt:', receipt);
      
      // Get the token address from the event logs
      const tokenCreatedEvent = receipt.logs.find(log => {
        // Check if this is the TokenCreated event
        return log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef' || // Transfer event
               log.topics[0] === '0x0f6798a560793a54c3bcfe86a93cde1e73087d944c0ea20544137d4121396885' || // TokenCreated event
               log.topics[0] === '0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0';  // OwnershipTransferred event
      });
      
      let tokenAddress: `0x${string}`;
      
      if (!tokenCreatedEvent) {
        // If we can't find the event, use the first contract created in the transaction
        const contractCreationLog = receipt.logs.find(log => 
          log.address && log.topics.length > 0
        );
        
        if (!contractCreationLog) {
          throw new Error('Token address not found in transaction logs');
        }
        
        tokenAddress = contractCreationLog.address as `0x${string}`;
        console.log('Token address (from contract creation):', tokenAddress);
      } else {
        tokenAddress = tokenCreatedEvent.address as `0x${string}`;
        console.log('Token address (from event):', tokenAddress);
      }
      
      toast({
        title: "Success",
        description: "Token created successfully",
      });
      
      onSuccess?.(tokenAddress);
    } catch (error: any) {
      console.error('Error creating token:', error);
      console.error('Error details:', {
        message: error?.message,
        code: error?.code,
        data: error?.data
      });
      toast({
        title: "Error",
        description: error?.message || "Failed to create token",
        variant: "destructive"
      });
      onError?.(error);
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
              {...form.register("startTime")}
              type="datetime-local"
              className="form-input"
            />
            {form.formState.errors.startTime && (
              <p className="form-error">{form.formState.errors.startTime.message}</p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="endTime" className="form-label">End Time</label>
            <Input
              {...form.register("endTime")}
              type="datetime-local"
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
            Distribution
            <InfoIcon content="Configure token distribution percentages" />
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

            <div className="form-group">
              <label htmlFor="teamWallet" className="form-label">
                Team Wallet
                <InfoIcon content="Address to receive team tokens" />
              </label>
              <Input
                {...form.register("teamWallet")}
                placeholder="0x..."
                className="form-input"
              />
              {form.formState.errors.teamWallet && (
                <p className="form-error">{form.formState.errors.teamWallet.message}</p>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="teamPercentage" className="form-label">
                Team Allocation (%)
                <InfoIcon content="Percentage of tokens allocated for team" />
              </label>
              <Input
                {...form.register("teamPercentage")}
                placeholder="10"
                className="form-input"
              />
              {form.formState.errors.teamPercentage && (
                <p className="form-error">{form.formState.errors.teamPercentage.message}</p>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="marketingWallet" className="form-label">
                Marketing Wallet
                <InfoIcon content="Address to receive marketing tokens" />
              </label>
              <Input
                {...form.register("marketingWallet")}
                placeholder="0x..."
                className="form-input"
              />
              {form.formState.errors.marketingWallet && (
                <p className="form-error">{form.formState.errors.marketingWallet.message}</p>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="marketingPercentage" className="form-label">
                Marketing Allocation (%)
                <InfoIcon content="Percentage of tokens allocated for marketing" />
              </label>
              <Input
                {...form.register("marketingPercentage")}
                placeholder="20"
                className="form-input"
              />
              {form.formState.errors.marketingPercentage && (
                <p className="form-error">{form.formState.errors.marketingPercentage.message}</p>
              )}
            </div>
          </div>
        </div>

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
        {mounted && (
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
        )}
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
            { name: 'Team', amount: Number(form.watch("teamPercentage")), percentage: Number(form.watch("teamPercentage")), color: '#FFBB28' },
            { name: 'Marketing', amount: Number(form.watch("marketingPercentage")), percentage: Number(form.watch("marketingPercentage")), color: '#FF8042' }
          ]}
          totalAllocation={5 + Number(form.watch("presalePercentage")) + Number(form.watch("liquidityPercentage")) + Number(form.watch("teamPercentage")) + Number(form.watch("marketingPercentage"))}
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