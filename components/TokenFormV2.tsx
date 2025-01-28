import { useState } from 'react';
import { BrowserProvider, Contract, parseUnits, Log } from 'ethers';
import { useNetwork } from '../contexts/NetworkContext';
import TokenFactory_v2 from '../contracts/abi/TokenFactory_v2.json';
import { getContractAddress } from '../config/networks';
import { getExplorerUrl } from '../config/networks';
import { LogDescription } from 'ethers';

interface TokenFormV2Props {
  isConnected: boolean;
}

interface ToastMessage {
  type: 'success' | 'error';
  message: string;
  link?: string;
}

export function TokenFormV2({ isConnected }: TokenFormV2Props) {
  const { chainId } = useNetwork();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const defaultValues = {
    name: 'Test Token',
    symbol: 'TEST',
    decimals: '18',
    initialSupply: '1000000',
    price: '0.001',
    softCap: '100',
    hardCap: '1000',
    minContribution: '0.1',
    maxContribution: '10',
    presaleRate: '1000',
    startTime: new Date(Date.now() + 3600000).toISOString().slice(0, 16),
    endTime: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
    whitelistEnabled: false
  };

  const [formData, setFormData] = useState(defaultValues);

  const showToast = (type: 'success' | 'error', message: string, link?: string) => {
    setToast({ type, message, link });
    if (type === 'error') {
      setTimeout(() => setToast(null), 10000);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected || !chainId) return;

    setLoading(true);
    setToast(null);

    try {
      if (!window.ethereum) {
        throw new Error("Please install MetaMask");
      }

      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();
      
      // Get factory address for V2
      const factoryAddress = getContractAddress(chainId, 'TokenFactory_v2');
      if (!factoryAddress) {
        throw new Error("V2 Factory not deployed on this network");
      }

      const factory = new Contract(factoryAddress, TokenFactory_v2.abi, signer);

      // Convert values to wei
      const initialSupplyWei = parseUnits(formData.initialSupply, formData.decimals);
      const softCapWei = parseUnits(formData.softCap, 18); // ETH values use 18 decimals
      const hardCapWei = parseUnits(formData.hardCap, 18);
      const minContributionWei = parseUnits(formData.minContribution, 18);
      const maxContributionWei = parseUnits(formData.maxContribution, 18);
      const presaleRate = parseUnits(formData.presaleRate, 0); // Rate is a whole number

      // Convert timestamps
      const startTime = Math.floor(new Date(formData.startTime).getTime() / 1000);
      const endTime = Math.floor(new Date(formData.endTime).getTime() / 1000);

      // Create token with presale
      const tx = await factory.deployToken(
        formData.name,
        formData.symbol,
        Number(formData.decimals),
        initialSupplyWei,
        softCapWei,
        hardCapWei,
        minContributionWei,
        maxContributionWei,
        startTime,
        endTime,
        presaleRate,
        formData.whitelistEnabled
      );

      showToast('success', 'Transaction submitted. Waiting for confirmation...');
      console.log('Transaction submitted:', tx.hash);
      
      const receipt = await tx.wait();
      
      // Get token address from event
      const event = receipt.logs
        .map((log: Log) => {
          try {
            return factory.interface.parseLog(log as any);
          } catch (e) {
            return null;
          }
        })
        .find((event: LogDescription | null) => event?.name === "TokenDeployed");

      if (!event) {
        throw new Error("Could not find token address in transaction logs");
      }

      const tokenAddress = event.args.tokenAddress || event.args.token;
      const explorerUrl = getExplorerUrl(chainId, tokenAddress, 'token');

      showToast(
        'success',
        'Token created successfully!',
        explorerUrl
      );

      // Reset form
      setFormData(defaultValues);

    } catch (error: any) {
      console.error('Error creating token:', error);
      showToast('error', error.message || 'Failed to create token');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container">
      <form onSubmit={handleSubmit} className="space-y-2">
        {/* Token Information */}
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-text-primary mb-0">Token Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div className="form-group">
              <label className="form-label">Token Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="form-input"
                placeholder="My Token"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Token Symbol</label>
              <input
                type="text"
                name="symbol"
                value={formData.symbol}
                onChange={handleChange}
                className="form-input"
                placeholder="TKN"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Decimals</label>
              <input
                type="number"
                name="decimals"
                value={formData.decimals}
                onChange={handleChange}
                className="form-input"
                min="0"
                max="18"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Initial Supply</label>
              <input
                type="number"
                name="initialSupply"
                value={formData.initialSupply}
                onChange={handleChange}
                className="form-input"
                min="1"
                required
              />
            </div>
          </div>
        </div>

        {/* Presale Settings */}
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-text-primary mb-1">Presale Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div className="form-group">
              <label className="form-label">Token Price (ETH/MATIC)</label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                className="form-input"
                min="0.000001"
                step="0.000001"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Presale Rate</label>
              <input
                type="number"
                name="presaleRate"
                value={formData.presaleRate}
                onChange={handleChange}
                className="form-input"
                min="1"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Soft Cap</label>
              <input
                type="number"
                name="softCap"
                value={formData.softCap}
                onChange={handleChange}
                className="form-input"
                min="0.1"
                step="0.1"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Hard Cap</label>
              <input
                type="number"
                name="hardCap"
                value={formData.hardCap}
                onChange={handleChange}
                className="form-input"
                min="0.1"
                step="0.1"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Min Contribution</label>
              <input
                type="number"
                name="minContribution"
                value={formData.minContribution}
                onChange={handleChange}
                className="form-input"
                min="0.1"
                step="0.1"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Max Contribution</label>
              <input
                type="number"
                name="maxContribution"
                value={formData.maxContribution}
                onChange={handleChange}
                className="form-input"
                min="0.1"
                step="0.1"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Start Time</label>
              <input
                type="datetime-local"
                name="startTime"
                value={formData.startTime}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">End Time</label>
              <input
                type="datetime-local"
                name="endTime"
                value={formData.endTime}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>
          </div>
          <div className="form-group flex items-center mt-2">
            <input
              type="checkbox"
              name="whitelistEnabled"
              checked={formData.whitelistEnabled}
              onChange={handleChange}
              className="form-checkbox"
            />
            <label className="form-label mb-0 ml-2">Enable Whitelist</label>
          </div>
        </div>

        <div className="flex justify-end mt-2">
          <button
            type="submit"
            className={`btn btn-primary ${(!isConnected || loading) ? 'btn-disabled' : ''}`}
            disabled={!isConnected || loading}
          >
            {loading ? 'Deploying...' : (isConnected ? 'Deploy Token' : 'Connect Wallet to Deploy')}
          </button>
        </div>
      </form>
      {toast && (
        <div className={`fixed bottom-4 right-4 ${
          toast.type === 'success' ? 'bg-[#2FFA3A]' : 'bg-red-500'
        } text-white px-4 py-2 rounded shadow-lg`}>
          <p>{toast.message}</p>
          {toast.link && (
            <a 
              href={toast.link} 
              target="_blank" 
              rel="noopener noreferrer"
              className="underline"
            >
              View on Explorer
            </a>
          )}
        </div>
      )}
    </div>
  );
} 