import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
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

const formSchema = z.object({
  name: z.string().min(1, 'Token name is required'),
  symbol: z.string().min(1, 'Token symbol is required'),
  initialSupply: z.string().min(1, 'Initial supply is required'),
  maxSupply: z.string().min(1, 'Max supply is required'),
  enableBlacklist: z.boolean().default(false),
  enableTimeLock: z.boolean().default(false),
  // Presale settings
  presaleEnabled: z.boolean().default(false),
  presalePrice: z.string().optional(),
  presaleStartTime: z.string().optional(),
  presaleEndTime: z.string().optional(),
  presaleMinContribution: z.string().optional(),
  presaleMaxContribution: z.string().optional(),
  // Distribution settings
  vestingAmounts: z.array(z.string()).default([]),
  vestingPeriods: z.array(z.string()).default([]),
  beneficiaries: z.array(z.string()).default([]),
  walletNames: z.array(z.string()).default([])
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

const defaultValues = {
  name: 'Test Token',
  symbol: 'TEST',
  initialSupply: '1000000',
  maxSupply: '2000000',
  enableBlacklist: false,
  enableTimeLock: false,
  presaleEnabled: false,
  presalePrice: '0.0001',
  presaleStartTime: '',
  presaleEndTime: '',
  presaleMinContribution: '0.1',
  presaleMaxContribution: '10',
  vestingAmounts: [''],
  vestingPeriods: [''],
  beneficiaries: [''],
  walletNames: ['']
};

// Distribution presets
const DISTRIBUTION_PRESETS = {
  standard: {
    name: 'Standard Distribution',
    schedules: [
      { amount: '20', period: '0', description: 'Initial Release', walletName: 'Owner' },
      { amount: '20', period: '90', description: '3 Months Cliff', walletName: 'Team' },
      { amount: '30', period: '180', description: '6 Months Cliff', walletName: 'Marketing' },
      { amount: '30', period: '360', description: '12 Months Cliff', walletName: 'Liquidity' }
    ]
  },
  team: {
    name: 'Team Vesting',
    schedules: [
      { amount: '10', period: '90', description: 'Initial Release after 3 months', walletName: 'Team Lead' },
      { amount: '30', period: '180', description: '6 Months', walletName: 'Development' },
      { amount: '30', period: '270', description: '9 Months', walletName: 'Operations' },
      { amount: '30', period: '360', description: '12 Months', walletName: 'Advisors' }
    ]
  },
  investors: {
    name: 'Investor Distribution',
    schedules: [
      { amount: '25', period: '0', description: 'Initial Release', walletName: 'Presale' },
      { amount: '25', period: '90', description: '3 Months', walletName: 'Private Sale' },
      { amount: '25', period: '180', description: '6 Months', walletName: 'Public Sale' },
      { amount: '25', period: '270', description: '9 Months', walletName: 'Treasury' }
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
          description: "Token created successfully"
        });
      }
    },
  });

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues
  });

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
      await createToken({
        name: data.name,
        symbol: data.symbol,
        initialSupply: BigInt(data.initialSupply),
        maxSupply: BigInt(data.maxSupply),
        vestingAmounts: data.vestingAmounts.map(BigInt),
        vestingPeriods: data.vestingPeriods.map(parseInt),
        beneficiaries: data.beneficiaries,
        walletNames: data.walletNames,
        enableBlacklist: data.enableBlacklist,
        enableTimeLock: data.enableTimeLock
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to create token",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-1">
      <Card className="p-3 bg-gray-800">
        <h2 className="text-lg font-semibold mb-1 text-white">Create Token (V3)</h2>
        <p className="text-xs text-white mb-1">
          Create a token with advanced features including vesting schedules and multi-wallet distribution.
        </p>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-1">
          <div className="grid grid-cols-2 gap-1">
            <div className="space-y-1">
              <div className="form-group">
                <label htmlFor="name" className="text-xs font-medium text-white">Token Name</label>
                <input
                  id="name"
                  {...form.register('name')}
                  placeholder="My Token"
                  className="mt-2 w-full px-2 py-1 text-sm bg-background-primary rounded border border-border text-white"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="symbol" className="text-xs font-medium text-white">Token Symbol</label>
                <input
                  id="symbol"
                  {...form.register('symbol')}
                  placeholder="TKN"
                  className="mt-2 w-full px-2 py-1 text-sm bg-background-primary rounded border border-border text-white"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="form-group">
                <label htmlFor="initialSupply" className="text-xs font-medium text-white">Initial Supply</label>
                <input
                  id="initialSupply"
                  {...form.register('initialSupply')}
                  placeholder="1000000"
                  className="mt-2 w-full px-2 py-1 text-sm bg-background-primary rounded border border-border text-white"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="maxSupply" className="text-xs font-medium text-white">Maximum Supply</label>
                <input
                  id="maxSupply"
                  {...form.register('maxSupply')}
                  placeholder="2000000"
                  className="mt-2 w-full px-2 py-1 text-sm bg-background-primary rounded border border-border text-white"
                  required
                />
              </div>
            </div>
          </div>

          {/* Token Features */}
          <div className="form-card">
            <h3 className="form-card-header">Token Features</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="enableBlacklist"
                  {...form.register('enableBlacklist')}
                  className="form-checkbox"
                />
                <label htmlFor="enableBlacklist" className="text-xs text-white">Enable Blacklist</label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="enableTimeLock"
                  {...form.register('enableTimeLock')}
                  className="form-checkbox"
                />
                <label htmlFor="enableTimeLock" className="text-xs text-white">Enable Time Lock</label>
              </div>
            </div>
          </div>

          {/* Add Presale Section after Token Features */}
          <div className="form-card">
            <h3 className="form-card-header">Presale Settings</h3>
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="presaleEnabled"
                  {...form.register('presaleEnabled')}
                  className="form-checkbox"
                />
                <label htmlFor="presaleEnabled" className="text-xs text-white">Enable Presale</label>
              </div>

              {form.watch('presaleEnabled') && (
                <div className="grid grid-cols-3 gap-1">
                  <div className="form-group">
                    <label className="text-xs text-white">Price (ETH)</label>
                    <input
                      {...form.register('presalePrice')}
                      placeholder="0.0001"
                      className="form-input"
                      type="number"
                      step="0.0001"
                    />
                  </div>
                  <div className="form-group">
                    <label className="text-xs text-white">Min Contribution (ETH)</label>
                    <input
                      {...form.register('presaleMinContribution')}
                      placeholder="0.1"
                      className="form-input"
                      type="number"
                      step="0.1"
                    />
                  </div>
                  <div className="form-group">
                    <label className="text-xs text-white">Max Contribution (ETH)</label>
                    <input
                      {...form.register('presaleMaxContribution')}
                      placeholder="10"
                      className="form-input"
                      type="number"
                      step="0.1"
                    />
                  </div>
                  <div className="form-group">
                    <label className="text-xs text-white">Start Time</label>
                    <input
                      {...form.register('presaleStartTime')}
                      type="datetime-local"
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="text-xs text-white">End Time</label>
                    <input
                      {...form.register('presaleEndTime')}
                      type="datetime-local"
                      className="form-input"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Update Vesting and Distribution section */}
          <div className="form-card">
            <h3 className="form-card-header">Vesting & Distribution</h3>
            <div className="space-y-1">
              <div className="flex space-x-2">
                {Object.entries(DISTRIBUTION_PRESETS).map(([key, preset]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      const schedules = preset.schedules;
                      form.setValue('vestingAmounts', schedules.map(s => s.amount));
                      form.setValue('vestingPeriods', schedules.map(s => s.period));
                      form.setValue('beneficiaries', schedules.map(() => ''));
                      form.setValue('walletNames', schedules.map(s => s.walletName));
                    }}
                    className="px-2 py-1 text-xs rounded bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
                  >
                    {preset.name}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    form.setValue('vestingAmounts', []);
                    form.setValue('vestingPeriods', []);
                    form.setValue('beneficiaries', []);
                    form.setValue('walletNames', []);
                  }}
                  className="px-2 py-1 text-xs rounded bg-red-500/20 text-red-400 hover:bg-red-500/30"
                >
                  Clear All
                </button>
              </div>

              {form.watch('vestingAmounts').map((_, index) => (
                <div key={index} className="grid grid-cols-4 gap-2">
                  <div className="form-group">
                    <label className="text-xs text-white">Wallet Name</label>
                    <input
                      {...form.register(`walletNames.${index}`)}
                      placeholder="e.g. Team, Marketing"
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="text-xs text-white">Vesting Amount (%)</label>
                    <input
                      {...form.register(`vestingAmounts.${index}`)}
                      placeholder="Amount"
                      className="form-input"
                      type="number"
                      min="0"
                      max="100"
                    />
                  </div>
                  <div className="form-group">
                    <label className="text-xs text-white">Vesting Period (days)</label>
                    <input
                      {...form.register(`vestingPeriods.${index}`)}
                      placeholder="Days"
                      className="form-input"
                      type="number"
                      min="0"
                    />
                  </div>
                  <div className="form-group">
                    <label className="text-xs text-white">Beneficiary Address</label>
                    <input
                      {...form.register(`beneficiaries.${index}`)}
                      placeholder="0x..."
                      className="form-input"
                    />
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  const current = form.getValues();
                  form.setValue('vestingAmounts', [...current.vestingAmounts, '']);
                  form.setValue('vestingPeriods', [...current.vestingPeriods, '']);
                  form.setValue('beneficiaries', [...current.beneficiaries, '']);
                  form.setValue('walletNames', [...current.walletNames, '']);
                }}
                className="px-4 py-1 text-sm rounded bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
              >
                Add Vesting Schedule
              </button>
            </div>
          </div>

          {error && (
            <div className="text-red-800 text-sm">{error}</div>
          )}

          <div className="flex justify-end items-center space-x-2">
            <div className="flex items-center">
              <InfoIcon content="Deployment fee will be charged in ETH. Make sure you have enough ETH to cover the fee and gas costs." />
            </div>
            <button
              type="submit"
              disabled={!isConnected || isSubmitting}
              className="px-4 py-1 text-sm font-medium rounded bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Spinner className="mr-2" />
                  Creating...
                </>
              ) : !isConnected ? (
                'Connect Wallet to Deploy'
              ) : (
                'Create Token'
              )}
            </button>
          </div>
        </form>
      </Card>

      {/* Preview Section */}
      <div className="space-y-1">
        <TokenPreview
          name={form.watch('name')}
          symbol={form.watch('symbol')}
          initialSupply={form.watch('initialSupply')}
          maxSupply={form.watch('maxSupply')}
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
    </div>
  );
} 