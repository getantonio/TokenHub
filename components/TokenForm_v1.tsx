import React, { useState } from 'react';
import { BrowserProvider, Contract, parseUnits, formatUnits, formatEther } from 'ethers';
import { getContractAddress } from '../config/networks';
import { useNetwork } from '../contexts/NetworkContext';
import TokenFactory_v1 from '../contracts/abi/TokenFactory_v1.json';
import { Toast } from './ui/Toast';
import { ethers } from 'ethers';
import { Log } from 'ethers';

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

const defaultValues: FormData = {
  name: "TokenFactory Test v1",
  symbol: "TFT1",
  initialSupply: "1000000",
  maxSupply: "1000000",
  blacklistEnabled: false,
  timeLockEnabled: false,
};

const deploymentFee = ethers.parseEther("0.0001"); // 0.0001 ETH deployment fee

export default function TokenForm_v1({ isConnected }: Props) {
  const { chainId } = useNetwork();
  const [formData, setFormData] = useState<FormData>(defaultValues);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [successInfo, setSuccessInfo] = useState<{
    symbol: string;
    address: string;
    supply: string;
    owner: string;
  } | null>(null);

  const resetForm = () => {
    setFormData(defaultValues);
  };

  const showToast = (type: 'success' | 'error', message: string, link?: string) => {
    setToast({ type, message, link });
    if (type === 'error') {
      setTimeout(() => setToast(null), 10000);
    }
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
      setIsLoading(true);
      const ethersProvider = new BrowserProvider(provider);
      const signer = await ethersProvider.getSigner();
      const factoryAddress = getContractAddress(chainId, 'TokenFactory_v1');
      
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
        TokenFactory_v1.abi,
        signer
      );

      // Enhanced contract verification
      try {
        // First check if there's any bytecode at the address
        const bytecode = await ethersProvider.getCode(factoryAddress);
        if (bytecode === '0x' || bytecode === '0x0') {
          showToast('error', 'No contract found at this address');
          return;
        }

        // Verify the contract interface
        const createTokenFragment = factory.interface.getFunction('createToken');
        if (!createTokenFragment) {
          showToast('error', 'Contract does not have createToken function');
          return;
        }

        // Convert supply values to include decimals since contract will not multiply
        const initialSupply = ethers.parseUnits(formData.initialSupply, TOKEN_DECIMALS);
        const maxSupply = ethers.parseUnits(formData.maxSupply, TOKEN_DECIMALS);

        // Validate inputs
        if (initialSupply > maxSupply) {
          showToast('error', 'Initial supply cannot be greater than max supply');
          return;
        }

        // Try to call a view function to verify interface
        try {
          const fee = await factory.DEPLOYMENT_FEE();
          if (fee.toString() !== deploymentFee.toString()) {
            showToast('error', `Unexpected deployment fee. Expected ${formatEther(deploymentFee)} ETH`);
            return;
          }

          // Try a static call first to check if the transaction would succeed
          await factory.createToken.staticCall(
            formData.name,
            formData.symbol,
            initialSupply,
            maxSupply,
            formData.blacklistEnabled,
            formData.timeLockEnabled,
            { value: deploymentFee }
          );
        } catch (e: any) {
          console.error('Failed to verify contract:', e);
          const errorMessage = e.message || 'Transaction would fail';
          if (errorMessage.toLowerCase().includes('insufficient funds')) {
            showToast('error', 'Insufficient funds to deploy token');
          } else if (errorMessage.includes('missing revert data')) {
            showToast('error', 'Contract rejected the transaction - please verify your inputs');
          } else {
            showToast('error', `Transaction would fail: ${errorMessage}`);
          }
          return;
        }

        // Create transaction data with explicit gas limit
        const txData = {
          to: factoryAddress,
          data: factory.interface.encodeFunctionData('createToken', [
            formData.name,
            formData.symbol,
            initialSupply,
            maxSupply,
            formData.blacklistEnabled,
            formData.timeLockEnabled
          ]),
          value: deploymentFee,
          gasLimit: 3000000 // Set a reasonable gas limit
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
            .find((event: ethers.LogDescription | null) => event?.name === 'TokenCreated');

          const tokenAddress = parsedEvent?.args?.tokenAddress;
          if (tokenAddress) {
            showToast('success', `Token deployed at ${tokenAddress}`);
            resetForm();
          } else {
            showToast('error', 'Token created but address not found in events');
          }
        } catch (error: any) {
          console.error('Transaction error:', error);
          const errorMessage = error.message || 'Failed to create token';
          showToast('error', errorMessage.includes('insufficient funds') ? 
            'Insufficient funds to create token' : 
            errorMessage.includes('user rejected') ?
            'Transaction was rejected' :
            errorMessage.includes('missing revert data') ?
            'Contract rejected the transaction - please check your inputs and try again' :
            errorMessage
          );
        }
      } catch (error: any) {
        console.error('Error creating token:', error);
        const errorMessage = error.message || 'Failed to create token';
        showToast('error', errorMessage.includes('insufficient funds') ? 
          'Insufficient funds to create token' : 
          errorMessage.includes('user rejected') ?
          'Transaction was rejected' :
          errorMessage.includes('missing revert data') ?
          'Contract rejected the transaction - please check your inputs and try again' :
          errorMessage
        );
      }
    } catch (error: any) {
      console.error('Error creating token:', error);
      const errorMessage = error.message || 'Failed to create token';
      showToast('error', errorMessage.includes('insufficient funds') ? 
        'Insufficient funds to create token' : 
        errorMessage.includes('user rejected') ?
        'Transaction was rejected' :
        errorMessage.includes('missing revert data') ?
        'Contract rejected the transaction - please check your inputs and try again' :
        errorMessage
      );
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
  );
} 