import { useState, useEffect } from 'react';
import { BrowserProvider, Contract, parseUnits, formatUnits } from 'ethers';
import { useNetwork } from '@contexts/NetworkContext';
import { getExplorerUrl } from '@config/networks';
import TokenPreview from '@components/features/token/TokenPreview';
import { useToast } from '@/components/ui/toast/use-toast';
import { Spinner } from '@components/ui/Spinner';
import { Button } from '@components/ui/button';
import { Card } from '@components/ui/card';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';

// Import the ABI
const AMOY_FACTORY_ABI = [
  "function owner() external view returns (address)",
  "function deploymentFee() external view returns (uint256)",
  "function getTokensByUser(address) external view returns (address[])",
  "function createToken(string,string,uint256) external payable returns (address)",
  "function isTokenFromFactory(address) external view returns (bool)",
  "event TokenCreated(address indexed tokenAddress, address indexed creator)"
];

// Token ABI
const TOKEN_ABI = [
  "function name() external view returns (string)",
  "function symbol() external view returns (string)",
  "function decimals() external view returns (uint8)",
  "function totalSupply() external view returns (uint256)"
];

const TOKEN_DECIMALS = 18;

// Define styling constants
const inputClasses = "mt-2 block w-full rounded-md border-gray-800 !bg-gray-900 text-white placeholder-gray-500 focus:!bg-gray-900 focus:ring-0 focus:border-gray-700 hover:!bg-gray-900 active:!bg-gray-900";
const labelClasses = "block text-sm font-medium text-gray-300";

interface FormData {
  name: string;
  symbol: string;
  initialSupply: string;
}

interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  totalSupply: string;
}

interface Props {
  isConnected: boolean;
}

interface SuccessInfo {
  tokenAddress: string;
  tokenName: string;
  tokenSymbol: string;
}

export default function AmoyTokenForm({ isConnected }: Props) {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    symbol: '',
    initialSupply: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<SuccessInfo | null>(null);
  const [deploymentFee, setDeploymentFee] = useState<string>('Loading...');
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [userTokens, setUserTokens] = useState<TokenInfo[]>([]);
  const [loadingTokens, setLoadingTokens] = useState(false);
  const { chainId } = useNetwork();
  const { toast } = useToast();
  
  // Factory address for Polygon Amoy
  const FACTORY_ADDRESS = "0xAC49A5f87D1b1c9df1885B90B911BdfdE40c2c36";

  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      setProvider(new BrowserProvider(window.ethereum));
    }
  }, []);

  // Fetch deployment fee when component mounts
  useEffect(() => {
    async function fetchDeploymentFee() {
      if (!window.ethereum || !isConnected || chainId !== 80002) return;
      
      try {
        const provider = new BrowserProvider(window.ethereum);
        const contract = new Contract(FACTORY_ADDRESS, AMOY_FACTORY_ABI, provider);
        const fee = await contract.deploymentFee();
        setDeploymentFee(formatUnits(fee, 'ether'));
      } catch (error) {
        console.error('Error fetching deployment fee:', error);
        setDeploymentFee('Error loading fee');
      }
    }

    fetchDeploymentFee();
  }, [isConnected, chainId]);

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

    if (chainId !== 80002) {
      setError("Please switch to Polygon Amoy network");
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
      const contract = new Contract(FACTORY_ADDRESS, AMOY_FACTORY_ABI, signer);
      
      // Get the deployment fee
      const fee = await contract.deploymentFee();
      console.log("Deployment fee:", formatUnits(fee, 'ether'), "ETH");

      // Prepare token creation parameters
      const { name, symbol, initialSupply } = formData;
      
      // Create token
      console.log("Creating token with parameters:", {
        name,
        symbol,
        initialSupply
      });
      
      const tx = await contract.createToken(
        name,
        symbol,
        initialSupply,
        { value: fee }
      );

      showToast('success', 'Transaction submitted. Waiting for confirmation...');
      
      const receipt = await tx.wait();
      let tokenAddress = null;
      
      // Parse the event logs to find the token address
      for (const log of receipt.logs) {
        try {
          const parsed = contract.interface.parseLog(log as unknown as { topics: string[], data: string });
          if (parsed?.name === "TokenCreated") {
            tokenAddress = parsed.args[0];
            break;
          }
        } catch (e) {
          continue;
        }
      }

      if (!tokenAddress) {
        throw new Error("Could not find token address in transaction logs");
      }

      const explorerUrl = getExplorerUrl(chainId, tokenAddress, 'token');
      const txExplorerUrl = getExplorerUrl(chainId, tx.hash, 'tx');

      setSuccessInfo({
        tokenAddress,
        tokenName: name,
        tokenSymbol: symbol,
      });

      showToast('success', 'Token created successfully!', txExplorerUrl);
      loadUserTokens(); // Refresh token list
    } catch (error: any) {
      console.error('Error creating token:', error);
      
      // Detailed error logging
      if (error.receipt) {
        console.log("Transaction receipt found in error:", error.receipt);
      }
      
      showToast('error', error.message || 'Failed to create token');
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserTokens = async () => {
    if (!window.ethereum || !isConnected || chainId !== 80002) return;
    
    setLoadingTokens(true);
    try {
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();
      
      const factory = new Contract(FACTORY_ADDRESS, AMOY_FACTORY_ABI, provider);
      const tokenAddresses = await factory.getTokensByUser(userAddress);
      
      const tokenInfoPromises = tokenAddresses.map(async (address: string) => {
        const token = new Contract(address, TOKEN_ABI, provider);
        const name = await token.name();
        const symbol = await token.symbol();
        const decimals = await token.decimals();
        const totalSupply = await token.totalSupply();
        
        return {
          address,
          name,
          symbol,
          totalSupply: formatUnits(totalSupply, decimals)
        };
      });
      
      const tokens = await Promise.all(tokenInfoPromises);
      setUserTokens(tokens);
    } catch (error) {
      console.error('Error loading tokens:', error);
      showToast('error', 'Failed to load your tokens');
    } finally {
      setLoadingTokens(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  useEffect(() => {
    if (isConnected && chainId === 80002) {
      loadUserTokens();
    }
  }, [isConnected, chainId]);

  if (chainId !== 80002) {
    return (
      <div className="p-4 bg-yellow-900 text-white rounded-md mb-4">
        <p className="font-medium">Please switch to Polygon Amoy network to use this form.</p>
        <p className="text-sm mt-2">
          This form is specifically designed for the Polygon Amoy testnet (Chain ID: 80002).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 p-4 rounded-md border border-gray-700">
        <h2 className="text-lg font-semibold text-white mb-2">Amoy Token Factory</h2>
        <p className="text-sm text-gray-400 mb-4">
          Create ERC20 tokens on Polygon Amoy network with our optimized factory.
          Current fee: {deploymentFee} MATIC
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name" className={labelClasses}>Token Name</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g. My Token"
              required
              className={inputClasses}
            />
          </div>
          
          <div>
            <Label htmlFor="symbol" className={labelClasses}>Token Symbol</Label>
            <Input
              id="symbol"
              name="symbol"
              value={formData.symbol}
              onChange={handleChange}
              placeholder="e.g. MTK"
              required
              className={inputClasses}
            />
          </div>
          
          <div>
            <Label htmlFor="initialSupply" className={labelClasses}>
              Initial Supply
            </Label>
            <Input
              id="initialSupply"
              name="initialSupply"
              value={formData.initialSupply}
              onChange={handleChange}
              placeholder="e.g. 1000"
              required
              type="number"
              className={inputClasses}
            />
            <p className="mt-1 text-xs text-gray-500">
              This is the total amount of tokens that will be created.
            </p>
          </div>
          
          <Button
            type="submit"
            disabled={isLoading || !isConnected}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? <Spinner className="h-4 w-4" /> : 'Create Token'}
          </Button>
          
          {error && (
            <div className="mt-2 text-red-500 text-sm">{error}</div>
          )}
        </form>
      </div>
      
      {successInfo && (
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
                <a
                  href={getExplorerUrl(chainId, successInfo.tokenAddress, 'token')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-400 hover:text-blue-300"
                >
                  View on Explorer
                </a>
              </div>
              <div className="mt-2">
                <p className="text-xs text-gray-500">
                  To see your token in MetaMask, click Add Token and enter the address above.
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}
      
      {userTokens.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-white mb-2">Your Tokens</h3>
          <div className="space-y-3">
            {userTokens.map((token) => (
              <Card key={token.address} className="bg-gray-800 border-gray-700">
                <div className="p-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-medium text-white">{token.name} ({token.symbol})</h4>
                      <p className="text-xs text-gray-400">Supply: {token.totalSupply}</p>
                    </div>
                    <a
                      href={getExplorerUrl(chainId, token.address, 'token')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:text-blue-300"
                    >
                      View
                    </a>
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <Button
            onClick={loadUserTokens}
            disabled={loadingTokens}
            className="mt-2 text-xs bg-gray-700 hover:bg-gray-600"
          >
            {loadingTokens ? <Spinner className="h-3 w-3" /> : 'Refresh'}
          </Button>
        </div>
      )}
    </div>
  );
} 