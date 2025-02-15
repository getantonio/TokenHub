import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useForm } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import TokenPreview from '@/components/features/token/TokenPreview';
import { useToast } from '@/components/ui/toast/use-toast';

interface TokenFormV4Props {
  isConnected: boolean;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

interface FormData {
  // Basic Token Info
  name: string;
  symbol: string;
  initialSupply: string;
  maxSupply: string;

  // Tax System
  dynamicTaxEnabled: boolean;
  baseBuyTax: string;
  baseSellTax: string;
  maxTaxRate: string;
  volumeThreshold: string;
  autoLiquidityPercent: string;

  // Tokenomics
  buybackEnabled: boolean;
  buybackThreshold: string;
  autoBurnPercent: string;
  rewardToken: string;
  rewardPercent: string;
  antiDumpEnabled: boolean;
  maxTxAmount: string;
  maxWalletAmount: string;

  // Supply Control
  elasticSupplyEnabled: boolean;
  targetPrice: string;
  priceThreshold: string;
  mintLimit: string;
  burnLimit: string;

  // Distribution
  merkleRoot: string;
  vestingEnabled: boolean;
  vestingDuration: string;
  cliffDuration: string;
}

export default function TokenForm_V4({ isConnected, onSuccess, onError }: TokenFormV4Props) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'basic' | 'tax' | 'tokenomics' | 'supply' | 'distribution'>('basic');
  const form = useForm<FormData>({
    defaultValues: {
      name: '',
      symbol: '',
      initialSupply: '1000000',
      maxSupply: '1000000',
      baseBuyTax: '5',
      baseSellTax: '5',
      maxTaxRate: '10',
      volumeThreshold: '100',
      autoLiquidityPercent: '50',
      buybackThreshold: '1',
      autoBurnPercent: '2',
      rewardPercent: '2',
      maxTxAmount: '10000',
      maxWalletAmount: '20000',
      targetPrice: '0.01',
      priceThreshold: '10',
      mintLimit: '1000',
      burnLimit: '1000',
      vestingDuration: '180',
      cliffDuration: '30'
    }
  });

  const handleSubmit = async (data: FormData) => {
    if (!isConnected) {
      toast({
        title: "Wallet Connection Required",
        description: "Please connect your wallet to create a token",
        variant: "destructive"
      });
      return;
    }

    try {
      // TODO: Implement token deployment
      console.log('Form data:', data);
      onSuccess?.();
    } catch (error) {
      console.error('Error deploying token:', error);
      onError?.(error as Error);
    }
  };

  const tabs = [
    { id: 'basic', label: 'Basic Info' },
    { id: 'tax', label: 'Tax System' },
    { id: 'tokenomics', label: 'Tokenomics' },
    { id: 'supply', label: 'Supply Control' },
    { id: 'distribution', label: 'Distribution' }
  ] as const;

  const inputClasses = "bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500";
  const checkboxClasses = "w-4 h-4 rounded border-gray-700 bg-gray-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-900";
  const labelClasses = "text-sm font-medium text-gray-200";
  const sectionClasses = "grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3";

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-gray-800/50 border border-gray-700/50">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-white">Create Your Token</h2>
          <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/50">
            Development
          </Badge>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-4 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700/50 text-gray-400 hover:text-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          {/* Basic Info */}
          <div className={activeTab === 'basic' ? 'block' : 'hidden'}>
            <div className={sectionClasses}>
              <div>
                <Label className={labelClasses}>Token Name</Label>
                <Input {...form.register('name')} placeholder="My Token" className={inputClasses} />
              </div>
              <div>
                <Label className={labelClasses}>Token Symbol</Label>
                <Input {...form.register('symbol')} placeholder="MTK" className={inputClasses} />
              </div>
              <div>
                <Label className={labelClasses}>Initial Supply</Label>
                <Input {...form.register('initialSupply')} type="number" className={inputClasses} />
              </div>
              <div>
                <Label className={labelClasses}>Maximum Supply</Label>
                <Input {...form.register('maxSupply')} type="number" className={inputClasses} />
              </div>
            </div>
          </div>

          {/* Tax System */}
          <div className={activeTab === 'tax' ? 'block' : 'hidden'}>
            <div className={sectionClasses}>
              <div className="md:col-span-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    {...form.register('dynamicTaxEnabled')}
                    className={checkboxClasses}
                  />
                  <span className={labelClasses}>Enable Dynamic Tax</span>
                </label>
              </div>
              <div>
                <Label className={labelClasses}>Base Buy Tax (%)</Label>
                <Input {...form.register('baseBuyTax')} type="number" className={inputClasses} />
              </div>
              <div>
                <Label className={labelClasses}>Base Sell Tax (%)</Label>
                <Input {...form.register('baseSellTax')} type="number" className={inputClasses} />
              </div>
              <div>
                <Label className={labelClasses}>Max Tax Rate (%)</Label>
                <Input {...form.register('maxTaxRate')} type="number" className={inputClasses} />
              </div>
              <div>
                <Label className={labelClasses}>Volume Threshold (ETH)</Label>
                <Input {...form.register('volumeThreshold')} type="number" className={inputClasses} />
              </div>
              <div>
                <Label className={labelClasses}>Auto-Liquidity (%)</Label>
                <Input {...form.register('autoLiquidityPercent')} type="number" className={inputClasses} />
              </div>
            </div>
          </div>

          {/* Tokenomics */}
          <div className={activeTab === 'tokenomics' ? 'block' : 'hidden'}>
            <div className={sectionClasses}>
              <div className="md:col-span-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    {...form.register('buybackEnabled')}
                    className={checkboxClasses}
                  />
                  <span className={labelClasses}>Enable Buyback</span>
                </label>
              </div>
              <div>
                <Label className={labelClasses}>Buyback Threshold (ETH)</Label>
                <Input {...form.register('buybackThreshold')} type="number" className={inputClasses} />
              </div>
              <div>
                <Label className={labelClasses}>Auto-Burn (%)</Label>
                <Input {...form.register('autoBurnPercent')} type="number" className={inputClasses} />
              </div>
              <div className="md:col-span-2">
                <Label className={labelClasses}>Reward Token Address</Label>
                <Input {...form.register('rewardToken')} placeholder="0x..." className={inputClasses} />
              </div>
              <div>
                <Label className={labelClasses}>Reward Percent (%)</Label>
                <Input {...form.register('rewardPercent')} type="number" className={inputClasses} />
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    {...form.register('antiDumpEnabled')}
                    className={checkboxClasses}
                  />
                  <span className={labelClasses}>Enable Anti-Dump</span>
                </label>
              </div>
              <div>
                <Label className={labelClasses}>Max Transaction Amount</Label>
                <Input {...form.register('maxTxAmount')} type="number" className={inputClasses} />
              </div>
              <div>
                <Label className={labelClasses}>Max Wallet Amount</Label>
                <Input {...form.register('maxWalletAmount')} type="number" className={inputClasses} />
              </div>
            </div>
          </div>

          {/* Supply Control */}
          <div className={activeTab === 'supply' ? 'block' : 'hidden'}>
            <div className={sectionClasses}>
              <div className="md:col-span-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    {...form.register('elasticSupplyEnabled')}
                    className={checkboxClasses}
                  />
                  <span className={labelClasses}>Enable Elastic Supply</span>
                </label>
              </div>
              <div>
                <Label className={labelClasses}>Target Price (ETH)</Label>
                <Input {...form.register('targetPrice')} type="number" className={inputClasses} />
              </div>
              <div>
                <Label className={labelClasses}>Price Threshold (%)</Label>
                <Input {...form.register('priceThreshold')} type="number" className={inputClasses} />
              </div>
              <div>
                <Label className={labelClasses}>Mint Limit</Label>
                <Input {...form.register('mintLimit')} type="number" className={inputClasses} />
              </div>
              <div>
                <Label className={labelClasses}>Burn Limit</Label>
                <Input {...form.register('burnLimit')} type="number" className={inputClasses} />
              </div>
            </div>
          </div>

          {/* Distribution */}
          <div className={activeTab === 'distribution' ? 'block' : 'hidden'}>
            <div className={sectionClasses}>
              <div className="md:col-span-2">
                <Label className={labelClasses}>Merkle Root (for airdrops)</Label>
                <Input {...form.register('merkleRoot')} placeholder="0x..." className={inputClasses} />
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    {...form.register('vestingEnabled')}
                    className={checkboxClasses}
                  />
                  <span className={labelClasses}>Enable Vesting</span>
                </label>
              </div>
              <div>
                <Label className={labelClasses}>Vesting Duration (days)</Label>
                <Input {...form.register('vestingDuration')} type="number" className={inputClasses} />
              </div>
              <div>
                <Label className={labelClasses}>Cliff Duration (days)</Label>
                <Input {...form.register('cliffDuration')} type="number" className={inputClasses} />
              </div>
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white h-9"
            disabled={!isConnected}
          >
            {isConnected ? "Create Token" : "Connect Wallet to Deploy"}
          </Button>
        </form>
      </Card>

      {/* Token Preview */}
      <TokenPreview
        name={form.watch('name')}
        symbol={form.watch('symbol')}
        initialSupply={form.watch('initialSupply')}
        maxSupply={form.watch('maxSupply')}
      />
    </div>
  );
} 