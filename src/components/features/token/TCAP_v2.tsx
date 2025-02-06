import { useState, useEffect } from 'react';
import { BrowserProvider, Contract, formatUnits, parseUnits, EventLog } from 'ethers';
import TokenFactory_v2 from '@contracts/abi/TokenFactory_v2.json';
import TokenTemplate_v2 from '@contracts/abi/TokenTemplate_v2.json';
import { getNetworkContractAddress } from '@config/contracts';
import { getExplorerUrl } from '@config/networks';
import { useNetwork } from '@contexts/NetworkContext';
import { Spinner } from '@components/ui/Spinner';
import { ethers } from 'ethers';
import { AbiCoder } from 'ethers';
import { Button } from '@components/ui/button';
import { Card } from '@components/ui/card';
import { useToast } from '@/components/ui/toast/use-toast';

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
  isConnected: boolean;
  address?: string;
  provider: BrowserProvider | null;
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

export default function TokenAdminV2({ isConnected, address, provider: externalProvider }: TokenAdminV2Props) {
  const { chainId } = useNetwork();
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [blacklistAddress, setBlacklistAddress] = useState('');
  const [lockInfo, setLockInfo] = useState<LockInfo>({ address: '', duration: 30 });
  const [currentWallet, setCurrentWallet] = useState<string | null>(null);
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
    if (isConnected && chainId && externalProvider && address) {
      console.log("Dependencies changed, reloading tokens:", {
        isConnected,
        chainId,
        hasProvider: !!externalProvider,
        address
      });
      loadTokens();
    }
  }, [isConnected, chainId, externalProvider, address]);

  useEffect(() => {
    const updateWallet = async () => {
      if (isConnected && window.ethereum && externalProvider) {
        try {
          const signer = await externalProvider.getSigner();
          const address = await signer.getAddress();
          setCurrentWallet(address);
        } catch (error) {
          console.error("Error getting wallet address:", error);
        }
      }
    };

    updateWallet();
  }, [isConnected, externalProvider]);

  useEffect(() => {
    if (isConnected && address && externalProvider) {
      checkOwnership();
    }
  }, [isConnected, address, externalProvider, currentWallet]);

  useEffect(() => {
    localStorage.setItem('hiddenTokensV2', JSON.stringify(hiddenTokens));
  }, [hiddenTokens]);

  const showToast = (type: 'success' | 'error', message: string) => {
    toast({
      title: message,
      variant: type === 'error' ? 'destructive' : 'default',
    });
  };

  const loadTokens = async () => {
    if (!isConnected || !window.ethereum || !chainId || !externalProvider) {
      console.error("Missing dependencies");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const signer = await externalProvider.getSigner();
      
      const factoryV2Address = chainId ? getNetworkContractAddress(Number(chainId), 'factoryAddressV2') : null;
      if (!factoryV2Address) {
        showToast('error', 'No V2 factory deployed on this network');
        return;
      }

      console.log("Loading tokens for:", {
        chainId,
        factoryV2Address
      });
      
      const factoryV2 = new Contract(factoryV2Address, TokenFactory_v2.abi, externalProvider);
      const currentBlock = await externalProvider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 100000);

      console.log(`\nSearching for events from block ${fromBlock} to ${currentBlock}`);

      // Get TokenCreated events
      const filter = factoryV2.filters.TokenCreated();
      const events = await factoryV2.queryFilter(filter, fromBlock, currentBlock);
      
      console.log("Found events:", events.length);

      const foundTokens: TokenInfo[] = [];
      const processedAddresses = new Set<string>();
      let errors = 0;

      for (const event of events) {
        try {
          // Cast event to EventLog to access args
          const eventLog = event as EventLog;
          const { token: tokenAddr, name, symbol, owner } = eventLog.args;
          
          if (!tokenAddr || !ethers.isAddress(tokenAddr)) {
            console.log(`Invalid token address: ${tokenAddr}`);
            continue;
          }
          
          const normalizedAddr = tokenAddr.toLowerCase();
          if (processedAddresses.has(normalizedAddr)) {
            console.log(`Token already processed: ${normalizedAddr}`);
            continue;
          }

          const code = await externalProvider.getCode(normalizedAddr);
          if (code === '0x') {
            console.log(`No code at address: ${normalizedAddr}`);
            continue;
          }

          console.log("Processing token:", {
            address: normalizedAddr,
            name,
            symbol,
            owner
          });

          // Create contract instance with both ERC20 and Template ABIs
          const erc20Contract = new Contract(normalizedAddr, ERC20_ABI, externalProvider);
          const tokenContract = new Contract(normalizedAddr, TokenTemplate_v2.abi, externalProvider);

          // Check initialization by trying to get basic token info
          try {
            const [totalSupply, decimals] = await Promise.all([
              erc20Contract.totalSupply(),
              erc20Contract.decimals()
            ]);

            console.log(`Token info loaded successfully:`, {
              address: normalizedAddr,
              totalSupply: formatUnits(totalSupply, decimals),
              decimals
            });

            // If we get here, the token is initialized
            foundTokens.push({
              address: normalizedAddr,
              name,
              symbol,
              totalSupply: formatUnits(totalSupply, decimals),
              blacklistEnabled: false,
              timeLockEnabled: false,
              presaleInfo: {
                softCap: "0",
                hardCap: "0",
                minContribution: "0",
                maxContribution: "0",
                startTime: 0,
                endTime: 0,
                presaleRate: "0",
                whitelistEnabled: false,
                finalized: false,
                totalContributed: "0"
              },
              platformFee: {
                recipient: ethers.ZeroAddress,
                totalTokens: "0",
                vestingEnabled: false,
                vestingDuration: 0,
                cliffDuration: 0,
                vestingStart: 0,
                tokensClaimed: "0"
              }
            });
            
            processedAddresses.add(normalizedAddr);
            console.log(`Successfully processed token: ${name} (${symbol}) at ${normalizedAddr}`);
          } catch (error) {
            console.log(`Token ${normalizedAddr} initialization check failed:`, error);
            continue;
          }
        } catch (error) {
          console.error("Error processing event:", error);
          errors++;
        }
      }

      if (foundTokens.length > 0) {
        console.log("Setting found tokens:", foundTokens);
        setTokens(foundTokens);
        showToast('success', `Found ${foundTokens.length} tokens`);

        // After setting the basic token info, load additional data in the background
        loadAdditionalTokenData(foundTokens);
      } else {
        console.log("No initialized tokens found");
        setTokens([]);
      }
    } catch (error: any) {
      console.error('Error loading tokens:', error);
      showToast('error', error.message || 'Failed to load tokens');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAdditionalTokenData = async (tokens: TokenInfo[]) => {
    if (!externalProvider) return;

    let presaleErrors = 0;
    let platformFeeErrors = 0;

    for (const token of tokens) {
      try {
        // Create contract instances
        const erc20Contract = new Contract(token.address, ERC20_ABI, externalProvider);
        const tokenContract = new Contract(token.address, TokenTemplate_v2.abi, externalProvider);

        // First get basic ERC20 info with proper error handling
        const [totalSupply, decimals] = await Promise.all([
          erc20Contract.totalSupply().catch((error) => {
            console.error(`Failed to get totalSupply for ${token.address}:`, error);
            return BigInt(0);
          }),
          erc20Contract.decimals().catch((error) => {
            console.error(`Failed to get decimals for ${token.address}:`, error);
            return 18;
          })
        ]);

        // Update basic token info first
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

        // Then try to get presale info with proper error handling
        const presaleInfo = await tokenContract.presaleInfo().catch((error) => {
          console.error(`Failed to get presale info for ${token.address}:`, error);
          presaleErrors++;
          return {
            softCap: BigInt(0),
            hardCap: BigInt(0),
            minContribution: BigInt(0),
            maxContribution: BigInt(0),
            startTime: BigInt(0),
            endTime: BigInt(0),
            presaleRate: BigInt(0),
            whitelistEnabled: false,
            finalized: false,
            totalContributed: BigInt(0)
          };
        });
        
        // Update presale info if successful
        setTokens(prevTokens => 
          prevTokens.map(t => 
            t.address === token.address 
              ? { 
                  ...t,
                  presaleInfo: {
                    softCap: formatUnits(presaleInfo.softCap, TOKEN_DECIMALS),
                    hardCap: formatUnits(presaleInfo.hardCap, TOKEN_DECIMALS),
                    minContribution: formatUnits(presaleInfo.minContribution, TOKEN_DECIMALS),
                    maxContribution: formatUnits(presaleInfo.maxContribution, TOKEN_DECIMALS),
                    startTime: Number(presaleInfo.startTime),
                    endTime: Number(presaleInfo.endTime),
                    presaleRate: formatUnits(presaleInfo.presaleRate, TOKEN_DECIMALS),
                    whitelistEnabled: presaleInfo.whitelistEnabled,
                    finalized: presaleInfo.finalized,
                    totalContributed: formatUnits(presaleInfo.totalContributed, TOKEN_DECIMALS)
                  }
                }
              : t
          )
        );

        // Try to get platform fee info with proper error handling
        try {
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

          // Update platform fee info if successful
          setTokens(prevTokens => 
            prevTokens.map(t => 
              t.address === token.address 
                ? { 
                    ...t, 
                    platformFee: {
                      recipient,
                      totalTokens: formatUnits(totalTokens, decimals),
                      vestingEnabled,
                      vestingDuration: Number(vestingDuration),
                      cliffDuration: Number(cliffDuration),
                      vestingStart: Number(vestingStart),
                      tokensClaimed: formatUnits(tokensClaimed, decimals)
                    }
                  }
                : t
            )
          );
        } catch (error: any) {
          console.error(`Failed to get platform fee info for ${token.address}:`, error);
          platformFeeErrors++;
        }

      } catch (error: any) {
        console.error(`Error loading additional data for token ${token.address}:`, error);
      }
    }

    // Show a single summary toast for all errors
    if (presaleErrors > 0 || platformFeeErrors > 0) {
      const errorMessages = [];
      if (presaleErrors > 0) errorMessages.push(`${presaleErrors} presale info errors`);
      if (platformFeeErrors > 0) errorMessages.push(`${platformFeeErrors} platform fee errors`);
      showToast('error', `Failed to load some token data: ${errorMessages.join(', ')}`);
    }
  };

  const handleBlacklist = async (tokenAddress: string, addressToBlacklist: string, blacklist: boolean) => {
    if (!isConnected || !window.ethereum) return;

    try {
      setIsLoading(true);
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const token = new Contract(tokenAddress, TokenTemplate_v2.abi, signer);

      const tx = await token[blacklist ? 'blacklist' : 'unblacklist'](addressToBlacklist);
      showToast('success', 'Transaction submitted...');
      
      await tx.wait();
      showToast('success', `Address ${blacklist ? 'blacklisted' : 'unblacklisted'} successfully`);
      setBlacklistAddress('');
    } catch (error: any) {
      console.error('Error managing blacklist:', error);
      showToast('error', error.message || 'Failed to manage blacklist');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetLockTime = async (tokenAddress: string, addressToLock: string, durationDays: number) => {
    if (!isConnected || !window.ethereum) return;

    if (addressToLock.toLowerCase() === currentWallet?.toLowerCase()) {
      if (!window.confirm('Warning: You are about to lock your own address. This will prevent you from transferring tokens. Are you sure?')) {
        return;
      }
    }

    try {
      setIsLoading(true);
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const token = new Contract(tokenAddress, TokenTemplate_v2.abi, signer);

      const lockUntil = Math.floor(Date.now() / 1000) + (durationDays * 24 * 60 * 60);
      
      const tx = await token.setTimeLock(addressToLock, lockUntil);
      showToast('success', 'Transaction submitted...');
      
      await tx.wait();
      showToast('success', `Address locked until ${new Date(lockUntil * 1000).toLocaleString()}`);
      setLockInfo({ address: '', duration: 30 });
    } catch (error: any) {
      console.error('Error setting lock time:', error);
      showToast('error', error.message || 'Failed to set lock time');
    } finally {
      setIsLoading(false);
    }
  };

  const checkLockTime = async (tokenAddress: string, addressToCheck: string) => {
    if (!isConnected || !window.ethereum) return;

    try {
      setIsLoading(true);
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const token = new Contract(tokenAddress, TokenTemplate_v2.abi, signer);

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
    if (!isConnected || !window.ethereum) return;

    try {
      setIsLoading(true);
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const token = new Contract(tokenAddress, TokenTemplate_v2.abi, signer);

      const tx = await token.finalize();
      showToast('success', 'Transaction submitted...');
      
      await tx.wait();
      showToast('success', 'Presale finalized successfully');
      loadTokens();
    } catch (error: any) {
      console.error('Error finalizing presale:', error);
      showToast('error', error.message || 'Failed to finalize presale');
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
    if (!address || !externalProvider || !currentWallet) return;
    try {
      const factory = new Contract(address, TokenFactory_v2.abi, externalProvider);
      const owner = await factory.owner();
      setIsOwner(owner.toLowerCase() === currentWallet.toLowerCase());
    } catch (error) {
      console.error('Error checking ownership:', error);
    }
  };

  const handleOwnerAction = async (action: string) => {
    if (!isConnected || !window.ethereum || !address) return;

    try {
      setIsLoading(true);
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
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