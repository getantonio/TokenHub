import { useState, useEffect } from 'react';
import { BrowserProvider, Contract, parseUnits, formatUnits } from 'ethers';
import { useNetwork } from '../contexts/NetworkContext';
import TokenFactory_v2_1_0 from '../contracts/abi/TokenFactory_v2.1.0.json';
import { getExplorerUrl } from '../config/networks';
import { getNetworkContractAddress } from '../config/contracts';
import { Toast } from './ui/Toast';
import { TokenPreview } from './TokenPreview';
import TokenAdminV2 from './TokenAdminV2';
import { InfoIcon } from './ui/InfoIcon';
import { TokenConfig } from './types';

interface TokenFormV2Props {
  isConnected: boolean;
}

interface FormData {
  name: string;
  symbol: string;
  initialSupply: string;
  maxSupply: string;
  initialPrice: string;
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

interface ToastMessage {
  type: 'success' | 'error';
  message: string;
  link?: string;
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
  initialPrice: '0.001',
  presaleRate: '100',
  minContribution: '0.1',
  maxContribution: '1',
  presaleCap: '10',
  ...getDefaultTimes(),
  enableBlacklist: false,
  enableTimeLock: false,
  customOwner: ''
};

export function TokenFormV2({ isConnected }: TokenFormV2Props) {
  const { chainId } = useNetwork();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [v2Available, setV2Available] = useState<boolean>(false);
  const [deploymentFee, setDeploymentFee] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(defaultValues);
  const [successInfo, setSuccessInfo] = useState<{
    message: string;
    tokenAddress: string;
    explorerUrl: string;
    symbol: string;
    initialSupply: string;
    owner: string | null;
  } | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);

  const [previewConfig, setPreviewConfig] = useState<TokenConfig>({
    name: formData.name,
    symbol: formData.symbol,
    totalSupply: formData.maxSupply,
    initialPrice: formData.initialPrice,
    presaleAllocation: 40,
    liquidityAllocation: 30,
    teamAllocation: 10,
    marketingAllocation: 10,
    developerAllocation: 10
  });

  // Update preview whenever form data changes
  useEffect(() => {
    setPreviewConfig({
      ...previewConfig,
      name: formData.name,
      symbol: formData.symbol,
      totalSupply: formData.maxSupply,
      initialPrice: formData.initialPrice
    });
  }, [formData]);

  // Check V2 availability
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

  // Fetch deployment fee
  useEffect(() => {
    const fetchDeploymentFee = async () => {
      if (!window.ethereum || !chainId) {
        setDeploymentFee('Not available on this network');
        return;
      }

      try {
        const factoryAddress = getNetworkContractAddress(chainId, 'factoryAddressV2');
        if (!factoryAddress) {
          setDeploymentFee('Not available on this network');
          return;
        }

        const provider = new BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const factoryV2 = new Contract(factoryAddress, TokenFactory_v2_1_0.abi, signer);
        const userAddress = await signer.getAddress();
        const fee = await factoryV2.getDeploymentFee(userAddress);
        if (!fee) {
          setDeploymentFee('0');
        } else {
          setDeploymentFee(formatUnits(fee, 'ether'));
        }
      } catch (error) {
        console.error('Error fetching deployment fee:', error);
        setDeploymentFee('Error fetching fee. Please try again.');
      }
    };

    fetchDeploymentFee();
  }, [chainId]);

  useEffect(() => {
    if (window.ethereum && isConnected) {
      const provider = new BrowserProvider(window.ethereum);
      setProvider(provider);
    }
  }, [isConnected]);

  const showToast = (type: 'success' | 'error', message: string, link?: string) => {
    setToast({ type, message, link });
    setTimeout(() => setToast(null), 5000);
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

      // Get required deployment fee
      const userAddress = await signer.getAddress();
      const fee = await factoryV2.getDeploymentFee(userAddress);
      if (!fee) {
        throw new Error('Failed to get deployment fee');
      }

      // Handle custom owner address
      let ownerAddress = "0x0000000000000000000000000000000000000000";
      if (formData.customOwner) {
        if (!formData.customOwner.match(/^0x[0-9a-fA-F]{40}$/)) throw new Error('Invalid owner address format');
        ownerAddress = formData.customOwner;
      }

      // Convert amounts to BigInt with proper decimals and scaling
      const initialSupplyAmount = parseUnits(formData.initialSupply || '0', 18);
      const hardCapAmount = parseUnits(formData.maxSupply || '0', 18);
      const presaleRateAmount = BigInt(formData.presaleRate || '0');
      const minContribAmount = parseUnits(formData.minContribution || '0', 18);
      const maxContribAmount = parseUnits(formData.maxContribution || '0', 18);
      const presaleCapAmount = parseUnits(formData.presaleCap || '0', 18);
      const startTimeBigInt = BigInt(startTimeSeconds);
      const endTimeBigInt = BigInt(endTimeSeconds);

      // Create token
      const tx = await factoryV2.createToken(
        formData.name,
        formData.symbol,
        initialSupplyAmount,
        hardCapAmount,
        formData.enableBlacklist,
        formData.enableTimeLock,
        presaleRateAmount,
        minContribAmount,
        maxContribAmount,
        presaleCapAmount,
        startTimeBigInt,
        endTimeBigInt,
        ownerAddress,
        { value: BigInt(fee) }
      );
      
      const receipt = await tx.wait();
      const tokenDeployedEvent = receipt.logs
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

      if (!tokenDeployedEvent) throw new Error('Token deployment event not found in transaction logs');

      const tokenAddress = tokenDeployedEvent.args.token;
      const explorerUrl = getExplorerUrl(chainId, tokenAddress, 'token');
      const txExplorerUrl = getExplorerUrl(chainId, tx.hash, 'tx');

      setSuccessInfo({
        message: 'Token created successfully!',
        tokenAddress,
        explorerUrl,
        symbol: formData.symbol,
        initialSupply: formData.initialSupply,
        owner: tokenDeployedEvent.args.owner
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  if (!v2Available) {
    return (
      <div className="p-2 bg-gray-800 rounded-lg shadow-lg">
        <div className="rounded-md bg-yellow-900/20 p-2 border border-yellow-700">
          <h3 className="text-sm font-medium text-yellow-500">TokenFactory V2.1.0 is not yet deployed on this network.</h3>
          <p className="text-xs text-yellow-400">Note: V2.1.0 is currently only available on specific networks.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {toast && (
        <Toast {...toast} />
      )}

      {successInfo && (
        <div className="rounded-md bg-green-900/20 p-6 border border-green-700 mb-6">
          <h3 className="text-lg font-medium text-green-500 mb-2">🎉 Token Created Successfully!</h3>
          <div className="space-y-2 text-sm text-green-400">
            <p>Token Symbol: {successInfo.symbol}</p>
            <p>Contract Address: <a 
              href={successInfo.explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-green-300"
            >
              {successInfo.tokenAddress}
            </a></p>
            <p>Initial Supply: {Number(successInfo.initialSupply).toLocaleString()} {successInfo.symbol}</p>
            <p>Owner: {successInfo.owner?.slice(0, 6)}...{successInfo.owner?.slice(-4)}</p>
          </div>
          <div className="mt-4 flex gap-4">
            <a
              href={successInfo.explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-black bg-green-400 hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              View on Explorer
            </a>
            <button
              onClick={() => setSuccessInfo(null)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-green-400 bg-transparent hover:bg-green-900/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Clear Message
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form Section */}
        <form onSubmit={handleSubmit} className="space-y-4 bg-gray-800 p-6 rounded-lg shadow-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white">Token Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-700 bg-gray-900 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="My Token"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white">Token Symbol</label>
              <input
                type="text"
                name="symbol"
                value={formData.symbol}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-700 bg-gray-900 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="TKN"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white">Initial Supply</label>
              <input
                type="number"
                name="initialSupply"
                value={formData.initialSupply}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-700 bg-gray-900 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                min="1"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white">Max Supply</label>
              <input
                type="number"
                name="maxSupply"
                value={formData.maxSupply}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-700 bg-gray-900 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                min="1"
                required
              />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Presale Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white">Initial Price (ETH)</label>
                <input
                  type="number"
                  name="initialPrice"
                  value={formData.initialPrice}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-700 bg-gray-900 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  min="0.0001"
                  step="0.0001"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white">Presale Rate (Tokens/ETH)</label>
                <input
                  type="number"
                  name="presaleRate"
                  value={formData.presaleRate}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-700 bg-gray-900 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  min="1"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white">Min Contribution (ETH)</label>
                <input
                  type="number"
                  name="minContribution"
                  value={formData.minContribution}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-700 bg-gray-900 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  min="0.1"
                  step="0.1"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white">Max Contribution (ETH)</label>
                <input
                  type="number"
                  name="maxContribution"
                  value={formData.maxContribution}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-700 bg-gray-900 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  min="0.1"
                  step="0.1"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white">Presale Cap (ETH)</label>
                <input
                  type="number"
                  name="presaleCap"
                  value={formData.presaleCap}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-700 bg-gray-900 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  min="0.1"
                  step="0.1"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-white">Start Time</label>
                <input
                  type="datetime-local"
                  name="startTime"
                  value={formData.startTime}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-700 bg-gray-900 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white">End Time</label>
                <input
                  type="datetime-local"
                  name="endTime"
                  value={formData.endTime}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-700 bg-gray-900 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  required
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Advanced Settings</h3>
            <div>
              <label className="block text-sm font-medium text-white">Custom Owner Address (Optional)</label>
              <input
                type="text"
                name="customOwner"
                value={formData.customOwner}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-700 bg-gray-900 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="0x..."
              />
              <p className="mt-1 text-xs text-gray-400">Leave empty to use connected wallet address</p>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="enableBlacklist"
                  checked={formData.enableBlacklist}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-gray-700 bg-gray-900 text-blue-600 focus:ring-blue-500"
                />
                <label className="ml-2 text-sm text-white">Enable Blacklist</label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="enableTimeLock"
                  checked={formData.enableTimeLock}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-gray-700 bg-gray-900 text-blue-600 focus:ring-blue-500"
                />
                <label className="ml-2 text-sm text-white">Enable Time Lock</label>
              </div>
            </div>
          </div>

          <div className="flex justify-end items-center space-x-2">
            <InfoIcon />
            <button
              type="submit"
              disabled={!isConnected || loading}
              className={`inline-flex justify-center rounded-md border border-transparent bg-[#1B4D3E] py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-[#2C614F] focus:outline-none focus:ring-2 focus:ring-[#2C614F] focus:ring-offset-2 ${(!isConnected || loading) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Creating...' : (isConnected ? 'Create Token' : 'Connect Wallet to Deploy')}
            </button>
          </div>
        </form>

        {/* Preview Section */}
        <div className="space-y-6">
          <TokenPreview
            config={previewConfig}
            isValid={true}
            validationErrors={[]}
          />
          
          <TokenAdminV2
            isConnected={isConnected}
            address={successInfo?.tokenAddress}
            provider={provider}
          />
        </div>
      </div>
    </div>
  );
}