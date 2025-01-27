import { useState } from 'react';
import { ethers } from 'ethers';
import { useNetwork } from '../contexts/NetworkContext';
import TokenFactory_v2 from '../contracts/abi/TokenFactory_v2.json';
import { getContractAddress } from '../config/networks';
import { Toast } from './ui/Toast';
import { Log } from 'ethers';
import { Contract } from 'ethers';
import { BrowserProvider } from 'ethers';
import { formatEther } from 'ethers';

interface TokenFormV2Props {
  isConnected: boolean;
}

interface FormData {
  name: string;
  symbol: string;
  decimals: number;
  initialSupply: string;
  price: string;
  softCap: string;
  hardCap: string;
  minContribution: string;
  maxContribution: string;
  presaleRate: string;
  startTime: string;
  endTime: string;
  whitelistEnabled: boolean;
}

const defaultValues: FormData = {
  name: "Test Token",
  symbol: "TEST",
  decimals: 18,
  initialSupply: "1000000",
  price: "0.001",
  softCap: "100",
  hardCap: "1000",
  minContribution: "0.1",
  maxContribution: "10",
  presaleRate: "1000",
  startTime: "",
  endTime: "",
  whitelistEnabled: false
};

const deploymentFee = ethers.parseEther("0.0001"); // 0.0001 ETH deployment fee

export function TokenFormV2({ isConnected }: TokenFormV2Props) {
  const { chainId } = useNetwork();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error', message: string, link?: string } | null>(null);

  const [formData, setFormData] = useState<FormData>(defaultValues);

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
      [name]: type === 'checkbox' ? checked : 
              name === 'decimals' ? Number(value) :
              value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check for any web3 provider
    const provider = window.ethereum || 
                    (window as any).web3?.currentProvider || 
                    (window as any).walletProvider;
                    
    if (!provider) {
      showToast('error', 'Please install a Web3 wallet (MetaMask, Trust Wallet, etc.)');
      return;
    }

    if (!isConnected) {
      try {
        // Try standard eth_requestAccounts first
        await provider.request({ method: 'eth_requestAccounts' });
      } catch (error) {
        try {
          // Fallback for older wallets
          await provider.enable();
        } catch (error) {
          showToast('error', 'Please connect your wallet to create tokens');
          return;
        }
      }
    }

    try {
      setLoading(true);
      const ethersProvider = new BrowserProvider(provider);
      const signer = await ethersProvider.getSigner();
      const factoryAddress = getContractAddress(chainId, 'TokenFactory_v2');
      
      if (!factoryAddress) {
        showToast('error', 'Contract not deployed on this network');
        return;
      }

      // First verify the contract exists and has the correct interface
      const code = await ethersProvider.getCode(factoryAddress);
      if (code === '0x') {
        showToast('error', 'Contract not found at the specified address');
        return;
      }

      // Create contract instance
      const factory = new Contract(
        factoryAddress,
        TokenFactory_v2.abi,
        signer
      );

      // Verify contract interface by checking required functions
      try {
        // Check if the deployToken function exists and has the correct signature
        const deployTokenFragment = factory.interface.getFunction('deployToken');
        if (!deployTokenFragment) {
          showToast('error', 'Contract does not have deployToken function. Wrong contract address?');
          return;
        }

        // Verify the function has the correct parameters
        const expectedParams = [
          'string', 'string', 'uint8', 'uint256', 'uint256', 'uint256',
          'uint256', 'uint256', 'uint256', 'uint256', 'uint256', 'bool'
        ];
        const actualParams = deployTokenFragment.inputs.map(input => input.type);
        if (JSON.stringify(actualParams) !== JSON.stringify(expectedParams)) {
          showToast('error', 'Contract has incorrect deployToken function signature. Wrong contract version?');
          return;
        }

        // Try to read contract bytecode to verify it's actually a contract
        const bytecode = await ethersProvider.getCode(factoryAddress);
        if (bytecode === '0x' || bytecode === '0x0') {
          showToast('error', 'No contract found at this address');
          return;
        }

        // Only check version if needed (optional)
        if (factory.interface.hasFunction('VERSION')) {
          try {
            const version = await factory.VERSION();
            if (version && !version.includes('2')) {
              showToast('error', `Wrong contract version detected: ${version}. Expected V2 factory.`);
              return;
            }
          } catch (e) {
            // Version check failed, but we can continue if the main function exists
            console.log('Version check failed, continuing with deployment');
          }
        }
      } catch (error: any) {
        console.error('Contract interface verification failed:', error);
        showToast('error', 'Invalid contract interface - please check network and contract address');
        return;
      }

      // Convert values with proper decimal handling
      const initialSupply = ethers.parseUnits(formData.initialSupply, 0); // Raw value since contract handles decimals
      const softCap = ethers.parseUnits(formData.softCap, 18);
      const hardCap = ethers.parseUnits(formData.hardCap, 18);
      const minContribution = ethers.parseUnits(formData.minContribution, 18);
      const maxContribution = ethers.parseUnits(formData.maxContribution, 18);
      const startTime = Math.floor(new Date(formData.startTime).getTime() / 1000);
      const endTime = Math.floor(new Date(formData.endTime).getTime() / 1000);

      // Validate inputs
      if (softCap > hardCap) {
        showToast('error', 'Soft cap cannot be greater than hard cap');
        return;
      }
      if (minContribution > maxContribution) {
        showToast('error', 'Minimum contribution cannot be greater than maximum');
        return;
      }
      if (startTime >= endTime) {
        showToast('error', 'Start time must be before end time');
        return;
      }

      // Create transaction data
      const txData = {
        to: factoryAddress,
        data: factory.interface.encodeFunctionData('deployToken', [
          formData.name,
          formData.symbol,
          formData.decimals,
          initialSupply,
          softCap,
          hardCap,
          minContribution,
          maxContribution,
          startTime,
          endTime,
          formData.presaleRate,
          formData.whitelistEnabled
        ]),
        value: deploymentFee
      };

      // Try low-level call first to get more detailed error
      try {
        console.log('Attempting low-level call to check transaction...');
        const rawProvider = provider as any;
        const result = await rawProvider.request({
          method: 'eth_call',
          params: [{
            from: await signer.getAddress(),
            to: factoryAddress,
            data: txData.data,
            value: ethers.toBeHex(deploymentFee)
          }, 'latest']
        });
        console.log('Low-level call result:', result);
      } catch (callError: any) {
        console.error('Low-level call error:', callError);
        // Try to extract error data from MetaMask format
        const errorData = callError?.data;
        if (errorData) {
          try {
            // Try to decode custom error if present
            const decodedError = factory.interface.parseError(errorData);
            if (decodedError) {
              showToast('error', `Contract error: ${decodedError.name}`);
              return;
            }
          } catch (e) {
            // If we can't decode the error, continue with other methods
            console.log('Could not decode error data:', e);
          }
        }
      }

      // Try gas estimation
      let gasEstimate;
      try {
        console.log('Estimating gas for transaction...');
        gasEstimate = await ethersProvider.estimateGas(txData);
      } catch (error: any) {
        console.error('Gas estimation error:', error);
        
        // Try to get a more detailed error using a direct call
        try {
          console.log('Attempting direct call to get more details...');
          const result = await ethersProvider.call(txData);
          console.log('Direct call result:', result);
        } catch (callError: any) {
          console.error('Direct call error:', callError);
          
          // Try to extract the revert reason from various error formats
          const revertReason = 
            // Try to get the revert reason from the error data
            (callError.data && callError.data.replace('Reverted ', '')) ||
            // Look for execution reverted message
            (callError.message && callError.message.includes('execution reverted') && 
             callError.message.split('execution reverted:')[1]?.trim()) ||
            // Look for reason in the error object
            (callError.reason) ||
            // Look for custom error data
            (callError.error?.data?.originalError?.data && 
             ethers.toUtf8String(callError.error.data.originalError.data)) ||
            // Look for MetaMask specific error format
            (callError.error?.data?.originalError?.message) ||
            // Default message
            'Contract rejected the transaction - please verify your inputs';

          showToast('error', `Transaction would fail: ${revertReason}`);
          return;
        }
        
        // If direct call succeeded but gas estimation failed, show a different error
        showToast('error', 'Failed to estimate gas - the transaction may fail');
        return;
      }

      // Add 20% buffer to gas estimate
      const gasLimit = Math.floor(Number(gasEstimate) * 1.2);

      try {
        console.log('Sending transaction with gas limit:', gasLimit);
        const tx = await signer.sendTransaction({
          ...txData,
          gasLimit
        });

        showToast('success', 'Transaction submitted...');
        
        const receipt = await tx.wait();
        if (!receipt) {
          throw new Error('Transaction failed - no receipt received');
        }
        
        const parsedEvent = receipt?.logs
          .map((log: Log) => {
            try {
              return factory.interface.parseLog({ topics: log.topics, data: log.data });
            } catch (e) {
              return null;
            }
          })
          .find((event: ethers.LogDescription | null) => event?.name === 'TokenDeployed');

        const tokenAddress = parsedEvent?.args?.tokenAddress;
        if (tokenAddress) {
          showToast('success', `Token deployed at ${tokenAddress}`);
          resetForm();
        } else {
          showToast('error', 'Token created but address not found in events');
        }
      } catch (error: any) {
        console.error('Transaction error:', error);
        const errorMessage = error.message || 'Failed to deploy token';
        showToast('error', errorMessage.includes('insufficient funds') ? 
          'Insufficient funds to deploy token' : 
          errorMessage.includes('user rejected') ?
          'Transaction was rejected' :
          errorMessage.includes('missing revert data') ?
          'Contract rejected the transaction - please check your inputs and try again' :
          errorMessage
        );
      }
    } catch (error: any) {
      console.error('Error deploying token:', error);
      const errorMessage = error.message || 'Failed to deploy token';
      showToast('error', errorMessage.includes('insufficient funds') ? 
        'Insufficient funds to deploy token' : 
        errorMessage.includes('user rejected') ?
        'Transaction was rejected' :
        errorMessage.includes('missing revert data') ?
        'Contract rejected the transaction - please check your inputs and try again' :
        errorMessage
      );
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData(defaultValues);
  };

  return (
    <div className="form-container">
      {toast && <Toast type={toast.type} message={toast.message} link={toast.link} />}
      {error && (
        <div className="error-message mb-4">
          {error}
        </div>
      )}
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
                step="1"
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
              <label className="form-label">Token Price (ETH)</label>
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
              <label className="form-label">Soft Cap (ETH)</label>
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
              <label className="form-label">Hard Cap (ETH)</label>
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
              <label className="form-label">Min Contribution (ETH)</label>
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
              <label className="form-label">Max Contribution (ETH)</label>
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
    </div>
  );
} 