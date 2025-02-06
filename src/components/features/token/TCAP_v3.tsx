import { useState, useEffect } from 'react';
import { BrowserProvider, Contract, formatUnits, parseUnits, EventLog } from 'ethers';
import TokenFactory_v2 from '@contracts/abi/TokenFactory_v2.json';
import TokenTemplate_v2 from '@contracts/abi/TokenTemplate_v2.json';
import { FACTORY_ADDRESSES } from '@config/contracts';
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

// Add ERC20 interface
const ERC20_ABI = [
  "function totalSupply() external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function balanceOf(address account) external view returns (uint256)",
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) external returns (bool)"
];

interface TokenAdminV3Props {
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
  vestingInfo: {
    schedules: Array<{
      walletName: string;
      amount: string;
      period: string;
      beneficiary: string;
      claimed: string;
    }>;
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

export default function TokenAdminV3({ isConnected, address, provider: externalProvider }: TokenAdminV3Props) {
  const { chainId } = useNetwork();
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [hiddenTokens, setHiddenTokens] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (isConnected && externalProvider) {
      loadTokens();
    }
  }, [isConnected, externalProvider, chainId]);

  const loadTokens = async () => {
    if (!externalProvider || !chainId) return;
    
    setIsLoading(true);
    try {
      const factoryAddress = FACTORY_ADDRESSES.v2[chainId];
      if (!factoryAddress) {
        throw new Error('Factory contract not available on this network');
      }

      const factory = new Contract(factoryAddress, TokenFactory_v2.abi, externalProvider);
      const filter = factory.filters.TokenCreated();
      const events = await factory.queryFilter(filter);
      
      const tokenPromises = events.map(async (event) => {
        if (!('args' in event)) return null;
        const tokenAddress = event.args?.[0];
        if (!tokenAddress) return null;

        const token = new Contract(tokenAddress, TokenTemplate_v2.abi, externalProvider);
        
        try {
          const [
            name,
            symbol,
            totalSupply,
            blacklistEnabled,
            timeLockEnabled,
            presaleInfo,
            vestingInfo,
            platformFee
          ] = await Promise.all([
            token.name(),
            token.symbol(),
            token.totalSupply(),
            token.blacklistEnabled(),
            token.timeLockEnabled(),
            token.getPresaleInfo(),
            token.getVestingInfo(),
            token.getPlatformFee()
          ]);

          return {
            address: tokenAddress,
            name,
            symbol,
            totalSupply: formatUnits(totalSupply, TOKEN_DECIMALS),
            blacklistEnabled,
            timeLockEnabled,
            presaleInfo: {
              softCap: formatUnits(presaleInfo.softCap, 18),
              hardCap: formatUnits(presaleInfo.hardCap, 18),
              minContribution: formatUnits(presaleInfo.minContribution, 18),
              maxContribution: formatUnits(presaleInfo.maxContribution, 18),
              startTime: Number(presaleInfo.startTime),
              endTime: Number(presaleInfo.endTime),
              presaleRate: formatUnits(presaleInfo.presaleRate, TOKEN_DECIMALS),
              whitelistEnabled: presaleInfo.whitelistEnabled,
              finalized: presaleInfo.finalized,
              totalContributed: formatUnits(presaleInfo.totalContributed, 18)
            },
            vestingInfo: {
              schedules: vestingInfo.schedules.map((schedule: any) => ({
                walletName: schedule.walletName,
                amount: formatUnits(schedule.amount, TOKEN_DECIMALS),
                period: schedule.period.toString(),
                beneficiary: schedule.beneficiary,
                claimed: formatUnits(schedule.claimed, TOKEN_DECIMALS)
              }))
            },
            platformFee: {
              recipient: platformFee.recipient,
              totalTokens: formatUnits(platformFee.totalTokens, TOKEN_DECIMALS),
              vestingEnabled: platformFee.vestingEnabled,
              vestingDuration: Number(platformFee.vestingDuration),
              cliffDuration: Number(platformFee.cliffDuration),
              vestingStart: Number(platformFee.vestingStart),
              tokensClaimed: formatUnits(platformFee.tokensClaimed, TOKEN_DECIMALS)
            }
          };
        } catch (error) {
          console.error(`Error loading token ${tokenAddress}:`, error);
          return null;
        }
      });

      const loadedTokens = (await Promise.all(tokenPromises)).filter((token): token is TokenInfo => token !== null);
      setTokens(loadedTokens);
    } catch (error) {
      console.error('Error loading tokens:', error);
      toast({
        title: "Error",
        description: "Failed to load tokens",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const hideToken = (tokenAddress: string) => {
    setHiddenTokens(prev => [...prev, tokenAddress]);
  };

  const getVisibleTokens = () => {
    return tokens.filter(token => !hiddenTokens.includes(token.address));
  };

  return (
    <Card className="bg-gray-900 border-gray-800">
      <div className="p-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-white">Token Control Panel (V3)</h2>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm text-gray-400 hover:text-white"
          >
            {isExpanded ? 'Collapse' : 'Expand'}
          </button>
        </div>

        {isExpanded && (
          isLoading ? (
            <div className="flex justify-center items-center py-4">
              <Spinner className="w-6 h-6 text-blue-400" />
            </div>
          ) : getVisibleTokens().length === 0 ? (
            <div className="mt-4">
              <p className="text-sm text-gray-400">No V3 tokens found. Deploy a new token to get started.</p>
            </div>
          ) : (
            <div className="space-y-4 mt-4">
              {getVisibleTokens().map(token => (
                <div key={token.address} className="border border-gray-800 rounded-lg p-4 bg-gray-800">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-white">{token.name} ({token.symbol})</h3>
                      <p className="text-sm text-gray-400">Address: {token.address}</p>
                      <p className="text-sm text-gray-400">
                        Total Supply: {Number(token.totalSupply).toLocaleString()} {token.symbol}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedToken(selectedToken === token.address ? null : token.address)}
                        className="px-3 py-1 rounded bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
                      >
                        {selectedToken === token.address ? 'Hide' : 'Manage'}
                      </button>
                      <button
                        onClick={() => hideToken(token.address)}
                        className="px-3 py-1 rounded bg-gray-700 text-gray-400 hover:bg-gray-600"
                      >
                        Hide
                      </button>
                    </div>
                  </div>

                  {selectedToken === token.address && (
                    <div className="mt-4 space-y-4 pt-4 border-t border-gray-700">
                      <div>
                        <a
                          href={getExplorerUrl(chainId || 0, token.address, 'token')}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300"
                        >
                          View on Explorer ↗
                        </a>
                      </div>

                      {/* Presale Information */}
                      <div>
                        <h4 className="text-md font-semibold text-white mb-2">Presale Status</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <p className="text-sm text-gray-400">
                              Soft Cap: {token.presaleInfo.softCap} ETH
                            </p>
                            <p className="text-sm text-gray-400">
                              Hard Cap: {token.presaleInfo.hardCap} ETH
                            </p>
                            <p className="text-sm text-gray-400">
                              Min Contribution: {token.presaleInfo.minContribution} ETH
                            </p>
                            <p className="text-sm text-gray-400">
                              Max Contribution: {token.presaleInfo.maxContribution} ETH
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm text-gray-400">
                              Start: {formatDate(token.presaleInfo.startTime)}
                            </p>
                            <p className="text-sm text-gray-400">
                              End: {formatDate(token.presaleInfo.endTime)}
                            </p>
                            <p className="text-sm text-gray-400">
                              Rate: {token.presaleInfo.presaleRate} tokens/ETH
                            </p>
                            <p className="text-sm text-gray-400">
                              Total Contributed: {token.presaleInfo.totalContributed} ETH
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Vesting Information */}
                      <div>
                        <h4 className="text-md font-semibold text-white mb-2">Vesting Schedules</h4>
                        <div className="space-y-2">
                          {token.vestingInfo.schedules.map((schedule, index) => (
                            <div key={index} className="bg-gray-700 rounded-lg p-3">
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <p className="text-sm text-gray-400">
                                    Wallet: {schedule.walletName}
                                  </p>
                                  <p className="text-sm text-gray-400">
                                    Amount: {Number(schedule.amount).toLocaleString()} {token.symbol}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-400">
                                    Period: {schedule.period} days
                                  </p>
                                  <p className="text-sm text-gray-400">
                                    Claimed: {Number(schedule.claimed).toLocaleString()} {token.symbol}
                                  </p>
                                </div>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                Beneficiary: {schedule.beneficiary}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Platform Fee Information */}
                      <div>
                        <h4 className="text-md font-semibold text-white mb-2">Platform Fee</h4>
                        <div className="space-y-1">
                          <p className="text-sm text-gray-400">
                            Total Tokens: {Number(token.platformFee.totalTokens).toLocaleString()} {token.symbol}
                          </p>
                          <p className="text-sm text-gray-400">
                            Claimed: {Number(token.platformFee.tokensClaimed).toLocaleString()} {token.symbol}
                          </p>
                          {token.platformFee.vestingEnabled && (
                            <>
                              <p className="text-sm text-gray-400">
                                Vesting Duration: {token.platformFee.vestingDuration} days
                              </p>
                              <p className="text-sm text-gray-400">
                                Cliff Duration: {token.platformFee.cliffDuration} days
                              </p>
                              <p className="text-sm text-gray-400">
                                Vesting Start: {formatDate(token.platformFee.vestingStart)}
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </Card>
  );
} 