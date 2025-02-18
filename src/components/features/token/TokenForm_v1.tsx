import { useState, useEffect } from 'react';
import { BrowserProvider, Contract, parseUnits, formatUnits } from 'ethers';
import { getNetworkContractAddress } from '@config/contracts';
import { useNetwork } from '@contexts/NetworkContext';
import TokenFactory_v1 from '@contracts/abi/TokenFactory_v1.json';
import TokenTemplate_v1 from '@contracts/abi/TokenTemplate_v1.json';
import { getExplorerUrl, getNetworkName } from '@config/networks';
import TokenPreview from '@components/features/token/TokenPreview';
import { InfoIcon } from '@components/ui/InfoIcon';
import type { TokenConfig } from '../../../types/token-config';
import { ethers } from 'ethers';
import { useToast } from '@/components/ui/toast/use-toast';
import { Spinner } from '@components/ui/Spinner';
import { Button } from '@components/ui/button';
import { Card } from '@components/ui/card';
import { useForm } from 'react-hook-form';
import { useWallet } from '@contexts/WalletContext';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { Switch } from '@components/ui/switch';
import { FACTORY_ADDRESSES } from '@config/contracts';
import TokenFactoryV1 from '@contracts/abi/TokenFactory_v1.json';

const TokenFactoryABI = TokenFactory_v1.abi;
const TokenTemplateABI = TokenTemplate_v1.abi;
const TOKEN_DECIMALS = 18;

interface FormData {
  name: string;
  symbol: string;
  initialSupply: string;
  maxSupply: string;
  blacklistEnabled: boolean;
  timeLockEnabled: boolean;
}

interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  totalSupply: string;
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

interface SuccessInfo {
  tokenAddress: string;
  tokenName: string;
  tokenSymbol: string;
}

export default function TokenForm_v1({ isConnected }: Props) {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    symbol: '',
    initialSupply: '',
    maxSupply: '',
    blacklistEnabled: false,
    timeLockEnabled: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<SuccessInfo | null>(null);
  const [deploymentFee, setDeploymentFee] = useState<string>('Loading...');
  const { chainId } = useNetwork();
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      setProvider(new BrowserProvider(window.ethereum));
    }
  }, []);

  useEffect(() => {
    if (chainId) {
      const address = getNetworkContractAddress(chainId, 'factoryAddress');
      console.log("V1 Factory address set to:", address);
    }
  }, [chainId]);

  // Fetch deployment fee when component mounts
  useEffect(() => {
    async function fetchDeploymentFee() {
      if (!window.ethereum || !isConnected) return;
      
      try {
        const provider = new BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const userAddress = await signer.getAddress();
        const chainId = Number(await window.ethereum.request({ method: 'eth_chainId' }));
        const factoryAddress = getNetworkContractAddress(chainId, 'factoryAddress');
        if (!factoryAddress) {
          setDeploymentFee('Not available on this network');
          return;
        }
        
        const factory = new Contract(factoryAddress, TokenFactoryABI, signer);
        const fee = await factory.deploymentFee();
        setDeploymentFee(formatUnits(fee, 'ether'));
      } catch (error) {
        console.error('Error fetching deployment fee:', error);
      }
    }

    fetchDeploymentFee();
  }, [isConnected]);

  const showToast = (type: 'success' | 'error', message: string, link?: string) => {
    toast({
      variant: type === 'error' ? 'destructive' : 'default',
      title: type === 'error' ? 'Error' : 'Success',
      description: (
        <div className="space-y-2">
          <p>{message}</p>
          {link && (
            <a href={link} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">
              View on Explorer
            </a>
          )}
        </div>
      )
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected) {
      setError("Please connect your wallet first");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setSuccessInfo(null);

    try {
      if (!window.ethereum) {
        throw new Error("Please install MetaMask");
      }

      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();
      const chainId = Number(await window.ethereum.request({ method: 'eth_chainId' }));
      
      const factoryAddress = getNetworkContractAddress(chainId, 'factoryAddress');
      if (!factoryAddress) {
        console.error("Factory address not found for this network");
        showToast('error', 'TokenFactory V1 is not deployed on this network');
        setIsLoading(false);
        return;
      }

      const factory = new Contract(factoryAddress, TokenFactoryABI, signer);
      const fee = await factory.deploymentFee();
      
      const initialSupplyWei = parseUnits(formData.initialSupply, TOKEN_DECIMALS);
      const maxSupplyWei = parseUnits(formData.maxSupply, TOKEN_DECIMALS);

      const tx = await factory.createToken(
        formData.name,
        formData.symbol,
        initialSupplyWei,
        maxSupplyWei,
        formData.blacklistEnabled,
        formData.timeLockEnabled,
        { value: BigInt(fee) }
      );

      showToast('success', 'Transaction submitted. Waiting for confirmation...');
      
      const receipt = await tx.wait();
      let tokenAddress = null;
      
      for (const log of receipt.logs) {
        try {
          const parsed = factory.interface.parseLog(log as unknown as { topics: string[], data: string });
          if (parsed?.name === "TokenCreated") {
            tokenAddress = parsed.args[0];
            break;
          }
        } catch (e) {
          continue;
        }
      }

      if (!tokenAddress) {
        for (const log of receipt.logs) {
          if (log.address !== factoryAddress) {
            tokenAddress = log.address;
            break;
          }
        }
      }

      if (!tokenAddress) {
        throw new Error("Could not find token address in transaction logs");
      }

      const explorerUrl = getExplorerUrl(chainId, tokenAddress, 'token');
      const txExplorerUrl = getExplorerUrl(chainId, tx.hash, 'tx');

      setSuccessInfo({
        tokenAddress,
        tokenName: formData.name,
        tokenSymbol: formData.symbol,
      });

      showToast('success', 'Token created successfully!', txExplorerUrl);

    } catch (error: any) {
      console.error('Error creating token:', error);
      showToast('error', error.message || 'Failed to create token');
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

  return (
    <div className="space-y-2">
      {successInfo && (
        <div className="mt-4">
          <Card className="bg-gray-800 border-gray-700">
            <div className="p-4">
              <h3 className="text-lg font-semibold text-white mb-2">Token Created Successfully!</h3>
              <div className="space-y-2">
                <p className="text-sm text-gray-400">
                  Your token has been created and is now ready to use.
                </p>
                <div className="flex flex-col space-y-1">
                  <span className="text-sm text-gray-400">Name: {successInfo.tokenName}</span>
                  <span className="text-sm text-gray-400">Symbol: {successInfo.tokenSymbol}</span>
                  <span className="text-sm text-gray-400">
                    Address: {successInfo.tokenAddress.slice(0, 6)}...{successInfo.tokenAddress.slice(-4)}
                  </span>
                </div>
                <div className="flex space-x-2 mt-2">
                  <a
                    href={`${getExplorerUrl(chainId ?? undefined, successInfo.tokenAddress, 'token')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 text-sm"
                  >
                    View on Explorer →
                  </a>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 gap-2">
        {/* Form Section */}
        <div className="form-card">
          <h2 className="form-card-header">Create Token</h2>
          <form onSubmit={handleSubmit} className="space-y-2">
            {error && (
              <div className="rounded-md bg-red-900/20 p-2 border border-red-700">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-500">{error}</h3>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-white">Token Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="mt-2 block w-full rounded-md border-gray-800 bg-gray-900 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="TokenFactory Test v1"
                required
              />
            </div>

            <div>
              <label htmlFor="symbol" className="block text-sm font-medium text-white">Token Symbol</label>
              <input
                type="text"
                id="symbol"
                name="symbol"
                value={formData.symbol}
                onChange={handleChange}
                className="mt-2 block w-full rounded-md border-gray-800 bg-gray-900 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="TFT1"
                required
              />
            </div>

            <div>
              <label htmlFor="initialSupply" className="block text-sm font-medium text-white">
                Initial Supply
                <span className="ml-1 text-xs text-gray-400">(tokens will be sent to your wallet)</span>
              </label>
              <div className="relative rounded-md shadow-sm">
                <input
                  type="text"
                  id="initialSupply"
                  name="initialSupply"
                  value={formData.initialSupply}
                  onChange={handleChange}
                  className="mt-2 block w-full rounded-md border-gray-800 bg-gray-900 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="1000000"
                  required
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <span className="text-gray-400 sm:text-sm">{formData.symbol}</span>
                </div>
              </div>
              <p className="mt-2 text-xs text-gray-400">Each token has {TOKEN_DECIMALS} decimals</p>
            </div>

            <div>
              <label htmlFor="maxSupply" className="block text-sm font-medium text-white">
                Max Supply
                <span className="ml-1 text-xs text-gray-400">(maximum tokens that can ever exist)</span>
              </label>
              <div className="relative rounded-md shadow-sm">
                <input
                  type="text"
                  id="maxSupply"
                  name="maxSupply"
                  value={formData.maxSupply}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-700 bg-gray-900 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="1000000"
                  required
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <span className="text-gray-400 sm:text-sm">{formData.symbol}</span>
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
                className="h-4 w-4 rounded border-gray-700 bg-gray-900 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="blacklistEnabled" className="ml-2 block text-sm text-white">
                Enable Blacklist
                <span className="ml-1 text-xs text-gray-400">(ability to block specific addresses)</span>
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="timeLockEnabled"
                name="timeLockEnabled"
                checked={formData.timeLockEnabled}
                onChange={handleChange}
                className="h-4 w-4 rounded border-gray-700 bg-gray-900 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="timeLockEnabled" className="ml-2 block text-sm text-white">
                Enable Time Lock
                <span className="ml-1 text-xs text-gray-400">(ability to lock tokens for a period)</span>
              </label>
            </div>

            <div className="flex justify-end items-center space-x-2">
              <InfoIcon content="Deployment fee will be charged in ETH. Make sure you have enough ETH to cover the fee and gas costs." />
              <button
                type="submit"
                disabled={!isConnected || isLoading || deploymentFee === 'Not available on this network'}
                className={`inline-flex justify-center rounded-md border border-transparent bg-blue-500/20 py-2 px-4 text-sm font-medium text-blue-400 shadow-sm hover:bg-blue-500/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 ${(!isConnected || isLoading || deploymentFee === 'Not available on this network') ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isLoading ? 'Creating...' : !isConnected ? 'Connect Wallet to Deploy' : deploymentFee === 'Not available on this network' ? 'Not Available on this Network' : 'Create Token'}
              </button>
            </div>
          </form>
        </div>

        {/* Preview Section */}
        <div className="space-y-2">
          <TokenPreview
            name={formData.name}
            symbol={formData.symbol}
            initialSupply={formData.initialSupply}
            maxSupply={formData.maxSupply}
          />
        </div>
      </div>
    </div>
  );
}