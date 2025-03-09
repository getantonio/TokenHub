import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useForm } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import TokenPreview from '@/components/features/token/TokenPreview';
import { useToast } from '@/components/ui/toast/use-toast';
import { TokenDistributionPreview } from '@/components/features/token/TokenDistributionPreview';
import { InfoTooltip } from '@/components/ui/InfoTooltip';

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
  vestingDuration: number;
  cliffDuration: number;
  liquidityPercentage: number;
  presaleEnabled: boolean;
  presalePercentage: number;
  wallets: Array<{
    name: string;
    address: string;
    percentage: number;
    vestingEnabled: boolean;
    vestingDuration: number;
    cliffDuration: number;
    vestingStartTime: number;
  }>;
}

// Vesting presets for quick configuration
const VESTING_PRESETS = {
  standard: {
    presalePercentage: 30,
    liquidityPercentage: 60,
    wallets: [
      {
        name: "Team",
        percentage: 5,
        vestingEnabled: true,
        vestingDuration: 365,
        cliffDuration: 90
      },
      {
        name: "Marketing",
        percentage: 5,
        vestingEnabled: true,
        vestingDuration: 180,
        cliffDuration: 30
      }
    ]
  },
  fair_launch: {
    presalePercentage: 0,
    liquidityPercentage: 95,
    wallets: [
      {
        name: "Team",
        percentage: 5,
        vestingEnabled: true,
        vestingDuration: 365,
        cliffDuration: 90
      }
    ]
  },
  community: {
    presalePercentage: 40,
    liquidityPercentage: 40,
    wallets: [
      {
        name: "Community Treasury",
        percentage: 10,
        vestingEnabled: true,
        vestingDuration: 730,
        cliffDuration: 180
      },
      {
        name: "Team",
        percentage: 5,
        vestingEnabled: true,
        vestingDuration: 365,
        cliffDuration: 90
      },
      {
        name: "Marketing",
        percentage: 5,
        vestingEnabled: true,
        vestingDuration: 180,
        cliffDuration: 30
      }
    ]
  }
};

const tooltips = {
  basic: {
    name: "The name of your token that will be displayed in wallets and exchanges.",
    symbol: "A short identifier for your token (2-6 characters recommended).",
    initialSupply: "The initial amount of tokens that will be minted at deployment.",
    maxSupply: "The maximum amount of tokens that can ever exist. Set to 0 for unlimited supply."
  },
  tax: {
    dynamicTax: `A tax is a percentage fee taken from each transaction.

Dynamic tax means this fee can automatically adjust based on trading conditions:

• Higher volume = Lower tax
• Lower volume = Higher tax

This helps prevent price manipulation and encourages healthy trading.`,
    baseBuyTax: "The standard tax rate applied to buy transactions.",
    baseSellTax: "The standard tax rate applied to sell transactions.",
    maxTaxRate: "The highest possible tax rate when dynamic tax is enabled.",
    volumeThreshold: "Trading volume threshold that triggers dynamic tax adjustments.",
    autoLiquidity: "Percentage of collected taxes automatically added to liquidity."
  },
  tokenomics: {
    buyback: "Automatically buy back and burn tokens using collected fees.",
    buybackThreshold: "Amount of ETH accumulated before triggering a buyback.",
    autoBurn: "Percentage of tokens automatically burned from each transaction.",
    rewardToken: "Token address used for holder rewards (e.g., WETH, USDT).",
    rewardPercent: "Percentage of transaction volume distributed as rewards.",
    antiDump: "Prevent large sells by limiting transaction and wallet sizes.",
    maxTxAmount: "Maximum tokens allowed per transaction.",
    maxWalletAmount: "Maximum tokens that can be held in a single wallet."
  },
  supply: {
    elasticSupply: "Automatically adjust token supply to target a specific price.",
    targetPrice: "The desired token price in ETH.",
    priceThreshold: "Price deviation percentage that triggers supply adjustments.",
    mintLimit: "Maximum tokens that can be minted in a single adjustment.",
    burnLimit: "Maximum tokens that can be burned in a single adjustment."
  },
  distribution: {
    merkleRoot: "Merkle root hash for airdrop claim verification.",
    presale: "Enable token presale with customizable parameters.",
    liquidity: "Percentage of tokens allocated to initial liquidity.",
    vesting: {
      enabled: "Enable gradual token unlocking over time.",
      duration: "Total time period for tokens to fully vest.",
      cliff: "Initial period where tokens remain locked before vesting begins."
    }
  }
};

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
      vestingDuration: 180,
      cliffDuration: 30,
      liquidityPercentage: 60,
      presaleEnabled: true,
      presalePercentage: 30,
      wallets: VESTING_PRESETS.standard.wallets
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

  const inputClasses = "bg-gray-900 border-gray-800 text-white placeholder-gray-500 focus:ring-0 focus:border-gray-700";
  const walletInputClasses = "bg-gray-900 text-sm h-8 border-gray-800 text-white placeholder-gray-500 focus:ring-0 focus:border-gray-700";
  const checkboxClasses = "w-4 h-4 rounded border-gray-700 bg-gray-900 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-900";
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
                <div className="flex items-center gap-2">
                  <Label className={labelClasses}>Token Name</Label>
                  <InfoTooltip content={tooltips.basic.name} />
                </div>
                <Input {...form.register('name')} placeholder="My Token" className={inputClasses} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Label className={labelClasses}>Token Symbol</Label>
                  <InfoTooltip content={tooltips.basic.symbol} />
                </div>
                <Input {...form.register('symbol')} placeholder="MTK" className={inputClasses} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Label className={labelClasses}>Initial Supply</Label>
                  <InfoTooltip content={tooltips.basic.initialSupply} />
                </div>
                <Input {...form.register('initialSupply')} type="number" className={inputClasses} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Label className={labelClasses}>Maximum Supply</Label>
                  <InfoTooltip content={tooltips.basic.maxSupply} />
                </div>
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
                  <InfoTooltip content={tooltips.tax.dynamicTax} />
                </label>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Label className={labelClasses}>Base Buy Tax (%)</Label>
                  <InfoTooltip content={tooltips.tax.baseBuyTax} />
                </div>
                <Input {...form.register('baseBuyTax')} type="number" className={inputClasses} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Label className={labelClasses}>Base Sell Tax (%)</Label>
                  <InfoTooltip content={tooltips.tax.baseSellTax} />
                </div>
                <Input {...form.register('baseSellTax')} type="number" className={inputClasses} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Label className={labelClasses}>Max Tax Rate (%)</Label>
                  <InfoTooltip content={tooltips.tax.maxTaxRate} />
                </div>
                <Input {...form.register('maxTaxRate')} type="number" className={inputClasses} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Label className={labelClasses}>Volume Threshold (ETH)</Label>
                  <InfoTooltip content={tooltips.tax.volumeThreshold} />
                </div>
                <Input {...form.register('volumeThreshold')} type="number" className={inputClasses} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Label className={labelClasses}>Auto-Liquidity (%)</Label>
                  <InfoTooltip content={tooltips.tax.autoLiquidity} />
                </div>
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
                  <InfoTooltip content={tooltips.tokenomics.buyback} />
                </label>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Label className={labelClasses}>Buyback Threshold (ETH)</Label>
                  <InfoTooltip content={tooltips.tokenomics.buybackThreshold} />
                </div>
                <Input {...form.register('buybackThreshold')} type="number" className={inputClasses} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Label className={labelClasses}>Auto-Burn (%)</Label>
                  <InfoTooltip content={tooltips.tokenomics.autoBurn} />
                </div>
                <Input {...form.register('autoBurnPercent')} type="number" className={inputClasses} />
              </div>
              <div className="md:col-span-2">
                <div className="flex items-center gap-2">
                  <Label className={labelClasses}>Reward Token Address</Label>
                  <InfoTooltip content={tooltips.tokenomics.rewardToken} />
                </div>
                <Input {...form.register('rewardToken')} placeholder="0x..." className={inputClasses} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Label className={labelClasses}>Reward Percent (%)</Label>
                  <InfoTooltip content={tooltips.tokenomics.rewardPercent} />
                </div>
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
                  <InfoTooltip content={tooltips.tokenomics.antiDump} />
                </label>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Label className={labelClasses}>Max Transaction Amount</Label>
                  <InfoTooltip content={tooltips.tokenomics.maxTxAmount} />
                </div>
                <Input {...form.register('maxTxAmount')} type="number" className={inputClasses} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Label className={labelClasses}>Max Wallet Amount</Label>
                  <InfoTooltip content={tooltips.tokenomics.maxWalletAmount} />
                </div>
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
                  <InfoTooltip content={tooltips.supply.elasticSupply} />
                </label>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Label className={labelClasses}>Target Price (ETH)</Label>
                  <InfoTooltip content={tooltips.supply.targetPrice} />
                </div>
                <Input {...form.register('targetPrice')} type="number" className={inputClasses} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Label className={labelClasses}>Price Threshold (%)</Label>
                  <InfoTooltip content={tooltips.supply.priceThreshold} />
                </div>
                <Input {...form.register('priceThreshold')} type="number" className={inputClasses} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Label className={labelClasses}>Mint Limit</Label>
                  <InfoTooltip content={tooltips.supply.mintLimit} />
                </div>
                <Input {...form.register('mintLimit')} type="number" className={inputClasses} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Label className={labelClasses}>Burn Limit</Label>
                  <InfoTooltip content={tooltips.supply.burnLimit} />
                </div>
                <Input {...form.register('burnLimit')} type="number" className={inputClasses} />
              </div>
            </div>
          </div>

          {/* Distribution */}
          <div className={activeTab === 'distribution' ? 'block' : 'hidden'}>
            <div className={sectionClasses}>
              <div className="md:col-span-2">
                <div className="flex items-center gap-2">
                  <Label className={labelClasses}>Merkle Root (for airdrops)</Label>
                  <InfoTooltip content={tooltips.distribution.merkleRoot} />
                </div>
                <Input {...form.register('merkleRoot')} placeholder="0x..." className={inputClasses} />
              </div>
              
              {/* Distribution Configuration */}
              <div className="md:col-span-2 bg-gray-900/50 rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-white">Distribution & Vesting</h3>
                    <p className="text-sm text-gray-400">Configure token allocations and vesting schedules</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select 
                      className="bg-gray-800 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-gray-200"
                      onChange={(e) => {
                        const preset = e.target.value as keyof typeof VESTING_PRESETS;
                        if (preset) {
                          const config = VESTING_PRESETS[preset];
                          form.setValue('presaleEnabled', config.presalePercentage > 0);
                          form.setValue('presalePercentage', config.presalePercentage);
                          form.setValue('liquidityPercentage', config.liquidityPercentage);
                          form.setValue('wallets', config.wallets.map(w => ({
                            ...w,
                            address: '',
                            vestingStartTime: Math.floor(Date.now() / 1000) + (24 * 3600)
                          })));
                        }
                      }}
                    >
                      <option value="">Select Preset</option>
                      <option value="standard">Standard Distribution</option>
                      <option value="fair_launch">Fair Launch</option>
                      <option value="community">Community Focused</option>
                    </select>
                  </div>
                </div>

                {/* Distribution Percentages */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Label className={labelClasses}>Liquidity Percentage (%)</Label>
                      <InfoTooltip content={tooltips.distribution.liquidity} />
                    </div>
                    <Input 
                      {...form.register('liquidityPercentage')} 
                      type="number" 
                      className={inputClasses}
                      min="0"
                      max="100"
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        {...form.register('presaleEnabled')}
                        className={checkboxClasses}
                      />
                      <span className={labelClasses}>Enable Presale</span>
                      <InfoTooltip content={tooltips.distribution.presale} />
                    </label>
                    {form.watch('presaleEnabled') && (
                      <div className="flex-1">
                        <Input 
                          {...form.register('presalePercentage')} 
                          type="number" 
                          className={inputClasses}
                          placeholder="Presale %"
                          min="0"
                          max="100"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Wallet Management */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-medium text-white">Additional Wallets</h4>
                      <InfoTooltip content="Configure wallet allocations and vesting schedules for team, marketing, etc." />
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-7 text-xs"
                      onClick={() => {
                        const wallets = form.getValues('wallets') || [];
                        form.setValue('wallets', [...wallets, {
                          name: `Wallet ${wallets.length + 1}`,
                          address: '',
                          percentage: 0,
                          vestingEnabled: false,
                          vestingDuration: 365,
                          cliffDuration: 90,
                          vestingStartTime: Math.floor(Date.now() / 1000) + (24 * 3600)
                        }]);
                      }}
                    >
                      Add Wallet
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {form.watch('wallets')?.map((_, index) => (
                      <div key={index} className="p-3 bg-gray-800 rounded-lg space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <Input
                              {...form.register(`wallets.${index}.name`)}
                              placeholder="Wallet Name"
                              className={walletInputClasses}
                            />
                          </div>
                          <div className="w-24">
                            <Input
                              {...form.register(`wallets.${index}.percentage`)}
                              type="number"
                              placeholder="%"
                              className={walletInputClasses}
                              min="0"
                              max="100"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="checkbox"
                                {...form.register(`wallets.${index}.vestingEnabled`)}
                                className={checkboxClasses}
                              />
                              <span className="text-xs text-gray-400">Vest</span>
                              <InfoTooltip content={tooltips.distribution.vesting.enabled} className="ml-1" />
                            </label>
                            <Button
                              type="button"
                              variant="destructive"
                              className="h-7 w-7 p-0"
                              onClick={() => {
                                const wallets = form.getValues('wallets');
                                form.setValue('wallets', wallets.filter((_, i) => i !== index));
                              }}
                            >
                              ×
                            </Button>
                          </div>
                        </div>

                        <Input
                          {...form.register(`wallets.${index}.address`)}
                          placeholder="Wallet Address"
                          className={walletInputClasses}
                        />

                        {form.watch(`wallets.${index}.vestingEnabled`) && (
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <Label className="text-xs text-gray-400">Vesting Duration (days)</Label>
                                <InfoTooltip content={tooltips.distribution.vesting.duration} />
                              </div>
                              <Input
                                {...form.register(`wallets.${index}.vestingDuration`)}
                                type="number"
                                placeholder="365"
                                className={walletInputClasses}
                                min="1"
                              />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <Label className="text-xs text-gray-400">Cliff Duration (days)</Label>
                                <InfoTooltip content={tooltips.distribution.vesting.cliff} />
                              </div>
                              <Input
                                {...form.register(`wallets.${index}.cliffDuration`)}
                                type="number"
                                placeholder="90"
                                className={walletInputClasses}
                                min="0"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
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
      <div className="grid gap-6">
        <TokenPreview
          name={form.watch('name')}
          symbol={form.watch('symbol')}
          initialSupply={form.watch('initialSupply')}
          maxSupply={form.watch('maxSupply')}
        />
        
        {activeTab === 'distribution' && (
          <TokenDistributionPreview
            presaleEnabled={form.watch('presaleEnabled')}
            presalePercentage={Number(form.watch('presalePercentage')) || 0}
            liquidityPercentage={Number(form.watch('liquidityPercentage')) || 0}
            wallets={form.watch('wallets') || []}
          />
        )}
      </div>
    </div>
  );
} 