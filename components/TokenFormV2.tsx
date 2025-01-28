import { useState, useEffect } from 'react';
import { BrowserProvider, Contract, parseUnits, Log } from 'ethers';
import { useNetwork } from '../contexts/NetworkContext';
import TokenFactory_v2 from '../contracts/abi/TokenFactory_v2.json';
import { getExplorerUrl } from '../config/networks';
import { getNetworkContractAddress } from '../config/contracts';
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

      const factoryV2 = new Contract(factoryAddress, TokenFactory_v2.abi, signer);

      // Log available methods
      console.log("Available methods:", Object.keys(factoryV2.interface.fragments).filter(key => 
        factoryV2.interface.getFunction(key) !== null
      ));

      // Convert values to proper format
      const initialSupplyWei = parseUnits(formData.initialSupply, 18);
      const softCapWei = parseUnits(formData.softCap, 18);
      const hardCapWei = parseUnits(formData.hardCap, 18);
      const minContributionWei = parseUnits(formData.minContribution, 18);
      const maxContributionWei = parseUnits(formData.maxContribution, 18);
      const presaleRate = BigInt(formData.presaleRate);
      const startTime = BigInt(Math.floor(new Date(formData.startTime).getTime() / 1000));
      const endTime = BigInt(Math.floor(new Date(formData.endTime).getTime() / 1000));

      // Log parameters for debugging
      console.log("Creating token with parameters:", {
        name: formData.name,
        symbol: formData.symbol,
        decimals: 18,
        initialSupply: initialSupplyWei.toString(),
        softCap: softCapWei.toString(),
        hardCap: hardCapWei.toString(),
        minContribution: minContributionWei.toString(),
        maxContribution: maxContributionWei.toString(),
        startTime: startTime.toString(),
        endTime: endTime.toString(),
        presaleRate: presaleRate.toString(),
        whitelistEnabled: formData.whitelistEnabled
      });

      // Encode function data for verification
      const functionData = factoryV2.interface.encodeFunctionData("deployToken", [
        formData.name,
        formData.symbol,
        18, // decimals
        initialSupplyWei,
        softCapWei,
        hardCapWei,
        minContributionWei,
        maxContributionWei,
        startTime,
        endTime,
        presaleRate,
        formData.whitelistEnabled
      ]);
      
      console.log("Encoded function data:", functionData);

      // Try to estimate gas first
      try {
        const gasEstimate = await factoryV2.deployToken.estimateGas(
          formData.name,
          formData.symbol,
          18, // decimals
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
        console.log("Estimated gas:", gasEstimate.toString());
      } catch (error: any) {
        console.error("Gas estimation failed:", {
          error,
          errorData: error.data,
          errorArgs: error.errorArgs,
          errorName: error.errorName,
          errorSignature: error.errorSignature,
          reason: error.reason
        });
        // Continue with deployment anyway, with higher gas limit
      }

      // Create token with proper parameter order matching the contract
      const tx = await factoryV2.deployToken(
        formData.name,
        formData.symbol,
        18, // decimals
        initialSupplyWei,
        softCapWei,
        hardCapWei,
        minContributionWei,
        maxContributionWei,
        startTime,
        endTime,
        presaleRate,
        formData.whitelistEnabled,
        { 
          gasLimit: 8000000, // Increased gas limit further
          value: await factoryV2.deploymentFee() // Add deployment fee
        }
      );

      setLoading(true);
      showToast('success', 'Transaction submitted. Waiting for confirmation...');
      
      const receipt = await tx.wait();
      
      // Get token address from event
      const event = receipt.logs
        .map((log: Log) => {
          try {
            return factoryV2.interface.parseLog(log as any);
          } catch (e) {
            console.error("Error parsing log:", e);
            return null;
          }
        })
        .find((event: LogDescription | null) => event?.name === "TokenDeployed");

      if (!event) {
        throw new Error("Could not find token address in transaction logs");
      }

      const tokenAddress = event.args.tokenAddress || event.args.token;
      const explorerUrl = getExplorerUrl(chainId, tokenAddress, 'token');
      const userAddress = await signer.getAddress();

      setSuccessInfo({
        message: 'Token created successfully!',
        tokenAddress,
        explorerUrl,
        symbol: formData.symbol,
        initialSupply: formData.initialSupply,
        owner: userAddress
      });

      // Reset form
      setFormData(defaultValues);
    } catch (error: any) {
      console.error("Error creating token:", {
        error,
        message: error.message,
        data: error.data,
        code: error.code,
        errorName: error.errorName,
        errorSignature: error.errorSignature,
        reason: error.reason,
        transaction: error.transaction,
        receipt: error.receipt
      });
      showToast('error', error.message || 'Failed to create token');
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