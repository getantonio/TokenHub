import { useState } from 'react';
import { BrowserProvider, Contract, parseUnits } from 'ethers';
import { useNetwork } from '@contexts/NetworkContext';
import { useToast } from '@/components/ui/toast/use-toast';
import TokenPreview from '@components/features/token/TokenPreview';
import { InfoIcon } from '@components/ui/InfoIcon';
import { Spinner } from '@components/ui/Spinner';
import TokenFactory_v2 from '@contracts/abi/TokenFactory_v2.json';
import { FACTORY_ADDRESSES } from '@config/contracts';

interface TokenFormV3Props {
  isConnected: boolean;
  onSuccess?: (address: string) => void;
}

interface FormData {
  name: string;
  symbol: string;
  initialSupply: string;
  maxSupply: string;
  pricePerToken: string;
  minContribution: string;
  maxContribution: string;
  presaleCap: string;
  startTime: string;
  endTime: string;
  presalePercent: string;
  liquidityPercent: string;
  liquidityLockPeriod: string;
  enableBlacklist: boolean;
  enableTimeLock: boolean;
  customOwner: string;
  vestingSchedules: {
    walletName: string;
    amount: string;
    period: string;
    beneficiary: string;
  }[];
}

const getDefaultTimes = () => {
  const now = new Date();
  const startTime = new Date(now.getTime() + 3600000); // 1 hour from now
  const endTime = new Date(now.getTime() + 86400000); // 24 hours from now
  return {
    startTime: startTime.toISOString().slice(0, 16),
    endTime: endTime.toISOString().slice(0, 16)
  };
};

// Define vesting presets with mandatory presale and liquidity allocations
const VESTING_PRESETS = {
  standard: [
    // Mandatory allocations (handled by contract)
    // - Presale: 40%
    // - Liquidity: 30%
    // Remaining 30% distribution:
    { walletName: 'Team', amount: '15', period: '365', beneficiary: '' },
    { walletName: 'Marketing', amount: '10', period: '180', beneficiary: '' },
    { walletName: 'Development', amount: '5', period: '365', beneficiary: '' }
  ],
  fair_launch: [
    // Mandatory allocations (handled by contract)
    // - Presale: 50%
    // - Liquidity: 30%
    // Remaining 20% distribution:
    { walletName: 'Team', amount: '10', period: '365', beneficiary: '' },
    { walletName: 'Marketing', amount: '5', period: '180', beneficiary: '' },
    { walletName: 'Development', amount: '5', period: '365', beneficiary: '' }
  ],
  community: [
    // Mandatory allocations (handled by contract)
    // - Presale: 45%
    // - Liquidity: 35%
    // Remaining 20% distribution:
    { walletName: 'Team', amount: '5', period: '365', beneficiary: '' },
    { walletName: 'Community', amount: '10', period: '180', beneficiary: '' },
    { walletName: 'Development', amount: '5', period: '365', beneficiary: '' }
  ]
};

const defaultValues: FormData = {
  name: 'Test Token',
  symbol: 'TEST',
  initialSupply: '1000000',
  maxSupply: '2000000',
  pricePerToken: '0.001',
  minContribution: '0.1',
  maxContribution: '1',
  presaleCap: '10',
  ...getDefaultTimes(),
  presalePercent: '40',
  liquidityPercent: '30',
  liquidityLockPeriod: '180',
  enableBlacklist: false,
  enableTimeLock: false,
  customOwner: '',
  vestingSchedules: []
};

export default function TokenForm_V3({ isConnected, onSuccess }: TokenFormV3Props) {
  const { chainId } = useNetwork();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>(defaultValues);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected) {
      setError("Please connect your wallet first");
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      if (!window.ethereum) {
        throw new Error("Please install MetaMask");
      }

      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const signerAddress = await signer.getAddress();

      // Get factory address for the current network
      const factoryAddress = FACTORY_ADDRESSES.v2[chainId || 0];
      if (!factoryAddress) {
        throw new Error('Factory contract not deployed on this network');
      }

      // Create contract instance
      const factory = new Contract(factoryAddress, TokenFactory_v2.abi, signer);

      // Convert form values to contract parameters
      const initialSupplyWei = parseUnits(formData.initialSupply, 18);
      const maxSupplyWei = parseUnits(formData.maxSupply, 18);
      const presaleRate = parseUnits(String(Math.floor(1 / Number(formData.pricePerToken))), 18);
      const minContributionWei = parseUnits(formData.minContribution, 18);
      const maxContributionWei = parseUnits(formData.maxContribution, 18);
      const presaleCapWei = parseUnits(formData.presaleCap, 18);
      const startTime = Math.floor(new Date(formData.startTime).getTime() / 1000);
      const endTime = Math.floor(new Date(formData.endTime).getTime() / 1000);

      // Prepare vesting schedules
      const vestingAmounts = formData.vestingSchedules.map(schedule => 
        parseUnits(String(Number(formData.initialSupply) * (Number(schedule.amount) / 100)), 18)
      );
      const vestingPeriods = formData.vestingSchedules.map(schedule => 
        Number(schedule.period) * 24 * 60 * 60 // Convert days to seconds
      );
      const beneficiaries = formData.vestingSchedules.map(schedule => 
        schedule.beneficiary || signerAddress
      );

      // Create token parameters
      const params = {
        name: formData.name,
        symbol: formData.symbol,
        initialSupply: initialSupplyWei,
        maxSupply: maxSupplyWei,
        owner: formData.customOwner || signerAddress,
        enableBlacklist: formData.enableBlacklist,
        enableTimeLock: formData.enableTimeLock,
        presaleRate,
        minContribution: minContributionWei,
        maxContribution: maxContributionWei,
        presaleCap: presaleCapWei,
        startTime,
        endTime,
        platformFeeRecipient: signerAddress, // This should be set to the actual platform fee recipient
        platformFeeTokens: parseUnits('1000', 18), // Example platform fee
        platformFeeVestingEnabled: true,
        platformFeeVestingDuration: 180 * 24 * 60 * 60, // 180 days in seconds
        platformFeeCliffDuration: 30 * 24 * 60 * 60, // 30 days in seconds
      };

      // Get deployment fee
      const deploymentFee = await factory.deploymentFee();

      // Create token with deployment fee
      const tx = await factory.createToken(params, {
        value: deploymentFee
      });

      toast({
        title: "Transaction Submitted",
        description: "Please wait for the transaction to be confirmed",
        variant: "default"
      });

      // Wait for transaction confirmation
      const receipt = await tx.wait();

      // Find TokenCreated event
      const event = receipt.logs.find(
        (log: any) => log.fragment?.name === 'TokenCreated'
      );

      if (event && event.args) {
        const tokenAddress = event.args[0];
        toast({
          title: "Success",
          description: "Token created successfully!",
          variant: "default"
        });
        
        // Call onSuccess callback with the new token address
        if (onSuccess) {
          onSuccess(tokenAddress);
        }
      }

    } catch (error) {
      console.error('Error creating token:', error);
      setError(error instanceof Error ? error.message : "Failed to create token");
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create token",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const applyVestingPreset = (presetName: keyof typeof VESTING_PRESETS) => {
    setFormData(prev => ({
      ...prev,
      vestingSchedules: VESTING_PRESETS[presetName]
    }));
  };

  // Calculate total allocation percentage
  const totalAllocation = formData.vestingSchedules.reduce((sum, schedule) => {
    return sum + Number(schedule.amount);
  }, 0);

  return (
    <div className="form-container form-compact">
      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="name" className="form-label">Token Name</label>
            <input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="My Token"
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="symbol" className="form-label">Token Symbol</label>
            <input
              id="symbol"
              name="symbol"
              value={formData.symbol}
              onChange={handleChange}
              placeholder="TKN"
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="initialSupply" className="form-label">Initial Supply</label>
            <input
              id="initialSupply"
              name="initialSupply"
              value={formData.initialSupply}
              onChange={handleChange}
              placeholder="1000000"
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="maxSupply" className="form-label">Max Supply</label>
            <input
              id="maxSupply"
              name="maxSupply"
              value={formData.maxSupply}
              onChange={handleChange}
              placeholder="2000000"
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="pricePerToken" className="form-label">
              Price per Token (ETH)
              <InfoIcon content="Initial price per token in ETH" />
            </label>
            <input
              id="pricePerToken"
              name="pricePerToken"
              value={formData.pricePerToken}
              onChange={handleChange}
              placeholder="0.001"
              className="form-input"
              required
            />
            <div className="mt-1 text-sm text-gray-400">
              Presale Rate: {formData.pricePerToken ? `${Math.round(1 / Number(formData.pricePerToken))} Tokens per ETH` : 'N/A'}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="minContribution" className="form-label">Min Contribution (ETH)</label>
            <input
              id="minContribution"
              name="minContribution"
              value={formData.minContribution}
              onChange={handleChange}
              placeholder="0.1"
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="maxContribution" className="form-label">Max Contribution (ETH)</label>
            <input
              id="maxContribution"
              name="maxContribution"
              value={formData.maxContribution}
              onChange={handleChange}
              placeholder="1"
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="presaleCap" className="form-label">Presale Cap (ETH)</label>
            <input
              id="presaleCap"
              name="presaleCap"
              value={formData.presaleCap}
              onChange={handleChange}
              placeholder="10"
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="startTime" className="form-label">Start Time</label>
            <input
              type="datetime-local"
              id="startTime"
              name="startTime"
              value={formData.startTime}
              onChange={handleChange}
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="endTime" className="form-label">End Time</label>
            <input
              type="datetime-local"
              id="endTime"
              name="endTime"
              value={formData.endTime}
              onChange={handleChange}
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="liquidityLockPeriod" className="form-label">
              Liquidity Lock Period (days)
              <InfoIcon content="Number of days the liquidity will be locked" />
            </label>
            <input
              id="liquidityLockPeriod"
              name="liquidityLockPeriod"
              value={formData.liquidityLockPeriod}
              onChange={handleChange}
              placeholder="180"
              className="form-input"
              required
            />
          </div>
        </div>

        <div className="form-section">
          <h3 className="text-lg font-medium text-white mb-4">Token Features</h3>
          <div className="form-grid">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="enableBlacklist"
                name="enableBlacklist"
                checked={formData.enableBlacklist}
                onChange={handleChange}
                className="form-checkbox"
              />
              <label htmlFor="enableBlacklist" className="form-label">Enable Blacklist</label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="enableTimeLock"
                name="enableTimeLock"
                checked={formData.enableTimeLock}
                onChange={handleChange}
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
              <label htmlFor="presalePercent" className="form-label">
                Presale Allocation (%)
                <InfoIcon content="Percentage of tokens allocated for presale" />
              </label>
              <input
                id="presalePercent"
                name="presalePercent"
                value={formData.presalePercent}
                onChange={handleChange}
                placeholder="40"
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="liquidityPercent" className="form-label">
                Liquidity Allocation (%)
                <InfoIcon content="Percentage of tokens allocated for liquidity" />
              </label>
              <input
                id="liquidityPercent"
                name="liquidityPercent"
                value={formData.liquidityPercent}
                onChange={handleChange}
                placeholder="30"
                className="form-input"
                required
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => applyVestingPreset('standard')}
                className="form-button-secondary"
              >
                Standard (30% Distribution)
              </button>
              <button
                type="button"
                onClick={() => applyVestingPreset('fair_launch')}
                className="form-button-secondary"
              >
                Fair Launch (20% Distribution)
              </button>
              <button
                type="button"
                onClick={() => applyVestingPreset('community')}
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
                {formData.vestingSchedules.map((schedule, index) => (
                  <div key={index} className="grid grid-cols-[2fr,1fr,1fr,2fr,auto] gap-4 items-center">
                    <input
                      value={schedule.walletName}
                      onChange={(e) => {
                        const newSchedules = [...formData.vestingSchedules];
                        newSchedules[index].walletName = e.target.value;
                        setFormData(prev => ({ ...prev, vestingSchedules: newSchedules }));
                      }}
                      placeholder="Wallet Name"
                      className="form-input"
                    />
                    <input
                      value={schedule.amount}
                      onChange={(e) => {
                        const newSchedules = [...formData.vestingSchedules];
                        newSchedules[index].amount = e.target.value;
                        setFormData(prev => ({ ...prev, vestingSchedules: newSchedules }));
                      }}
                      placeholder="%"
                      className="form-input"
                    />
                    <input
                      value={schedule.period}
                      onChange={(e) => {
                        const newSchedules = [...formData.vestingSchedules];
                        newSchedules[index].period = e.target.value;
                        setFormData(prev => ({ ...prev, vestingSchedules: newSchedules }));
                      }}
                      placeholder="Days"
                      className="form-input"
                    />
                    <input
                      value={schedule.beneficiary}
                      onChange={(e) => {
                        const newSchedules = [...formData.vestingSchedules];
                        newSchedules[index].beneficiary = e.target.value;
                        setFormData(prev => ({ ...prev, vestingSchedules: newSchedules }));
                      }}
                      placeholder="0x..."
                      className="form-input"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newSchedules = formData.vestingSchedules.filter((_, i) => i !== index);
                        setFormData(prev => ({ ...prev, vestingSchedules: newSchedules }));
                      }}
                      className="form-button-danger px-2 py-1"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  setFormData(prev => ({
                    ...prev,
                    vestingSchedules: [
                      ...prev.vestingSchedules,
                      { walletName: '', amount: '', period: '', beneficiary: '' }
                    ]
                  }));
                }}
                className="form-button-secondary w-full mt-4"
              >
                Add Vesting Schedule
              </button>
            </div>

            {totalAllocation + Number(formData.presalePercent) + Number(formData.liquidityPercent) > 100 && (
              <div className="form-error">
                <p className="text-red-500">
                  Total allocation exceeds 100%. Please adjust the distribution percentages.
                </p>
              </div>
            )}
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
          <button
            type="submit"
            disabled={!isConnected || loading || totalAllocation + Number(formData.presalePercent) + Number(formData.liquidityPercent) > 100}
            className="form-button-primary"
          >
            {loading ? (
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

      <div className="mt-8">
        <TokenPreview
          name={formData.name}
          symbol={formData.symbol}
          initialSupply={formData.initialSupply}
          maxSupply={formData.maxSupply}
          distributionSegments={[
            { name: 'Presale', amount: Number(formData.presalePercent), percentage: Number(formData.presalePercent), color: '#0088FE' },
            { name: 'Liquidity', amount: Number(formData.liquidityPercent), percentage: Number(formData.liquidityPercent), color: '#00C49F' },
            ...formData.vestingSchedules.map((schedule, index) => ({
              name: schedule.walletName,
              amount: Number(schedule.amount),
              percentage: Number(schedule.amount),
              color: COLORS[index + 2] || '#FF8042'
            }))
          ]}
          totalAllocation={Number(formData.presalePercent) + Number(formData.liquidityPercent) + formData.vestingSchedules.reduce((sum, schedule) => sum + Number(schedule.amount), 0)}
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