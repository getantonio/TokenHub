import React, { useState } from 'react';
import { BrowserProvider, Contract, parseUnits, formatUnits } from 'ethers';
import { getNetworkContractAddress } from '../config/contracts';
import TokenFactoryArtifact from '../contracts/abi/TokenFactory_v1.json';
import { Toast } from './ui/Toast';

const TokenFactoryABI = TokenFactoryArtifact.abi;
const TOKEN_DECIMALS = 18; // Standard ERC20 decimals

interface FormData {
  name: string;
  symbol: string;
  initialSupply: string;
  maxSupply: string;
  blacklistEnabled: boolean;
  timeLockEnabled: boolean;
}

interface Props {
  isConnected: boolean;
}

interface ToastMessage {
  type: 'success' | 'error';
  message: string;
  link?: string;
}

export default function TokenForm_v1({ isConnected }: Props) {
  const [formData, setFormData] = useState<FormData>({
    name: "TokenFactory Test v1",
    symbol: "TFT1",
    initialSupply: "1000000",
    maxSupply: "1000000",
    blacklistEnabled: false,
    timeLockEnabled: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [successInfo, setSuccessInfo] = useState<{
    symbol: string;
    address: string;
    supply: string;
    owner: string;
  } | null>(null);

  const showToast = (type: 'success' | 'error', message: string, link?: string) => {
    setToast({ type, message, link });
    // Only auto-clear error toasts, success toasts will stay until next action
    if (type === 'error') {
      setTimeout(() => setToast(null), 10000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected) {
      setError("Please connect your wallet first");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setSuccessInfo(null); // Clear previous success
    setToast(null); // Clear previous toast

    try {
      if (!window.ethereum) {
        throw new Error("Please install MetaMask");
      }

      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();
      const chainId = Number(await window.ethereum.request({ method: 'eth_chainId' }));
      
      const factoryAddress = getNetworkContractAddress(chainId, 'factoryAddress');
      const factory = new Contract(factoryAddress, TokenFactoryABI, signer);

      // Get deployment fee
      const fee = await factory.deploymentFee();
      
      // Convert supply to wei (with 18 decimals)
      const initialSupplyWei = parseUnits(formData.initialSupply, TOKEN_DECIMALS);
      const maxSupplyWei = parseUnits(formData.maxSupply, TOKEN_DECIMALS);

      console.log('Creating token with parameters:', {
        name: formData.name,
        symbol: formData.symbol,
        initialSupply: formData.initialSupply,
        maxSupply: formData.maxSupply,
        initialSupplyWei: initialSupplyWei.toString(),
        maxSupplyWei: maxSupplyWei.toString(),
        blacklistEnabled: formData.blacklistEnabled,
        timeLockEnabled: formData.timeLockEnabled,
        fee: formatUnits(fee, 'ether'),
        owner: userAddress
      });

      // Create token
      const tx = await factory.createToken(
        formData.name,
        formData.symbol,
        initialSupplyWei,
        maxSupplyWei,
        formData.blacklistEnabled,
        formData.timeLockEnabled,
        { value: fee }
      );

      showToast('success', 'Transaction submitted! Waiting for confirmation...', `https://sepolia.etherscan.io/tx/${tx.hash}`);
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      
      // Find the TokenCreated event
      const event = receipt.logs.find((log: any) => {
        try {
          return factory.interface.parseLog({
            topics: log.topics,
            data: log.data
          })?.name === 'TokenCreated';
        } catch {
          return false;
        }
      });

      if (event) {
        const parsedEvent = factory.interface.parseLog({
          topics: event.topics,
          data: event.data
        });
        const tokenAddress = parsedEvent?.args?.tokenAddress;
        
        console.log('Token created successfully:', {
          address: tokenAddress,
          name: formData.name,
          symbol: formData.symbol,
          initialSupply: formData.initialSupply,
          owner: userAddress
        });

        // Set success info for persistent display
        setSuccessInfo({
          symbol: formData.symbol,
          address: tokenAddress,
          supply: formatUnits(initialSupplyWei, TOKEN_DECIMALS),
          owner: userAddress
        });

        showToast(
          'success',
          `Token ${formData.symbol} created successfully!\nInitial supply of ${formatUnits(initialSupplyWei, TOKEN_DECIMALS)} ${formData.symbol} sent to ${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`,
          `https://sepolia.etherscan.io/token/${tokenAddress}`
        );

        // Reset form to default values
        setFormData({
          name: "TokenFactory Test v1",
          symbol: "TFT1",
          initialSupply: "1000000",
          maxSupply: "1000000",
          blacklistEnabled: false,
          timeLockEnabled: false,
        });
      }
    } catch (error: any) {
      console.error('Error creating token:', error);
      setError(error.message || 'Failed to create token');
      setSuccessInfo(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  if (!isConnected) {
    return (
      <div className="rounded-md bg-yellow-900/20 p-4 border border-yellow-700">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-500">
              Please connect your wallet to create tokens
            </h3>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {successInfo && (
        <div className="rounded-md bg-green-900/20 p-6 border border-green-700 mb-6">
          <h3 className="text-lg font-medium text-green-500 mb-2">🎉 Token Created Successfully!</h3>
          <div className="space-y-2 text-sm text-green-400">
            <p>Token Symbol: {successInfo.symbol}</p>
            <p>Contract Address: <a 
              href={`https://sepolia.etherscan.io/token/${successInfo.address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-green-300"
            >
              {successInfo.address}
            </a></p>
            <p>Initial Supply: {Number(successInfo.supply).toLocaleString()} {successInfo.symbol}</p>
            <p>Owner: {successInfo.owner.slice(0, 6)}...{successInfo.owner.slice(-4)}</p>
          </div>
          <div className="mt-4 flex gap-4">
            <a
              href={`https://sepolia.etherscan.io/token/${successInfo.address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-black bg-green-400 hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              View on Etherscan
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

      <form onSubmit={handleSubmit} className="space-y-4 bg-background-secondary p-6 rounded-lg shadow-lg">
        {toast && (
          <Toast 
            type={toast.type} 
            message={toast.message}
            link={toast.link}
          />
        )}

        {error && (
          <div className="rounded-md bg-red-900/20 p-4 border border-red-700">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-500">{error}</h3>
              </div>
            </div>
          </div>
        )}

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-text-primary">Token Name</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-700 bg-background-primary text-text-primary shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            placeholder="TokenFactory Test v1"
            required
          />
        </div>

        <div>
          <label htmlFor="symbol" className="block text-sm font-medium text-text-primary">Token Symbol</label>
          <input
            type="text"
            id="symbol"
            name="symbol"
            value={formData.symbol}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-700 bg-background-primary text-text-primary shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            placeholder="TFT1"
            required
          />
        </div>

        <div>
          <label htmlFor="initialSupply" className="block text-sm font-medium text-text-primary">
            Initial Supply
            <span className="ml-1 text-xs text-text-secondary">(tokens will be sent to your wallet)</span>
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <input
              type="text"
              id="initialSupply"
              name="initialSupply"
              value={formData.initialSupply}
              onChange={handleChange}
              className="block w-full rounded-md border-gray-700 bg-background-primary text-text-primary shadow-sm focus:border-indigo-500 focus:ring-indigo-500 pr-12"
              placeholder="1000000"
              required
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <span className="text-text-secondary sm:text-sm">{formData.symbol}</span>
            </div>
          </div>
          <p className="mt-1 text-xs text-text-secondary">Each token has {TOKEN_DECIMALS} decimals</p>
        </div>

        <div>
          <label htmlFor="maxSupply" className="block text-sm font-medium text-text-primary">
            Max Supply
            <span className="ml-1 text-xs text-text-secondary">(maximum tokens that can ever exist)</span>
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <input
              type="text"
              id="maxSupply"
              name="maxSupply"
              value={formData.maxSupply}
              onChange={handleChange}
              className="block w-full rounded-md border-gray-700 bg-background-primary text-text-primary shadow-sm focus:border-indigo-500 focus:ring-indigo-500 pr-12"
              placeholder="1000000"
              required
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <span className="text-text-secondary sm:text-sm">{formData.symbol}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="blacklistEnabled"
            name="blacklistEnabled"
            checked={formData.blacklistEnabled}
            onChange={handleChange}
            className="h-4 w-4 rounded border-gray-700 bg-background-primary text-indigo-600 focus:ring-indigo-500"
          />
          <label htmlFor="blacklistEnabled" className="ml-2 block text-sm text-text-primary">
            Enable Blacklist
            <span className="ml-1 text-xs text-text-secondary">(ability to block specific addresses)</span>
          </label>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="timeLockEnabled"
            name="timeLockEnabled"
            checked={formData.timeLockEnabled}
            onChange={handleChange}
            className="h-4 w-4 rounded border-gray-700 bg-background-primary text-indigo-600 focus:ring-indigo-500"
          />
          <label htmlFor="timeLockEnabled" className="ml-2 block text-sm text-text-primary">
            Enable Time Lock
            <span className="ml-1 text-xs text-text-secondary">(ability to lock tokens for a period)</span>
          </label>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={`inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isLoading ? 'Creating...' : 'Create Token'}
        </button>
      </form>
    </div>
  );
} 