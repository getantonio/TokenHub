import { useEffect, useState } from 'react';
import { useAccount, useContractRead, useWriteContract, usePublicClient } from 'wagmi';
import { formatEther, parseEther, Abi } from 'viem';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast/use-toast';
import TokenV3ABI from '@/contracts/abi/TokenTemplate_v3.json';
import TokenFactoryV3ABI from '@/contracts/abi/TokenFactory_v3.json';
import { Spinner } from '@/components/ui/Spinner';
import { useNetwork } from '@/contexts/NetworkContext';
import { getExplorerUrl } from '@/config/networks';
import { InfoIcon } from '@/components/ui/InfoIcon';
import { FACTORY_ADDRESSES } from '@/config/contracts';
import { Contract } from 'ethers';
import { shortenAddress } from '@/utils/address';

interface TokenAdminTestProps {
  tokenAddress: `0x${string}`;
  factoryAddress?: `0x${string}`;
}

interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  totalSupply: bigint;
  presaleInfo?: {
    softCap: bigint;
    hardCap: bigint;
    minContribution: bigint;
    maxContribution: bigint;
    presaleRate: bigint;
    startTime: bigint;
    endTime: bigint;
    whitelistEnabled: boolean;
    finalized: boolean;
    totalContributed: bigint;
    totalTokensSold: bigint;
  };
  liquidityInfo?: {
    percentage: bigint;
    lockDuration: bigint;
    unlockTime: bigint;
    locked: boolean;
  };
  platformFee?: {
    recipient: string;
    totalTokens: bigint;
    vestingEnabled: boolean;
    vestingDuration: bigint;
    cliffDuration: bigint;
    vestingStart: bigint;
    tokensClaimed: bigint;
  };
}

interface PresaleInfo {
  softCap: bigint;
  hardCap: bigint;
  minContribution: bigint;
  maxContribution: bigint;
  presaleRate: bigint;
  startTime: bigint;
  endTime: bigint;
  whitelistEnabled: boolean;
  finalized: boolean;
  totalContributed: bigint;
  totalTokensSold: bigint;
}

interface LiquidityInfo {
  percentage: bigint;
  lockDuration: bigint;
  unlockTime: bigint;
  locked: boolean;
}

interface PlatformFeeInfo {
  recipient: string;
  totalTokens: bigint;
  vestingEnabled: boolean;
  vestingDuration: bigint;
  cliffDuration: bigint;
  vestingStart: bigint;
  tokensClaimed: bigint;
}

interface VestingSchedule {
  walletName: string;
  amount: bigint;
  period: bigint;
  beneficiary: string;
  claimed: bigint;
  startTime: bigint;
}

interface TokenDetails {
  address: string;
  name: string;
  symbol: string;
  totalSupply: bigint;
  owner: string;
}

export default function TCAP_v3({ tokenAddress, factoryAddress }: TokenAdminTestProps) {
  const { address } = useAccount();
  const { chainId } = useNetwork();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedToken, setSelectedToken] = useState<`0x${string}` | null>(null);
  const [transferAmount, setTransferAmount] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [isTransferPending, setIsTransferPending] = useState(false);
  const [vestingSchedulesCount, setVestingSchedulesCount] = useState<number>(0);
  const [selectedSchedule, setSelectedSchedule] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const [errorTimeout, setErrorTimeout] = useState<NodeJS.Timeout | null>(null);
  const [userTokens, setUserTokens] = useState<`0x${string}`[]>([]);
  const [tokenDetails, setTokenDetails] = useState<Record<`0x${string}`, TokenDetails>>({});
  const publicClient = usePublicClient();

  const isZeroAddress = !tokenAddress || tokenAddress === '0x0000000000000000000000000000000000000000';

  // Initialize mounting and fetch user's tokens
  useEffect(() => {
    setMounted(true);
    if (address && factoryAddress && publicClient) {
      fetchUserTokens();
    }
    return () => {
      if (errorTimeout) {
        clearTimeout(errorTimeout);
      }
    };
  }, [address, factoryAddress, publicClient]);

  // Set selected token when tokenAddress prop changes
  useEffect(() => {
    if (tokenAddress && !isZeroAddress && publicClient) {
      const hexTokenAddress = tokenAddress as `0x${string}`;
      setSelectedToken(hexTokenAddress);
      if (!tokenDetails[hexTokenAddress]) {
        fetchTokenDetails(hexTokenAddress, publicClient);
      }
    }
  }, [tokenAddress, publicClient]);

  // Reset state when token address changes
  useEffect(() => {
    if (!mounted) return;

    setLoading(true);
    setError(null);

    // Don't reset selected token if we have a valid token address
    if (!tokenAddress || isZeroAddress) {
      setSelectedToken(null);
    }

    setTransferAmount('');
    setTransferTo('');
    setVestingSchedulesCount(0);
    setSelectedSchedule(null);

    // Clear any existing error timeout
    if (errorTimeout) {
      clearTimeout(errorTimeout);
      setErrorTimeout(null);
    }

    // If no token address or zero address, stop loading
    if (isZeroAddress) {
      setLoading(false);
    }
  }, [tokenAddress, mounted]);

  const fetchUserTokens = async () => {
    if (!publicClient || !factoryAddress || !address) return;
    
    try {
      setLoading(true);
      
      // Get all deployed tokens first
      const allTokens = await publicClient.readContract({
        address: factoryAddress,
        abi: TokenFactoryV3ABI.abi as unknown as Abi,
        functionName: 'getDeployedTokens'
      }) as `0x${string}`[];

      console.log('All deployed tokens:', allTokens);
      
      // Get user's tokens
      const userCreatedTokens = await publicClient.readContract({
        address: factoryAddress,
        abi: TokenFactoryV3ABI.abi as unknown as Abi,
        functionName: 'getTokensByUser',
        args: [address]
      }) as `0x${string}`[];

      console.log('User created tokens:', userCreatedTokens);

      // Use all tokens, but mark user's tokens
      setUserTokens(allTokens);

      // Fetch details for each token
      for (const token of allTokens) {
        await fetchTokenDetails(token, publicClient);
      }
      
    } catch (err) {
      console.error('Error fetching tokens:', err);
      toast({
        title: 'Error',
        description: 'Failed to fetch tokens',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Contract reads for token info
  const { data: name, isError: nameError, isLoading: nameLoading } = useContractRead({
    address: tokenAddress as `0x${string}`,
    abi: TokenV3ABI.abi as unknown as Abi,
    functionName: 'name',
    query: {
      enabled: mounted && !isZeroAddress,
    }
  }) as { data: string | undefined; isError: boolean; isLoading: boolean };

  const { data: symbol, isError: symbolError, isLoading: symbolLoading } = useContractRead({
    address: tokenAddress as `0x${string}`,
    abi: TokenV3ABI.abi as unknown as Abi,
    functionName: 'symbol',
    query: {
      enabled: mounted && !isZeroAddress,
    }
  }) as { data: string | undefined; isError: boolean; isLoading: boolean };

  const { data: totalSupply, isError: totalSupplyError, isLoading: totalSupplyLoading } = useContractRead({
    address: tokenAddress as `0x${string}`,
    abi: TokenV3ABI.abi as unknown as Abi,
    functionName: 'totalSupply',
    query: {
      enabled: mounted && !isZeroAddress,
    }
  }) as { data: bigint | undefined; isError: boolean; isLoading: boolean };

  // Presale Info
  const { data: presaleInfo, isError: presaleError, isLoading: presaleLoading } = useContractRead({
    address: tokenAddress as `0x${string}`,
    abi: TokenV3ABI.abi as unknown as Abi,
    functionName: 'presaleInfo',
    query: {
      enabled: mounted && !isZeroAddress,
    }
  }) as { data: PresaleInfo | undefined; isError: boolean; isLoading: boolean };

  // Liquidity Info
  const { data: liquidityInfo, isError: liquidityError, isLoading: liquidityLoading } = useContractRead({
    address: tokenAddress as `0x${string}`,
    abi: TokenV3ABI.abi as unknown as Abi,
    functionName: 'liquidityInfo',
    query: {
      enabled: mounted && !isZeroAddress,
    }
  }) as { data: LiquidityInfo | undefined; isError: boolean; isLoading: boolean };

  // Platform Fee Info
  const { data: platformFee, isError: platformFeeError, isLoading: platformFeeLoading } = useContractRead({
    address: tokenAddress as `0x${string}`,
    abi: TokenV3ABI.abi as unknown as Abi,
    functionName: 'platformFee',
    query: {
      enabled: mounted && !isZeroAddress,
    }
  }) as { data: PlatformFeeInfo | undefined; isError: boolean; isLoading: boolean };

  // Vesting Schedules Count
  const { data: vestingCount, isLoading: vestingCountLoading } = useContractRead({
    address: tokenAddress as `0x${string}`,
    abi: TokenV3ABI.abi as unknown as Abi,
    functionName: 'getVestingSchedulesCount',
    query: {
      enabled: mounted && !isZeroAddress,
    }
  }) as { data: bigint | undefined; isLoading: boolean };

  // Selected Vesting Schedule
  const { data: vestingSchedule, isLoading: vestingScheduleLoading } = useContractRead({
    address: tokenAddress as `0x${string}`,
    abi: TokenV3ABI.abi as unknown as Abi,
    functionName: 'getVestingSchedule',
    args: selectedSchedule !== null ? [BigInt(selectedSchedule)] : undefined,
    query: {
      enabled: mounted && !isZeroAddress && selectedSchedule !== null,
    }
  }) as { data: VestingSchedule | undefined; isLoading: boolean };

  // Write Contract Functions
  const { writeContract, isPending } = useWriteContract();

  const refreshData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Clear any existing error state and timeout
      if (errorTimeout) {
        clearTimeout(errorTimeout);
        setErrorTimeout(null);
      }

      // Fetch user's tokens if we have the required data
      if (address && factoryAddress) {
        await fetchUserTokens();
      }

      // If we have a selected token, fetch its details again
      if (selectedToken) {
        await fetchTokenDetails(selectedToken, publicClient);
      }
      
      // Force a re-render to refresh contract reads
      setMounted(false);
      setTimeout(() => setMounted(true), 100);
      
      toast({
        title: 'Success',
        description: 'Token data refreshed from blockchain',
      });
    } catch (err) {
      console.error('Error refreshing data:', err);
      setError('Failed to refresh token data');
      toast({
        title: 'Error',
        description: 'Failed to refresh token data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (vestingCount) {
      setVestingSchedulesCount(Number(vestingCount));
    }
  }, [vestingCount]);

  // Effect to handle loading and error states
  useEffect(() => {
    if (!mounted) return;
    
    const isLoading = nameLoading || symbolLoading || totalSupplyLoading;
    const hasError = nameError || symbolError || totalSupplyError;
    
    setLoading(isLoading);
    
    if (hasError) {
      setError('Failed to load token information');
    } else {
      setError(null);
    }
  }, [
    mounted,
    nameLoading, symbolLoading, totalSupplyLoading,
    nameError, symbolError, totalSupplyError
  ]);

  const handleTransfer = async () => {
    if (!transferTo || !transferAmount) {
      toast({
        title: 'Error',
        description: 'Please provide both recipient address and amount',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsTransferPending(true);
      await writeContract({
        address: tokenAddress,
        abi: TokenV3ABI.abi as unknown as Abi,
        functionName: 'transfer',
        args: [transferTo as `0x${string}`, parseEther(transferAmount)]
      });
      toast({
        title: 'Transfer Initiated',
        description: 'Your transfer has been initiated. Please wait for confirmation.',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to transfer tokens',
        variant: 'destructive'
      });
    } finally {
      setIsTransferPending(false);
    }
  };

  const handleClaimVested = async (scheduleIndex: number) => {
    try {
      await writeContract({
        address: tokenAddress,
        abi: TokenV3ABI.abi as unknown as Abi,
        functionName: 'claimVestedTokens',
        args: [BigInt(scheduleIndex)]
      });
      toast({
        title: 'Claim Initiated',
        description: 'Vested tokens claim has been initiated.',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to claim vested tokens',
        variant: 'destructive'
      });
    }
  };

  const handleFinalizePresale = async () => {
    try {
      await writeContract({
        address: tokenAddress,
        abi: TokenV3ABI.abi as unknown as Abi,
        functionName: 'finalizePresale',
      });
      toast({
        title: 'Finalization Initiated',
        description: 'Presale finalization has been initiated.',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to finalize presale',
        variant: 'destructive'
      });
    }
  };

  // Fetch token details for a specific token
  const fetchTokenDetails = async (token: `0x${string}`, client: any) => {
    try {
      const [name, symbol, totalSupply, owner] = await Promise.all([
        client.readContract({
          address: token,
          abi: TokenV3ABI.abi as unknown as Abi,
          functionName: 'name',
        }),
        client.readContract({
          address: token,
          abi: TokenV3ABI.abi as unknown as Abi,
          functionName: 'symbol',
        }),
        client.readContract({
          address: token,
          abi: TokenV3ABI.abi as unknown as Abi,
          functionName: 'totalSupply',
        }),
        client.readContract({
          address: token,
          abi: TokenV3ABI.abi as unknown as Abi,
          functionName: 'owner',
        })
      ]);

      setTokenDetails(prev => ({
        ...prev,
        [token]: { 
          name: name as string, 
          symbol: symbol as string,
          totalSupply: totalSupply as bigint,
          owner: owner as string,
          address: token,
        }
      }));
    } catch (err) {
      console.error('Error fetching token details for', token, ':', err);
    }
  };

  if (!mounted) {
    return (
      <div className="form-card">
        <div className="flex justify-between items-center py-1">
          <h2 className="text-sm font-medium text-text-primary">Token Creator Admin Controls (V3)</h2>
          <Spinner className="w-4 h-4 text-text-primary" />
        </div>
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
          <h2 className="text-sm font-medium text-text-primary">Token Creator Admin Controls (V3)</h2>
          {!isZeroAddress && name && symbol && (
            <span className="text-xs text-text-secondary">
              {name && symbol ? `${name.toString()} (${symbol.toString()})` : 'Loading...'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              refreshData();
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
        <div className="mt-2 border-t border-border pt-2">
          {/* User's Tokens List */}
          {userTokens.length > 0 && (
            <div className="mb-4 border border-border rounded-lg p-2 bg-gray-800/50">
              <h3 className="text-sm font-medium text-text-primary mb-2">All Tokens ({userTokens.length})</h3>
              <div className="grid gap-2">
                {userTokens.map((token) => (
                  <button
                    key={token}
                    onClick={() => setSelectedToken(token)}
                    className={`w-full text-left p-2 rounded-md transition-colors ${
                      token === selectedToken
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    <div className="text-xs font-medium">{token}</div>
                    {tokenDetails[token] && (
                      <div className="text-xs text-gray-400">
                        {tokenDetails[token].name} ({tokenDetails[token].symbol})
                        <div>Supply: {formatEther(tokenDetails[token].totalSupply)}</div>
                        <div>Owner: {tokenDetails[token].owner === address ? 'You' : shortenAddress(tokenDetails[token].owner)}</div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center py-1">
              <Spinner className="w-4 h-4 text-text-primary" />
            </div>
          ) : error ? (
            <div className="text-center py-2 text-red-400">
              {error}
            </div>
          ) : (
            <>
              {/* Token Details Section */}
              {!isZeroAddress && name && symbol && (
                <div className="border border-border rounded-lg p-2 bg-gray-800">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h3 className="text-sm font-medium text-text-primary">
                        {String(name)} ({String(symbol)})
                      </h3>
                      <p className="text-xs text-text-secondary mt-0.5">Token: {tokenAddress}</p>
                      <p className="text-xs text-text-secondary">
                        Supply: {totalSupply ? formatEther(totalSupply) : '0'} {String(symbol)}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setSelectedToken(selectedToken === tokenAddress ? null : tokenAddress)}
                        className="btn-blue btn-small"
                      >
                        {selectedToken === tokenAddress ? 'Hide' : 'Manage'}
                      </button>
                    </div>
                  </div>

                  {selectedToken === tokenAddress && (
                    <div className="mt-2 pt-2 border-t border-border">
                      <div className="space-y-2">
                        {/* Token Explorer */}
                        <div className="flex flex-col gap-1">
                          <h4 className="text-xs font-medium text-text-primary">Token Explorer</h4>
                          <a
                            href={getExplorerUrl(chainId, tokenAddress, 'token')}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-blue btn-small w-fit"
                          >
                            View on Explorer
                          </a>
                        </div>

                        {/* Presale Information */}
                        {presaleInfo && (
                          <div className="flex flex-col gap-1">
                            <h4 className="text-xs font-medium text-text-primary">Presale Status</h4>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <p>Soft Cap: {formatEther((presaleInfo as PresaleInfo).softCap)} ETH</p>
                                <p>Hard Cap: {formatEther((presaleInfo as PresaleInfo).hardCap)} ETH</p>
                                <p>Min Contribution: {formatEther((presaleInfo as PresaleInfo).minContribution)} ETH</p>
                                <p>Max Contribution: {formatEther((presaleInfo as PresaleInfo).maxContribution)} ETH</p>
                              </div>
                              <div>
                                <p>Total Contributed: {formatEther((presaleInfo as PresaleInfo).totalContributed)} ETH</p>
                                <p>Tokens Sold: {formatEther((presaleInfo as PresaleInfo).totalTokensSold)}</p>
                                <p>Status: {(presaleInfo as PresaleInfo).finalized ? 'Finalized' : 'Active'}</p>
                                {!(presaleInfo as PresaleInfo).finalized && (
                                  <button
                                    onClick={handleFinalizePresale}
                                    className="btn-blue btn-small mt-1"
                                  >
                                    Finalize Presale
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Liquidity Information */}
                        {liquidityInfo && (
                          <div className="flex flex-col gap-1">
                            <h4 className="text-xs font-medium text-text-primary">Liquidity Status</h4>
                            <div className="text-xs">
                              <p>Percentage: {Number((liquidityInfo as LiquidityInfo).percentage)}%</p>
                              <p>Lock Duration: {Number((liquidityInfo as LiquidityInfo).lockDuration)} days</p>
                              <p>Status: {(liquidityInfo as LiquidityInfo).locked ? 'Locked' : 'Unlocked'}</p>
                              {(liquidityInfo as LiquidityInfo).locked && (
                                <p>Unlocks: {new Date(Number((liquidityInfo as LiquidityInfo).unlockTime) * 1000).toLocaleString()}</p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Platform Fee Information */}
                        {platformFee && (
                          <div className="flex flex-col gap-1">
                            <h4 className="text-xs font-medium text-text-primary">Platform Fee</h4>
                            <div className="text-xs">
                              <p>Recipient: {(platformFee as PlatformFeeInfo).recipient}</p>
                              <p>Total Tokens: {formatEther((platformFee as PlatformFeeInfo).totalTokens)}</p>
                              <p>Vesting: {(platformFee as PlatformFeeInfo).vestingEnabled ? 'Enabled' : 'Disabled'}</p>
                              {(platformFee as PlatformFeeInfo).vestingEnabled && (
                                <>
                                  <p>Vesting Duration: {Number((platformFee as PlatformFeeInfo).vestingDuration)} days</p>
                                  <p>Cliff Duration: {Number((platformFee as PlatformFeeInfo).cliffDuration)} days</p>
                                  <p>Tokens Claimed: {formatEther((platformFee as PlatformFeeInfo).tokensClaimed)}</p>
                                </>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Vesting Schedules */}
                        {vestingSchedulesCount > 0 && (
                          <div className="flex flex-col gap-1">
                            <h4 className="text-xs font-medium text-text-primary">Vesting Schedules</h4>
                            <div className="flex gap-1">
                              <select
                                value={selectedSchedule === null ? '' : selectedSchedule}
                                onChange={(e) => setSelectedSchedule(e.target.value ? Number(e.target.value) : null)}
                                className="form-select h-7 text-xs"
                              >
                                <option value="">Select Schedule</option>
                                {Array.from({ length: vestingSchedulesCount }, (_, i) => (
                                  <option key={i} value={i}>Schedule {i + 1}</option>
                                ))}
                              </select>
                              {selectedSchedule !== null && vestingSchedule && (
                                <button
                                  onClick={() => handleClaimVested(selectedSchedule)}
                                  className="btn-blue btn-small"
                                >
                                  Claim Vested
                                </button>
                              )}
                            </div>
                            {selectedSchedule !== null && vestingSchedule && (
                              <div className="text-xs mt-1">
                                <p>Name: {vestingSchedule.walletName}</p>
                                <p>Amount: {formatEther(vestingSchedule.amount)}</p>
                                <p>Period: {Number(vestingSchedule.period)} days</p>
                                <p>Claimed: {formatEther(vestingSchedule.claimed)}</p>
                                <p>Start Time: {new Date(Number(vestingSchedule.startTime) * 1000).toLocaleString()}</p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Transfer Tokens */}
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-medium text-text-primary">Transfer Tokens</h4>
                            <InfoIcon content="Transfer tokens to another address." />
                          </div>
                          <div className="flex gap-1">
                            <Input
                              type="text"
                              placeholder="Recipient Address (0x...)"
                              value={transferTo}
                              onChange={(e) => setTransferTo(e.target.value)}
                              className="flex-1 h-7 text-xs bg-gray-900 border-gray-700 text-white"
                            />
                            <Input
                              type="number"
                              placeholder="Amount"
                              value={transferAmount}
                              onChange={(e) => setTransferAmount(e.target.value)}
                              className="w-32 h-7 text-xs bg-gray-900 border-gray-700 text-white"
                            />
                            <button
                              onClick={handleTransfer}
                              disabled={isTransferPending || isPending}
                              className="btn-blue btn-small"
                            >
                              {isTransferPending || isPending ? 'Processing...' : 'Transfer'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
} 