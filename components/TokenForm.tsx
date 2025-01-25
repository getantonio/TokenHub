import { useState, FormEvent, ChangeEvent } from 'react';

interface TokenFormProps {
  isConnected: boolean;
}

interface WalletDistribution {
  address: string;
  percentage: string;
  lockDuration: string;  // in days
}

interface FormData {
  name: string;
  symbol: string;
  initialSupply: string;
  decimals: string;
  ownerAddress: string;
  initialPriceETH: string;
  showAdvanced: boolean;
  maxSupply: string;
  mintable: boolean;
  burnable: boolean;
  pausable: boolean;
  transferTax: string;
  transferTaxReceiver: string;
  distributions: WalletDistribution[];
}

type TabType = 'basic' | 'wallets' | 'advanced';

export default function TokenForm({ isConnected }: TokenFormProps) {
  const [activeTab, setActiveTab] = useState<TabType>('basic');
  const [formData, setFormData] = useState<FormData>({
    name: 'My Token',
    symbol: 'MTK',
    initialSupply: '1000000',
    decimals: '18',
    ownerAddress: '',
    initialPriceETH: '0.0001',
    showAdvanced: false,
    maxSupply: '',
    mintable: false,
    burnable: false,
    pausable: false,
    transferTax: '0',
    transferTaxReceiver: '',
    distributions: [
      { address: '', percentage: '100', lockDuration: '0' }
    ]
  });

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log('Deploying token with:', formData);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleDistributionChange = (index: number, field: keyof WalletDistribution, value: string) => {
    setFormData(prev => {
      const newDistributions = [...prev.distributions];
      newDistributions[index] = { ...newDistributions[index], [field]: value };
      return { ...prev, distributions: newDistributions };
    });
  };

  const addDistribution = () => {
    setFormData(prev => ({
      ...prev,
      distributions: [...prev.distributions, { address: '', percentage: '0', lockDuration: '0' }]
    }));
  };

  const removeDistribution = (index: number) => {
    if (formData.distributions.length > 1) {
      setFormData(prev => ({
        ...prev,
        distributions: prev.distributions.filter((_, i) => i !== index)
      }));
    }
  };

  const TabButton = ({ tab, label }: { tab: TabType; label: string }) => (
    <button
      type="button"
      onClick={() => setActiveTab(tab)}
      className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
        activeTab === tab
          ? 'bg-background-secondary text-text-primary border-b-2 border-text-accent'
          : 'text-text-secondary hover:text-text-primary'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3 text-text-primary">Create New Token</h2>
      <div className="border-b border-border mb-4">
        <div className="flex space-x-4">
          <TabButton tab="basic" label="Basic Info" />
          <TabButton tab="wallets" label="Distribution" />
          <TabButton tab="advanced" label="Advanced" />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {activeTab === 'basic' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Token Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={handleInputChange}
                  name="name"
                  className="input w-full py-1.5 text-sm"
                  placeholder="My Token"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Token Symbol</label>
                <input
                  type="text"
                  value={formData.symbol}
                  onChange={handleInputChange}
                  name="symbol"
                  className="input w-full py-1.5 text-sm"
                  placeholder="MTK"
                  maxLength={5}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Initial Supply</label>
                <input
                  type="number"
                  value={formData.initialSupply}
                  onChange={handleInputChange}
                  name="initialSupply"
                  className="input w-full py-1.5 text-sm"
                  placeholder="1000000"
                  min="0"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Decimals</label>
                <input
                  type="number"
                  value={formData.decimals}
                  onChange={handleInputChange}
                  name="decimals"
                  className="input w-full py-1.5 text-sm"
                  placeholder="18"
                  min="0"
                  max="18"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Owner Address</label>
                <input
                  type="text"
                  value={formData.ownerAddress}
                  onChange={handleInputChange}
                  name="ownerAddress"
                  className="input w-full py-1.5 text-sm"
                  placeholder="0x..."
                  pattern="^0x[a-fA-F0-9]{40}$"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Initial Price (ETH)</label>
                <input
                  type="number"
                  value={formData.initialPriceETH}
                  onChange={handleInputChange}
                  name="initialPriceETH"
                  className="input w-full py-1.5 text-sm"
                  placeholder="0.0001"
                  min="0"
                  step="0.0001"
                  required
                />
              </div>
            </div>
          </>
        )}

        {activeTab === 'wallets' && (
          <div className="space-y-3">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium text-text-primary">Token Distribution</h3>
              <button
                type="button"
                onClick={addDistribution}
                className="button-secondary py-1 px-2 text-xs"
              >
                Add Wallet
              </button>
            </div>
            {formData.distributions.map((dist, index) => (
              <div key={index} className="flex items-center gap-3 py-2 px-3 bg-background-accent rounded-lg">
                <div className="w-8 text-xs font-medium text-text-secondary">{index + 1}.</div>
                <div className="flex-1">
                  <input
                    type="text"
                    value={dist.address}
                    onChange={(e) => handleDistributionChange(index, 'address', e.target.value)}
                    className="input w-full py-1 text-sm"
                    placeholder="Wallet Address (0x...)"
                    pattern="^0x[a-fA-F0-9]{40}$"
                    required
                  />
                </div>
                <div className="w-24">
                  <input
                    type="number"
                    value={dist.percentage}
                    onChange={(e) => handleDistributionChange(index, 'percentage', e.target.value)}
                    className="input w-full py-1 text-sm"
                    placeholder="%"
                    min="0"
                    max="100"
                    step="0.01"
                    required
                  />
                </div>
                <div className="w-24">
                  <input
                    type="number"
                    value={dist.lockDuration}
                    onChange={(e) => handleDistributionChange(index, 'lockDuration', e.target.value)}
                    className="input w-full py-1 text-sm"
                    placeholder="Days"
                    min="0"
                    required
                  />
                </div>
                {index > 0 && (
                  <button
                    type="button"
                    onClick={() => removeDistribution(index)}
                    className="text-xs text-red-400 hover:text-red-300 px-2"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <div className="flex justify-between text-xs text-text-secondary mt-1 px-1">
              <span>Total: {formData.distributions.reduce((sum, dist) => sum + Number(dist.percentage), 0)}%</span>
              <div className="space-x-8 mr-2">
                <span>Percentage</span>
                <span>Lock Days</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'advanced' && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <label className="flex items-center space-x-2 text-text-secondary">
                <input
                  type="checkbox"
                  checked={formData.mintable}
                  onChange={handleInputChange}
                  name="mintable"
                  className="rounded border-border bg-background-accent text-text-accent focus:ring-text-accent"
                />
                <span className="text-xs">Mintable</span>
              </label>
              <label className="flex items-center space-x-2 text-text-secondary">
                <input
                  type="checkbox"
                  checked={formData.burnable}
                  onChange={handleInputChange}
                  name="burnable"
                  className="rounded border-border bg-background-accent text-text-accent focus:ring-text-accent"
                />
                <span className="text-xs">Burnable</span>
              </label>
              <label className="flex items-center space-x-2 text-text-secondary">
                <input
                  type="checkbox"
                  checked={formData.pausable}
                  onChange={handleInputChange}
                  name="pausable"
                  className="rounded border-border bg-background-accent text-text-accent focus:ring-text-accent"
                />
                <span className="text-xs">Pausable</span>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Max Supply</label>
                <input
                  type="number"
                  value={formData.maxSupply}
                  onChange={handleInputChange}
                  name="maxSupply"
                  className="input w-full py-1.5 text-sm"
                  placeholder="10000000"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Transfer Tax (%)</label>
                <input
                  type="number"
                  value={formData.transferTax}
                  onChange={handleInputChange}
                  name="transferTax"
                  className="input w-full py-1.5 text-sm"
                  placeholder="0"
                  min="0"
                  max="25"
                  step="0.1"
                />
              </div>
            </div>
            {formData.transferTax !== '0' && (
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Tax Receiver Address</label>
                <input
                  type="text"
                  value={formData.transferTaxReceiver}
                  onChange={handleInputChange}
                  name="transferTaxReceiver"
                  className="input w-full py-1.5 text-sm"
                  placeholder="0x..."
                  pattern="^0x[a-fA-F0-9]{40}$"
                  required={formData.transferTax !== '0'}
                />
              </div>
            )}
          </div>
        )}

        <button
          type="submit"
          className="button-primary w-full py-1.5 text-sm mt-6"
        >
          Deploy Token
        </button>
      </form>
    </div>
  );
} 