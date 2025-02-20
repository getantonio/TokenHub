import { useState, useEffect } from 'react';
import { BrowserProvider, Contract, formatUnits, parseUnits, EventLog } from 'ethers';
import TokenFactory_v2 from '@contracts/abi/TokenFactory_v2.json';
import TokenTemplate_v2 from '@contracts/abi/TokenTemplate_v2.json';
import { getNetworkContractAddress, FACTORY_ADDRESSES } from '@config/contracts';
import { getExplorerUrl } from '@config/networks';
import { useNetwork } from '@contexts/NetworkContext';
import { Spinner } from '@components/ui/Spinner';
import { ethers } from 'ethers';
import { AbiCoder } from 'ethers';
import { Button } from '@components/ui/button';
import { Card } from '@components/ui/card';
import { useToast } from '@/components/ui/toast/use-toast';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';

const TOKEN_DECIMALS = 18;

// Add ERC1967 proxy interface
const ERC1967_ABI = [
  "function implementation() external view returns (address)",
  "function admin() external view returns (address)",
  "function upgradeTo(address newImplementation) external",
  "function upgradeToAndCall(address newImplementation, bytes memory data) external payable"
];

// Add ERC20 interface at the top with other interfaces
const ERC20_ABI = [
  "function totalSupply() external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function balanceOf(address account) external view returns (uint256)",
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) external returns (bool)"
];

interface TokenAdminV2Props {
  address?: string;
}

interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  totalSupply: string;
  blacklistEnabled: boolean;
  timeLockEnabled: boolean;
  presaleInfo: {
    softCap: string;
    hardCap: string;
    minContribution: string;
    maxContribution: string;
    startTime: number;
    endTime: number;
    presaleRate: string;
    whitelistEnabled: boolean;
    finalized: boolean;
    totalContributed: string;
  };
  platformFee: {
    recipient: string;
    totalTokens: string;
    vestingEnabled: boolean;
    vestingDuration: number;
    cliffDuration: number;
    vestingStart: number;
    tokensClaimed: string;
  };
  userContribution?: string;
  displayTotalSupply?: string;
  createdAt?: number;
}

interface ToastMessage {
  type: 'success' | 'error';
  message: string;
}

interface LockInfo {
  address: string;
  duration: number;
  lockUntil?: number;
}

export default function TokenAdminV2({ address }: TokenAdminV2Props) {
  const { chainId } = useNetwork();
  const { isConnected, address: walletAddress } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [blacklistAddress, setBlacklistAddress] = useState('');
  const [lockInfo, setLockInfo] = useState<LockInfo>({ address: '', duration: 30 });
  const [isExpanded, setIsExpanded] = useState(false);
  const [hiddenTokens, setHiddenTokens] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('hiddenTokensV2');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  const [isOwner, setIsOwner] = useState(false);
  const [ownerControls, setOwnerControls] = useState({
    newOwner: '',
    newFee: ''
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initProvider = async () => {
      if (typeof window !== 'undefined' && window.ethereum) {
        try {
          const provider = new BrowserProvider(window.ethereum);
          setProvider(provider);
          // Clear any previous errors
          setError(null);
        } catch (error) {
          console.error('Error initializing provider:', error);
          setProvider(null);
          setError('Failed to initialize provider');
        }
      } else {
        setProvider(null);
      }
    };
    
    if (isConnected) {
      initProvider();
    }
  }, [isConnected, chainId]);

  useEffect(() => {
    const initSigner = async () => {
      if (provider && isConnected) {
        try {
          const signer = await provider.getSigner();
          setSigner(signer);
        } catch (error) {
          console.error('Error initializing signer:', error);
          setSigner(null);
        }
      }
    };
    
    initSigner();
  }, [provider, isConnected]);

  useEffect(() => {
    if (isConnected && chainId && provider && walletAddress) {
      console.log("Dependencies changed, reloading tokens:", {
        isConnected,
        chainId,
        hasProvider: !!provider,
        walletAddress
      });
      
      // Reset state when network changes
      setTokens([]);
      setError(null);
      setIsLoading(true);
      
      // Add small delay to ensure provider is ready after network change
      const timeoutId = setTimeout(() => {
        loadTokens().catch(err => {
          console.error('Error loading tokens:', err);
          setError('Failed to load tokens. Please try refreshing the page.');
          setIsLoading(false);
        });
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
  }, [isConnected, chainId, provider, walletAddress]);

  useEffect(() => {
    if (isConnected && address && walletAddress) {
      checkOwnership();
    }
  }, [isConnected, address, walletAddress]);

  useEffect(() => {
    localStorage.setItem('hiddenTokensV2', JSON.stringify(hiddenTokens));
  }, [hiddenTokens]);

  const showToast = (type: 'success' | 'error', message: string, link?: string) => {
    toast({
      variant: type === 'error' ? 'destructive' : 'default',
      title: type === 'error' ? 'Error' : 'Success',
      description: (
        <div className="space-y-2">
          <p>{message}</p>
          {link && (
            <a 
              href={link} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-blue-400 hover:text-blue-300 underline inline-flex items-center gap-1"
            >
              View on Explorer
              <span className="text-xs">↗</span>
            </a>
          )}
        </div>
      )
    });
  };

  const loadTokens = async () => {
    if (!isConnected || !chainId || !provider) {
      console.error("Missing dependencies:", {
        isConnected,
        chainId,
        hasProvider: !!provider
      });
      showToast('error', 'Please connect your wallet to continue');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // Try multiple ways to get the factory address
      let factoryV2Address = null;
      
      // First try FACTORY_ADDRESSES
      if (chainId && FACTORY_ADDRESSES.v2[chainId]) {
        factoryV2Address = FACTORY_ADDRESSES.v2[chainId];
        console.log("Got factory address from FACTORY_ADDRESSES:", factoryV2Address);
      }
      
      // If not found, try getNetworkContractAddress
      if (!factoryV2Address) {
        factoryV2Address = getNetworkContractAddress(Number(chainId), 'factoryV2');
        console.log("Got factory address from getNetworkContractAddress:", factoryV2Address);
      }

      if (!factoryV2Address) {
        console.error("No factory address found for chain:", chainId);
        showToast('error', 'No V2 factory deployed on this network');
        return;
      }

      // Verify the factory contract exists
      const code = await provider.getCode(factoryV2Address);
      if (code === '0x' || code === '') {
        console.error("Factory contract not deployed at:", factoryV2Address);
        showToast('error', 'Factory contract not found on this network');
        return;
      }

      console.log("Loading tokens for:", {
        chainId,
        factoryV2Address
      });
      
      const signer = await provider.getSigner();
      const factory = new Contract(factoryV2Address, [
        'function getDeployedTokens() view returns (address[])',
        'function getUserCreatedTokens(address) view returns (address[])',
        'function isTokenCreator(address,address) view returns (bool)',
        'function getTokenCreator(address) view returns (address)'
      ], signer);
      
      const userAddress = await signer.getAddress();
      console.log('TCAP_v2: Got user address:', userAddress);
      
      // Try both methods to get user's tokens
      let userTokens = [];
      try {
        console.log('TCAP_v2: Trying getUserCreatedTokens');
        userTokens = await factory.getUserCreatedTokens(userAddress);
      } catch (error) {
        console.log('TCAP_v2: getUserCreatedTokens failed, trying getDeployedTokens');
        try {
          const allTokens = await factory.getDeployedTokens();
          // Filter tokens created by user
          const tokenPromises = allTokens.map(async (token: string) => {
            try {
              const isCreator = await factory.isTokenCreator(userAddress, token);
              return isCreator ? token : null;
            } catch {
              return null;
            }
          });
          userTokens = (await Promise.all(tokenPromises)).filter(Boolean);
        } catch (error) {
          console.error('Both token retrieval methods failed:', error);
          throw new Error('Failed to retrieve tokens');
        }
      }

      if (!Array.isArray(userTokens)) {
        throw new Error('Unexpected response format from getUserCreatedTokens');
      }

      const tokenPromises = userTokens.map(async (tokenAddress: string) => {
        try {
          // Create contract instances with explicit ABIs
          const erc20Contract = new Contract(tokenAddress, [
            'function name() view returns (string)',
            'function symbol() view returns (string)',
            'function totalSupply() view returns (uint256)',
            'function decimals() view returns (uint8)',
            'function balanceOf(address) view returns (uint256)'
          ], provider);

          const tokenContract = new Contract(tokenAddress, [
            'function blacklistEnabled() view returns (bool)',
            'function timeLockEnabled() view returns (bool)',
            'function presaleInfo() view returns (tuple(uint256,uint256,uint256,uint256,uint256,uint256,uint256,bool,bool,uint256))',
            'function platformFee() view returns (tuple(address,uint256,bool,uint256,uint256,uint256,uint256))'
          ], provider);

          // Basic token info with error handling
          const [name, symbol, totalSupply, decimals] = await Promise.all([
            erc20Contract.name().catch(() => 'Unknown Name'),
            erc20Contract.symbol().catch(() => 'Unknown Symbol'),
            erc20Contract.totalSupply().catch(() => BigInt(0)),
            erc20Contract.decimals().catch(() => 18)
          ]);

          // Get feature flags and presale info with error handling
          const [blacklistEnabled, timeLockEnabled, presaleData] = await Promise.all([
            tokenContract.blacklistEnabled().catch(() => false),
            tokenContract.timeLockEnabled().catch(() => false),
            tokenContract.presaleInfo().catch(() => [
              BigInt(0), BigInt(0), BigInt(0), BigInt(0), 
              BigInt(0), BigInt(0), BigInt(0), false, false, BigInt(0)
            ])
          ]);

          // Get platform fee info with error handling
          const platformFee = await tokenContract.platformFee().catch(() => ({
            recipient: '0x0000000000000000000000000000000000000000',
            totalTokens: BigInt(0),
            vestingEnabled: false,
            vestingDuration: BigInt(0),
            cliffDuration: BigInt(0),
            vestingStart: BigInt(0),
            tokensClaimed: BigInt(0)
          }));

          return {
            address: tokenAddress,
            name,
            symbol,
            totalSupply: formatUnits(totalSupply, decimals),
            displayTotalSupply: Number(formatUnits(totalSupply, decimals)).toLocaleString(undefined, {
              maximumFractionDigits: 0
            }),
            blacklistEnabled,
            timeLockEnabled,
            presaleInfo: {
              softCap: formatUnits(presaleData[0], decimals),
              hardCap: formatUnits(presaleData[1], decimals),
              minContribution: formatUnits(presaleData[2], decimals),
              maxContribution: formatUnits(presaleData[3], decimals),
              startTime: Number(presaleData[4]),
              endTime: Number(presaleData[5]),
              presaleRate: formatUnits(presaleData[6], decimals),
              whitelistEnabled: presaleData[7],
              finalized: presaleData[8],
              totalContributed: formatUnits(presaleData[9], decimals)
            },
            platformFee: {
              recipient: platformFee.recipient,
              totalTokens: formatUnits(platformFee.totalTokens || BigInt(0), decimals),
              vestingEnabled: platformFee.vestingEnabled,
              vestingDuration: Number(platformFee.vestingDuration),
              cliffDuration: Number(platformFee.cliffDuration),
              vestingStart: Number(platformFee.vestingStart),
              tokensClaimed: formatUnits(platformFee.tokensClaimed || BigInt(0), decimals)
            },
            createdAt: Date.now()
          } as TokenInfo;
        } catch (error) {
          console.error(`Error loading token ${tokenAddress}:`, error);
          return null;
        }
      });

      const loadedTokens = (await Promise.all(tokenPromises))
        .filter((token): token is TokenInfo => token !== null)
        .sort((a, b) => {
          const timeA = a.createdAt || 0;
          const timeB = b.createdAt || 0;
          return timeB - timeA;
        });

      console.log('Loaded tokens:', loadedTokens);
      setTokens(loadedTokens);
      showToast('success', `Found ${loadedTokens.length} tokens`);
    } catch (error: any) {
      console.error('TCAP_v2 Error:', error);
      showToast('error', error.message || 'Failed to load tokens');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAdditionalTokenData = async (tokens: TokenInfo[]) => {
    if (!provider) return;

    let presaleErrors = 0;
    let platformFeeErrors = 0;

    for (const token of tokens) {
      try {
        // Create contract instances
        const erc20Contract = new Contract(token.address, ERC20_ABI, provider);
        const tokenContract = new Contract(token.address, TokenTemplate_v2.abi, provider);

        // First get basic ERC20 info
        const [totalSupply, decimals] = await Promise.all([
          erc20Contract.totalSupply(),
          erc20Contract.decimals()
        ]);

        // Skip if token not initialized
        if (!totalSupply || totalSupply === BigInt(0)) {
          console.log(`Skipping uninitialized token: ${token.address}`);
          continue;
        }

        // Update basic token info
        setTokens(prevTokens => 
          prevTokens.map(t => 
            t.address === token.address 
              ? { 
                  ...t, 
                  totalSupply: formatUnits(totalSupply, decimals),
                  displayTotalSupply: Number(formatUnits(totalSupply, decimals)).toLocaleString(undefined, {
                    maximumFractionDigits: 0
                  })
                }
              : t
          )
        );

        try {
          // Get feature flags and presale info
          const [
            blacklistEnabled,
            timeLockEnabled,
            presaleData
          ] = await Promise.all([
            tokenContract.blacklistEnabled(),
            tokenContract.timeLockEnabled(),
            tokenContract.presaleInfo()
          ]);

          // Update token info with feature flags and presale data
          setTokens(prevTokens => 
            prevTokens.map(t => 
              t.address === token.address 
                ? { 
                    ...t,
                    blacklistEnabled,
                    timeLockEnabled,
                    presaleInfo: {
                      softCap: formatUnits(presaleData[0], TOKEN_DECIMALS),
                      hardCap: formatUnits(presaleData[1], TOKEN_DECIMALS),
                      minContribution: formatUnits(presaleData[2], TOKEN_DECIMALS),
                      maxContribution: formatUnits(presaleData[3], TOKEN_DECIMALS),
                      startTime: Number(presaleData[4]),
                      endTime: Number(presaleData[5]),
                      presaleRate: formatUnits(presaleData[6], TOKEN_DECIMALS),
                      whitelistEnabled: presaleData[7],
                      finalized: presaleData[8],
                      totalContributed: formatUnits(presaleData[9], TOKEN_DECIMALS)
                    }
                  }
                : t
          )
        );
        } catch (error) {
          console.error(`Failed to get presale info for ${token.address}:`, error);
          presaleErrors++;
        }

        try {
          // Get platform fee info
          const [
            recipient,
            totalTokens,
            vestingEnabled,
            vestingDuration,
            cliffDuration,
            vestingStart,
            tokensClaimed
          ] = await Promise.all([
            tokenContract.platformFeeRecipient(),
            tokenContract.platformFeeTokens(),
            tokenContract.platformFeeVestingEnabled(),
            tokenContract.platformFeeVestingDuration(),
            tokenContract.platformFeeCliffDuration(),
            tokenContract.platformFeeVestingStart(),
            tokenContract.platformFeeTokensClaimed()
          ]);

          setTokens(prevTokens => 
            prevTokens.map(t => 
              t.address === token.address 
                ? { 
                    ...t, 
                    platformFee: {
                      recipient,
                      totalTokens: formatUnits(totalTokens, TOKEN_DECIMALS),
                      vestingEnabled,
                      vestingDuration: Number(vestingDuration),
                      cliffDuration: Number(cliffDuration),
                      vestingStart: Number(vestingStart),
                      tokensClaimed: formatUnits(tokensClaimed, TOKEN_DECIMALS)
                    }
                  }
                : t
          )
        );
        } catch (error) {
          console.error(`Failed to get platform fee info for ${token.address}:`, error);
          platformFeeErrors++;
        }

      } catch (error) {
        console.error(`Error loading additional data for token ${token.address}:`, error);
      }
    }

    // Show summary of errors
    if (presaleErrors > 0 || platformFeeErrors > 0) {
      const errorMessages = [];
      if (presaleErrors > 0) errorMessages.push(`${presaleErrors} presale info errors`);
      if (platformFeeErrors > 0) errorMessages.push(`${platformFeeErrors} platform fee errors`);
      showToast('error', `Failed to load some token data: ${errorMessages.join(', ')}`);
    }
  };

  const handleBlacklist = async (tokenAddress: string, addressToBlacklist: string, blacklist: boolean) => {
    if (!isConnected || !signer) return;

    try {
      setIsLoading(true);
      const token = new Contract(tokenAddress, TokenTemplate_v2.abi, signer);

      const tx = await token[blacklist ? 'blacklist' : 'unblacklist'](addressToBlacklist);
      showToast('success', `Transaction submitted: ${blacklist ? 'Blacklisting' : 'Unblacklisting'} address...`);
      
      await tx.wait();
      const explorerUrl = getExplorerUrl(chainId || 0, tx.hash, 'tx');
      showToast('success', `Successfully ${blacklist ? 'blacklisted' : 'unblacklisted'} address ${addressToBlacklist.slice(0, 6)}...${addressToBlacklist.slice(-4)}`, explorerUrl);
      setBlacklistAddress('');
    } catch (error: any) {
      console.error('Error managing blacklist:', error);
      showToast('error', `Failed to ${blacklist ? 'blacklist' : 'unblacklist'} address: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetLockTime = async (tokenAddress: string, addressToLock: string, durationDays: number) => {
    if (!isConnected || !signer) return;

    if (addressToLock.toLowerCase() === walletAddress?.toLowerCase()) {
      if (!window.confirm('Warning: You are about to lock your own address. This will prevent you from transferring tokens. Are you sure?')) {
        return;
      }
    }

    try {
      setIsLoading(true);
      const token = new Contract(tokenAddress, TokenTemplate_v2.abi, signer);

      const lockUntil = Math.floor(Date.now() / 1000) + (durationDays * 24 * 60 * 60);
      
      const tx = await token.setTimeLock(addressToLock, lockUntil);
      showToast('success', 'Transaction submitted: Setting time lock...');
      
      await tx.wait();
      const explorerUrl = getExplorerUrl(chainId || 0, tx.hash, 'tx');
      showToast('success', `Successfully locked address ${addressToLock.slice(0, 6)}...${addressToLock.slice(-4)} until ${new Date(lockUntil * 1000).toLocaleString()}`, explorerUrl);
      setLockInfo({ address: '', duration: 30 });
    } catch (error: any) {
      console.error('Error setting lock time:', error);
      showToast('error', `Failed to set lock time: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const checkLockTime = async (tokenAddress: string, addressToCheck: string) => {
    if (!isConnected || !provider) return;

    try {
      setIsLoading(true);
      const token = new Contract(tokenAddress, TokenTemplate_v2.abi, provider);

      const lockTime = await token.getTimeLock(addressToCheck);
      const currentTime = Math.floor(Date.now() / 1000);
      
      if (lockTime > currentTime) {
        const daysLeft = Math.ceil((lockTime - currentTime) / (24 * 60 * 60));
        showToast('success', `Address is locked for ${daysLeft} more days (until ${new Date(lockTime * 1000).toLocaleString()})`);
      } else {
        showToast('success', 'Address is not locked');
      }
    } catch (error: any) {
      console.error('Error checking lock time:', error);
      showToast('error', error.message || 'Failed to check lock time');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinalizePresale = async (tokenAddress: string) => {
    if (!isConnected || !signer) return;

    try {
      setIsLoading(true);
      const token = new Contract(tokenAddress, TokenTemplate_v2.abi, signer);

      const tx = await token.finalize();
      showToast('success', 'Transaction submitted: Finalizing presale...');
      
      await tx.wait();
      const explorerUrl = getExplorerUrl(chainId || 0, tx.hash, 'tx');
      showToast('success', 'Presale finalized successfully! Tokens are now available for trading.', explorerUrl);
      loadTokens();
    } catch (error: any) {
      console.error('Error finalizing presale:', error);
      showToast('error', `Failed to finalize presale: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (timestamp: number) => {
    if (!timestamp) return 'Not set';
    return new Date(timestamp * 1000).toLocaleString();
  };

  function hideToken(address: string) {
    setHiddenTokens(prev => [...prev, address]);
  }

  function resetHiddenTokens() {
    setHiddenTokens([]);
  }

  function getVisibleTokens() {
    return tokens.filter(token => !hiddenTokens.includes(token.address));
  }

  const checkOwnership = async () => {
    if (!address || !provider || !walletAddress) return;
    try {
      const factory = new Contract(address, [
        'function owner() view returns (address)'
      ], provider);
      
      const owner = await factory.owner().catch(() => null);
      if (owner) {
        setIsOwner(owner.toLowerCase() === walletAddress.toLowerCase());
      } else {
        setIsOwner(false);
      }
    } catch (error) {
      console.error('Error checking ownership:', error);
      setIsOwner(false);
    }
  };

  const handleOwnerAction = async (action: string) => {
    if (!isConnected || !walletAddress || !address || !signer) return;

    try {
      setIsLoading(true);
      const factory = new Contract(address, TokenFactory_v2.abi, signer);

      let tx;
      switch (action) {
        case 'transferOwnership':
          if (!ownerControls.newOwner || !ethers.isAddress(ownerControls.newOwner)) {
            showToast('error', 'Invalid address');
            return;
          }
          tx = await factory.transferOwnership(ownerControls.newOwner);
          break;
        case 'setFee':
          if (!ownerControls.newFee || isNaN(Number(ownerControls.newFee))) {
            showToast('error', 'Invalid fee amount');
            return;
          }
          tx = await factory.setDeploymentFee(ethers.parseEther(ownerControls.newFee));
          break;
      }

      showToast('success', 'Transaction submitted...');
      await tx.wait();
      showToast('success', 'Transaction completed successfully');
      setOwnerControls({ newOwner: '', newFee: '' });
    } catch (error: any) {
      console.error('Error executing owner action:', error);
      showToast('error', error.message || 'Transaction failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="p-1 bg-gray-800 rounded-lg shadow-lg">
        <h2 className="text-xs font-medium text-text-primary">Token Management (V2)</h2>
        <p className="text-xs text-text-secondary">Please connect your wallet to manage tokens.</p>
      </div>
    );
  }

  return (
    <div className="form-card">
      <div
        className="flex justify-between items-center cursor-pointer py-1"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-1">
          <h2 className="text-sm font-medium text-text-primary">Token Creator Admin Controls (V2)</h2>
          <span className="text-xs text-text-secondary">
            {getVisibleTokens().length} tokens
          </span>
        </div>
        <div className="flex items-center gap-1">
          {hiddenTokens.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                resetHiddenTokens();
              }}
              className="btn-blue btn-small"
            >
              Show All ({hiddenTokens.length})
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              loadTokens();
            }}
            className="btn-blue btn-small"
          >
            Refresh
          </button>
          <span className="text-text-accent hover:text-blue-400">
            {isExpanded ? '▼' : '▶'}
          </span>
        </div>
      </div>

      {isExpanded && (
        isLoading ? (
          <div className="flex justify-center items-center py-1">
            <Spinner className="w-4 h-4 text-text-primary" />
          </div>
        ) : getVisibleTokens().length === 0 ? (
          <div className="mt-2">
            <p className="text-sm text-text-secondary">No V2 tokens found. Deploy a new token to get started.</p>
          </div>
        ) : (
          <div className="space-y-1 mt-2">
            {getVisibleTokens().map(token => (
              <div key={token.address} className="border border-border rounded-lg p-2 bg-gray-800">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-text-primary">{token.name} ({token.symbol})</h3>
                    <p className="text-xs text-text-secondary">Address: {token.address}</p>
                    <p className="text-xs text-text-secondary">Total Supply: {token.displayTotalSupply || Number(token.totalSupply).toLocaleString(undefined, { maximumFractionDigits: 0 })} {token.symbol}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedToken(selectedToken === token.address ? null : token.address)}
                      className="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
                    >
                      {selectedToken === token.address ? 'Hide' : 'Manage'}
                    </button>
                    <button
                      onClick={() => hideToken(token.address)}
                      className="text-xs px-2 py-1 rounded bg-gray-500/10 text-gray-400 hover:bg-gray-500/20"
                      title="Hide token"
                    >
                      Hide
                    </button>
                  </div>
                </div>

                {selectedToken === token.address && (
                  <div className="space-y-2 pt-1 border-t border-border">
                    <div className="flex gap-1">
                      <a
                        href={getExplorerUrl(chainId || 0, token.address, 'token')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-text-accent hover:text-blue-400"
                      >
                        View on Etherscan ↗
                      </a>
                    </div>

                    {/* Presale Information */}
                    <div className="space-y-1">
                      <h4 className="text-xs font-medium text-text-primary">Presale Status</h4>
                      <div className="grid grid-cols-2 gap-1">
                        <div>
                          <p className="text-xs text-text-secondary">Soft Cap: {token.presaleInfo.softCap} ETH</p>
                          <p className="text-xs text-text-secondary">Hard Cap: {token.presaleInfo.hardCap} ETH</p>
                          <p className="text-xs text-text-secondary">Min Contribution: {token.presaleInfo.minContribution} ETH</p>
                          <p className="text-xs text-text-secondary">Max Contribution: {token.presaleInfo.maxContribution} ETH</p>
                        </div>
                        <div>
                          <p className="text-xs text-text-secondary">Start Time: {formatDate(token.presaleInfo.startTime)}</p>
                          <p className="text-xs text-text-secondary">End Time: {formatDate(token.presaleInfo.endTime)}</p>
                          <p className="text-xs text-text-secondary">Rate: {token.presaleInfo.presaleRate} tokens/ETH</p>
                          <p className="text-xs text-text-secondary">Total Contributed: {token.presaleInfo.totalContributed} ETH</p>
                        </div>
                      </div>
                      {!token.presaleInfo.finalized && (
                        <button
                          onClick={() => handleFinalizePresale(token.address)}
                          className="mt-1 px-2 py-0.5 text-xs rounded bg-blue-500/20 text-blue-500 hover:bg-blue-500/30"
                          disabled={Date.now() / 1000 < token.presaleInfo.endTime}
                        >
                          Finalize Presale
                        </button>
                      )}
                    </div>

                    {/* Platform Fee Information */}
                    <div className="space-y-1">
                      <h4 className="text-xs font-medium text-text-primary">Platform Fee Info</h4>
                      <div className="grid grid-cols-2 gap-1">
                        <div>
                          <p className="text-xs text-text-secondary">Total Tokens: {token.platformFee.totalTokens}</p>
                          <p className="text-xs text-text-secondary">Tokens Claimed: {token.platformFee.tokensClaimed}</p>
                          <p className="text-xs text-text-secondary">Vesting Enabled: {token.platformFee.vestingEnabled ? 'Yes' : 'No'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-text-secondary">Vesting Duration: {token.platformFee.vestingDuration / 86400} days</p>
                          <p className="text-xs text-text-secondary">Cliff Duration: {token.platformFee.cliffDuration / 86400} days</p>
                          {token.platformFee.vestingStart > 0 && (
                            <p className="text-xs text-text-secondary">Vesting Start: {formatDate(token.platformFee.vestingStart)}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* User Contribution */}
                    {token.userContribution && (
                      <div className="space-y-1">
                        <h4 className="text-xs font-medium text-text-primary">Your Contribution</h4>
                        <p className="text-xs text-text-secondary">{token.userContribution} ETH</p>
                      </div>
                    )}

                    {!token.blacklistEnabled && !token.timeLockEnabled ? (
                      <p className="text-xs text-text-secondary italic">This token was created without blacklist or timelock features.</p>
                    ) : (
                      <>
                        {token.blacklistEnabled && (
                          <div className="space-y-1">
                            <h4 className="text-xs font-medium text-text-primary">Blacklist Management</h4>
                            <div className="flex gap-1">
                              <input
                                type="text"
                                value={blacklistAddress}
                                onChange={(e) => setBlacklistAddress(e.target.value)}
                                placeholder="Address to blacklist/unblacklist"
                                className="flex-1 p-1 text-xs rounded bg-background-primary border border-border hover:border-border-light focus:border-text-accent text-text-primary placeholder-text-secondary"
                              />
                              <button
                                onClick={() => handleBlacklist(token.address, blacklistAddress, true)}
                                className="px-2 py-0.5 text-xs rounded bg-red-500/20 text-red-500 hover:bg-red-500/30"
                              >
                                Blacklist
                              </button>
                              <button
                                onClick={() => handleBlacklist(token.address, blacklistAddress, false)}
                                className="px-2 py-0.5 text-xs rounded bg-green-500/20 text-green-500 hover:bg-green-500/30"
                              >
                                Unblacklist
                              </button>
                            </div>
                          </div>
                        )}

                        {token.timeLockEnabled && (
                          <div className="space-y-1">
                            <h4 className="text-xs font-medium text-text-primary">Time Lock Management</h4>
                            <p className="text-xs text-text-secondary">Lock token transfers for a specific address for a set duration.</p>
                            <div className="flex gap-1">
                              <input
                                type="text"
                                value={lockInfo.address}
                                onChange={(e) => setLockInfo({ ...lockInfo, address: e.target.value })}
                                placeholder="Address to lock/check"
                                className="flex-1 p-1 text-xs rounded bg-background-primary border border-border hover:border-border-light focus:border-text-accent text-text-primary placeholder-text-secondary"
                              />
                              <input
                                type="number"
                                value={lockInfo.duration}
                                onChange={(e) => setLockInfo({ ...lockInfo, duration: parseInt(e.target.value) || 0 })}
                                min="1"
                                max="365"
                                placeholder="Days"
                                className="w-16 p-1 text-xs rounded bg-background-primary border border-border hover:border-border-light focus:border-text-accent text-text-primary"
                              />
                              <button
                                onClick={() => handleSetLockTime(token.address, lockInfo.address, lockInfo.duration)}
                                className="px-2 py-0.5 text-xs rounded bg-blue-500/20 text-blue-500 hover:bg-blue-500/30"
                              >
                                Lock
                              </button>
                              <button
                                onClick={() => checkLockTime(token.address, lockInfo.address)}
                                className="px-2 py-0.5 text-xs rounded bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30"
                              >
                                Check
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}