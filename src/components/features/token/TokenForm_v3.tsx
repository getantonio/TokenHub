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
  onSuccess?: () => void;
  onError?: (error: any) => void;
}

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  symbol: z.string().min(1, "Symbol is required"),
  initialSupply: z.coerce.number().min(0, "Initial supply must be >= 0"),
  maxSupply: z.coerce.number().min(0, "Max supply must be >= 0"),
  enableBlacklist: z.boolean(),
  enableTimeLock: z.boolean(),
  presaleRate: z.string().min(1, "Presale rate is required"),
  softCap: z.coerce.number().min(0, "Soft cap must be >= 0"),
  hardCap: z.coerce.number().min(0, "Hard cap must be >= 0"),
  minContribution: z.coerce.number().min(0, "Min contribution must be >= 0"),
  maxContribution: z.coerce.number().min(0, "Max contribution must be >= 0"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  presalePercentage: z.coerce.number().min(0, "Presale percentage must be >= 0").max(100, "Presale percentage must be <= 100"),
  liquidityPercentage: z.coerce.number().min(0, "Liquidity percentage must be >= 0").max(100, "Liquidity percentage must be <= 100"),
  liquidityLockDuration: z.coerce.number().min(1, "Lock duration must be >= 1"),
  wallets: z.array(z.object({
    name: z.string().min(1, "Name is required"),
    address: z.string().min(1, "Address is required"),
    percentage: z.coerce.number().min(0, "Percentage must be >= 0").max(100, "Percentage must be <= 100"),
    vestingEnabled: z.boolean(),
    vestingDuration: z.coerce.number().optional(),
    cliffDuration: z.coerce.number().optional(),
    vestingStartTime: z.string().optional()
  }))
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
  const totalPercentage = data.presalePercentage + data.liquidityPercentage + 
    data.wallets.reduce((sum, wallet) => sum + wallet.percentage, 0);
  return totalPercentage === 100;
}, "Total allocation must equal 100%");

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
  presaleRate: '0.001',
  softCap: '50',
  hardCap: '100',
  minContribution: '0.1',
  maxContribution: '10',
  startTime: getDefaultTimes().startTimeFormatted,
  endTime: getDefaultTimes().endTimeFormatted,
  presalePercentage: 40,
  liquidityPercentage: 40,
  liquidityLockDuration: 180,
  wallets: [
    {
      name: 'Team',
      address: '',
      percentage: 20,
      vestingEnabled: true,
      vestingDuration: 365,
      cliffDuration: 90,
      vestingStartTime: getDefaultTimes().startTimeFormatted
    }
  ]
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
      wallets: defaultValues.wallets.map(wallet => ({
        ...wallet,
        address: address || ''
      }))
    }
  });

  useEffect(() => {
    if (address) {
      form.setValue('owner', address);
      form.setValue('wallets', form.getValues('wallets').map(wallet => ({
        ...wallet,
        address: address
      })));
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

      // Validate soft cap and hard cap
      const softCap = Number(data.softCap);
      const hardCap = Number(data.hardCap);
      if (softCap >= hardCap) {
        toast({
          title: "Error",
          description: "Soft cap must be less than hard cap",
          variant: "destructive"
        });
        return;
      }

      // Calculate total percentage
      const totalPercentage = data.presalePercentage + 
        data.liquidityPercentage + 
        data.wallets.reduce((sum, wallet) => sum + wallet.percentage, 0);

      console.log('Wallet allocations:', data.wallets.map(w => ({ name: w.name, percentage: w.percentage })));
      console.log('Total percentage:', totalPercentage);

      if (totalPercentage !== 100) {
        toast({
          title: "Error",
          description: `Total allocation must be exactly 100%. Current total: ${totalPercentage}%`,
          variant: "destructive"
        });
        return;
      }

      // Validate individual percentages
      if (data.presalePercentage <= 0) throw new Error('Presale percentage must be greater than 0');
      if (data.liquidityPercentage <= 0) throw new Error('Liquidity percentage must be greater than 0');

      // Validate wallet percentages and addresses
      for (const wallet of data.wallets) {
        if (wallet.percentage <= 0) {
          throw new Error(`Percentage for ${wallet.name} must be greater than 0`);
        }
        if (!wallet.address || wallet.address === '0x0000000000000000000000000000000000000000') {
          throw new Error(`Please provide a valid address for wallet "${wallet.name}"`);
        }
      }

      if (!publicClient) {
        throw new Error('Failed to get public client');
      }

      setLoading(true);

      // Convert presale rate from ETH to tokens per ETH
      const ethPerToken = Number(data.presaleRate);
      const tokensPerEth = Math.floor(1 / ethPerToken);
      console.log('Converting presale rate:', { ethPerToken, tokensPerEth });

      // Convert dates to Unix timestamps
      const startTime = BigInt(Math.floor(new Date(data.startTime).getTime() / 1000));
      const endTime = BigInt(Math.floor(new Date(data.endTime).getTime() / 1000));

      // Process wallet allocations with vesting
      const processedWallets = data.wallets.map(wallet => ({
        name: wallet.name,
        address: wallet.address as `0x${string}`,
        percentage: wallet.percentage,
        vestingEnabled: wallet.vestingEnabled || false,
        vestingDuration: wallet.vestingEnabled ? (wallet.vestingDuration || 365) : 0,
        cliffDuration: wallet.vestingEnabled ? (wallet.cliffDuration || 90) : 0,
        vestingStartTime: wallet.vestingEnabled ? 
          BigInt(Math.floor(new Date(wallet.vestingStartTime || Date.now()).getTime() / 1000)) :
          BigInt(0)
      }));

      // Log the wallet allocations for debugging
      console.log('Processed wallets:', processedWallets);

      const params = {
        name: data.name,
        symbol: data.symbol,
        initialSupply: parseEther(data.initialSupply.toString()),
        maxSupply: parseEther(data.maxSupply.toString()),
        owner: address as `0x${string}`,
        enableBlacklist: data.enableBlacklist,
        enableTimeLock: data.enableTimeLock,
        presaleRate: BigInt(tokensPerEth),
        softCap: parseEther(data.softCap.toString()),
        hardCap: parseEther(data.hardCap.toString()),
        minContribution: parseEther(data.minContribution.toString()),
        maxContribution: parseEther(data.maxContribution.toString()),
        startTime,
        endTime,
        presalePercentage: data.presalePercentage,
        liquidityPercentage: data.liquidityPercentage,
        liquidityLockDuration: data.liquidityLockDuration,
        wallets: processedWallets
      };

      console.log('Token creation params:', params);
      const tx = await createToken(params);
      
      // Wait for transaction receipt to get the token address
      const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
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
      
      onSuccess?.();
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

  const addWallet = () => {
    const newWallet = {
      name: '',
      address: '',
      percentage: 0,
      vestingEnabled: false,
      vestingDuration: 365, // Default to 1 year
      cliffDuration: 90,   // Default to 3 months
      vestingStartTime: BigInt(Math.floor(Date.now() / 1000)) // Current timestamp
    };
    
    form.setValue('wallets', [...form.getValues('wallets'), newWallet]);
  };

  const removeWallet = (index: number) => {
    const wallets = form.getValues('wallets');
    form.setValue('wallets', wallets.filter((_, i) => i !== index));
  };

  const applyPreset = (preset: keyof typeof VESTING_PRESETS) => {
    const presetConfig = VESTING_PRESETS[preset];
    form.setValue('presalePercentage', presetConfig.presalePercentage);
    form.setValue('liquidityPercentage', presetConfig.liquidityPercentage);
    form.setValue('wallets', presetConfig.wallets.map(wallet => ({
      name: wallet.walletName,
      address: address || '0x0000000000000000000000000000000000000000',
      percentage: wallet.amount,
      vestingEnabled: wallet.vestingEnabled,
      vestingDuration: wallet.vestingDuration,
      cliffDuration: wallet.cliffDuration,
      vestingStartTime: wallet.vestingStartTime
    })));
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
            <label htmlFor="presaleRate" className="form-label">
              Presale Rate (ETH/token)
              <InfoIcon content="Amount of ETH needed to buy 1 token. Example: 0.001 means 1 token costs 0.001 ETH" />
            </label>
            <div className="relative">
              <Input
                type="number"
                step="0.0000000001"
                placeholder="0.001"
                {...form.register("presaleRate")}
                className="form-input"
              />
              <div className="absolute right-0 top-0 h-full flex items-center pr-2">
                <span className="text-xs text-gray-400">
                  {form.watch("presaleRate") ? `≈ ${Math.floor(1 / Number(form.watch("presaleRate")))} tokens/ETH` : ''}
                </span>
              </div>
            </div>
            {form.formState.errors.presaleRate && (
              <p className="form-error">{form.formState.errors.presaleRate.message}</p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="softCap" className="form-label">
              Soft Cap (ETH)
              <InfoIcon content="Minimum amount of ETH needed for presale to be considered successful" />
            </label>
            <Input
              {...form.register("softCap")}
              placeholder="50"
              className="form-input"
            />
            {form.formState.errors.softCap && (
              <p className="form-error">{form.formState.errors.softCap.message}</p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="hardCap" className="form-label">
              Hard Cap (ETH)
              <InfoIcon content="Maximum amount of ETH that can be raised during presale" />
            </label>
            <Input
              {...form.register("hardCap")}
              placeholder="100"
              className="form-input"
            />
            {form.formState.errors.hardCap && (
              <p className="form-error">{form.formState.errors.hardCap.message}</p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="minContribution" className="form-label">
              Min Contribution (ETH)
              <InfoIcon content="Minimum amount of ETH a user can contribute" />
            </label>
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
            <label htmlFor="maxContribution" className="form-label">
              Max Contribution (ETH)
              <InfoIcon content="Maximum amount of ETH a user can contribute" />
            </label>
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
          <h3 className="text-lg font-medium text-white mb-2">Token Features</h3>
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

        <div className="form-section col-span-2 bg-gray-900/50 rounded-lg p-2">
          <div className="mb-2">
            <h3 className="text-lg font-medium text-white mb-1">
              Distribution & Vesting
            </h3>
            <p className="text-sm text-gray-400">Configure token allocations and vesting schedules</p>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
            <Button
              type="button"
              onClick={() => applyPreset('standard')}
              variant="secondary"
              className="h-6 text-xs"
            >
              Standard
            </Button>
            <Button
              type="button"
              onClick={() => applyPreset('fair_launch')}
              variant="secondary"
              className="h-6 text-xs"
            >
              Fair
            </Button>
            <Button
              type="button"
              onClick={() => applyPreset('community')}
              variant="secondary"
              className="h-6 text-xs"
            >
              Community
            </Button>
            <Button
              type="button"
              onClick={() => applyPreset('growth')}
              variant="secondary"
              className="h-6 text-xs"
            >
              Growth
            </Button>
            <Button
              type="button"
              onClick={() => applyPreset('bootstrap')}
              variant="secondary"
              className="h-6 text-xs"
            >
              Bootstrap
            </Button>
            <Button
              type="button"
              onClick={() => applyPreset('governance')}
              variant="secondary"
              className="h-6 text-xs"
            >
              Gov
            </Button>
          </div>
          
          <div className="bg-gray-800/50 rounded-lg p-1 mb-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-white">Token Distribution</h4>
                <div className="text-xs text-gray-400">
                  {(() => {
                    const total = Number(form.watch("presalePercentage")) + Number(form.watch("liquidityPercentage")) + form.watch('wallets').reduce((sum, wallet) => sum + Number(wallet.percentage), 0);
                    return (
                      <span className={total > 100 ? 'text-red-400' : 'text-gray-400'}>
                        Total: {total}%
                        {total > 100 && ' (exceeds 100%)'}
                      </span>
                    );
                  })()}
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                {/* Presale */}
                <div className="relative">
                  <Input
                    {...form.register("presalePercentage")}
                    type="number"
                    placeholder="25"
                    className="form-input h-7 text-sm bg-gray-700 pr-8 w-full"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center">
                    <span className="text-sm text-gray-400 mr-3">%</span>
                  </div>
                  <div className="absolute -top-5 left-0 text-xs text-gray-400">Presale</div>
                </div>
                
                {/* Liquidity */}
                <div className="relative">
                  <Input
                    {...form.register("liquidityPercentage")}
                    type="number"
                    placeholder="25"
                    className="form-input h-7 text-sm bg-gray-700 pr-8 w-full"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center">
                    <span className="text-sm text-gray-400 mr-3">%</span>
                  </div>
                  <div className="absolute -top-5 left-0 text-xs text-gray-400">Liquidity</div>
                </div>
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
        </div>

        <div className="form-actions mt-4">
          <div className="flex items-center mr-2">
            <InfoIcon content="Deployment fee will be charged in ETH. Make sure you have enough ETH to cover the fee and gas costs." />
          </div>
          <Button 
            type="submit"
            disabled={!isConnected || loading || form.formState.isSubmitting}
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

        <div className="mt-8">
          <TokenPreview
            name={form.watch("name")}
            symbol={form.watch("symbol")}
            initialSupply={form.watch("initialSupply")}
            maxSupply={form.watch("maxSupply")}
            distributionSegments={[
              { name: 'Presale', amount: Number(form.watch("presalePercentage")), percentage: Number(form.watch("presalePercentage")), color: '#0088FE' },
              { name: 'Liquidity', amount: Number(form.watch("liquidityPercentage")), percentage: Number(form.watch("liquidityPercentage")), color: '#00C49F' },
              ...form.watch('wallets').map((wallet, index) => ({
                name: wallet.name,
                amount: Number(wallet.percentage),
                percentage: Number(wallet.percentage),
                color: COLORS[index % COLORS.length]
              }))
            ]}
            totalAllocation={Number(form.watch("presalePercentage")) + Number(form.watch("liquidityPercentage")) + form.watch('wallets').reduce((sum, wallet) => sum + Number(wallet.percentage), 0)}
          />
        </div>
      </form>
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
  standard: {
    presalePercentage: 35,
    liquidityPercentage: 35,
    wallets: [
      { 
        walletName: 'Team', 
        amount: 15, 
        vestingEnabled: true,
        vestingDuration: 365,
        cliffDuration: 90,
        vestingStartTime: getDefaultTimes().startTimeFormatted
      },
      { 
        walletName: 'Marketing', 
        amount: 10, 
        vestingEnabled: true,
        vestingDuration: 180,
        cliffDuration: 30,
        vestingStartTime: getDefaultTimes().startTimeFormatted
      },
      { 
        walletName: 'Development', 
        amount: 5, 
        vestingEnabled: true,
        vestingDuration: 365,
        cliffDuration: 60,
        vestingStartTime: getDefaultTimes().startTimeFormatted
      }
    ]
  },
  fair_launch: {
    presalePercentage: 45,
    liquidityPercentage: 35,
    wallets: [
      { 
        walletName: 'Team', 
        amount: 10, 
        vestingEnabled: true,
        vestingDuration: 365,
        cliffDuration: 180,
        vestingStartTime: getDefaultTimes().startTimeFormatted
      },
      { 
        walletName: 'Marketing', 
        amount: 5, 
        vestingEnabled: true,
        vestingDuration: 180,
        cliffDuration: 30,
        vestingStartTime: getDefaultTimes().startTimeFormatted
      },
      { 
        walletName: 'Development', 
        amount: 5, 
        vestingEnabled: true,
        vestingDuration: 365,
        cliffDuration: 90,
        vestingStartTime: getDefaultTimes().startTimeFormatted
      }
    ]
  },
  community: {
    presalePercentage: 45,
    liquidityPercentage: 35,
    wallets: [
      { 
        walletName: 'Team', 
        amount: 5, 
        vestingEnabled: true,
        vestingDuration: 365,
        cliffDuration: 90,
        vestingStartTime: getDefaultTimes().startTimeFormatted
      },
      { 
        walletName: 'Marketing', 
        amount: 10, 
        vestingEnabled: true,
        vestingDuration: 180,
        cliffDuration: 30,
        vestingStartTime: getDefaultTimes().startTimeFormatted
      },
      { 
        walletName: 'Development', 
        amount: 5, 
        vestingEnabled: true,
        vestingDuration: 365,
        cliffDuration: 60,
        vestingStartTime: getDefaultTimes().startTimeFormatted
      }
    ]
  },
  growth: {
    presalePercentage: 35,
    liquidityPercentage: 35,
    wallets: [
      { 
        walletName: 'Team', 
        amount: 12, 
        vestingEnabled: true,
        vestingDuration: 365,
        cliffDuration: 180,
        vestingStartTime: getDefaultTimes().startTimeFormatted
      },
      { 
        walletName: 'Marketing', 
        amount: 15, 
        vestingEnabled: true,
        vestingDuration: 180,
        cliffDuration: 30,
        vestingStartTime: getDefaultTimes().startTimeFormatted
      },
      { 
        walletName: 'Development', 
        amount: 3, 
        vestingEnabled: true,
        vestingDuration: 365,
        cliffDuration: 90,
        vestingStartTime: getDefaultTimes().startTimeFormatted
      }
    ]
  },
  bootstrap: {
    presalePercentage: 40,
    liquidityPercentage: 40,
    wallets: [
      { 
        walletName: 'Team', 
        amount: 8, 
        vestingEnabled: true,
        vestingDuration: 365,
        cliffDuration: 180,
        vestingStartTime: getDefaultTimes().startTimeFormatted
      },
      { 
        walletName: 'Marketing', 
        amount: 8, 
        vestingEnabled: true,
        vestingDuration: 180,
        cliffDuration: 30,
        vestingStartTime: getDefaultTimes().startTimeFormatted
      },
      { 
        walletName: 'Development', 
        amount: 4, 
        vestingEnabled: true,
        vestingDuration: 180,
        cliffDuration: 60,
        vestingStartTime: getDefaultTimes().startTimeFormatted
      }
    ]
  },
  governance: {
    presalePercentage: 35,
    liquidityPercentage: 35,
    wallets: [
      { 
        walletName: 'Team', 
        amount: 10, 
        vestingEnabled: true,
        vestingDuration: 365,
        cliffDuration: 180,
        vestingStartTime: getDefaultTimes().startTimeFormatted
      },
      { 
        walletName: 'Treasury', 
        amount: 12, 
        vestingEnabled: true,
        vestingDuration: 365,
        cliffDuration: 90,
        vestingStartTime: getDefaultTimes().startTimeFormatted
      },
      { 
        walletName: 'Development', 
        amount: 8, 
        vestingEnabled: true,
        vestingDuration: 180,
        cliffDuration: 60,
        vestingStartTime: getDefaultTimes().startTimeFormatted
      }
    ]
  }
};