// Updated Token Distribution Manager - v4
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ethers } from 'ethers';
import { useToast } from '@/components/ui/toast/use-toast';
import { getExplorerUrl } from '@/config/networks';
import { getNetworkContractAddress } from '@/config/contracts';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAccount } from 'wagmi';

interface TCAP_v4Props {
  onAnalyze?: (address: string) => void;
}

interface TokenInfo {
  name: string;
  symbol: string;
  totalSupply: bigint;
}

const getWalletColor = (index: number) => {
  const colors = [
    '#3B82F6', // blue-500
    '#10B981', // emerald-500
    '#F59E0B', // amber-500
    '#EF4444', // red-500
    '#8B5CF6', // violet-500
    '#EC4899', // pink-500
    '#06B6D4', // cyan-500
    '#F97316', // orange-500
  ];
  return colors[index % colors.length];
};

export function TCAP_v4({ onAnalyze }: TCAP_v4Props) {
  const [tokenAddress, setTokenAddress] = useState('');
  const [userTokens, setUserTokens] = useState<string[]>([]);
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);
  const [isExecutingDistribution, setIsExecutingDistribution] = useState(false);
  const [isSettingAllocations, setIsSettingAllocations] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const { toast } = useToast();
  const { address } = useAccount();

  // Default wallet allocations
  const distributionEntries = [
    { name: 'Owner', percentage: 40, address: address },
    { name: 'Community Treasury', percentage: 30, address: '0xb6083258E7E7B04Bdc72640E1a75E1F40541e83F' },
    { name: 'Team', percentage: 20, address: '0x10C8c279c6b381156733ec160A89Abb260bfcf0C' },
    { name: 'Marketing', percentage: 10, address: '0x991Ed392F033B2228DC55A1dE2b706ef8D9d9DcD' }
  ];

  const totalPercentage = distributionEntries.reduce((sum, entry) => sum + entry.percentage, 0);
  const isValid = totalPercentage === 100;

  // Function to fetch tokens created by the current user
  const fetchUserTokens = async () => {
    if (!address) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to view your tokens",
        variant: "destructive"
      });
      return;
    }

    setIsLoadingTokens(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const { chainId } = await provider.getNetwork();
      
      // Get factory address based on network
      const factoryAddress = getNetworkContractAddress(Number(chainId), 'FACTORY_ADDRESS_V4');
      
      if (!factoryAddress) {
        throw new Error("Factory address not found for this network");
      }
      
      // Create factory contract instance with expanded ABI
      const factory = new ethers.Contract(
        factoryAddress,
        [
          "function getAllTokens() view returns (address[])",
          "function getTokensByOwner(address) view returns (address[])",
          "event TokenCreated(address indexed tokenAddress, string name, string symbol, address indexed owner)",
          "function userTokenCount(address) view returns (uint256)",
          "function userTokens(address, uint256) view returns (address)"
        ],
        provider
      );
      
      let tokens: string[] = [];
      
      // Method 1: Try to get tokens by owner directly if the function exists
      try {
        tokens = await factory.getTokensByOwner(address);
        console.log("Tokens created by user:", tokens);
      } catch (error) {
        console.log("getTokensByOwner function not available, trying alternative methods");
        
        // Method 2: Try to use userTokens mapping if available
        try {
          const tokenCount = await factory.userTokenCount(address);
          console.log(`User has ${tokenCount} tokens`);
          
          if (tokenCount > 0) {
            for (let i = 0; i < Number(tokenCount); i++) {
              const tokenAddress = await factory.userTokens(address, i);
              if (tokenAddress && tokenAddress !== ethers.ZeroAddress) {
                tokens.push(tokenAddress);
              }
            }
          }
        } catch (error) {
          console.log("userTokens mapping not available, trying event-based lookup");
          
          // Method 3: Fallback to event-based lookup
          try {
            // Get all factory-created tokens
            let allTokens: string[] = [];
            try {
              allTokens = await factory.getAllTokens();
              console.log("All tokens from factory:", allTokens);
            } catch (e) {
              console.log("getAllTokens not available, using event-based lookup only");
              
              // Method 4: Query for TokenCreated events related to this user
              // Get the event signature hash for TokenCreated
              const eventTopic = ethers.id("TokenCreated(address,string,string,address)");
              // The fourth parameter (indexed owner) is at index 3
              const ownerTopic = ethers.zeroPadValue(address.toLowerCase(), 32);
              
              const events = await provider.getLogs({
                fromBlock: 0,
                toBlock: "latest",
                address: factoryAddress,
                topics: [
                  eventTopic,
                  null,  // indexed tokenAddress (wildcard)
                  null,  // wildcard for non-indexed params
                  ownerTopic // indexed owner address
                ]
              });
              
              console.log("TokenCreated events:", events);
              
              // Parse events to get token addresses
              for (const event of events) {
                // The token address is the first indexed parameter
                if (event.topics && event.topics.length > 1) {
                  const tokenAddress = ethers.dataSlice(event.topics[1], 12); // Convert to address
                  tokens.push(ethers.getAddress(`0x${tokenAddress}`));
                }
              }
              
              return; // Skip the next steps as we've already collected tokens
            }
            
            // For each token, check if it was created by the current user
            for (const tokenAddr of allTokens) {
              try {
                const tokenContract = new ethers.Contract(
                  tokenAddr,
                  ["function owner() view returns (address)"],
                  provider
                );
                const owner = await tokenContract.owner();
                if (owner.toLowerCase() === address.toLowerCase()) {
                  tokens.push(tokenAddr);
                }
              } catch (e) {
                console.log(`Error checking token ${tokenAddr}:`, e);
              }
            }
          } catch (e) {
            console.log("Event-based lookup failed:", e);
          }
        }
      }
      
      // If all methods fail but we have a known token address, add it manually
      if (tokens.length === 0 && tokenAddress) {
        console.log("No tokens found via contract methods, adding manual token:", tokenAddress);
        try {
          const tokenContract = new ethers.Contract(
            tokenAddress,
            ["function owner() view returns (address)"],
            provider
          );
          const owner = await tokenContract.owner();
          if (owner.toLowerCase() === address.toLowerCase()) {
            tokens.push(tokenAddress);
          }
        } catch (e) {
          console.log("Error checking manual token:", e);
        }
      }
      
      setUserTokens(tokens);
      
      if (tokens.length === 0) {
        toast({
          title: "No tokens found",
          description: "You haven't created any tokens yet"
        });
      } else {
        console.log(`Found ${tokens.length} tokens for address ${address}`);
      }
      
    } catch (error) {
      console.error("Error fetching user tokens:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch tokens",
        variant: "destructive"
      });
    } finally {
      setIsLoadingTokens(false);
    }
  };

  // Fetch tokens when the component mounts and when the address changes
  useEffect(() => {
    if (address) {
      fetchUserTokens();
    }
  }, [address]);

  // Fetch token info when an address is selected
  useEffect(() => {
    const fetchTokenInfo = async () => {
      if (!tokenAddress || !ethers.isAddress(tokenAddress)) return;
      
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const tokenContract = new ethers.Contract(
          tokenAddress,
          [
            "function name() view returns (string)",
            "function symbol() view returns (string)",
            "function totalSupply() view returns (uint256)"
          ],
          provider
        );

        const [name, symbol, totalSupply] = await Promise.all([
          tokenContract.name(),
          tokenContract.symbol(),
          tokenContract.totalSupply()
        ]);

        setTokenInfo({ name, symbol, totalSupply });
      } catch (error) {
        console.error("Error fetching token info:", error);
        setTokenInfo(null);
      }
    };

    fetchTokenInfo();
  }, [tokenAddress]);

  const handleAnalyze = async () => {
    if (!tokenAddress) return;
    
    try {
      // TODO: Implement contract analysis
      onAnalyze?.(tokenAddress);
    } catch (error) {
      console.error('Error analyzing token:', error);
    }
  };

  const handleViewOnExplorer = () => {
    if (!tokenAddress) return;
    
    // Get the current network
    if (window.ethereum) {
      window.ethereum.request({ method: 'eth_chainId' })
        .then((chainIdHex: string) => {
          const chainId = parseInt(chainIdHex, 16);
          const explorerUrl = getExplorerUrl(chainId, tokenAddress, 'token');
          window.open(explorerUrl, '_blank');
        })
        .catch((error: any) => {
          console.error('Error getting chain ID:', error);
          toast({
            title: "Error",
            description: "Could not determine the current network",
            variant: "destructive"
          });
        });
    }
  };

  // Function to execute token distribution
  const executeDistribution = async () => {
    if (!tokenAddress) {
      toast({
        title: "No Token Selected",
        description: "Please select a token to execute distribution",
        variant: "destructive"
      });
      return;
    }

    setIsExecutingDistribution(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // First we need to get the distribution module address
      const tokenContract = new ethers.Contract(
        tokenAddress,
        [
          "function getModules() view returns (address[])",
          "function getModuleByType(bytes32) view returns (address)",
          "function totalSupply() view returns (uint256)",
          "function symbol() view returns (string)",
          "function name() view returns (string)",
          "function balanceOf(address) view returns (uint256)"
        ],
        signer
      );
      
      // Get token info for logging
      const symbol = await tokenContract.symbol();
      const totalSupply = await tokenContract.totalSupply();
      const name = await tokenContract.name();
      const ownerAddress = await signer.getAddress();
      
      // Get owner balance before distribution
      const ownerBalanceBefore = await tokenContract.balanceOf(ownerAddress);

      // Get distribution module
      const distributionModuleType = ethers.keccak256(ethers.toUtf8Bytes("DISTRIBUTION_MODULE"));
      const distributionModuleAddress = await tokenContract.getModuleByType(distributionModuleType);
      
      if (distributionModuleAddress === ethers.ZeroAddress) {
        throw new Error(`Distribution module not found for ${name} (${symbol})`);
      }
      
      console.log(`Found distribution module for ${name} (${symbol}):`, distributionModuleAddress);
      
      // Create distribution module contract instance
      const distributionModule = new ethers.Contract(
        distributionModuleAddress,
        [
          "function executeDistribution() returns (bool)",
          "function isDistributionExecuted() view returns (bool)",
          "function getAllAllocations() view returns (tuple(address wallet, uint256 amount, string label, bool locked, uint256 unlockTime)[])"
        ],
        signer
      );
      
      // Check if distribution was already executed
      try {
        const isDistributionExecuted = await distributionModule.isDistributionExecuted();
        if (isDistributionExecuted) {
          throw new Error(`Distribution has already been executed for ${name} (${symbol}). Check your wallet for tokens.`);
        }
      } catch (error) {
        // If the function doesn't exist, continue with execution
        if (!(error instanceof Error) || !error.message.includes("isDistributionExecuted")) {
          throw error;
        }
      }
      
      // Check if there are allocations first
      const allocations = await distributionModule.getAllAllocations();
      console.log(`Current allocations for ${symbol}:`, allocations);
      
      if (allocations.length === 0) {
        throw new Error(`No allocations found for ${name} (${symbol}). Please set up allocations before executing distribution.`);
      }
      
      // Sum total allocations to ensure it matches total supply
      const totalAllocated = allocations.reduce(
        (sum: bigint, allocation: {amount: string | bigint}) => 
          sum + BigInt(allocation.amount), 
        BigInt(0)
      );
      console.log(`Total allocated: ${ethers.formatUnits(totalAllocated, 18)} ${symbol}`);
      console.log(`Total supply: ${ethers.formatUnits(totalSupply, 18)} ${symbol}`);
      
      // Build confirmation message with allocations
      let confirmMsg = `Execute distribution for ${name} (${symbol})?\n\nAllocations:\n`;
      allocations.forEach((allocation: {
        wallet: string;
        amount: string | bigint;
        label: string;
        locked: boolean;
        unlockTime: string | bigint;
      }) => {
        confirmMsg += `${allocation.label}: ${ethers.formatUnits(allocation.amount, 18)} ${symbol} (${allocation.wallet})\n`;
      });
      confirmMsg += `\nTotal: ${ethers.formatUnits(totalAllocated, 18)} ${symbol}`;
      
      // Ask for confirmation
      if (!window.confirm(confirmMsg)) {
        setIsExecutingDistribution(false);
        return;
      }
      
      // Execute distribution with higher gas limit for Polygon Amoy
      console.log(`Executing distribution for ${name} (${symbol})...`);
      const tx = await distributionModule.executeDistribution({
        gasLimit: BigInt(7500000) // Much higher gas limit for Polygon Amoy distribution
      });
      
      console.log(`Distribution transaction sent for ${symbol}:`, tx.hash);
      
      // Show transaction hash immediately
      toast({
        title: "Distribution Transaction Sent",
        description: `Transaction hash: ${tx.hash.substring(0, 10)}...${tx.hash.substring(tx.hash.length - 4)}`
      });
      
      // Wait for transaction to be mined
      const receipt = await tx.wait();
      console.log("Distribution executed:", receipt);
      
      // Check owner balance after distribution
      const ownerBalanceAfter = await tokenContract.balanceOf(ownerAddress);
      
      // Calculate balance change
      const balanceChange = ownerBalanceAfter - ownerBalanceBefore;
      const balanceChangeStr = ethers.formatUnits(balanceChange, 18);
      
      toast({
        title: "Distribution Executed Successfully",
        description: `${symbol} tokens have been distributed! Your balance increased by ${balanceChangeStr} ${symbol}`
      });
      
      // Refresh token list after distribution
      fetchUserTokens();
      
    } catch (error) {
      console.error("Error executing distribution:", error);
      toast({
        title: "Distribution Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsExecutingDistribution(false);
    }
  };

  // Function to set up allocations based on the form configuration
  const setupAllocations = async () => {
    if (!tokenAddress) {
      toast({
        title: "No Token Selected",
        description: "Please select a token to set up allocations",
        variant: "destructive"
      });
      return;
    }

    setIsSettingAllocations(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const ownerAddress = await signer.getAddress();
      
      // First we need to get the distribution module address
      const tokenContract = new ethers.Contract(
        tokenAddress,
        [
          "function getModules() view returns (address[])",
          "function getModuleByType(bytes32) view returns (address)",
          "function totalSupply() view returns (uint256)",
          "function symbol() view returns (string)",
          "function name() view returns (string)",
          "function balanceOf(address) view returns (uint256)"
        ],
        signer
      );
      
      // Get token info
      const totalSupply = await tokenContract.totalSupply();
      const symbol = await tokenContract.symbol();
      const name = await tokenContract.name();
      
      // Get distribution module
      const distributionModuleType = ethers.keccak256(ethers.toUtf8Bytes("DISTRIBUTION_MODULE"));
      const distributionModuleAddress = await tokenContract.getModuleByType(distributionModuleType);
      
      if (distributionModuleAddress === ethers.ZeroAddress) {
        throw new Error("Distribution module not found for this token");
      }
      
      console.log(`Found distribution module for ${name} (${symbol}):`, distributionModuleAddress);
      
      // Create distribution module contract instance
      const distributionModule = new ethers.Contract(
        distributionModuleAddress,
        [
          "function addMultipleAllocations(address[], uint256[], string[], bool[], uint256[]) returns (bool)",
          "function getAllAllocations() view returns (tuple(address wallet, uint256 amount, string label, bool locked, uint256 unlockTime)[])",
          "function applyPreset(uint256, uint256) returns (bool)",
          "function isDistributionExecuted() view returns (bool)"
        ],
        signer
      );
      
      // Check if distribution was already executed
      try {
        const isDistributionExecuted = await distributionModule.isDistributionExecuted();
        if (isDistributionExecuted) {
          throw new Error(`Distribution has already been executed for ${symbol}. No further allocations can be set.`);
        }
      } catch (error) {
        // If the function doesn't exist, continue with execution
        if (!(error instanceof Error) || !error.message.includes("isDistributionExecuted")) {
          throw error;
        }
      }
      
      // Check if there are already allocations
      const existingAllocations = await distributionModule.getAllAllocations();
      
      if (existingAllocations.length > 0) {
        throw new Error(`Allocations are already set up for ${symbol}. Please execute distribution instead.`);
      }
      
      // Use the distributionEntries instead of hardcoded values
      // Update the owner address to be the current connected wallet
      const allocations = distributionEntries.map(entry => {
        if (entry.name === 'Owner') {
          return { ...entry, address: ownerAddress };
        }
        return entry;
      });
      
      // Verify total percentage adds up to 100%
      const totalPercentage = allocations.reduce((sum, wallet) => sum + wallet.percentage, 0);
      
      // Format the allocation details for the confirmation message
      const formattedAllocations = allocations.map(wallet => {
        const walletAddress = wallet.address || '';
        const addressDisplay = walletAddress === ownerAddress 
          ? 'Connected Wallet' 
          : `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}`;
        
        return `${wallet.name}: ${wallet.percentage}% (${addressDisplay})`;
      }).join('\n');
      
      // Create the confirmation message with clear percentage breakdown
      const confirmMessage = `
Distribution for ${name} (${symbol}):

${formattedAllocations}

Total: ${totalPercentage}% ${totalPercentage === 100 ? '✓' : '❌'}

Total supply: ${ethers.formatUnits(totalSupply, 18)} ${symbol}

Proceed with allocation setup?`;
      
      // Confirm with the user showing the proper total
      if (!window.confirm(confirmMessage)) {
        setIsSettingAllocations(false);
        return;
      }
      
      // Verify total equals 100%
      if (totalPercentage !== 100) {
        throw new Error(`Total allocation percentage must equal 100%. Current total: ${totalPercentage}%`);
      }
      
      // Calculate allocations - dividing up the total supply
      const walletAddresses: string[] = [];
      const amounts: bigint[] = [];
      const labels: string[] = [];
      const locked: boolean[] = [];
      const unlockTimes: bigint[] = [];
      
      // Set up allocations based on percentages
      allocations.forEach(wallet => {
        const amount = totalSupply * BigInt(wallet.percentage) / BigInt(100);
        walletAddresses.push(wallet.address as string);
        amounts.push(amount);
        labels.push(wallet.name);
        locked.push(false);
        unlockTimes.push(BigInt(0));
      });
      
      console.log(`Setting up allocations for ${symbol} with total supply ${ethers.formatUnits(totalSupply, 18)}`);
      console.log("Wallets:", walletAddresses);
      console.log("Amounts:", amounts.map(a => ethers.formatUnits(a, 18)));
      
      const totalAllocated = amounts.reduce((sum, amount) => sum + amount, BigInt(0));
      console.log(`Total allocated: ${ethers.formatUnits(totalAllocated, 18)} ${symbol} (${(Number(totalAllocated) * 100 / Number(totalSupply)).toFixed(2)}%)`);
      
      // Add allocations with increased gas limit for Polygon Amoy
      const tx = await distributionModule.addMultipleAllocations(
        walletAddresses,
        amounts,
        labels,
        locked,
        unlockTimes,
        {
          gasLimit: BigInt(5000000) // Higher gas limit for Polygon Amoy
        }
      );
      
      console.log(`Allocations transaction sent for ${symbol}:`, tx.hash);
      
      // Wait for transaction to be mined
      const receipt = await tx.wait();
      console.log("Allocations set up:", receipt);
      
      toast({
        title: "Allocations Set Up Successfully",
        description: `${symbol} allocations have been set up. Click "Execute Distribution" to mint tokens to these addresses.`
      });
      
    } catch (error) {
      console.error("Error setting up allocations:", error);
      toast({
        title: "Failed to Set Up Allocations",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsSettingAllocations(false);
    }
  };

  return (
    <Card className="p-6 bg-gray-800/50 border border-gray-700/50">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Token Distribution Manager</h2>
          <p className="text-sm text-gray-400">Set up and execute token distribution for V4 tokens</p>
        </div>
        <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/50">
          V4
        </Badge>
      </div>

      <div className="space-y-6">
        {/* Your Tokens Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium text-gray-200">Your Tokens</Label>
            <Button 
              onClick={fetchUserTokens} 
              variant="secondary" 
              className="h-7 text-xs"
              disabled={isLoadingTokens}
            >
              {isLoadingTokens ? "Loading..." : "Refresh"}
            </Button>
          </div>
          
          {userTokens.length > 0 ? (
            <div className="grid gap-2 mt-2">
              {userTokens.map((address, index) => (
                <div 
                  key={index} 
                  className="flex justify-between items-center p-2 bg-gray-800 rounded-md border border-gray-700 hover:border-blue-600 cursor-pointer"
                  onClick={() => setTokenAddress(address)}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-xs text-gray-300 font-mono">
                      {address.substring(0, 8)}...{address.substring(address.length - 6)}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    className="h-6 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      setTokenAddress(address);
                    }}
                  >
                    Select
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-3 bg-gray-800 rounded-md">
              <p className="text-gray-400 text-sm">
                {isLoadingTokens ? "Loading your tokens..." : "No tokens found for your address"}
              </p>
            </div>
          )}
        </div>
        
        {/* Manual Input Section */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-200">Token Address</Label>
          <div className="flex gap-2">
            <Input
              value={tokenAddress}
              onChange={(e) => setTokenAddress(e.target.value)}
              placeholder="0x..."
              className="flex-1 bg-gray-800 border-gray-700 text-white placeholder-gray-500"
            />
            <Button
              onClick={() => {
                if (tokenAddress) {
                  toast({
                    title: "Token Selected",
                    description: `Token at ${tokenAddress.substring(0, 6)}...${tokenAddress.substring(tokenAddress.length - 4)} is ready for distribution setup`
                  });
                }
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Use Token
            </Button>
          </div>
        </div>

        {/* Token Info Preview */}
        {tokenInfo && (
          <div className="bg-gray-700/30 rounded-md p-4 border border-gray-600/50">
            <h3 className="text-sm font-semibold text-white mb-3">Token Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div>
                  <span className="text-gray-400 text-xs">Name:</span>
                  <p className="text-white text-sm">{tokenInfo.name}</p>
                </div>
                <div>
                  <span className="text-gray-400 text-xs">Symbol:</span>
                  <p className="text-white text-sm">{tokenInfo.symbol}</p>
                </div>
              </div>
              <div className="space-y-1">
                <div>
                  <span className="text-gray-400 text-xs">Total Supply:</span>
                  <p className="text-white text-sm">
                    {tokenInfo.totalSupply ? ethers.formatUnits(tokenInfo.totalSupply, 18) : '0'} {tokenInfo.symbol}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Distribution Preview */}
        {tokenAddress && (
          <div className="bg-gray-700/30 rounded-md p-4 border border-gray-600/50">
            <h3 className="text-sm font-semibold text-white mb-3">Distribution Preview</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-200">Total Distribution</span>
                <span className={`font-medium ${isValid ? 'text-green-400' : 'text-red-400'}`}>
                  {totalPercentage}%
                </span>
              </div>
              
              <div className="h-3 bg-gray-900 rounded-full overflow-hidden flex">
                {distributionEntries.map((entry, index) => (
                  <div
                    key={index}
                    className="h-full transition-all duration-300 first:rounded-l-full last:rounded-r-full"
                    style={{
                      width: `${entry.percentage}%`,
                      backgroundColor: getWalletColor(index),
                    }}
                  />
                ))}
              </div>
              
              {!isValid && (
                <p className="text-sm text-red-400 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Total distribution must equal 100%
                </p>
              )}
            </div>

            <div className="space-y-3 mt-4">
              <div className="text-sm font-medium text-gray-200">Distribution Breakdown</div>
              <div className="divide-y divide-gray-800">
                {distributionEntries.map((entry, index) => (
                  <div 
                    key={index} 
                    className="flex items-center gap-3 py-3 group"
                  >
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: getWalletColor(index) }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-200 truncate group-hover:text-gray-100 transition-colors">
                        {entry.name}
                      </p>
                      {entry.address && (
                        <p className="text-xs text-gray-400 truncate">
                          {typeof entry.address === 'string' && entry.address === address ? 'Connected Wallet' : 
                            `${entry.address.substring(0, 6)}...${entry.address.substring(entry.address.length - 3)}`}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-200">
                        {entry.percentage}%
                      </span>
                      <div 
                        className="w-16 h-1 rounded-full"
                        style={{ backgroundColor: getWalletColor(index) }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Validation Status */}
            <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4 mt-4">
              <div className="text-sm text-gray-200">
                {isValid ? (
                  <div className="flex items-center gap-2 text-green-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Distribution is valid
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-red-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Adjust percentages to total 100%
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Distribution Actions */}
        {tokenAddress && (
          <div className="space-y-4">
            <div className="bg-gray-700/30 rounded-md p-4 border border-gray-600/50">
              <h3 className="text-sm font-semibold text-white mb-3">Distribution Actions</h3>
              <p className="text-xs text-gray-400 mb-4">
                Follow these steps to distribute your token:
                <br />
                1. Set up allocations to define how tokens will be distributed
                <br />
                2. Execute distribution to mint tokens to the specified addresses
                <br />
                3. View on explorer to verify your token distribution
              </p>
              
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant="secondary" 
                  className="bg-yellow-600/20 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-600/30"
                  onClick={setupAllocations}
                  disabled={isSettingAllocations}
                >
                  {isSettingAllocations ? "Setting Up..." : "1. Setup Allocations"}
                </Button>

                <Button 
                  variant="secondary" 
                  className="bg-purple-600/20 text-purple-400 border border-purple-500/30 hover:bg-purple-600/30"
                  onClick={executeDistribution}
                  disabled={isExecutingDistribution}
                >
                  {isExecutingDistribution ? "Executing..." : "2. Execute Distribution"}
                </Button>

                <Button 
                  variant="secondary" 
                  className="bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30"
                  onClick={handleViewOnExplorer}
                >
                  3. View on Explorer
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Instructions when no token is selected */}
        {!tokenAddress && (
          <div className="text-center py-8">
            <p className="text-gray-400 text-sm">Select one of your tokens or enter a token address to manage distribution</p>
          </div>
        )}
      </div>
    </Card>
  );
} 