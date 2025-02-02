import React, { useState, useEffect } from 'react';
import { BrowserProvider, Contract, parseUnits, formatUnits } from 'ethers';
import { getNetworkContractAddress } from '@config/contracts';
import TokenFactory_v1 from '@contracts/abi/TokenFactory_v1.1.0.json';
import TokenTemplate_v1 from '@contracts/abi/TokenTemplate_v1.1.0.json';
import { Toast } from '@components/ui/Toast';
import { getExplorerUrl } from '@config/networks';
import { TokenPreview } from '@components/features/token/TokenPreview';
import TokenAdmin from '@components/features/token/TCAP_v1';
import { InfoIcon } from '@components/ui/InfoIcon';
import type { TokenConfig } from '../../../types/token-config';
import { useNetwork } from '@contexts/NetworkContext';
import { ethers } from 'ethers';

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

export default function TokenForm_v1({ isConnected }: Props) {
  const [formData, setFormData] = useState<FormData>({
    name: "TokenFactory Test v1",
    symbol: "TFT1",
    initialSupply: "1000000",
    maxSupply: "1000000",
    blacklistEnabled: false,
    timeLockEnabled: false,
  });

  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [deploymentFee, setDeploymentFee] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{
    message: string;
    tokenAddress: string;
    explorerUrl: string;
    symbol: string;
    initialSupply: string;
    owner: string | null;
  } | null>(null);

  const [previewConfig, setPreviewConfig] = useState<TokenConfig>({
    name: formData.name,
    symbol: formData.symbol,
    totalSupply: formData.initialSupply,
    initialPrice: "0.001",
    presaleAllocation: 40,
    liquidityAllocation: 30,
    teamAllocation: 10,
    marketingAllocation: 10,
    developerAllocation: 10
  });

  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const { chainId } = useNetwork();
  const [factoryAddress, setFactoryAddress] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum && isConnected) {
      const provider = new BrowserProvider(window.ethereum);
      setProvider(provider);
    }
  }, [isConnected]);

  useEffect(() => {
    if (chainId) {
      const address = getNetworkContractAddress(chainId, 'factoryAddress');
      setFactoryAddress(address || undefined);
      console.log("V1 Factory address set to:", address);
    }
  }, [chainId]);

  // Update preview whenever form data changes
  useEffect(() => {
    setPreviewConfig({
      ...previewConfig,
      name: formData.name,
      symbol: formData.symbol,
      totalSupply: formData.initialSupply
    });
  }, [formData]);

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
        const fee = await factory.getDeploymentFee(userAddress);
        setDeploymentFee(formatUnits(fee, 'ether'));
      } catch (error) {
        console.error('Error fetching deployment fee:', error);
      }
    }

    fetchDeploymentFee();
  }, [isConnected]);

  const showToast = (type: 'success' | 'error', message: string, link?: string) => {
    setToast({ type, message, link });
    setTimeout(() => setToast(null), 5000);
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
    setToast(null);

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
        throw new Error("TokenFactory is not yet deployed on this network.");
      }

      const factory = new Contract(factoryAddress, TokenFactoryABI, signer);
      const fee = await factory.getDeploymentFee(userAddress);
      
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
        message: 'Token created successfully!',
        tokenAddress,
        explorerUrl,
        symbol: formData.symbol,
        initialSupply: formData.initialSupply,
        owner: userAddress
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

  const loadTokens = async () => {
    if (!isConnected || !chainId || !provider || typeof window === 'undefined') {
      console.log("Missing dependencies:", { isConnected, chainId, hasProvider: !!provider, isBrowser: typeof window !== 'undefined' });
      return;
    }

    try {
      setIsLoading(true);
      console.log("Loading V1 tokens from factory at:", factoryAddress);
      
      if (!factoryAddress) {
        console.error("No factory address provided");
        return;
      }

      const factory = new Contract(factoryAddress, TokenFactoryABI, provider);
      console.log("Factory contract initialized");

      // Try to get all deployed tokens first
      try {
        const deployedTokens = await factory.getDeployedTokens();
        console.log("Found deployedTokens:", deployedTokens);
        
        if (deployedTokens && deployedTokens.length > 0) {
          const tokenPromises = deployedTokens.map(async (tokenAddr: string) => {
            try {
              const token = new Contract(tokenAddr, TokenTemplateABI, provider);
              const [name, symbol, totalSupply, blacklistEnabled, timeLockEnabled] = await Promise.all([
                token.name(),
                token.symbol(),
                token.totalSupply(),
                token.blacklistEnabled(),
                token.timeLockEnabled()
              ]);

              return {
                address: tokenAddr,
                name,
                symbol,
                totalSupply: formatUnits(totalSupply, TOKEN_DECIMALS),
                blacklistEnabled,
                timeLockEnabled
              };
            } catch (error) {
              console.error(`Error checking token ${tokenAddr}:`, error);
              return null;
            }
          });

          const tokenResults = await Promise.all(tokenPromises);
          const validTokens = tokenResults.filter(Boolean);
          if (validTokens.length > 0) {
            console.log("Setting tokens from direct method:", validTokens);
            setTokens(validTokens as TokenInfo[]);
            return;
          }
        }
      } catch (error) {
        console.error("deployedTokens failed, trying event logs...", error);
      }

      // Fallback to event logs
      const currentBlock = await provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 200000); // Look back further

      console.log(`\nSearching for events from block ${fromBlock} to ${currentBlock}`);

      // Get all logs from the factory contract
      const logs = await provider.getLogs({
        address: factoryAddress,
        fromBlock,
        toBlock: currentBlock
      });
      console.log("Found logs:", logs.length);

      const foundTokens: TokenInfo[] = [];
      const processedAddresses = new Set<string>();

      for (const log of logs) {
        try {
          const parsedLog = factory.interface.parseLog({
            topics: log.topics || [],
            data: log.data
          });

          if (!parsedLog || parsedLog.name !== 'TokenCreated') {
            console.log("Skipping non-TokenCreated log:", parsedLog?.name);
            continue;
          }

          console.log("Processing TokenCreated event:", {
            token: parsedLog.args[0],
            name: parsedLog.args[1],
            symbol: parsedLog.args[2]
          });

          const tokenAddr = parsedLog.args[0] as string;
          if (!tokenAddr || !ethers.isAddress(tokenAddr)) continue;

          const normalizedAddr = tokenAddr.toLowerCase();
          if (processedAddresses.has(normalizedAddr)) continue;

          const code = await provider.getCode(normalizedAddr);
          if (code === '0x') continue;

          console.log("Checking token contract at:", normalizedAddr);
          const token = new Contract(normalizedAddr, TokenTemplateABI, provider);
          const [name, symbol, totalSupply, blacklistEnabled, timeLockEnabled] = await Promise.all([
            token.name(),
            token.symbol(),
            token.totalSupply(),
            token.blacklistEnabled(),
            token.timeLockEnabled()
          ]);

          if (!foundTokens.some(t => t.address.toLowerCase() === normalizedAddr)) {
            foundTokens.push({
              address: normalizedAddr,
              name,
              symbol,
              totalSupply: formatUnits(totalSupply, TOKEN_DECIMALS),
              blacklistEnabled,
              timeLockEnabled
            });
            processedAddresses.add(normalizedAddr);
          }
        } catch (error) {
          console.error("Error processing log:", error);
        }
      }

      if (foundTokens.length > 0) {
        console.log("Setting found tokens:", foundTokens);
        setTokens(foundTokens);
      } else {
        console.log("No tokens found");
        setTokens([]);
      }
    } catch (error) {
      console.error("Error in loadTokens:", error);
      showToast('error', 'Failed to load tokens');
    } finally {
      setIsLoading(false);
    }
  };

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
            <label htmlFor="name" className="block text-sm font-medium text-white">Token Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-700 bg-gray-900 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
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
              className="mt-1 block w-full rounded-md border-gray-700 bg-gray-900 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
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
                className="mt-1 block w-full rounded-md border-gray-700 bg-gray-900 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="1000000"
                required
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <span className="text-gray-400 sm:text-sm">{formData.symbol}</span>
              </div>
            </div>
            <p className="mt-1 text-xs text-gray-400">Each token has {TOKEN_DECIMALS} decimals</p>
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

        {/* Preview Section */}
        <div className="space-y-6">
          <TokenPreview
            config={previewConfig}
            isValid={true}
            validationErrors={[]}
          />
          
          <div className="bg-background-secondary rounded-lg p-6 border border-border mb-6">
            <h2 className="text-xl font-bold text-white mb-4">Token Creator Admin Panel</h2>
            <TokenAdmin
              isConnected={isConnected}
              address={factoryAddress || undefined}
              provider={provider}
            />
          </div>
        </div>
      </div>
    </div>
  );
}