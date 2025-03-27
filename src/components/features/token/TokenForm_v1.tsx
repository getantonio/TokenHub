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
import { safeNormalizeAddress, getFactoryAddress } from '@/utils/address';

// Define styling constants - enhanced to ensure inputs remain gray-900 with important flag
const inputClasses = "mt-2 block w-full rounded-md border-gray-800 !bg-gray-900 text-white placeholder-gray-500 focus:!bg-gray-900 focus:ring-0 focus:border-gray-700 hover:!bg-gray-900 active:!bg-gray-900";
const labelClasses = "block text-sm font-medium text-gray-300";

const TokenFactoryABI = TokenFactory_v1.abi;
const TokenTemplateABI = TokenTemplate_v1.abi;
const TOKEN_DECIMALS = 18;

// Networks known to support v1 factory
const V1_SUPPORTED_NETWORKS = [
  { id: 11155111, name: 'Ethereum Sepolia' },
  { id: 421614, name: 'Arbitrum Sepolia' },
  { id: 11155420, name: 'Optimism Sepolia' },
  { id: 80002, name: 'Polygon Amoy' },
  { id: 97, name: 'BSC Testnet' }
];

// Add the ABI for our new AmoyTokenFactory
const AMOY_FACTORY_ABI = [
  "function owner() external view returns (address)",
  "function deploymentFee() external view returns (uint256)",
  "function getTokensByUser(address) external view returns (address[])",
  "function createToken(string,string,uint256) external payable returns (address)",
  "function isTokenFromFactory(address) external view returns (bool)",
  "event TokenCreated(address indexed tokenAddress, address indexed creator)"
];

// Decide which ABI to use based on network
const getFactoryABI = (chainId: number | null) => {
  if (chainId === 80002) {
    return AMOY_FACTORY_ABI;
  }
  return TokenFactoryABI;
};

// Utility function to safely create a Contract instance
const safeCreateContract = (address: string, abi: any, signerOrProvider: any): Contract => {
  // Always use lowercase address to avoid checksum issues
  const safeAddress = address.toLowerCase();
  return new Contract(safeAddress, abi, signerOrProvider);
};

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

interface NetworkStatus {
  isSupported: boolean;
  hasDeployedFactory: boolean | null;
  message: string;
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
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isSupported: true,
    hasDeployedFactory: null,
    message: ''
  });
  const [isFactoryDeployed, setIsFactoryDeployed] = useState<boolean | null>(null);
  const { toast } = useToast();

  // Function to check if the factory contract is deployed at the given address
  const checkFactoryDeployment = async (factoryAddress: string) => {
    if (!window.ethereum || !factoryAddress) return;
    
    try {
      const provider = new BrowserProvider(window.ethereum);
      
      // Check if there's code at the address
      const code = await provider.getCode(factoryAddress);
      if (code === '0x') {
        console.log(`No contract deployed at address ${factoryAddress}`);
        setNetworkStatus({
          isSupported: true,
          hasDeployedFactory: false,
          message: `No contract deployed at address ${factoryAddress}`
        });
        setIsFactoryDeployed(false);
        return;
      }
      
      // Try to instantiate the contract and call a view function
      try {
        const contract = new Contract(factoryAddress, getFactoryABI(chainId), provider);
        const fee = await contract.deploymentFee();
        console.log(`Factory contract verified at ${factoryAddress}, deployment fee: ${formatUnits(fee, 'ether')} ETH`);
        setNetworkStatus({
          isSupported: true,
          hasDeployedFactory: true,
          message: 'Factory contract verified'
        });
        setIsFactoryDeployed(true);
        setDeploymentFee(formatUnits(fee, 'ether'));
      } catch (error) {
        console.error('Error calling factory contract:', error);
        setNetworkStatus({
          isSupported: true,
          hasDeployedFactory: false,
          message: 'Contract exists but does not appear to be a TokenFactory'
        });
        setIsFactoryDeployed(false);
      }
    } catch (error) {
      console.error('Error checking factory deployment:', error);
      setNetworkStatus({
        isSupported: true,
        hasDeployedFactory: false,
        message: 'Error checking factory deployment'
      });
      setIsFactoryDeployed(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      setProvider(new BrowserProvider(window.ethereum));
    }
  }, []);

  useEffect(() => {
    if (chainId) {
      // Get factory address from environment variable for Polygon Amoy
      let factoryAddress;
      if (chainId === 80002) {
        // Use environment variable for Polygon Amoy
        factoryAddress = process.env.NEXT_PUBLIC_POLYGONAMOY_FACTORY_ADDRESS_V1;
        console.log("Using environment variable for Polygon Amoy:", factoryAddress);
      } else if (chainId === 421614) {
        // Use environment variable for Arbitrum Sepolia
        factoryAddress = process.env.NEXT_PUBLIC_ARBITRUMSEPOLIA_FACTORY_ADDRESS_V1;
        console.log("Using environment variable for Arbitrum Sepolia:", factoryAddress);
      } else {
        factoryAddress = getFactoryAddress(FACTORY_ADDRESSES, 'v1', chainId);
      }
      
      console.log("Environment variable value:", process.env.NEXT_PUBLIC_POLYGONAMOY_FACTORY_ADDRESS_V1);
      console.log("Factory address after resolution:", factoryAddress);
      
      // Always assume network is supported, just check the factory
      if (!factoryAddress) {
        setNetworkStatus({
          isSupported: true,
          hasDeployedFactory: false, 
          message: 'No factory address configured for this network'
        });
        return;
      }
      
      // At this point we have a configured address, check if factory is deployed
      setIsFactoryDeployed(null);
      checkFactoryDeployment(factoryAddress);
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
        const factoryAddress = FACTORY_ADDRESSES.v1[chainId];
        if (!factoryAddress) {
          setDeploymentFee('Not available on this network');
          return;
        }
        
        const factory = new Contract(factoryAddress, getFactoryABI(chainId), signer);
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
      
      // Get factory address from environment variable for Polygon Amoy
      let factoryAddress;
      if (chainId === 80002) {
        // Use environment variable for Polygon Amoy
        factoryAddress = process.env.NEXT_PUBLIC_POLYGONAMOY_FACTORY_ADDRESS_V1;
        console.log("Using environment variable for Polygon Amoy:", factoryAddress);
      } else if (chainId === 421614) {
        // Use environment variable for Arbitrum Sepolia
        factoryAddress = process.env.NEXT_PUBLIC_ARBITRUMSEPOLIA_FACTORY_ADDRESS_V1;
        console.log("Using environment variable for Arbitrum Sepolia:", factoryAddress);
      } else {
        factoryAddress = getFactoryAddress(FACTORY_ADDRESSES, 'v1', chainId);
      }
      
      console.log("Using factory address:", factoryAddress);
      
      if (!factoryAddress) {
        console.error("Factory address not found for this network");
        showToast('error', 'TokenFactory V1 is not deployed on this network');
        setIsLoading(false);
        return;
      }

      // Check if the contract exists at this address
      try {
        const code = await provider.getCode(factoryAddress);
        if (code === '0x') {
          console.error(`No contract deployed at address ${factoryAddress}`);
          showToast('error', `No contract deployed at address ${factoryAddress}`);
          setIsLoading(false);
          return;
        }
        console.log("Contract code exists at address:", factoryAddress);
      } catch (error) {
        console.error("Error checking contract code:", error);
        showToast('error', `Error verifying contract at ${factoryAddress}`);
        setIsLoading(false);
        return;
      }

      const factory = new Contract(factoryAddress, getFactoryABI(chainId), signer);
      
      // Get deployment fee - skip for Polygon Amoy
      let fee;
      if (chainId === 80002) {
        console.log("Skipping deployment fee check for Polygon Amoy");
        fee = BigInt(0); // Use zero fee for Polygon Amoy
      } else {
        try {
          fee = await factory.deploymentFee();
          console.log("Successfully retrieved deployment fee:", formatUnits(fee, 'ether'), "ETH");
        } catch (error) {
          console.error("Error calling deploymentFee function:", error);
          showToast('error', 'The factory contract exists but is not responding correctly');
          setIsLoading(false);
          return;
        }
      }
      
      const initialSupplyWei = parseUnits(formData.initialSupply, TOKEN_DECIMALS);
      const maxSupplyWei = parseUnits(formData.maxSupply, TOKEN_DECIMALS);

      try {
        let tx;
        
        if (chainId === 80002) {
          console.log("Using direct token creation for Polygon Amoy");
          
          const { name, symbol, initialSupply } = formData;
          
          console.log("Creating token with parameters:", {
            name,
            symbol,
            initialSupply
          });
          
          // Get fee
          const fee = await factory.deploymentFee();
          console.log("Deployment fee:", formatUnits(fee, "ether"), "ETH");
          
          // AmoyTokenFactory has a simpler interface - just name, symbol, initialSupply
          tx = await factory.createToken(
            name,
            symbol,
            initialSupply,
            { value: fee, gasLimit: 3000000 }
          );
        } else {
          // Normal flow for other networks
          tx = await factory.createToken(
            formData.name,
            formData.symbol,
            initialSupplyWei,
            maxSupplyWei,
            formData.blacklistEnabled,
            formData.timeLockEnabled,
            { value: fee }
          );
        }

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
        console.error('Error in createToken transaction:', error);

        // Log comprehensive debug information
        if (error.receipt) {
          console.log('Transaction receipt found in error:', error.receipt);
          console.log('Transaction status:', error.receipt.status);
          console.log('Gas used:', error.receipt.gasUsed.toString());
          
          if (error.receipt.logs && error.receipt.logs.length > 0) {
            console.log('Transaction logs:', error.receipt.logs);
          }
        }
        
        // More detailed transaction data inspection
        if (error.transaction) {
          console.log('Transaction details:', {
            to: error.transaction.to,
            from: error.transaction.from,
            value: error.transaction.value,
            gasLimit: error.transaction.gasLimit,
            dataPresent: !!error.transaction.data,
            dataEmpty: error.transaction.data === '' || error.transaction.data === '0x',
            dataLength: error.transaction.data ? error.transaction.data.length : 0,
            dataPrefix: error.transaction.data ? error.transaction.data.substring(0, 10) : ''
          });
        }
        
        // Check for specific error types
        if (error.message && error.message.includes("user rejected transaction")) {
          showToast('error', 'Transaction was rejected by the user');
        } else if (error.message && error.message.includes("insufficient funds")) {
          showToast('error', 'Insufficient funds to create token');
        } else if (chainId === 80002) {
          // Specific Polygon Amoy error handling
          if (error.transaction && (!error.transaction.data || error.transaction.data === '0x' || error.transaction.data === '')) {
            showToast('error', 'Transaction failed: Empty function data. This appears to be a MetaMask issue with Polygon Amoy. Please try using Sepolia or another network.');
          } else if (error.message.includes("execution reverted")) {
            showToast('error', 'Transaction execution reverted on Polygon Amoy. Please try on Ethereum Sepolia or another network, as Polygon Amoy is having issues.');
          } else {
            showToast('error', 'Error creating token on Polygon Amoy. The network is experimental and may have issues. Try Ethereum Sepolia instead.');
          }
        } else {
          showToast('error', `Error creating token: ${error.message || 'Unknown error'}`);
        }
      }
    } catch (error: any) {
      console.error('Error creating token:', error);
      showToast('error', error.message || 'Failed to create token');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
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
              <Label htmlFor="name" className={labelClasses}>Token Name</Label>
              <Input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={inputClasses}
                placeholder="TokenFactory Test v1"
                required
              />
            </div>

            <div>
              <Label htmlFor="symbol" className={labelClasses}>Token Symbol</Label>
              <Input
                type="text"
                id="symbol"
                name="symbol"
                value={formData.symbol}
                onChange={handleChange}
                className={inputClasses}
                placeholder="TFT1"
                required
              />
            </div>

            <div>
              <Label htmlFor="initialSupply" className={labelClasses}>
                Initial Supply
                <span className="ml-1 text-xs text-gray-400">(tokens will be sent to your wallet)</span>
              </Label>
              <div className="relative rounded-md shadow-sm">
                <Input
                  type="text"
                  id="initialSupply"
                  name="initialSupply"
                  value={formData.initialSupply}
                  onChange={handleChange}
                  className={inputClasses}
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
              <Label htmlFor="maxSupply" className={labelClasses}>
                Max Supply
                <span className="ml-1 text-xs text-gray-400">(maximum tokens that can ever exist)</span>
              </Label>
              <div className="relative rounded-md shadow-sm">
                <Input
                  type="text"
                  id="maxSupply"
                  name="maxSupply"
                  value={formData.maxSupply}
                  onChange={handleChange}
                  className={inputClasses}
                  placeholder="1000000"
                  required
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <span className="text-gray-400 sm:text-sm">{formData.symbol}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="blacklistEnabled"
                name="blacklistEnabled"
                checked={formData.blacklistEnabled}
                onCheckedChange={(checked) => 
                  setFormData(prev => ({ ...prev, blacklistEnabled: checked }))
                }
                className="data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-gray-900 bg-gray-900 border-gray-700"
              />
              <Label htmlFor="blacklistEnabled" className="cursor-pointer text-gray-300">Enable Blacklist</Label>
              <InfoIcon content="Allows the owner to blacklist addresses to prevent them from making transactions with this token" />
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="timeLockEnabled"
                name="timeLockEnabled"
                checked={formData.timeLockEnabled}
                onCheckedChange={(checked) => 
                  setFormData(prev => ({ ...prev, timeLockEnabled: checked }))
                }
                className="data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-gray-900 bg-gray-900 border-gray-700"
              />
              <Label htmlFor="timeLockEnabled" className="cursor-pointer text-gray-300">Enable TimeLock</Label>
              <InfoIcon content="Creates a time-delay for certain owner-only operations, increasing security" />
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700" 
              disabled={!isConnected || isLoading}
            >
              {isLoading ? 'Creating...' : !isConnected ? 'Connect Wallet to Deploy' : 'Create Token'}
            </Button>
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