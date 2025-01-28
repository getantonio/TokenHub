import { useState, useEffect } from 'react';
import { BrowserProvider, Contract, parseUnits, Log } from 'ethers';
import { useNetwork } from '../contexts/NetworkContext';
import TokenFactory_v2 from '../contracts/abi/TokenFactory_v2.json';
import { getExplorerUrl } from '../config/networks';
import { getNetworkContractAddress } from '../config/contracts';
import type { ContractAddresses } from '../config/contracts';
import { LogDescription } from 'ethers';

interface TokenFormV2Props {
  isConnected: boolean;
}

interface ToastMessage {
  type: 'success' | 'error';
  message: string;
  link?: string;
}

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

export function TokenFormV2({ isConnected }: TokenFormV2Props) {
  const { chainId } = useNetwork();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [v2Available, setV2Available] = useState<boolean>(false);
  const [formData, setFormData] = useState(defaultValues);
  const [successInfo, setSuccessInfo] = useState<{
    message: string;
    tokenAddress: string;
    explorerUrl: string;
    symbol: string;
    initialSupply: string;
    owner: string | null;
  } | null>(null);

  // Check if V2 is available on this network
  useEffect(() => {
    const checkV2Availability = async () => {
      if (!chainId) {
        setV2Available(false);
        return;
      }

      try {
        const factoryAddress = getNetworkContractAddress(chainId, 'factoryAddressV2');
        console.log('Checking V2 availability for chain:', chainId);
        console.log('Factory address:', factoryAddress);
        
        if (!factoryAddress || factoryAddress === '') {
          console.log('V2 Factory not configured for this network');
          setV2Available(false);
          return;
        }

        // Check if contract exists at address
        if (window.ethereum) {
          const provider = new BrowserProvider(window.ethereum);
          try {
            const code = await provider.getCode(factoryAddress);
            const hasCode = code !== '0x' && code !== '0x0';
            console.log('Contract exists at address:', hasCode);
            setV2Available(hasCode);
          } catch (error) {
            console.log('Error checking contract code:', error);
            setV2Available(false);
          }
        }
      } catch (error) {
        console.log('Error checking V2 availability:', error);
        setV2Available(false);
      }
    };

    checkV2Availability();
  }, [chainId]);

  // If V2 is not available, show message and disable form
  if (!v2Available) {
    return (
      <div className="form-container p-6 bg-background-secondary rounded-lg shadow-lg">
        <div className="rounded-md bg-yellow-900/20 p-4 border border-yellow-700">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-500">
                TokenFactory V2 is not yet deployed on this network. Please use V1 for now.
              </h3>
              <p className="text-sm text-yellow-400 mt-2">
                Note: V2 is currently only available on specific networks. Check the documentation for supported networks.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const showToast = (type: 'success' | 'error', message: string, link?: string) => {
    setToast({
      type,
      message,
      link
    });
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
      // Validate parameters
      const now = Math.floor(Date.now() / 1000);
      const startTimeSeconds = Math.floor(new Date(formData.startTime).getTime() / 1000);
      const endTimeSeconds = Math.floor(new Date(formData.endTime).getTime() / 1000);
      
      if (startTimeSeconds <= now) {
        throw new Error('Start time must be in the future');
      }
      
      if (endTimeSeconds <= startTimeSeconds) {
        throw new Error('End time must be after start time');
      }

      const softCap = parseFloat(formData.softCap);
      const hardCap = parseFloat(formData.hardCap);
      const minContribution = parseFloat(formData.minContribution);
      const maxContribution = parseFloat(formData.maxContribution);

      if (hardCap <= softCap) {
        throw new Error('Hard cap must be greater than soft cap');
      }

      if (maxContribution <= minContribution) {
        throw new Error('Max contribution must be greater than min contribution');
      }

      if (minContribution <= 0 || maxContribution <= 0 || softCap <= 0 || hardCap <= 0) {
        throw new Error('All amounts must be greater than 0');
      }

      if (!window.ethereum) {
        throw new Error("Please install MetaMask");
      }

      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // Get factory address for V2
      let factoryAddress;
      try {
        factoryAddress = getNetworkContractAddress(chainId, 'factoryAddressV2');
      } catch (error) {
        throw new Error("TokenFactory V2 is not yet deployed on this network. Please use V1 for now.");
      }

      if (!factoryAddress) {
        throw new Error("TokenFactory V2 is not yet deployed on this network. Please use V1 for now.");
      }

      console.log("V2 Factory address:", factoryAddress);

      // Create contract instance with proper ABI
      const factoryV2 = new Contract(factoryAddress, TokenFactory_v2.abi, signer);

      // Get deployment fee first
      const deploymentFee = await factoryV2.deploymentFee();
      console.log("Deployment fee:", deploymentFee.toString());

      // Convert values to proper format
      const tokenDecimals = Number(formData.decimals);
      if (isNaN(tokenDecimals) || tokenDecimals < 0 || tokenDecimals > 18) {
        throw new Error('Invalid decimals value. Must be between 0 and 18.');
      }

      const initialSupplyAmount = parseUnits(formData.initialSupply, tokenDecimals);
      const softCapAmount = parseUnits(formData.softCap, tokenDecimals);
      const hardCapAmount = parseUnits(formData.hardCap, tokenDecimals);
      const minContributionAmount = parseUnits(formData.minContribution, tokenDecimals);
      const maxContributionAmount = parseUnits(formData.maxContribution, tokenDecimals);
      const presaleRateAmount = parseUnits(formData.presaleRate, tokenDecimals);
      const startTime = BigInt(Math.floor(new Date(formData.startTime).getTime() / 1000));
      const endTime = BigInt(Math.floor(new Date(formData.endTime).getTime() / 1000));

      console.log("Converted amounts:", {
        initialSupply: initialSupplyAmount.toString(),
        softCap: softCapAmount.toString(),
        hardCap: hardCapAmount.toString(),
        minContribution: minContributionAmount.toString(),
        maxContribution: maxContributionAmount.toString(),
        presaleRate: presaleRateAmount.toString(),
        decimals: tokenDecimals
      });

      // Prepare transaction parameters
      const params = [
        formData.name,
        formData.symbol,
        tokenDecimals,
        initialSupplyAmount,
        softCapAmount,
        hardCapAmount,
        minContributionAmount,
        maxContributionAmount,
        startTime,
        endTime,
        presaleRateAmount,
        formData.whitelistEnabled
      ];

      // Try to estimate gas with value parameter
      let gasLimit;
      try {
        // First verify the contract interface is working
        const encodedData = factoryV2.interface.encodeFunctionData('deployToken', params);
        console.log("Encoded function data:", encodedData);

        // Estimate gas with proper value parameter
        const gasEstimate = await provider.estimateGas({
          to: factoryAddress,
          from: await signer.getAddress(),
          value: deploymentFee,
          data: encodedData
        });

        console.log("Estimated gas:", gasEstimate.toString());
        // Increase buffer to 50% to ensure successful deployment
        gasLimit = gasEstimate * BigInt(1500) / BigInt(1000);
      } catch (error) {
        console.error("Gas estimation failed:", error);
        // Use higher conservative gas limit
        gasLimit = BigInt(2000000); // 2M gas as fallback
      }

      // Get current gas price with higher buffer
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice || parseUnits('10', 'gwei'); // 10 gwei fallback

      // Use legacy transaction format with higher gas settings
      const txOptions = {
        gasLimit,
        value: deploymentFee,
        gasPrice: gasPrice * BigInt(1500) / BigInt(1000), // 50% buffer
        nonce: await provider.getTransactionCount(await signer.getAddress())
      };

      console.log("Deployment parameters:", {
        gasLimit: gasLimit.toString(),
        gasPrice: txOptions.gasPrice.toString(),
        deploymentFee: deploymentFee.toString(),
        nonce: txOptions.nonce
      });

      // Deploy token with optimized parameters
      const tx = await factoryV2.deployToken(...params, txOptions);
      console.log("Transaction sent:", tx.hash);
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      console.log("Transaction confirmed:", receipt);

      // Check for TokenCreated event
      const tokenCreatedEvent = receipt.logs
        .map((log: { topics: string[], data: string }) => {
          try {
            return factoryV2.interface.parseLog({
              topics: log.topics,
              data: log.data
            });
          } catch (e) {
            return null;
          }
        })
        .find((event: LogDescription | null) => event?.name === 'TokenCreated');

      if (!tokenCreatedEvent) {
        throw new Error('Token creation event not found in transaction logs');
      }

      const tokenAddress = tokenCreatedEvent.args.tokenAddress;
      console.log("New token deployed at:", tokenAddress);

      // Show success message with explorer link
      const explorerUrl = getExplorerUrl(chainId, 'token');
      setSuccessInfo({
        message: 'Token created successfully!',
        tokenAddress,
        explorerUrl: `${explorerUrl}/address/${tokenAddress}`,
        symbol: formData.symbol,
        initialSupply: formData.initialSupply,
        owner: await signer.getAddress()
      });

      showToast('success', 'Token created successfully!', `${explorerUrl}/tx/${tx.hash}`);

      // Reset form
      setFormData(defaultValues);
    } catch (error: any) {
      console.error("Error creating token:", error);
      
      // Extract revert reason if available
      let errorMessage = error.message || 'Unknown error occurred';
      if (error.data && window.ethereum) {
        try {
          // Get factory instance for error parsing
          const provider = new BrowserProvider(window.ethereum);
          const factoryAddress = getNetworkContractAddress(chainId!, 'factoryAddressV2');
          if (factoryAddress) {
            const factory = new Contract(factoryAddress, TokenFactory_v2.abi, provider);
            const revertData = factory.interface.parseError(error.data);
            if (revertData) {
              errorMessage = `Contract reverted: ${revertData.name}`;
            }
          }
        } catch (e) {
          // If we can't parse the error, use the original message
        }
      }
      
      showToast('error', `Failed to create token: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
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
      </div>
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
              className={`btn btn-secondary ${(!isConnected || loading) ? 'btn-disabled' : ''}`}
              disabled={!isConnected || loading}
            >
              {loading ? 'Deploying...' : (isConnected ? 'Deploy Token' : 'Connect Wallet to Deploy')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 