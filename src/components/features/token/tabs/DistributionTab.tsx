import { useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect } from "react";

interface VestingPreset {
  presalePercentage: string;
  liquidityPercentage: string;
  wallets: {
    name: string;
    percentage: string;
    address?: string;
    vestingEnabled: boolean;
    vestingDuration: string;
    cliffDuration: string;
    vestingStartTime: number;
  }[];
}

interface DistributionTabProps {
  chainId: number;
  account: string | undefined;
}

const VESTING_PRESETS: Record<string, VestingPreset> = {
  bootstrap: {
    presalePercentage: "20",
    liquidityPercentage: "65",
    wallets: [
      { 
        name: 'Development', 
        percentage: "5",
        address: '0xb6083258E7E7B04Bdc72640E1a75E1F40541e83F',
        vestingEnabled: true,
        vestingDuration: "365",
        cliffDuration: "90",
        vestingStartTime: Number(Math.floor(Date.now() / 1000) + (24 * 3600))
      },
      { 
        name: 'Marketing', 
        percentage: "5",
        address: '0x10C8c279c6b381156733ec160A89Abb260bfcf0C',
        vestingEnabled: true,
        vestingDuration: "180",
        cliffDuration: "30",
        vestingStartTime: Number(Math.floor(Date.now() / 1000) + (24 * 3600))
      },
      { 
        name: 'Treasury', 
        percentage: "5",
        address: '0x991Ed392F033B2228DC55A1dE2b706ef8D9d9DcD',
        vestingEnabled: true,
        vestingDuration: "730",
        cliffDuration: "180",
        vestingStartTime: Number(Math.floor(Date.now() / 1000) + (24 * 3600))
      }
    ],
  },
  standard: {
    presalePercentage: "5",
    liquidityPercentage: "70",
    wallets: [
      { 
        name: 'Team', 
        percentage: "15",
        vestingEnabled: true,
        vestingDuration: "365",
        cliffDuration: "90",
        vestingStartTime: Number(Math.floor(Date.now() / 1000) + (24 * 3600))
      },
      { 
        name: 'Marketing', 
        percentage: "10",
        vestingEnabled: true,
        vestingDuration: "180",
        cliffDuration: "30",
        vestingStartTime: Number(Math.floor(Date.now() / 1000) + (24 * 3600))
      }
    ],
  },
  fair_launch: {
    presalePercentage: "5",
    liquidityPercentage: "85",
    wallets: [
      {
        name: 'Team',
        percentage: "10",
        vestingEnabled: true,
        vestingDuration: "365",
        cliffDuration: "180",
        vestingStartTime: Number(Math.floor(Date.now() / 1000) + (24 * 3600))
      }
    ]
  },
  community: {
    presalePercentage: "5",
    liquidityPercentage: "75",
    wallets: [
      {
        name: 'Community Rewards',
        percentage: "10",
        vestingEnabled: true,
        vestingDuration: "180",
        cliffDuration: "30",
        vestingStartTime: Number(Math.floor(Date.now() / 1000) + (24 * 3600))
      },
      {
        name: 'Team',
        percentage: "10",
        vestingEnabled: true,
        vestingDuration: "365",
        cliffDuration: "90",
        vestingStartTime: Number(Math.floor(Date.now() / 1000) + (24 * 3600))
      }
    ]
  },
  defi: {
    presalePercentage: "5",
    liquidityPercentage: "80",
    wallets: [
      {
        name: 'Development',
        percentage: "10",
        vestingEnabled: true,
        vestingDuration: "365",
        cliffDuration: "90",
        vestingStartTime: Number(Math.floor(Date.now() / 1000) + (24 * 3600))
      },
      {
        name: 'Treasury',
        percentage: "5",
        vestingEnabled: true,
        vestingDuration: "730",
        cliffDuration: "365",
        vestingStartTime: Number(Math.floor(Date.now() / 1000) + (24 * 3600))
      }
    ]
  },
  gaming: {
    presalePercentage: "5",
    liquidityPercentage: "70",
    wallets: [
      {
        name: 'Game Development',
        percentage: "15",
        vestingEnabled: true,
        vestingDuration: "365",
        cliffDuration: "90",
        vestingStartTime: Number(Math.floor(Date.now() / 1000) + (24 * 3600))
      },
      {
        name: 'Marketing',
        percentage: "10",
        vestingEnabled: true,
        vestingDuration: "180",
        cliffDuration: "30",
        vestingStartTime: Number(Math.floor(Date.now() / 1000) + (24 * 3600))
      }
    ]
  },
  nft: {
    presalePercentage: "5",
    liquidityPercentage: "75",
    wallets: [
      {
        name: 'Art Development',
        percentage: "10",
        vestingEnabled: true,
        vestingDuration: "365",
        cliffDuration: "90",
        vestingStartTime: Number(Math.floor(Date.now() / 1000) + (24 * 3600))
      },
      {
        name: 'Community Treasury',
        percentage: "10",
        vestingEnabled: true,
        vestingDuration: "365",
        cliffDuration: "180",
        vestingStartTime: Number(Math.floor(Date.now() / 1000) + (24 * 3600))
      }
    ]
  }
};

const DistributionTab = ({ chainId, account }: DistributionTabProps) => {
  const form = useFormContext();
  const [showTokenomicsInfo, setShowTokenomicsInfo] = useState(false);
  const [totalPercentage, setTotalPercentage] = useState(0);
  const [validationError, setValidationError] = useState("");
  
  const presaleEnabled = form.watch("presaleEnabled");

  // Watch for changes in percentage values
  useEffect(() => {
    const presalePercentage = presaleEnabled ? Number(form.watch("presalePercentage") || 0) : 0;
    const liquidityPercentage = Number(form.watch("liquidityPercentage") || 0);
    const wallets = form.watch("wallets") || [];
    
    let walletTotal = 0;
    if (wallets.length > 0) {
      walletTotal = wallets.reduce((sum: number, wallet: any) => sum + Number(wallet.percentage || 0), 0);
    }
    
    const total = liquidityPercentage + presalePercentage + walletTotal;
    
    setTotalPercentage(Math.round(total * 100) / 100); // Round to 2 decimal places
    
    // If total is not 100%, show error
    if (Math.abs(total - 100) > 0.01) {
      setValidationError(`Total: ${total}% (must be 100%)`);
    } else {
      setValidationError("");
    }
  }, [form.watch("liquidityPercentage"), form.watch("presalePercentage"), form.watch("wallets"), presaleEnabled]);
  
  const wallets = form.watch("wallets") || [];
  
  const addWallet = () => {
    if (!account) return;
    
    const now = Math.floor(Date.now() / 1000);
    const newWallet = {
      name: '',
      address: account,
      percentage: "0",
      vestingEnabled: false,
      vestingDuration: "365",
      cliffDuration: "90",
      vestingStartTime: Number(now + (24 * 3600))
    };
    
    form.setValue('wallets', [...form.getValues('wallets'), newWallet]);
  };
  
  const removeWallet = (index: number) => {
    const wallets = form.getValues('wallets');
    form.setValue('wallets', wallets.filter((_: any, i: number) => i !== index));
  };
  
  const applyPreset = (preset: keyof typeof VESTING_PRESETS) => {
    const presetConfig = VESTING_PRESETS[preset];
    const presaleEnabled = form.getValues("presaleEnabled");
    const now = Math.floor(Date.now() / 1000);
    
    // Set presale percentage if presale is enabled
    if (presaleEnabled) {
      form.setValue('presalePercentage', presetConfig.presalePercentage.toString());
    }
    
    // Set liquidity percentage based on presale state
    const liquidityPercentage = presaleEnabled ? 
      presetConfig.liquidityPercentage : // Use preset liquidity if presale enabled
      presetConfig.liquidityPercentage + presetConfig.presalePercentage; // Add presale's percentage to liquidity if disabled
    
    form.setValue('liquidityPercentage', liquidityPercentage.toString());
    
    // Set wallets with correct percentages and vesting schedules
    form.setValue('wallets', presetConfig.wallets.map(wallet => ({
      name: wallet.name,
      address: wallet.address || account || '',
      percentage: wallet.percentage.toString(),
      vestingEnabled: wallet.vestingEnabled,
      vestingDuration: wallet.vestingDuration.toString(),
      cliffDuration: wallet.cliffDuration.toString(),
      vestingStartTime: Number(now + (24 * 3600)) // Start 24 hours from now, ensure it's a number
    })));
  };

  return (
    <div className="space-y-2 text-white">
      <div className="flex items-center justify-between mb-1">
        <div>
          <h3 className="text-lg font-medium">Distribution & Vesting</h3>
          <p className="text-sm text-gray-400">Configure token allocations and vesting schedules</p>
        </div>
        
        <select
          onChange={(e) => applyPreset(e.target.value as keyof typeof VESTING_PRESETS)}
          className="px-2 py-1 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
          defaultValue=""
        >
          <option value="" disabled>Select Preset</option>
          <option value="bootstrap">Bootstrap</option>
          <option value="standard">Standard</option>
          <option value="fair_launch">Fair Launch</option>
          <option value="community">Community</option>
          <option value="defi">DeFi</option>
          <option value="gaming">Gaming</option>
          <option value="nft">NFT</option>
        </select>
      </div>
      
      <div className="p-2 bg-gray-800 rounded-lg">
        <div className="flex items-center justify-between mb-1.5">
          <h4 className="font-medium text-sm">Token Distribution</h4>
          <div>
            <span className={totalPercentage === 100 ? 'text-green-400' : 'text-red-400'}>
              {validationError}
            </span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
          {presaleEnabled && (
            <FormField
              control={form.control}
              name="presalePercentage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white text-sm">Presale Allocation (%)</FormLabel>
                  <FormControl>
                    <Input
                      className="h-8"
                      type="number"
                      min="1"
                      max="95"
                      placeholder="5"
                      {...field}
                      onChange={e => field.onChange(e.target.value)}
                    />
                  </FormControl>
                  <FormDescription className="text-gray-400 text-xs">
                    Percentage of tokens allocated for presale
                  </FormDescription>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
          )}
          
          <FormField
            control={form.control}
            name="liquidityPercentage"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white text-sm">Liquidity Allocation (%)</FormLabel>
                <FormControl>
                  <Input
                    className="h-8"
                    type="number"
                    min="0"
                    max="100"
                    placeholder="70"
                    {...field}
                    onChange={e => field.onChange(e.target.value)}
                  />
                </FormControl>
                <FormDescription className="text-gray-400 text-xs">
                  Percentage of tokens allocated for liquidity
                </FormDescription>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
        </div>
        
        <div className="mt-2">
          <div className="flex items-center justify-between mb-1.5">
            <h4 className="font-medium text-sm">Additional Wallets</h4>
            <Button
              type="button"
              variant="secondary"
              className="h-8"
              onClick={addWallet}
            >
              Add Wallet
            </Button>
          </div>
          
          <div className="space-y-1.5">
            {wallets.map((_: any, index: number) => (
              <div key={index} className="p-1.5 bg-gray-700 rounded-lg">
                <div className="flex flex-col md:flex-row md:items-center gap-1.5">
                  <div className="flex-1">
                    <FormField
                      control={form.control}
                      name={`wallets.${index}.name`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white text-sm">Wallet Name</FormLabel>
                          <FormControl>
                            <Input className="h-8" placeholder="Team, Marketing, etc." {...field} />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="w-full md:w-24">
                    <FormField
                      control={form.control}
                      name={`wallets.${index}.percentage`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white text-sm">Allocation %</FormLabel>
                          <FormControl>
                            <Input
                              className="h-8"
                              type="number"
                              min="1"
                              max="100"
                              placeholder="10"
                              {...field}
                              onChange={e => field.onChange(e.target.value)}
                            />
                          </FormControl>
                          <FormDescription className="text-gray-400 text-xs">
                            Percentage of total supply
                          </FormDescription>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="flex-1">
                    <FormField
                      control={form.control}
                      name={`wallets.${index}.address`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white text-sm">Wallet Address</FormLabel>
                          <FormControl>
                            <Input className="h-8" placeholder="0x..." {...field} />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div>
                    <Button
                      type="button"
                      variant="destructive"
                      className="h-8"
                      onClick={() => removeWallet(index)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
                
                <div className="mt-1.5 border-t border-gray-600 pt-1.5">
                  <FormField
                    control={form.control}
                    name={`wallets.${index}.vestingEnabled`}
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between bg-gray-700 rounded-lg p-1.5">
                        <FormLabel className="text-white text-sm">Enable Vesting</FormLabel>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  {form.watch(`wallets.${index}.vestingEnabled`) && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-1.5 mt-1.5">
                      <FormField
                        control={form.control}
                        name={`wallets.${index}.vestingDuration`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white text-sm">Vesting Duration (days)</FormLabel>
                            <FormControl>
                              <Input
                                className="h-8"
                                type="number"
                                min="1"
                                placeholder="365"
                                {...field}
                                value={field.value}
                                onChange={e => {
                                  // Convert the input to a number for validation but store as string
                                  const numValue = Number(e.target.value);
                                  if (!isNaN(numValue)) {
                                    field.onChange(e.target.value);
                                  }
                                }}
                              />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name={`wallets.${index}.cliffDuration`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white text-sm">Cliff Period (days)</FormLabel>
                            <FormControl>
                              <Input
                                className="h-8"
                                type="number"
                                min="0"
                                placeholder="90"
                                {...field}
                                value={field.value}
                                onChange={e => {
                                  // Convert the input to a number for validation but store as string
                                  const numValue = Number(e.target.value);
                                  if (!isNaN(numValue)) {
                                    field.onChange(e.target.value);
                                  }
                                }}
                              />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name={`wallets.${index}.vestingStartTime`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white text-sm">Start Time</FormLabel>
                            <FormControl>
                              <Input
                                className="h-8"
                                type="date"
                                value={new Date(Number(field.value) * 1000).toISOString().split('T')[0]}
                                onChange={(e) => {
                                  const date = new Date(e.target.value);
                                  field.onChange(Math.floor(date.getTime() / 1000));
                                }}
                              />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {wallets.length === 0 && (
              <div className="p-2 text-center bg-gray-700 rounded-lg">
                <p className="text-gray-400 text-sm">No wallet allocations added yet.</p>
                <Button
                  type="button"
                  variant="secondary"
                  className="mt-1.5 h-8"
                  onClick={addWallet}
                >
                  Add Wallet
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="p-2 bg-blue-900/20 border border-blue-800/30 rounded-lg">
        <h4 className="font-medium text-blue-300 text-sm mb-1">Distribution Guidelines</h4>
        <ul className="list-disc list-inside text-sm text-gray-300 space-y-0.5">
          <li>Total allocation must equal exactly 100%</li>
          <li>Recommended: At least 65% liquidity for better token stability</li>
          <li>Team tokens should be vested for 6+ months</li>
          <li>Consider adding a cliff period for team/founder allocations</li>
        </ul>
      </div>
    </div>
  );
};

export default DistributionTab; 