import { useState, useEffect } from 'react';
import { BrowserProvider, Contract, parseUnits, formatUnits, JsonRpcProvider, parseEther, TransactionReceipt } from 'ethers';
import { getNetworkContractAddress } from '@config/contracts';
import { useChainId } from 'wagmi';
import TokenFactory_v1 from '@contracts/abi/TokenFactory_v1.json';
import TokenTemplate_v1 from '@contracts/abi/TokenTemplate_v1.json';
import { getExplorerUrl, getNetworkName } from '@/config/networks';
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
import { safeNormalizeAddress } from '@/utils/address';
import { useAccount } from 'wagmi';
import { ChainId } from '@/types/network';

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

// Add a helper function to handle explorer URL construction with address and type
const getExplorerUrlWithType = (chainId: number | null | undefined, addressOrHash: string, type: 'token' | 'tx' | 'address' = 'address'): string => {
  if (!chainId) return '#';
  // Cast to ChainId type before calling getExplorerUrl
  const chainIdAsEnum = chainId as ChainId;
  const baseUrl = getExplorerUrl(chainIdAsEnum);
  // We then append the type and address ourselves
  return `${baseUrl}/${type === 'tx' ? 'tx' : 'address'}/${addressOrHash}`;
};

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
  const chainId = useChainId();
  const { address } = useAccount();
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isSupported: true,
    hasDeployedFactory: null,
    message: ''
  });
  const [isFactoryDeployed, setIsFactoryDeployed] = useState<boolean | null>(null);
  const { toast } = useToast();

  // Function to check factory deployment (remains mostly the same, uses the provider state)
  const checkFactoryDeployment = async (factoryAddress: string, currentProvider: BrowserProvider | null) => {
    if (!currentProvider || !factoryAddress) return;
    
    try {
      // Check if there's code at the address
      const code = await currentProvider.getCode(factoryAddress);
      if (code === '0x') {
        console.log(`[checkFactory] No contract deployed at address ${factoryAddress}`);
        setNetworkStatus({ isSupported: true, hasDeployedFactory: false, message: `No factory contract deployed at ${factoryAddress}` });
        setIsFactoryDeployed(false);
        return;
      }
      
      // Try to instantiate and call
      try {
        const contract = new Contract(factoryAddress, getFactoryABI(chainId), currentProvider);
        const fee = await contract.deploymentFee(); // Example call
        console.log(`[checkFactory] Factory verified at ${factoryAddress}, fee: ${formatUnits(fee, 'ether')} ETH`);
        setNetworkStatus({ isSupported: true, hasDeployedFactory: true, message: 'Factory contract verified' });
        setIsFactoryDeployed(true);
        setDeploymentFee(formatUnits(fee, 'ether'));
      } catch (error) {
        console.error('[checkFactory] Error calling factory contract:', error);
        setNetworkStatus({ isSupported: true, hasDeployedFactory: false, message: 'Contract exists but is not a V1 factory' });
        setIsFactoryDeployed(false);
      }
    } catch (error) {
      console.error('[checkFactory] Error checking factory deployment:', error);
      setNetworkStatus({ isSupported: true, hasDeployedFactory: false, message: 'Error checking factory deployment' });
      setIsFactoryDeployed(false);
    }
  };

  // Effect to initialize provider and handle network changes
  useEffect(() => {
    let providerInstance: BrowserProvider | null = null;
    let chainChangedHandler: (() => void) | null = null;

    if (typeof window !== 'undefined' && window.ethereum) {
      // Standard provider from wallet
      providerInstance = new BrowserProvider(window.ethereum);
      setProvider(providerInstance);

      chainChangedHandler = () => {
        console.log("Network changed, re-initializing provider for TokenForm_v1_EVM...");
        setProvider(new BrowserProvider(window.ethereum));
      };

      window.ethereum.on('chainChanged', chainChangedHandler);

    } else {
      // Fallback for SSR or if window.ethereum isn't available initially
      // Attempt to create a JsonRpcProvider if on Arbitrum Sepolia and env var is set
      const arbitrumSepoliaRpc = process.env.NEXT_PUBLIC_ARBITRUMSEPOLIA_RPC_URL;
      if (chainId === 421614 && arbitrumSepoliaRpc) {
         console.warn("[TokenForm_v1_EVM] window.ethereum not found, attempting JsonRpcProvider fallback for Arbitrum Sepolia.")
         try {
            // Use JsonRpcProvider directly - NOTE: This won't use the connected wallet's signer
            // It's mainly for read operations or if the signer is handled differently.
            // This is a diagnostic step.
            const staticProvider = new JsonRpcProvider(arbitrumSepoliaRpc);
            // We can't set this as the main 'provider' state easily as it's not a BrowserProvider
            // But we can use it for specific checks if needed.
            console.log("[TokenForm_v1_EVM] Fallback JsonRpcProvider created.")
         } catch (e) {
            console.error("[TokenForm_v1_EVM] Failed to create fallback JsonRpcProvider:", e)
         }
      }
    }

    // Cleanup listener
    return () => {
      if (window.ethereum && chainChangedHandler && window.ethereum.removeListener) {
        window.ethereum.removeListener('chainChanged', chainChangedHandler);
      }
    };
  }, [chainId]); // Rerun if chainId changes, maybe to init fallback provider

  // Effect to check factory deployment when chainId or provider changes
  useEffect(() => {
    if (chainId && provider) {
      console.log(`[FactoryCheckEffect] chainId: ${chainId}, provider set: ${!!provider}`);
      let factoryAddress;
      if (chainId === 80002) {
        factoryAddress = process.env.NEXT_PUBLIC_POLYGONAMOY_FACTORY_ADDRESS_V1;
      } else if (chainId === 421614) {
        factoryAddress = process.env.NEXT_PUBLIC_ARBITRUMSEPOLIA_FACTORY_ADDRESS_V1;
      } else {
        factoryAddress = FACTORY_ADDRESSES.v1[chainId];
      }

      if (!factoryAddress) {
         console.log("[FactoryCheckEffect] No factory address configured.");
         setNetworkStatus({ isSupported: true, hasDeployedFactory: false, message: 'No factory address configured for this network' });
         setIsFactoryDeployed(false);
         setDeploymentFee('N/A');
      } else {
         console.log(`[FactoryCheckEffect] Checking deployment for factory: ${factoryAddress}`);
         setIsFactoryDeployed(null); // Reset while checking
         setDeploymentFee('Loading...'); // Reset fee while checking
         checkFactoryDeployment(factoryAddress, provider); // Pass the current provider
      }
    } else {
      console.log(`[FactoryCheckEffect] chainId or provider not available. chainId: ${chainId}, provider set: ${!!provider}`);
      // Reset status if chainId or provider is missing
      setNetworkStatus({ isSupported: true, hasDeployedFactory: null, message: 'Connecting...' });
      setIsFactoryDeployed(null);
      setDeploymentFee('...');
    }
  }, [chainId, provider]); // Add provider as a dependency

  // Fetch deployment fee (this might be redundant now if checkFactoryDeployment sets it)
  // Consider removing or adapting this if checkFactoryDeployment reliably sets the fee.
  /*
  useEffect(() => {
    async function fetchDeploymentFee() {
      // ... (needs provider from state)
    }
    fetchDeploymentFee();
  }, [chainId, provider, isConnected]); // Add provider
  */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentProvider = provider;

    if (isFactoryDeployed === false) {
         toast({ variant: 'destructive', title: 'Error', description: 'Factory contract not found or invalid on this network. Cannot deploy.' });
         return;
    }
     if (isFactoryDeployed === null) {
         toast({ variant: 'destructive', title: 'Error', description: 'Still verifying factory contract. Please wait a moment and try again.' });
         return;
    }

    if (!isConnected || !currentProvider || !address || !chainId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please ensure your wallet is connected.' });
      return;
    }
    
    // --- Create checkProvider (potentially JsonRpcProvider) for reads ---
    let rpcUrlToCheck: string | undefined;
    let isArbitrumSepolia = false;
    if (chainId === 421614) { // Arbitrum Sepolia
       rpcUrlToCheck = process.env.NEXT_PUBLIC_ARBITRUMSEPOLIA_RPC_URL;
       isArbitrumSepolia = true;
       console.log(`[handleSubmit] Using specific RPC check for Arbitrum Sepolia: ${rpcUrlToCheck}`);
    } 
    // Add else if for other chains needing specific RPC if necessary
    
    let checkProvider: BrowserProvider | JsonRpcProvider = currentProvider; // Default to wallet provider
    if (rpcUrlToCheck) {
        try {
            // Create JsonRpcProvider specifically for read operations on this chain
            checkProvider = new JsonRpcProvider(rpcUrlToCheck);
            console.log(`[handleSubmit] Created temporary JsonRpcProvider for read checks.`);
        } catch (err) {
            console.error(`[handleSubmit] Failed to create JsonRpcProvider for checks, falling back to BrowserProvider. Error:`, err);
            // If creating JsonRpcProvider fails, we fallback to the wallet provider for reads too
            checkProvider = currentProvider; 
        }
    }
    // --- End checkProvider setup ---

    let txResponse: ethers.TransactionResponse | null = null;

    try {
      setIsLoading(true);
      setError(null);
      setSuccessInfo(null);

      // Signer MUST come from the wallet provider
      const signer = await currentProvider.getSigner(); 

      let factoryAddress;
      if (chainId === 80002) {
        factoryAddress = process.env.NEXT_PUBLIC_POLYGONAMOY_FACTORY_ADDRESS_V1;
      } else if (chainId === 421614) {
        factoryAddress = process.env.NEXT_PUBLIC_ARBITRUMSEPOLIA_FACTORY_ADDRESS_V1;
      } else {
        factoryAddress = FACTORY_ADDRESSES.v1[chainId];
      }
      if (!factoryAddress) throw new Error('Factory address configuration missing for this network');
      console.log("Using factory address:", factoryAddress);

      // Use checkProvider for the getCode read operation
      console.log("Checking contract code at factory address using checkProvider...");
      const code = await checkProvider.getCode(factoryAddress);
      if (code === '0x') {
        throw new Error(`Factory contract not found at ${factoryAddress}. Check network or configuration.`);
      }
      console.log("Contract code found. Proceeding with deployment...");
      
      // Instantiate contract with the SIGNER for the actual transaction
      const factory = safeCreateContract(factoryAddress, getFactoryABI(chainId), signer);

      // --- Deployment Fee Logic (using checkProvider for reads) --- 
      let fee = parseEther('0');
      let txValue = parseEther('0');

      if (isArbitrumSepolia || (chainId !== 80002)) { // Check fee unless it's Amoy
          console.log(`Attempting to retrieve deployment fee for chain ${chainId} using checkProvider...`);
          try {
              // Use checkProvider for read-only fee check
              const factoryReader = safeCreateContract(factoryAddress, getFactoryABI(chainId), checkProvider);
              fee = await factoryReader.deploymentFee();
              txValue = fee;
              console.log(`Successfully retrieved deployment fee: ${formatUnits(fee, 'ether')} ETH`);
          } catch (feeError) {
              console.error(`Error fetching deployment fee for chain ${chainId}:`, feeError);
              console.warn("Proceeding with 0 fee due to error.");
              txValue = parseEther('0'); // Proceed with 0 if fee check fails
          }
      } else { // Polygon Amoy
          console.log("Skipping deployment fee check for Polygon Amoy");
          txValue = parseEther('0'); 
      }
      console.log(`Deployment fee to send: ${formatUnits(txValue, 'ether')} ETH`);

      // --- Token Creation Logic (using factory instance with signer) --- 
      if (chainId === 80002) { // Polygon Amoy
         console.log("Using direct token creation for Polygon Amoy");
         const tokenParams = { name: formData.name, symbol: formData.symbol, initialSupply: parseUnits(formData.initialSupply, TOKEN_DECIMALS).toString() };
         console.log("Creating token with parameters:", tokenParams);
         txResponse = await factory.createToken(
             tokenParams.name,
             tokenParams.symbol,
             tokenParams.initialSupply
         );
      } else { // Standard creation 
         console.log("Using standard token creation method");
         txResponse = await factory.createToken(
            formData.name,
            formData.symbol,
            parseUnits(formData.initialSupply, TOKEN_DECIMALS).toString(),
            parseUnits(formData.maxSupply || formData.initialSupply, TOKEN_DECIMALS).toString(),
            formData.blacklistEnabled,
            formData.timeLockEnabled,
            { value: txValue } // Send the determined fee
         );
      }

      console.log("Transaction submitted:", txResponse.hash);
      toast({ title: 'Transaction Submitted', description: 'Waiting for confirmation...' });

      // Wait for confirmation using the wallet provider
      const receipt: TransactionReceipt | null = await currentProvider.waitForTransaction(txResponse.hash, 1);
      
      if (!receipt) {
          throw new Error("Transaction failed: No receipt received after waiting.");
      }
      
      if (receipt.status === 0) {
           console.error("Transaction failed on-chain. Receipt:", receipt);
           throw new Error(`Transaction failed on-chain (status 0). TxHash: ${receipt.hash}`);
      }
      
      console.log("Transaction confirmed! Receipt status:", receipt.status);
      console.log("Raw Receipt Logs:", JSON.stringify(receipt.logs, null, 2)); // Log the raw logs

      let tokenAddress = null;
      
      const tokenFactoryInterface = new ethers.Interface(getFactoryABI(chainId));
      console.log("Using ABI events for parsing:", JSON.stringify(tokenFactoryInterface.fragments.filter(f => f.type === 'event'), null, 2)); // Log the events in the ABI being used

      // --- More Robust Event Parsing ---
      const tokenCreatedEventFragment = "event TokenCreated(address indexed tokenAddress, address indexed creator)";
      const tokenCreatedTopic = ethers.id(tokenCreatedEventFragment);
      console.log("Looking for TokenCreated event with topic:", tokenCreatedTopic);

      for (const log of receipt.logs) {
         // console.log("Processing log:", JSON.stringify(log)); // Optional: Log individual raw log
         if (log.topics && log.topics.length > 0 && log.topics[0] === tokenCreatedTopic) {
            console.log("Found log with matching TokenCreated topic:", log);
            try {
               const iface = new ethers.Interface([tokenCreatedEventFragment]); // Interface with only the event we want
               const decodedLog = iface.decodeEventLog("TokenCreated", log.data, log.topics);
               console.log("Decoded TokenCreated event args:", decodedLog);

               // Extract tokenAddress (usually the first argument for this event)
               if (decodedLog && decodedLog.length > 0 && typeof decodedLog[0] === 'string') {
                 tokenAddress = decodedLog[0];
                 console.log('Successfully decoded TokenCreated event, token address:', tokenAddress);
                 break; // Found it, exit loop
               } else {
                 console.error('Decoded TokenCreated event, but args structure is unexpected or invalid:', decodedLog);
               }
            } catch (decodeError) {
               console.error('Error decoding log with matching topic:', decodeError, 'Raw log:', log);
            }
         } 
         // Optional: Fallback or logging for other events if needed
         // else { console.log("Log topic doesn't match TokenCreated:", log.topics[0]); }
      }
      // --- End Robust Event Parsing ---

      if (!tokenAddress) {
        console.error('Could not find TokenCreated event in transaction logs.', receipt.logs);
        throw new Error('Token creation transaction confirmed, but failed to extract token address from logs.');
      }

      tokenAddress = ethers.getAddress(tokenAddress);
      console.log('Successfully extracted and validated token address:', tokenAddress);
      
      const explorerUrl = getExplorerUrlWithType(chainId, tokenAddress, 'token');
      const txExplorerUrl = getExplorerUrlWithType(chainId, txResponse.hash, 'tx');

      setSuccessInfo({
        tokenAddress,
        tokenName: formData.name,
        tokenSymbol: formData.symbol,
      });
      
      toast({
        title: "Token Created Successfully!",
        description: (
          <>
            <span>{`Token Address: ${tokenAddress.slice(0, 6)}...${tokenAddress.slice(-4)}`}</span>
            {explorerUrl && (
              <a 
                href={explorerUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="ml-2 text-blue-400 hover:text-blue-300 underline"
              >
                View on Explorer
              </a>
            )}
          </>
        ),
      });

    } catch (error: any) {
      console.error('Error during handleSubmit or confirmation:', error);
       if (error.code === 'NETWORK_ERROR') {
             setError(`Network changed during operation. Please try again. Detected Chain ID: ${chainId}`);
        } else if (error.message?.includes('Factory contract not found')) {
            setError(error.message); 
        } else if (error.code === 'ACTION_REJECTED') {
            setError('Transaction rejected in wallet.');
        } else if (error.message?.includes('429')) {
             setError('RPC Error: Too Many Requests. The network node is overloaded. Please wait a moment and try again, or switch to a different RPC if the problem persists.');
        } else {
             setError(error.message || 'An unexpected error occurred during deployment.');
        }
      toast({ variant: 'destructive', title: 'Deployment Failed', description: error.message || 'Unknown error' });
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
                    href={getExplorerUrlWithType(chainId, successInfo.tokenAddress, 'token')}
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