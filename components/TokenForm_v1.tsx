import React, { useState } from 'react';
import { BrowserProvider, Contract, parseUnits, formatUnits } from 'ethers';
import { getNetworkContractAddress } from '../config/contracts';
import TokenFactoryArtifact from '../contracts/abi/TokenFactory_v1.json';
import TokenTemplateArtifact from '../contracts/abi/TokenTemplate_v1.json';
import { Toast } from './ui/Toast';
import { getExplorerUrl } from '../config/networks';

const TokenFactoryABI = TokenFactoryArtifact.abi;
const TokenTemplateABI = TokenTemplateArtifact.abi;
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
    message: string;
    tokenAddress: string;
    explorerUrl: string;
    symbol: string;
    initialSupply: string;
    owner: string | null;
  } | null>(null);

  const showToast = (type: 'success' | 'error', message: string, link?: string) => {
    setToast({
      type,
      message,
      link
    });
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
      let fee;
      try {
        // Try to get version first
        const version = await factory.VERSION();
        console.log("Factory version:", version);
        
        // Get fee based on version
        if (version.includes('1.1.0')) {
          // V1.1.0 doesn't require a fee and is owner-only
          fee = parseUnits('0', 'ether');
          
          // Check if user is owner
          const owner = await factory.owner();
          if (owner.toLowerCase() !== userAddress.toLowerCase()) {
            throw new Error("Only owner can create tokens in V1.1.0");
          }
        } else {
          fee = await factory.deploymentFee();
        }
        console.log("Deployment fee:", formatUnits(fee, 'ether'), "ETH");
      } catch (error: any) {
        console.error("Error getting deployment fee:", error);
        showToast('error', error.message || 'Failed to get deployment fee');
        setIsLoading(false);
        return;
      }
      
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

      showToast('success', 'Transaction submitted. Waiting for confirmation...');
      console.log('Transaction submitted:', tx.hash);
      
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);

      // Look for TokenCreated event in logs
      let tokenAddress = null;
      for (const log of receipt.logs) {
        try {
          const parsed = factory.interface.parseLog(log as unknown as { topics: string[], data: string });
          console.log("Parsed log:", parsed);
          
          if (parsed?.name === "TokenCreated") {
            tokenAddress = parsed.args[0]; // First argument is the token address
            console.log("Found token address from event:", tokenAddress);
            break;
          }
        } catch (e) {
          console.log("Could not parse log, trying next one:", e);
          continue;
        }
      }

      if (!tokenAddress) {
        // Try to get the token address from raw logs
        for (const log of receipt.logs) {
          console.log("Raw log:", log);
          if (log.address !== factoryAddress) {
            tokenAddress = log.address; // The new token's address will be in the log's address field
            console.log("Found token address from raw log:", tokenAddress);
            break;
          }
        }
      }

      if (!tokenAddress) {
        console.error("Could not find token address in transaction logs");
        showToast("error", "Token created but could not get address. Check your wallet for the new token.");
        setIsLoading(false);
        return;
      }

      console.log("New token address:", tokenAddress);
      
      // Fix explorer URL construction
      const explorerUrl = getExplorerUrl(chainId, tokenAddress, 'token');
      
      setSuccessInfo({
        message: 'Token created successfully!',
        tokenAddress,
        explorerUrl,
        symbol: formData.symbol,
        initialSupply: formData.initialSupply,
        owner: userAddress
      });
      
      showToast('success', 'Token created successfully!');
      
      // Get token info for success message
      const token = new Contract(tokenAddress, TokenTemplateABI, signer);
      try {
        // Wait for proxy initialization to complete
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Get token info using function calls
        const [name, symbol, owner] = await Promise.all([
          token.name(),
          token.symbol(),
          token.owner()
        ]);

        console.log("Retrieved token info:", { name, symbol, owner });

        // Reset form and update success info with correct values
        setFormData({
          name: "TokenFactory Test v1",
          symbol: "TFT1",
          initialSupply: "1000000",
          maxSupply: "1000000",
          blacklistEnabled: false,
          timeLockEnabled: false,
        });

        setSuccessInfo({
          message: 'Token created successfully!',
          tokenAddress,
          explorerUrl,
          symbol: symbol || formData.symbol, // Fallback to form data if needed
          initialSupply: formData.initialSupply,
          owner: owner || userAddress // Fallback to user address if needed
        });
      } catch (error) {
        console.error("Could not get token info:", error);
        // Use form data as fallback
        setSuccessInfo({
          message: 'Token created successfully!',
          tokenAddress,
          explorerUrl,
          symbol: formData.symbol,
          initialSupply: formData.initialSupply,
          owner: userAddress
        });
      }

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
    <div className="relative">
      {toast && (
        <div className={`mb-4 p-4 rounded-lg border ${
          toast.type === 'success' 
            ? 'bg-green-900/20 border-green-500 text-green-500' 
            : 'bg-red-900/20 border-red-500 text-red-500'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {toast.type === 'success' ? (
                <span className="text-green-500 mr-2">🎉</span>
              ) : (
                <span className="text-red-500 mr-2">⚠️</span>
              )}
              <div>
                <p className="text-sm font-medium">{toast.message}</p>
                {toast.link && (
                  <a 
                    href={toast.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-blue-500 hover:text-blue-400"
                  >
                    View on Etherscan
                  </a>
                )}
              </div>
            </div>
            <button 
              onClick={() => setToast(null)}
              className="text-sm opacity-70 hover:opacity-100"
            >
              Clear Message
            </button>
          </div>
        </div>
      )}
      <div className="space-y-6">
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
            <label htmlFor="name" className="form-label">Token Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="form-input"
              placeholder="TokenFactory Test v1"
              required
            />
          </div>

          <div>
            <label htmlFor="symbol" className="form-label">Token Symbol</label>
            <input
              type="text"
              id="symbol"
              name="symbol"
              value={formData.symbol}
              onChange={handleChange}
              className="form-input"
              placeholder="TFT1"
              required
            />
          </div>

          <div>
            <label htmlFor="initialSupply" className="form-label">
              Initial Supply
              <span className="ml-1 text-xs text-text-secondary">(tokens will be sent to your wallet)</span>
            </label>
            <div className="relative rounded-md shadow-sm">
              <input
                type="text"
                id="initialSupply"
                name="initialSupply"
                value={formData.initialSupply}
                onChange={handleChange}
                className="form-input pr-12"
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
            <label htmlFor="maxSupply" className="form-label">
              Max Supply
              <span className="ml-1 text-xs text-text-secondary">(maximum tokens that can ever exist)</span>
            </label>
            <div className="relative rounded-md shadow-sm">
              <input
                type="text"
                id="maxSupply"
                name="maxSupply"
                value={formData.maxSupply}
                onChange={handleChange}
                className="form-input pr-12"
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
            disabled={!isConnected || isLoading}
            className={`inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${(!isConnected || isLoading) ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isLoading ? 'Creating...' : (isConnected ? 'Create Token' : 'Connect Wallet to Deploy')}
          </button>
        </form>
      </div>
    </div>
  );
} 