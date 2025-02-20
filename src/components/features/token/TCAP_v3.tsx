import { useEffect, useState, forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
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
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { getNetworkContractAddress, FACTORY_ADDRESSES } from '@config/contracts';

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
  paused: boolean;
  vestingInfo?: {
    hasVesting: boolean;
    totalAmount: string;
    startTime: number;
    cliffDuration: number;
    vestingDuration: number;
    releasedAmount: string;
    revocable: boolean;
    revoked: boolean;
    releasableAmount: string;
  };
  createdAt?: number;
}

interface BlockDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  tokenName: string;
  tokenAddress: string;
}

function BlockDialog({ isOpen, onClose, onConfirm, tokenName, tokenAddress }: BlockDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full border border-red-500">
          <h3 className="text-xl font-bold text-white mb-4">⚠️ Block Token Permanently</h3>
          <div className="space-y-4">
            <p className="text-gray-300">
              Are you sure you want to block <span className="font-semibold text-white">{tokenName}</span>?
            </p>
            <p className="text-red-400 text-sm">
              This action cannot be undone. The token will be permanently removed from your management panel.
            </p>
            <div className="bg-gray-800 p-3 rounded text-xs font-mono text-gray-300 break-all">
              {tokenAddress}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-white"
              >
                Block Permanently
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
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

  // Add state for vesting schedules popup
  const [showVestingSchedules, setShowVestingSchedules] = useState(false);
  const [selectedTokenForSchedules, setSelectedTokenForSchedules] = useState<string | null>(null);
  const [vestingSchedules, setVestingSchedules] = useState<any[]>([]);

  // Add these state variables after the existing ones
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [tokenToBlock, setTokenToBlock] = useState<TokenInfo | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Add click-away listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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
      'function balanceOf(address account) view returns (uint256)',
      'function transfer(address to, uint256 amount) returns (bool)',
      'function allowance(address owner, address spender) view returns (uint256)',
      'function approve(address spender, uint256 amount) returns (bool)',
      'function transferFrom(address from, address to, uint256 amount) returns (bool)',
      // Control functions
      'function pause() external',
      'function unpause() external',
      'function paused() view returns (bool)',
      'function isPauser(address account) view returns (bool)',
      'function addPauser(address account) external',
      'function renouncePauser() external',
      // Other existing functions...
      'function updateBlacklist(address[] calldata addresses, bool status) external',
      'function setTimeLock(address account, uint256 unlockTime) external',
      'function burn(uint256 amount) external',
      // Presale functions
      'function presaleInfo() view returns (tuple(uint256 softCap, uint256 hardCap, uint256 minContribution, uint256 maxContribution, uint256 startTime, uint256 endTime, uint256 presaleRate, bool whitelistEnabled, bool finalized, uint256 totalContributed))',
      'function updateWhitelist(address[] calldata addresses, bool status) external',
      'function finalize() external',
      'function getContributors() view returns (address[])',
      'function getContributorCount() view returns (uint256)',
      'function getContributorInfo(address) view returns (uint256 contribution, uint256 tokenAllocation, bool isWhitelisted)',
      // Liquidity functions
      'function liquidityInfo() view returns (tuple(uint256 percentage, uint256 lockDuration, uint256 unlockTime, bool locked))',
      // Platform fee functions
      'function platformFee() view returns (tuple(address recipient, uint256 totalTokens, bool vestingEnabled, uint256 vestingDuration, uint256 cliffDuration, uint256 vestingStart, uint256 tokensClaimed))',
      'function createVestingSchedule(address beneficiary, uint256 totalAmount, uint256 startTime, uint256 cliffDuration, uint256 vestingDuration, bool revocable) external',
      'function releaseVestedTokens() external',
      'function revokeVesting(address beneficiary) external',
      'function getVestingSchedule(address) view returns (uint256 totalAmount, uint256 startTime, uint256 cliffDuration, uint256 vestingDuration, uint256 releasedAmount, bool revocable, bool revoked, uint256 releasableAmount)',
      'function hasVestingSchedule(address) view returns (bool)'
    ], signer);
  };

  // Add this function to handle blocked tokens
  const getBlockedTokens = (): string[] => {
    const blocked = localStorage.getItem('blockedTokensV3');
    return blocked ? JSON.parse(blocked) : [];
  };

  // Add this function to save blocked tokens
  const saveBlockedToken = (tokenAddress: string) => {
    const blocked = getBlockedTokens();
    blocked.push(tokenAddress);
    localStorage.setItem('blockedTokensV3', JSON.stringify(blocked));
  };

  const loadTokens = async () => {
    if (!externalProvider) {
      console.log('TCAP_v3 loadTokens: Missing provider');
      return;
    }

    try {
      console.log('TCAP_v3 loadTokens: Starting token load');
      setIsLoading(true);
      setError(null);

      // Get chainId
      const network = await externalProvider.getNetwork();
      const chainId = Number(network.chainId);

      // Try multiple ways to get the factory address
      let factoryV3Address = null;
      
      // First try FACTORY_ADDRESSES
      if (FACTORY_ADDRESSES.v3[chainId]) {
        factoryV3Address = FACTORY_ADDRESSES.v3[chainId];
        console.log("Got factory address from FACTORY_ADDRESSES:", factoryV3Address);
      }
      
      // If not found, try getNetworkContractAddress with different keys
      if (!factoryV3Address) {
        const keys = ['FACTORY_ADDRESS_V3', 'factoryV3', 'factoryAddressV3'];
        for (const key of keys) {
          factoryV3Address = getNetworkContractAddress(chainId, key);
          if (factoryV3Address) {
            console.log(`Got factory address using key ${key}:`, factoryV3Address);
            break;
          }
        }
      }

      if (!factoryV3Address) {
        console.error("No factory address found for chain:", chainId);
        setError('No V3 factory deployed on this network');
        return;
      }

      // Verify the factory contract exists
      const code = await externalProvider.getCode(factoryV3Address);
      if (code === '0x' || code === '') {
        console.error("Factory contract not deployed at:", factoryV3Address);
        setError('Factory contract not found on this network');
        return;
      }

      const signer = await externalProvider.getSigner();
      console.log('TCAP_v3: Got signer');
      
      const factory = new Contract(factoryV3Address, [
        'function getUserCreatedTokens(address user) view returns (address[])',
        'function getDeployedTokens() view returns (address[])',
        'function getTokenCreator(address token) view returns (address)',
        'function isTokenCreator(address user, address token) view returns (bool)',
        'function getUserTokenCount(address user) view returns (uint256)'
      ], signer);
      
      console.log('TCAP_v3: Factory contract created with signer');
      
      const userAddress = await signer.getAddress();
      console.log('TCAP_v3: Got user address:', userAddress);
      
      // Try both methods to get user's tokens
      let deployedTokens = [];
      try {
        console.log('TCAP_v3: Trying getUserCreatedTokens');
        deployedTokens = await factory.getUserCreatedTokens(userAddress);
      } catch (error) {
        console.log('TCAP_v3: getUserCreatedTokens failed, trying getDeployedTokens');
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
          deployedTokens = (await Promise.all(tokenPromises)).filter(Boolean);
        } catch (error) {
          console.error('Both token retrieval methods failed:', error);
          throw new Error('Failed to retrieve tokens');
        }
      }

      console.log('TCAP_v3: Deployed tokens:', deployedTokens);

      if (!Array.isArray(deployedTokens)) {
        throw new Error('Unexpected response format from token retrieval');
      }

      const blockedTokens = getBlockedTokens();
      
      const tokenPromises = deployedTokens
        .filter(token => !blockedTokens.includes(token)) // Filter out blocked tokens
        .map(async (tokenAddress: string) => {
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

            // Try to get vesting info
            let vestingInfo;
            try {
              const hasVesting = await tokenContract.hasVestingSchedule(userAddress);
              if (hasVesting) {
                const scheduleInfo = await tokenContract.getVestingSchedule(userAddress);
                vestingInfo = {
                  hasVesting: true,
                  totalAmount: formatEther(scheduleInfo.totalAmount),
                  startTime: Number(scheduleInfo.startTime),
                  cliffDuration: Number(scheduleInfo.cliffDuration),
                  vestingDuration: Number(scheduleInfo.vestingDuration),
                  releasedAmount: formatEther(scheduleInfo.releasedAmount),
                  revocable: scheduleInfo.revocable,
                  revoked: scheduleInfo.revoked,
                  releasableAmount: formatEther(scheduleInfo.releasableAmount)
                };
              }
            } catch (e) {
              console.log('No vesting info for token:', tokenAddress);
            }

            return {
              address: tokenAddress,
              name,
              symbol,
              totalSupply: formatEther(totalSupply),
              owner,
              presaleInfo,
              liquidityInfo,
              platformFee,
              paused: await tokenContract.paused(),
              vestingInfo,
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
          // Sort by creation time (newest first)
          const timeA = a.createdAt || 0;
          const timeB = b.createdAt || 0;
          return timeB - timeA;
        });

      console.log('Loaded tokens:', loadedTokens);
      setTokens(loadedTokens);
    } catch (error) {
      console.error('TCAP_v3 Error loading tokens:', error);
      setError('Failed to load tokens. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Update handlePause with better error handling
  const handlePause = async (tokenAddress: string) => {
    try {
      const signer = await externalProvider.getSigner();
      const tokenContract = getTokenContract(tokenAddress, signer);
      
      // First check if the user is the owner
      const owner = await tokenContract.owner();
      const currentUser = await signer.getAddress();
      
      if (owner.toLowerCase() !== currentUser.toLowerCase()) {
        throw new Error('Only the token owner can pause/unpause transfers');
      }

      // Check if user is a pauser
      const isPauser = await tokenContract.isPauser(currentUser);
      if (!isPauser) {
        throw new Error('You do not have pauser role');
      }

      // Check current pause state
      const isPaused = await tokenContract.paused();
      console.log('Current pause state:', isPaused);
      
      // Prepare the transaction
      const method = isPaused ? 'unpause' : 'pause';
      
      // Estimate gas with a buffer
      const gasEstimate = await tokenContract[method].estimateGas();
      const gasLimit = gasEstimate + (gasEstimate / BigInt(5)); // Add 20% buffer
      
      // Send transaction with gas limit
      const tx = await tokenContract[method]({
        gasLimit,
      });
      
      toast({
        title: 'Transaction Pending',
        description: `${isPaused ? 'Unpausing' : 'Pausing'} token transfers...`,
      });
      
      await tx.wait();
      
      toast({
        title: isPaused ? 'Token Unpaused' : 'Token Paused',
        description: `Successfully ${isPaused ? 'unpaused' : 'paused'} token transfers.`
      });
      
      loadTokens();
    } catch (error: any) {
      console.error('Error toggling pause:', error);
      let errorMessage = 'Failed to toggle pause state.';
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.reason) {
        errorMessage = error.reason;
      } else if (error.code === 'CALL_EXCEPTION') {
        errorMessage = 'Transaction failed. You may not have the required permissions or there might be a network issue.';
      }

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    }
  };

  const handleEmergencyWithdraw = async (tokenAddress: string) => {
    try {
      const signer = await externalProvider.getSigner();
      const tokenContract = getTokenContract(tokenAddress, signer);
      
      const tx = await tokenContract.claimRefund();
      await tx.wait();
      
      toast({
        title: 'Emergency Withdraw',
        description: 'Successfully claimed refund.'
      });
      
      loadTokens();
    } catch (error) {
      console.error('Error claiming refund:', error);
      toast({
        title: 'Error',
        description: 'Failed to claim refund. Make sure presale has ended and soft cap was not reached.',
        variant: 'destructive'
      });
    }
  };

  const handleBlacklist = async (tokenAddress: string) => {
    try {
      const addresses = prompt('Enter addresses to blacklist (comma-separated):');
      if (!addresses) return;
      
      const addressList = addresses.split(',').map(addr => addr.trim());
      const signer = await externalProvider.getSigner();
      const tokenContract = getTokenContract(tokenAddress, signer);
      
      const tx = await tokenContract.updateBlacklist(addressList, true);
      await tx.wait();
      
      toast({
        title: 'Addresses Blacklisted',
        description: `Successfully blacklisted ${addressList.length} addresses.`
      });
    } catch (error) {
      console.error('Error updating blacklist:', error);
      toast({
        title: 'Error',
        description: 'Failed to update blacklist.',
        variant: 'destructive'
      });
    }
  };

  const handleTimeLock = async (tokenAddress: string) => {
    try {
      const address = prompt('Enter address to timelock:');
      if (!address) return;
      
      const duration = prompt('Enter lock duration in days:');
      if (!duration) return;
      
      const unlockTime = Math.floor(Date.now() / 1000) + (parseInt(duration) * 24 * 60 * 60);
      
      const signer = await externalProvider.getSigner();
      const tokenContract = getTokenContract(tokenAddress, signer);
      
      const tx = await tokenContract.setTimeLock(address, unlockTime);
      await tx.wait();
      
      toast({
        title: 'Time Lock Set',
        description: `Successfully set time lock for ${address}.`
      });
    } catch (error) {
      console.error('Error setting time lock:', error);
      toast({
        title: 'Error',
        description: 'Failed to set time lock.',
        variant: 'destructive'
      });
    }
  };

  const handleBurn = async (tokenAddress: string) => {
    try {
      const amount = prompt('Enter amount to burn:');
      if (!amount) return;
      
      const signer = await externalProvider.getSigner();
      const tokenContract = getTokenContract(tokenAddress, signer);
      
      const tx = await tokenContract.burn(parseEther(amount));
      await tx.wait();
      
      toast({
        title: 'Tokens Burned',
        description: `Successfully burned ${amount} tokens.`
      });
      
      loadTokens();
    } catch (error) {
      console.error('Error burning tokens:', error);
      toast({
        title: 'Error',
        description: 'Failed to burn tokens.',
        variant: 'destructive'
      });
    }
  };

  const handleWhitelist = async (tokenAddress: string) => {
    try {
      const addresses = prompt('Enter addresses to whitelist (comma-separated):');
      if (!addresses) return;
      
      const addressList = addresses.split(',').map(addr => addr.trim());
      const signer = await externalProvider.getSigner();
      const tokenContract = getTokenContract(tokenAddress, signer);
      
      const tx = await tokenContract.updateWhitelist(addressList, true);
      await tx.wait();
      
      toast({
        title: 'Addresses Whitelisted',
        description: `Successfully whitelisted ${addressList.length} addresses.`
      });
    } catch (error) {
      console.error('Error updating whitelist:', error);
      toast({
        title: 'Error',
        description: 'Failed to update whitelist.',
        variant: 'destructive'
      });
    }
  };

  const handleFinalize = async (tokenAddress: string) => {
    try {
      const signer = await externalProvider.getSigner();
      const tokenContract = getTokenContract(tokenAddress, signer);
      
      const tx = await tokenContract.finalize();
      await tx.wait();
      
      toast({
        title: 'Presale Finalized',
        description: 'Successfully finalized the presale.'
      });
      
      loadTokens();
    } catch (error) {
      console.error('Error finalizing presale:', error);
      toast({
        title: 'Error',
        description: 'Failed to finalize presale.',
        variant: 'destructive'
      });
    }
  };

  const handleCreateVesting = async (tokenAddress: string) => {
    try {
      const beneficiary = prompt('Enter beneficiary address:');
      if (!beneficiary) return;
      
      const amount = prompt('Enter amount of tokens to vest:');
      if (!amount) return;
      
      const cliffMonths = prompt('Enter cliff period in months:');
      if (!cliffMonths) return;
      
      const vestingMonths = prompt('Enter vesting period in months:');
      if (!vestingMonths) return;
      
      const startTime = Math.floor(Date.now() / 1000);
      const cliffDuration = parseInt(cliffMonths) * 30 * 24 * 60 * 60;
      const vestingDuration = parseInt(vestingMonths) * 30 * 24 * 60 * 60;
      
      const signer = await externalProvider.getSigner();
      const tokenContract = getTokenContract(tokenAddress, signer);
      
      const tx = await tokenContract.createVestingSchedule(
        beneficiary,
        parseEther(amount),
        startTime,
        cliffDuration,
        vestingDuration,
        true // revocable
      );
      await tx.wait();
      
      toast({
        title: 'Vesting Schedule Created',
        description: `Successfully created vesting schedule for ${beneficiary}`
      });
      
      loadTokens();
    } catch (error) {
      console.error('Error creating vesting schedule:', error);
      toast({
        title: 'Error',
        description: 'Failed to create vesting schedule.',
        variant: 'destructive'
      });
    }
  };

  const handleReleaseVested = async (tokenAddress: string) => {
    try {
      const signer = await externalProvider.getSigner();
      const tokenContract = getTokenContract(tokenAddress, signer);
      
      const tx = await tokenContract.releaseVestedTokens();
      await tx.wait();
      
      toast({
        title: 'Tokens Released',
        description: 'Successfully released vested tokens.'
      });
      
      loadTokens();
    } catch (error) {
      console.error('Error releasing vested tokens:', error);
      toast({
        title: 'Error',
        description: 'Failed to release vested tokens.',
        variant: 'destructive'
      });
    }
  };

  const handleRevokeVesting = async (tokenAddress: string) => {
    try {
      const beneficiary = prompt('Enter beneficiary address to revoke vesting:');
      if (!beneficiary) return;
      
      const signer = await externalProvider.getSigner();
      const tokenContract = getTokenContract(tokenAddress, signer);
      
      const tx = await tokenContract.revokeVesting(beneficiary);
      await tx.wait();
      
      toast({
        title: 'Vesting Revoked',
        description: `Successfully revoked vesting for ${beneficiary}`
      });
      
      loadTokens();
    } catch (error) {
      console.error('Error revoking vesting:', error);
      toast({
        title: 'Error',
        description: 'Failed to revoke vesting.',
        variant: 'destructive'
      });
    }
  };

  // Add function to handle viewing vesting schedules
  const handleViewVestingSchedules = async (tokenAddress: string) => {
    try {
      const signer = await externalProvider.getSigner();
      const tokenContract = getTokenContract(tokenAddress, signer);
      setSelectedTokenForSchedules(tokenAddress);
      setShowVestingSchedules(true);
      
      // Get the current user's vesting schedule
      const userAddress = await signer.getAddress();
      try {
        const hasVesting = await tokenContract.hasVestingSchedule(userAddress);
        if (hasVesting) {
          const schedule = await tokenContract.getVestingSchedule(userAddress);
          const cliffDays = Math.floor(Number(schedule.cliffDuration) / (24 * 60 * 60));
          const vestingDays = Math.floor(Number(schedule.vestingDuration) / (24 * 60 * 60));
          const formattedSchedule = {
            beneficiary: userAddress,
            totalAmount: formatEther(schedule.totalAmount),
            startTime: new Date(Number(schedule.startTime) * 1000).toLocaleString(),
            cliffDuration: cliffDays,
            vestingDuration: vestingDays,
            releasedAmount: formatEther(schedule.releasedAmount),
            revocable: schedule.revocable,
            revoked: schedule.revoked,
            releasableAmount: formatEther(schedule.releasableAmount)
          };
          setVestingSchedules([formattedSchedule]);
        } else {
          setVestingSchedules([]);
        }
      } catch (error) {
        console.error('Error fetching vesting schedule:', error);
        setVestingSchedules([]);
      }
    } catch (error) {
      console.error('Error fetching vesting schedules:', error);
      toast({
        title: "Error",
        description: "Failed to fetch vesting schedules",
        variant: "destructive"
      });
    }
  };

  // Add this function to handle blocking a token
  const handleBlockToken = (token: TokenInfo) => {
    setTokenToBlock(token);
    setBlockDialogOpen(true);
  };

  // Add this function to confirm blocking a token
  const confirmBlockToken = () => {
    if (!tokenToBlock) return;
    
    saveBlockedToken(tokenToBlock.address);
    setTokens(prev => prev.filter(t => t.address !== tokenToBlock.address));
    setBlockDialogOpen(false);
    setTokenToBlock(null);
    
    toast({
      title: "Token Blocked",
      description: "The token has been permanently removed from your management panel",
      variant: "default"
    });
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
    <div className="form-card" ref={containerRef}>
      <div
        className="flex justify-between items-center cursor-pointer py-2 px-1"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium text-text-primary">Token Creator Admin Controls (V3)</h2>
          <span className="text-xs text-text-secondary">
            {showOnlyRecent ? `${Math.min(tokens.length, 3)}/${tokens.length}` : tokens.length} tokens
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowOnlyRecent(!showOnlyRecent);
            }}
            className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 text-text-primary rounded"
          >
            {showOnlyRecent ? 'Show All' : 'Show Recent'}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              loadTokens();
            }}
            className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 text-text-primary rounded"
          >
            Refresh
          </button>
          <span className="text-text-accent hover:text-blue-400 text-lg p-2 w-8 h-8 flex items-center justify-center">
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
            {displayedTokens.map((token) => (
              <div key={token.address} className="border border-border rounded p-2 bg-gray-800">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                    <h3 className="text-xs font-medium text-text-primary">{token.name} ({token.symbol})</h3>
                    <p className="text-xs text-text-secondary">Supply: {Number(token.totalSupply).toLocaleString()} {token.symbol}</p>
                    <p className="text-xs mt-1">
                      Status: {" "}
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        token.paused 
                        ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' 
                        : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      }`}>
                        {token.paused ? 'Paused' : 'Active'}
                      </span>
                    </p>
                    {token.presaleInfo && (
                      <div className="mt-1">
                      <p className="text-xs text-text-secondary">
                          Presale: {Number(token.presaleInfo.totalContributed).toLocaleString()} ETH
                          ({token.presaleInfo.contributorCount} contributors)
                      </p>
                      <p className="text-xs text-text-secondary">
                          Start: {new Date(token.presaleInfo.startTime * 1000).toLocaleString()}
                      </p>
                      <p className="text-xs text-text-secondary">
                          End: {new Date(token.presaleInfo.endTime * 1000).toLocaleString()}
                      </p>
                    </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => setSelectedToken(selectedToken === token.address ? null : token.address)}
                      className="text-xs px-2 py-0.5 bg-gray-700 hover:bg-gray-600 text-text-primary rounded"
                    >
                      {selectedToken === token.address ? 'Hide' : 'Manage'}
                    </button>
                    <button
                      onClick={() => handleBlockToken(token)}
                      className="px-1.5 py-0.5 text-xs bg-red-600/20 hover:bg-red-600/40 border border-red-600/40 rounded text-red-400 hover:text-red-300 transition-colors"
                      title="Permanently remove from management panel"
                    >
                      Block
                    </button>
                  </div>
                </div>

                {selectedToken === token.address && (
                    <div className="mt-2 pt-2 border-t border-border">
                    <div className="grid grid-cols-2 gap-3">
                      {/* Token Explorer Section */}
                        <div className="flex flex-col gap-1">
                        <h4 className="text-xs font-medium text-text-primary mb-1">Token Explorer</h4>
                        <div className="flex gap-1">
                          <a
                            href={getExplorerUrl(chainId ?? undefined, token.address, 'token')}
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
                            onClick={() => handlePause(token.address)}
                            className="text-xs px-2 py-0.5 bg-gray-700 hover:bg-gray-600 text-text-primary rounded"
                                  >
                            {token.paused ? 'Unpause' : 'Pause'}
                                  </button>
                          <button
                            onClick={() => handleBlacklist(token.address)}
                            className="text-xs px-2 py-0.5 bg-gray-700 hover:bg-gray-600 text-text-primary rounded"
                          >
                            Blacklist
                          </button>
                          <button
                            onClick={() => handleTimeLock(token.address)}
                            className="text-xs px-2 py-0.5 bg-gray-700 hover:bg-gray-600 text-text-primary rounded"
                          >
                            Time Lock
                          </button>
                          <button
                            onClick={() => handleBurn(token.address)}
                            className="text-xs px-2 py-0.5 bg-gray-700 hover:bg-gray-600 text-text-primary rounded"
                          >
                            Burn
                          </button>
                              </div>
                            </div>

                      {/* Vesting Management Section */}
                          <div className="flex flex-col gap-1">
                        <h4 className="text-xs font-medium text-text-primary mb-1">Vesting Management</h4>
                        <div className="space-x-2">
                          <button
                            onClick={() => handleCreateVesting(token.address)}
                            className="text-xs px-2 py-0.5 bg-gray-700 hover:bg-gray-600 text-text-primary rounded"
                          >
                            Create Vesting
                          </button>
                          <button
                            onClick={() => handleRevokeVesting(token.address)}
                            className="text-xs px-2 py-0.5 bg-gray-700 hover:bg-gray-600 text-text-primary rounded"
                          >
                            Revoke Vesting
                          </button>
                          <button
                            onClick={() => handleReleaseVested(token.address)}
                            className="text-xs px-2 py-0.5 bg-gray-700 hover:bg-gray-600 text-text-primary rounded"
                          >
                            Release Vested
                          </button>
                          <button
                            onClick={() => handleViewVestingSchedules(token.address)}
                            className="text-xs px-2 py-0.5 bg-gray-700 hover:bg-gray-600 text-text-primary rounded"
                          >
                            Vesting Schedules
                          </button>
                            </div>
                        
                        {token.vestingInfo?.hasVesting && (
                          <div className="mt-2">
                            <p className="text-xs text-text-secondary">Total Amount: {token.vestingInfo.totalAmount}</p>
                            <p className="text-xs text-text-secondary">Released: {token.vestingInfo.releasedAmount}</p>
                            <p className="text-xs text-text-secondary">Releasable: {token.vestingInfo.releasableAmount}</p>
                            <p className="text-xs text-text-secondary">
                              Start: {new Date(token.vestingInfo.startTime * 1000).toLocaleString()}
                            </p>
                            <p className="text-xs text-text-secondary">
                              Cliff: {Math.floor(token.vestingInfo.cliffDuration / (30 * 24 * 60 * 60))} months
                            </p>
                            <p className="text-xs text-text-secondary">
                              Duration: {Math.floor(token.vestingInfo.vestingDuration / (30 * 24 * 60 * 60))} months
                            </p>
                            {token.vestingInfo.revoked && (
                              <p className="text-xs text-red-500">Vesting Revoked</p>
                            )}
                          </div>
                        )}
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
                                onClick={() => handleWhitelist(token.address)}
                                className="text-xs px-2 py-0.5 bg-gray-700 hover:bg-gray-600 text-text-primary rounded"
                                disabled={token.presaleInfo.finalized}
                              >
                                Manage Whitelist
                              </button>
                                <button
                                onClick={() => handleFinalize(token.address)}
                                className="text-xs px-2 py-0.5 bg-gray-700 hover:bg-gray-600 text-text-primary rounded"
                                disabled={token.presaleInfo.finalized || 
                                  Number(token.presaleInfo.totalContributed) < Number(token.presaleInfo.softCap)}
                              >
                                Finalize Presale
                                </button>
                              <button
                                onClick={() => handleEmergencyWithdraw(token.address)}
                                className="text-xs px-2 py-0.5 bg-gray-700 hover:bg-gray-600 text-text-primary rounded"
                                disabled={token.presaleInfo.finalized || 
                                  Number(token.presaleInfo.totalContributed) >= Number(token.presaleInfo.softCap) ||
                                  Date.now() < token.presaleInfo.endTime * 1000}
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
                    </div>
                              </div>
                            )}
                          </div>
            ))}
          </div>
        )
      )}

      {/* Add the vesting schedules popup */}
      <Dialog 
        open={showVestingSchedules} 
        onOpenChange={(open) => setShowVestingSchedules(open)}
      >
        <DialogContent className="bg-gray-800 p-0">
          <div className="p-4 max-w-2xl w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-white">Vesting Schedules</h3>
              <button
                onClick={() => setShowVestingSchedules(false)}
                className="text-gray-400 hover:text-gray-300"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              {vestingSchedules.length > 0 ? (
                vestingSchedules.map((schedule, index) => (
                  <div key={index} className="bg-gray-700/50 rounded-lg p-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-gray-400">Beneficiary</p>
                        <p className="text-white">{shortenAddress(schedule.beneficiary)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Total Amount</p>
                        <p className="text-white">{schedule.totalAmount}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Released Amount</p>
                        <p className="text-white">{schedule.releasedAmount}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Releasable Amount</p>
                        <p className="text-white">{schedule.releasableAmount}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Start Time</p>
                        <p className="text-white">{schedule.startTime}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Cliff Duration</p>
                        <p className="text-white">{Math.floor(Number(schedule.cliffDuration) / (24 * 60 * 60))} days</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Vesting Duration</p>
                        <p className="text-white">{Math.floor(Number(schedule.vestingDuration) / (24 * 60 * 60))} days</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Status</p>
                        <p className="text-white">
                          {schedule.revoked ? 'Revoked' : 'Active'}
                          {schedule.revocable && !schedule.revoked && ' (Revocable)'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-400 text-center">No vesting schedules found</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add the block dialog */}
      {tokenToBlock && (
        <BlockDialog
          isOpen={blockDialogOpen}
          onClose={() => {
            setBlockDialogOpen(false);
            setTokenToBlock(null);
          }}
          onConfirm={confirmBlockToken}
          tokenName={tokenToBlock.name}
          tokenAddress={tokenToBlock.address}
        />
      )}
    </div>
  );
});

export default TCAP_v3; 