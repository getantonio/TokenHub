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
  maxSupply: z.string().min(1, 'Max supply is required')
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
  maxSupply: '2000000'
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
        maxSupply: BigInt(data.maxSupply)
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
      <Card className="p-2 bg-gray-800">
        <h2 className="text-lg font-semibold mb-1 text-white">Create Token (V3)</h2>
        <p className="text-xs text-white mb-1">
          Create a basic token with standard ERC20 features.
        </p>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <div className="form-group">
                <label htmlFor="name" className="text-xs font-medium text-white">Token Name</label>
                <input
                  id="name"
                  {...form.register('name')}
                  placeholder="My Token"
                  className="mt-1 w-full px-2 py-1.5 text-sm bg-background-primary rounded border border-border text-white"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="symbol" className="text-xs font-medium text-white">Token Symbol</label>
                <input
                  id="symbol"
                  {...form.register('symbol')}
                  placeholder="TKN"
                  className="mt-1 w-full px-2 py-1.5 text-sm bg-background-primary rounded border border-border text-white"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="form-group">
                <label htmlFor="initialSupply" className="text-xs font-medium text-white">Initial Supply</label>
                <input
                  id="initialSupply"
                  {...form.register('initialSupply')}
                  placeholder="1000000"
                  className="mt-1 w-full px-2 py-1.5 text-sm bg-background-primary rounded border border-border text-white"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="maxSupply" className="text-xs font-medium text-white">Maximum Supply</label>
                <input
                  id="maxSupply"
                  {...form.register('maxSupply')}
                  placeholder="2000000"
                  className="mt-1 w-full px-2 py-1.5 text-sm bg-background-primary rounded border border-border text-white"
                  required
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="text-red-900 text-sm">{error}</div>
          )}

          <div className="flex justify-end items-center space-x-2">
            <div className="flex items-center">
              <InfoIcon content="Deployment fee will be charged in ETH. Make sure you have enough ETH to cover the fee and gas costs." />
            </div>
            <button
              type="submit"
              disabled={!isConnected || isSubmitting}
              className="px-4 py-1.5 text-sm font-medium rounded bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
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
      <div className="space-y-4">
        <TokenPreview
          name={form.watch('name')}
          symbol={form.watch('symbol')}
          initialSupply={form.watch('initialSupply')}
          maxSupply={form.watch('maxSupply')}
        />
        
        <Card className="p-2 bg-gray-900">
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