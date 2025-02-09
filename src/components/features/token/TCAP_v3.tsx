import { useEffect, useState, forwardRef, useImperativeHandle, useMemo } from 'react';
import { Contract } from 'ethers';
import { formatEther, parseEther } from 'viem';
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
import { shortenAddress } from '@/utils/address';

interface Props {
  isConnected: boolean;
  address?: string;  // Factory address
  provider: any;
}

interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  totalSupply: string;
  owner: string;
  presaleInfo?: {
    softCap: string;
    hardCap: string;
    minContribution: string;
    maxContribution: string;
    presaleRate: string;
    startTime: number;
    endTime: number;
    whitelistEnabled: boolean;
    finalized: boolean;
    totalContributed: string;
    totalTokensSold: string;
    contributorCount: number;
    contributors: {
      address: string;
      contribution: string;
      tokenAllocation: string;
      isWhitelisted: boolean;
    }[];
  };
  liquidityInfo?: {
    percentage: string;
    lockDuration: string;
    unlockTime: number;
    locked: boolean;
  };
  platformFee?: {
    recipient: string;
    totalTokens: string;
    vestingEnabled: boolean;
    vestingDuration: number;
    cliffDuration: number;
    vestingStart: number;
    tokensClaimed: string;
  };
}

export interface TCAP_v3Ref {
  loadTokens: () => void;
}

const TCAP_v3 = forwardRef<TCAP_v3Ref, Props>(({ isConnected, address: factoryAddress, provider: externalProvider }, ref) => {
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showOnlyRecent, setShowOnlyRecent] = useState(true);
  const { chainId } = useNetwork();
  const { toast } = useToast();

  const displayedTokens = useMemo(() => {
    if (showOnlyRecent) {
      return tokens.slice(0, 3);
    }
    return tokens;
  }, [tokens, showOnlyRecent]);

  useEffect(() => {
    console.log('TCAP_v3 useEffect triggered with:', {
      isConnected,
      factoryAddress,
      hasProvider: !!externalProvider
    });
    
    if (isConnected && factoryAddress && externalProvider) {
      loadTokens();
    }
  }, [isConnected, factoryAddress, externalProvider]);

  const getTokenContract = (tokenAddress: string, signer: any) => {
    return new Contract(tokenAddress, [
      // Basic token functions
      'function name() view returns (string)',
      'function symbol() view returns (string)',
      'function totalSupply() view returns (uint256)',
      'function owner() view returns (address)',
      // Presale functions
      'function presaleInfo() view returns (tuple(uint256 softCap, uint256 hardCap, uint256 minContribution, uint256 maxContribution, uint256 startTime, uint256 endTime, uint256 presaleRate, bool whitelistEnabled, bool finalized, uint256 totalContributed))',
      'function getContributors() view returns (address[])',
      'function getContributorCount() view returns (uint256)',
      'function getContributorInfo(address) view returns (uint256 contribution, uint256 tokenAllocation, bool isWhitelisted)',
      // Liquidity functions
      'function liquidityInfo() view returns (tuple(uint256 percentage, uint256 lockDuration, uint256 unlockTime, bool locked))',
      // Platform fee functions
      'function platformFee() view returns (tuple(address recipient, uint256 totalTokens, bool vestingEnabled, uint256 vestingDuration, uint256 cliffDuration, uint256 vestingStart, uint256 tokensClaimed))'
    ], signer);
  };

  const loadTokens = async () => {
    if (!externalProvider || !factoryAddress) {
      console.log('TCAP_v3 loadTokens: Missing provider or factory address', {
        hasProvider: !!externalProvider,
        factoryAddress
      });
      return;
    }

    try {
      console.log('TCAP_v3 loadTokens: Starting token load');
      setIsLoading(true);
      setError(null);
      
      const signer = await externalProvider.getSigner();
      console.log('TCAP_v3: Got signer');
      
      const factory = new Contract(factoryAddress, [
        'function getUserCreatedTokens(address user) view returns (address[])',
        'function getTokenCreator(address token) view returns (address)',
        'function isTokenCreator(address user, address token) view returns (bool)',
        'function getUserTokenCount(address user) view returns (uint256)'
      ], signer);
      
      console.log('TCAP_v3: Factory contract created with signer');
      
      const userAddress = await signer.getAddress();
      console.log('TCAP_v3: Got user address:', userAddress);
      
      // Get tokens deployed by the connected user
      console.log('TCAP_v3: Calling getUserCreatedTokens');
      try {
        const deployedTokens = await factory.getUserCreatedTokens(userAddress);
        console.log('TCAP_v3: Deployed tokens:', deployedTokens);

        if (!Array.isArray(deployedTokens)) {
          throw new Error('Unexpected response format from getUserCreatedTokens');
        }

        const tokenPromises = deployedTokens.map(async (tokenAddress: string) => {
          try {
            const tokenContract = getTokenContract(tokenAddress, signer);

            // Basic token info
            const [name, symbol, totalSupply, owner] = await Promise.all([
              tokenContract.name(),
              tokenContract.symbol(),
              tokenContract.totalSupply(),
              tokenContract.owner()
            ]);

            // Get presale info with additional details
            let presaleInfo;
            let contributorInfo;
            try {
              const [info, contributorCount, contributors] = await Promise.all([
                tokenContract.presaleInfo(),
                tokenContract.getContributorCount(),
                tokenContract.getContributors()
              ]);

              // Get detailed info for each contributor
              const contributorDetails = await Promise.all(
                contributors.map(async (addr: string) => {
                  const details = await tokenContract.getContributorInfo(addr);
                  return {
                    address: addr,
                    contribution: formatEther(details.contribution),
                    tokenAllocation: formatEther(details.tokenAllocation),
                    isWhitelisted: details.isWhitelisted
                  };
                })
              );

              presaleInfo = {
                softCap: formatEther(info.softCap),
                hardCap: formatEther(info.hardCap),
                minContribution: formatEther(info.minContribution),
                maxContribution: formatEther(info.maxContribution),
                presaleRate: info.presaleRate.toString(),
                startTime: Number(info.startTime),
                endTime: Number(info.endTime),
                whitelistEnabled: info.whitelistEnabled,
                finalized: info.finalized,
                totalContributed: formatEther(info.totalContributed),
                totalTokensSold: formatEther(info.totalTokensSold || BigInt(0)),
                contributorCount: Number(contributorCount),
                contributors: contributorDetails
              };
            } catch (e) {
              console.log('No presale info for token:', tokenAddress);
            }

            // Try to get liquidity info
            let liquidityInfo;
            try {
              const info = await tokenContract.liquidityInfo();
              liquidityInfo = {
                percentage: info.percentage.toString(),
                lockDuration: info.lockDuration.toString(),
                unlockTime: Number(info.unlockTime),
                locked: info.locked
              };
            } catch (e) {
              console.log('No liquidity info for token:', tokenAddress);
            }

            // Try to get platform fee info
            let platformFee;
            try {
              const info = await tokenContract.platformFee();
              platformFee = {
                recipient: info.recipient,
                totalTokens: formatEther(info.totalTokens),
                vestingEnabled: info.vestingEnabled,
                vestingDuration: Number(info.vestingDuration),
                cliffDuration: Number(info.cliffDuration),
                vestingStart: Number(info.vestingStart),
                tokensClaimed: formatEther(info.tokensClaimed)
              };
            } catch (e) {
              console.log('No platform fee info for token:', tokenAddress);
            }

            return {
        address: tokenAddress,
              name,
              symbol,
              totalSupply: formatEther(totalSupply),
              owner,
              presaleInfo,
              liquidityInfo,
              platformFee
            } as TokenInfo;
          } catch (error) {
            console.error(`Error loading token ${tokenAddress}:`, error);
            return null;
          }
        });

        const loadedTokens = (await Promise.all(tokenPromises))
          .filter((token): token is TokenInfo => token !== null)
          .sort((a, b) => a.name.localeCompare(b.name));

        console.log('Loaded tokens:', loadedTokens);
        setTokens(loadedTokens);
      } catch (error) {
        console.error('TCAP_v3 Error loading tokens:', error);
        setError('Failed to load tokens. Please try again.');
      }
    } catch (error) {
      console.error('TCAP_v3 Error loading tokens:', error);
      setError('Failed to load tokens. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useImperativeHandle(ref, () => ({
    loadTokens: () => {
      console.log('TCAP_v3: loadTokens called via ref');
      loadTokens();
    }
  }));

  if (!isConnected) {
    return (
      <div className="p-1 bg-gray-800 rounded-lg shadow-lg">
        <h2 className="text-xs font-medium text-text-primary">Token Management (V3)</h2>
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
          <h2 className="text-xs font-medium text-text-primary">Token Creator Admin Controls (V3)</h2>
            <span className="text-xs text-text-secondary">
            {showOnlyRecent ? `${Math.min(tokens.length, 3)}/${tokens.length}` : tokens.length} tokens
            </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowOnlyRecent(!showOnlyRecent);
            }}
            className="text-xs px-2 py-0.5 bg-gray-700 hover:bg-gray-600 text-text-primary rounded"
          >
            {showOnlyRecent ? 'Show All' : 'Show Recent'}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              loadTokens();
            }}
            className="text-xs px-2 py-0.5 bg-gray-700 hover:bg-gray-600 text-text-primary rounded ml-1"
          >
            Refresh
          </button>
          <span className="text-text-accent hover:text-blue-400 ml-1">
            {isExpanded ? '▼' : '▶'}
          </span>
        </div>
      </div>

      {isExpanded && (
        isLoading ? (
            <div className="flex justify-center items-center py-1">
            <Spinner className="w-3 h-3 text-text-primary" />
            </div>
          ) : error ? (
          <div className="text-center py-1 text-red-400 text-xs">
              {error}
            </div>
        ) : tokens.length === 0 ? (
          <div className="mt-1">
            <p className="text-xs text-text-secondary">No V3 tokens found. Deploy a new token to get started.</p>
            </div>
          ) : (
          <div className="space-y-1 mt-1">
            {displayedTokens.map(token => (
              <div key={token.address} className="border border-border rounded p-2 bg-gray-800">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                    <h3 className="text-xs font-medium text-text-primary">{token.name} ({token.symbol})</h3>
                    <p className="text-xs text-text-secondary mt-0.5">Token: {token.address}</p>
                    <p className="text-xs text-text-secondary">Supply: {Number(token.totalSupply).toLocaleString()} {token.symbol}</p>
                    {token.presaleInfo && (
                      <div className="mt-0.5">
                      <p className="text-xs text-text-secondary">
                          Presale: {token.presaleInfo.finalized ? 'Finalized' : 'Active'} |
                          Progress: {Number(token.presaleInfo.totalContributed) / Number(token.presaleInfo.hardCap) * 100}%
                      </p>
                    </div>
                    )}
                  </div>
                      <button
                    onClick={() => setSelectedToken(selectedToken === token.address ? null : token.address)}
                    className="text-xs px-2 py-0.5 bg-gray-700 hover:bg-gray-600 text-text-primary rounded"
                      >
                    {selectedToken === token.address ? 'Hide' : 'Manage'}
                      </button>
                  </div>

                {selectedToken === token.address && (
                    <div className="mt-2 pt-2 border-t border-border">
                    <div className="grid grid-cols-2 gap-3">
                      {/* Token Explorer Section */}
                        <div className="flex flex-col gap-1">
                        <h4 className="text-xs font-medium text-text-primary mb-1">Token Explorer</h4>
                        <div className="flex gap-1">
                          <a
                            href={getExplorerUrl(chainId, token.address, 'token')}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs px-2 py-0.5 bg-gray-700 hover:bg-gray-600 text-text-primary rounded"
                          >
                            View on Explorer
                          </a>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(token.address);
                              toast({
                                title: "Address Copied",
                                description: "Token address copied to clipboard"
                              });
                            }}
                            className="text-xs px-2 py-0.5 bg-gray-700 hover:bg-gray-600 text-text-primary rounded"
                          >
                            Copy Address
                          </button>
                        </div>
                        </div>

                      {/* Token Controls Section */}
                          <div className="flex flex-col gap-1">
                        <h4 className="text-xs font-medium text-text-primary mb-1">Token Controls</h4>
                        <div className="grid grid-cols-2 gap-1">
                          <button
                            onClick={() => {/* TODO: Implement pause */}}
                            className="text-xs px-2 py-0.5 bg-gray-700 hover:bg-gray-600 text-text-primary rounded"
                          >
                            Pause
                          </button>
                          <button
                            onClick={() => {/* TODO: Implement blacklist */}}
                            className="text-xs px-2 py-0.5 bg-gray-700 hover:bg-gray-600 text-text-primary rounded"
                          >
                            Blacklist
                          </button>
                          <button
                            onClick={() => {/* TODO: Implement timelock */}}
                            className="text-xs px-2 py-0.5 bg-gray-700 hover:bg-gray-600 text-text-primary rounded"
                          >
                            Time Lock
                          </button>
                          <button
                            onClick={() => {/* TODO: Implement burn */}}
                            className="text-xs px-2 py-0.5 bg-gray-700 hover:bg-gray-600 text-text-primary rounded"
                          >
                            Burn
                          </button>
                        </div>
                      </div>

                      {/* Presale Management Section */}
                      {token.presaleInfo && (
                        <div className="col-span-2">
                          <h4 className="text-xs font-medium text-text-primary mb-1">Presale Management</h4>
                          <div className="grid grid-cols-3 gap-3">
                              <div>
                              <p className="text-xs text-text-secondary">Soft Cap: {token.presaleInfo.softCap} ETH</p>
                              <p className="text-xs text-text-secondary">Hard Cap: {token.presaleInfo.hardCap} ETH</p>
                              <p className="text-xs text-text-secondary">Min/Max: {token.presaleInfo.minContribution}/{token.presaleInfo.maxContribution} ETH</p>
                              <p className="text-xs text-text-secondary">Rate: {token.presaleInfo.presaleRate} tokens/ETH</p>
                              </div>
                              <div>
                              <p className="text-xs text-text-secondary">Start: {new Date(token.presaleInfo.startTime * 1000).toLocaleString()}</p>
                              <p className="text-xs text-text-secondary">End: {new Date(token.presaleInfo.endTime * 1000).toLocaleString()}</p>
                              <p className="text-xs text-text-secondary">Contributors: {token.presaleInfo.contributorCount}</p>
                              <p className="text-xs text-text-secondary">Total Raised: {token.presaleInfo.totalContributed} ETH</p>
                            </div>
                            <div className="flex flex-col gap-1">
                              <button
                                onClick={() => {/* TODO: Implement whitelist management */}}
                                className="text-xs px-2 py-0.5 bg-gray-700 hover:bg-gray-600 text-text-primary rounded"
                                disabled={token.presaleInfo.finalized}
                              >
                                Manage Whitelist
                              </button>
                                  <button
                                onClick={() => {/* TODO: Implement finalize */}}
                                className="text-xs px-2 py-0.5 bg-gray-700 hover:bg-gray-600 text-text-primary rounded"
                                disabled={token.presaleInfo.finalized || 
                                  Number(token.presaleInfo.totalContributed) < Number(token.presaleInfo.softCap)}
                                  >
                                    Finalize Presale
                                  </button>
                              <button
                                onClick={() => {/* TODO: Implement emergency withdraw */}}
                                className="text-xs px-2 py-0.5 bg-gray-700 hover:bg-gray-600 text-text-primary rounded"
                                disabled={token.presaleInfo.finalized}
                              >
                                Emergency Withdraw
                              </button>
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="w-full bg-gray-700 rounded-full h-1.5 mt-2">
                            <div 
                              className="bg-blue-600 h-1.5 rounded-full" 
                              style={{ 
                                width: `${Math.min(
                                  (Number(token.presaleInfo.totalContributed) / Number(token.presaleInfo.hardCap)) * 100, 
                                  100
                                )}%` 
                              }}
                            ></div>
                          </div>

                          {/* Contributors List */}
                          {token.presaleInfo.contributors.length > 0 && (
                            <div className="mt-2">
                              <h5 className="text-xs font-medium text-text-primary mb-1">Contributors</h5>
                              <div className="max-h-32 overflow-y-auto">
                                {token.presaleInfo.contributors.map((contributor, index) => (
                                  <div key={index} className="text-xs text-text-secondary flex justify-between items-center py-0.5">
                                    <span>{shortenAddress(contributor.address)}</span>
                                    <span>{contributor.contribution} ETH = {contributor.tokenAllocation} {token.symbol}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          </div>
                        )}

                      {/* Liquidity Management Section */}
                      {token.liquidityInfo && (
                        <div className="col-span-2">
                          <h4 className="text-xs font-medium text-text-primary mb-1">Liquidity Management</h4>
                          <div className="grid grid-cols-3 gap-3">
                            <div className="col-span-2">
                              <p className="text-xs text-text-secondary">Percentage: {token.liquidityInfo.percentage}% | Lock Duration: {token.liquidityInfo.lockDuration} days</p>
                              <p className="text-xs text-text-secondary">Status: {token.liquidityInfo.locked ? 'Locked' : 'Unlocked'} | Unlock: {new Date(token.liquidityInfo.unlockTime * 1000).toLocaleString()}</p>
                            </div>
                            <div className="flex gap-1">
                              <button
                                onClick={() => {/* TODO: Implement lock extension */}}
                                className="text-xs px-2 py-0.5 bg-gray-700 hover:bg-gray-600 text-text-primary rounded"
                                disabled={!token.liquidityInfo.locked}
                              >
                                Extend Lock
                              </button>
                                <button
                                onClick={() => {/* TODO: Implement unlock */}}
                                className="text-xs px-2 py-0.5 bg-gray-700 hover:bg-gray-600 text-text-primary rounded"
                                disabled={token.liquidityInfo.locked || 
                                  Date.now() < token.liquidityInfo.unlockTime * 1000}
                              >
                                Unlock
                                </button>
                            </div>
                              </div>
                          </div>
                        )}

                      {/* Platform Fee Section */}
                      {token.platformFee && token.platformFee.vestingEnabled && (
                        <div className="col-span-2">
                          <h4 className="text-xs font-medium text-text-primary mb-1">Platform Fee</h4>
                          <div className="grid grid-cols-3 gap-3">
                            <div className="col-span-2">
                              <p className="text-xs text-text-secondary">Total: {token.platformFee.totalTokens} | Claimed: {token.platformFee.tokensClaimed}</p>
                              <p className="text-xs text-text-secondary">Vesting: {token.platformFee.vestingDuration} days | Cliff: {token.platformFee.cliffDuration} days</p>
                            </div>
                            <div>
                              <button
                                onClick={() => {/* TODO: Implement claim */}}
                                className="text-xs px-2 py-0.5 bg-gray-700 hover:bg-gray-600 text-text-primary rounded"
                                disabled={Date.now() < token.platformFee.vestingStart * 1000 + 
                                  token.platformFee.cliffDuration * 24 * 60 * 60 * 1000}
                              >
                                Claim Tokens
                              </button>
                            </div>
                          </div>
                          
                          {/* Vesting Progress Bar */}
                          <div className="w-full bg-gray-700 rounded-full h-1.5 mt-2">
                            <div 
                              className="bg-blue-600 h-1.5 rounded-full" 
                              style={{ 
                                width: `${Math.min(
                                  (Number(token.platformFee.tokensClaimed) / Number(token.platformFee.totalTokens)) * 100, 
                                  100
                                )}%` 
                              }}
                            ></div>
                          </div>
                        </div>
                      )}
                      </div>
                    </div>
                  )}
                </div>
            ))}
        </div>
        )
      )}
    </div>
  );
});

export default TCAP_v3; 