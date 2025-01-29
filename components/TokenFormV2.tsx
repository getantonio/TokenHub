import { useState, useEffect } from 'react';
import { BrowserProvider, Contract, parseUnits } from 'ethers';
import { useNetwork } from '../contexts/NetworkContext';
import TokenFactory_v2_1_0 from '../contracts/abi/TokenFactory_v2.1.0.json';
import { getExplorerUrl } from '../config/networks';
import { getNetworkContractAddress } from '../config/contracts';

interface TokenFormV2Props {
  isConnected: boolean;
}

interface ToastMessage {
  type: 'success' | 'error';
  message: string;
  link?: string;
}

interface FormData {
  name: string;
  symbol: string;
  initialSupply: string;
  maxSupply: string;
  presaleRate: string;
  minContribution: string;
  maxContribution: string;
  presaleCap: string;
  startTime: string;
  endTime: string;
  enableBlacklist: boolean;
  enableTimeLock: boolean;
  customOwner: string;
}

const getDefaultTimes = () => {
  const now = new Date();
  const startTime = new Date(now.getTime() + 3600000);
  const endTime = new Date(now.getTime() + 86400000);
  return {
    startTime: startTime.toISOString().slice(0, 16),
    endTime: endTime.toISOString().slice(0, 16)
  };
};

const defaultValues: FormData = {
  name: 'Test Token',
  symbol: 'TEST',
  initialSupply: '1000000',
  maxSupply: '2000000',
  presaleRate: '1000',
  minContribution: '0.1',
  maxContribution: '10',
  presaleCap: '100',
  ...getDefaultTimes(),
  enableBlacklist: false,
  enableTimeLock: false,
  customOwner: ''
};

const DEPLOYMENT_FEE = parseUnits('0.0001', 'ether');

export function TokenFormV2({ isConnected }: TokenFormV2Props) {
  const { chainId } = useNetwork();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [v2Available, setV2Available] = useState<boolean>(false);
  const [formData, setFormData] = useState<FormData>(defaultValues);
  const [successInfo, setSuccessInfo] = useState<{
    message: string;
    tokenAddress: string;
    explorerUrl: string;
    symbol: string;
    initialSupply: string;
    owner: string | null;
  } | null>(null);

  useEffect(() => {
    setFormData({
      ...defaultValues,
      ...getDefaultTimes()
    });
  }, []);

  useEffect(() => {
    const checkV2Availability = async () => {
      if (!chainId) {
        setV2Available(false);
        return;
      }

      try {
        const factoryAddress = getNetworkContractAddress(chainId, 'factoryAddressV2');
        if (!factoryAddress || factoryAddress === '') {
          setV2Available(false);
          return;
        }

        if (window.ethereum) {
          const provider = new BrowserProvider(window.ethereum);
          try {
            const code = await provider.getCode(factoryAddress);
            const hasCode = code !== '0x' && code !== '0x0';
            setV2Available(hasCode);
          } catch (error) {
            setV2Available(false);
          }
        }
      } catch (error) {
        setV2Available(false);
      }
    };

    checkV2Availability();
  }, [chainId]);

  if (!v2Available) {
    return (
      <div className="p-2 bg-background-secondary rounded-lg shadow-lg">
        <div className="rounded-md bg-yellow-900/20 p-2 border border-yellow-700">
          <h3 className="text-sm font-medium text-yellow-500">TokenFactory V2.1.0 is not yet deployed on this network.</h3>
          <p className="text-xs text-yellow-400">Note: V2.1.0 is currently only available on specific networks.</p>
        </div>
      </div>
    );
  }

  const showToast = (type: 'success' | 'error', message: string, link?: string) => {
    setToast({ type, message, link });
    setTimeout(() => setToast(null), 5000);
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
    setSuccessInfo(null);

    try {
      const now = Math.floor(Date.now() / 1000);
      const startTimeSeconds = Math.floor(new Date(formData.startTime).getTime() / 1000);
      const endTimeSeconds = Math.floor(new Date(formData.endTime).getTime() / 1000);
      
      if (startTimeSeconds <= now) throw new Error('Start time must be in the future');
      if (endTimeSeconds <= startTimeSeconds) throw new Error('End time must be after start time');
      if (!window.ethereum) throw new Error("Please install MetaMask");

      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const factoryAddress = getNetworkContractAddress(chainId, 'factoryAddressV2');
      if (!factoryAddress) throw new Error("TokenFactory V2.1.0 is not yet deployed on this network.");

      const factoryV2 = new Contract(factoryAddress, TokenFactory_v2_1_0.abi, signer);

      const initialSupplyAmount = parseUnits(formData.initialSupply || '0', 18);
      const maxSupplyAmount = parseUnits(formData.maxSupply || '0', 18);
      const minContributionAmount = parseUnits(formData.minContribution || '0', 18);
      const maxContributionAmount = parseUnits(formData.maxContribution || '0', 18);
      const presaleRateAmount = parseUnits(formData.presaleRate || '0', 18);
      const presaleCapAmount = parseUnits(formData.presaleCap || '0', 18);

      let ownerAddress = "0x0000000000000000000000000000000000000000";
      if (formData.customOwner) {
        if (!formData.customOwner.match(/^0x[0-9a-fA-F]{40}$/)) throw new Error('Invalid owner address format');
        ownerAddress = formData.customOwner;
      }

      const tx = await factoryV2.createToken(
        formData.name,
        formData.symbol,
        initialSupplyAmount,
        maxSupplyAmount,
        formData.enableBlacklist,
        formData.enableTimeLock,
        presaleRateAmount,
        minContributionAmount,
        maxContributionAmount,
        presaleCapAmount,
        BigInt(startTimeSeconds),
        BigInt(endTimeSeconds),
        ownerAddress,
        { value: DEPLOYMENT_FEE }
      );
      
      const receipt = await tx.wait();
      const tokenCreatedEvent = receipt.logs
        .map((log: any) => {
          try {
            return factoryV2.interface.parseLog({
              topics: log.topics,
              data: log.data
            });
          } catch (e) {
            return null;
          }
        })
        .find((event: any) => event?.name === 'TokenCreated');

      if (!tokenCreatedEvent) throw new Error('Token creation event not found in transaction logs');

      const tokenAddress = tokenCreatedEvent.args.token;
      const explorerUrl = getExplorerUrl(chainId, tokenAddress, 'token');
      const txExplorerUrl = getExplorerUrl(chainId, tx.hash, 'tx');

      setSuccessInfo({
        message: 'Token created successfully!',
        tokenAddress,
        explorerUrl,
        symbol: formData.symbol,
        initialSupply: formData.initialSupply,
        owner: tokenCreatedEvent.args.owner || await signer.getAddress()
      });

      showToast('success', 'Token created successfully!', txExplorerUrl);
      setFormData({ ...defaultValues, ...getDefaultTimes() });
    } catch (error: any) {
      console.error("Error creating token:", error);
      showToast('error', `Failed to create token: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      {successInfo && (
        <div className="rounded-md bg-green-900/20 p-2 border border-green-700">
          <h3 className="text-sm font-medium text-green-500">🎉 Token Created Successfully!</h3>
          <div className="space-y-1 text-xs text-green-400">
            <p>Token Symbol: {successInfo.symbol}</p>
            <p>Contract Address: <a href={successInfo.explorerUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-green-300">{successInfo.tokenAddress}</a></p>
            <p>Initial Supply: {Number(successInfo.initialSupply).toLocaleString()} {successInfo.symbol}</p>
            <p>Owner: {successInfo.owner?.slice(0, 6)}...{successInfo.owner?.slice(-4)}</p>
          </div>
          <div className="mt-2 flex gap-2">
            <a href={successInfo.explorerUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-2 py-1 text-xs border border-transparent rounded-md shadow-sm text-black bg-green-400 hover:bg-green-500">View on Etherscan</a>
            <button onClick={() => setSuccessInfo(null)} className="inline-flex items-center px-2 py-1 text-xs border border-transparent rounded-md text-green-400 hover:bg-green-900/30">Clear</button>
          </div>
        </div>
      )}
      {toast && (
        <div className={`p-2 rounded-lg border ${toast.type === 'success' ? 'bg-green-900/20 border-green-500 text-green-500' : 'bg-red-900/20 border-red-500 text-red-500'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {toast.type === 'success' ? '🎉' : '⚠️'}
              <div className="ml-1">
                <p className="text-xs">{toast.message}</p>
                {toast.link && <a href={toast.link} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:text-blue-400">View on Etherscan</a>}
              </div>
            </div>
            <button onClick={() => setToast(null)} className="text-xs opacity-70 hover:opacity-100">Clear</button>
          </div>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-2 bg-background-secondary p-3 rounded-lg shadow-lg">
        <div>
          <h3 className="text-xs font-semibold text-text-primary mb-1">Token Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-text-secondary">Token Name</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} className="form-input" placeholder="My Token" required />
            </div>
            <div>
              <label className="text-xs text-text-secondary">Token Symbol</label>
              <input type="text" name="symbol" value={formData.symbol} onChange={handleChange} className="form-input" placeholder="TKN" required />
            </div>
            <div>
              <label className="text-xs text-text-secondary">Initial Supply</label>
              <input type="number" name="initialSupply" value={formData.initialSupply} onChange={handleChange} className="form-input" min="1" required />
            </div>
            <div>
              <label className="text-xs text-text-secondary">Max Supply</label>
              <input type="number" name="maxSupply" value={formData.maxSupply} onChange={handleChange} className="form-input" min="1" required />
            </div>
          </div>
        </div>
        <div>
          <h3 className="text-xs font-semibold text-text-primary mb-1">Presale Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-text-secondary">Presale Rate</label>
              <input type="number" name="presaleRate" value={formData.presaleRate} onChange={handleChange} className="form-input" min="1" required />
            </div>
            <div>
              <label className="text-xs text-text-secondary">Min Contribution</label>
              <input type="number" name="minContribution" value={formData.minContribution} onChange={handleChange} className="form-input" min="0.1" step="0.1" required />
            </div>
            <div>
              <label className="text-xs text-text-secondary">Max Contribution</label>
              <input type="number" name="maxContribution" value={formData.maxContribution} onChange={handleChange} className="form-input" min="0.1" step="0.1" required />
            </div>
            <div>
              <label className="text-xs text-text-secondary">Presale Cap</label>
              <input type="number" name="presaleCap" value={formData.presaleCap} onChange={handleChange} className="form-input" min="0.1" step="0.1" required />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
            <div>
              <label className="text-xs text-text-secondary">Start Time</label>
              <input type="datetime-local" name="startTime" value={formData.startTime} onChange={handleChange} className="form-input" required />
            </div>
            <div>
              <label className="text-xs text-text-secondary">End Time</label>
              <input type="datetime-local" name="endTime" value={formData.endTime} onChange={handleChange} className="form-input" required />
            </div>
          </div>
        </div>
        <div>
          <h3 className="text-xs font-semibold text-text-primary mb-1">Advanced Settings</h3>
          <div>
            <div>
              <label className="text-xs text-text-secondary">Custom Owner Address (Optional)</label>
              <input type="text" name="customOwner" value={formData.customOwner} onChange={handleChange} className="form-input" placeholder="0x..." />
              <p className="text-xs text-gray-500 mt-0.5">Leave empty to use connected wallet address</p>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="flex items-center">
                <input type="checkbox" name="enableBlacklist" checked={formData.enableBlacklist} onChange={handleChange} className="h-4 w-4 rounded border-gray-700 bg-background-primary text-indigo-600 focus:ring-indigo-500" />
                <label className="ml-2 text-xs text-text-secondary">Enable Blacklist</label>
              </div>
              <div className="flex items-center">
                <input type="checkbox" name="enableTimeLock" checked={formData.enableTimeLock} onChange={handleChange} className="h-4 w-4 rounded border-gray-700 bg-background-primary text-indigo-600 focus:ring-indigo-500" />
                <label className="ml-2 text-xs text-text-secondary">Enable Time Lock</label>
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!isConnected || loading}
            className={`inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${(!isConnected || loading) ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {loading ? 'Creating...' : (isConnected ? 'Create Token' : 'Connect Wallet to Deploy')}
          </button>
        </div>
      </form>
    </div>
  );
}