import { useState, useEffect } from 'react';
import { BrowserProvider, Contract, formatUnits, parseUnits } from 'ethers';
import { useNetwork } from '@contexts/NetworkContext';
import TokenFactory_v2 from '@contracts/abi/TokenFactory_v2.json';
import { contractAddresses } from '@config/contracts';
import { Spinner } from '@components/ui/Spinner';
import { useToast } from '@/components/ui/toast/use-toast';
import { Button } from '@components/ui/button';
import { Card } from '@components/ui/card';
import { getExplorerUrl } from '@config/networks';
import { useAccount, useContractRead, useWriteContract, usePublicClient } from 'wagmi';
import { Abi } from 'viem';

interface Props {
  isConnected: boolean;
  address?: string;
  provider: BrowserProvider | null;
}

export default function FactoryOwnerControls_v2({ isConnected, address: factoryAddr, provider: externalProvider }: Props) {
  const { address } = useAccount();
  const { chainId } = useNetwork();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [currentFee, setCurrentFee] = useState<string>('0');
  const [newFee, setNewFee] = useState<string>('');
  const [accumulatedFees, setAccumulatedFees] = useState<string>('0');
  const [platformFeePercentage, setPlatformFeePercentage] = useState<string>('0');
  const [newPlatformFeePercentage, setNewPlatformFeePercentage] = useState<string>('');
  const [platformFeeRecipient, setPlatformFeeRecipient] = useState<string>('');
  const [newPlatformFeeRecipient, setNewPlatformFeeRecipient] = useState<string>('');
  const [vestingEnabled, setVestingEnabled] = useState<boolean>(false);
  const [vestingDuration, setVestingDuration] = useState<string>('7');
  const [cliffDuration, setCliffDuration] = useState<string>('1');
  const [contractInfo, setContractInfo] = useState<{
    totalTokens: number;
    totalDeployments: number;
  }>({ totalTokens: 0, totalDeployments: 0 });

  const factoryAddress = factoryAddr as `0x${string}`;
  const publicClient = usePublicClient();

  // Initialize mounting
  useEffect(() => {
    setMounted(true);
  }, []);

  // Factory Owner Info
  const { data: owner } = useContractRead({
    address: factoryAddress,
    abi: TokenFactory_v2.abi as unknown as Abi,
    functionName: 'owner',
    query: {
      enabled: mounted && factoryAddress !== '0x0000000000000000000000000000000000000000',
    }
  }) as { data: string | undefined };

  const { data: deploymentFee } = useContractRead({
    address: factoryAddress,
    abi: TokenFactory_v2.abi as unknown as Abi,
    functionName: 'deploymentFee',
    query: {
      enabled: mounted && factoryAddress !== '0x0000000000000000000000000000000000000000',
    }
  }) as { data: bigint | undefined };

  const { data: currentPlatformFeePercentage } = useContractRead({
    address: factoryAddress,
    abi: TokenFactory_v2.abi as unknown as Abi,
    functionName: 'platformFeePercentage',
    query: {
      enabled: mounted && factoryAddress !== '0x0000000000000000000000000000000000000000',
    }
  }) as { data: bigint | undefined };

  const { data: currentPlatformFeeRecipient } = useContractRead({
    address: factoryAddress,
    abi: TokenFactory_v2.abi as unknown as Abi,
    functionName: 'platformFeeRecipient',
    query: {
      enabled: mounted && factoryAddress !== '0x0000000000000000000000000000000000000000',
    }
  }) as { data: string | undefined };

  const { data: currentVestingEnabled } = useContractRead({
    address: factoryAddress,
    abi: TokenFactory_v2.abi as unknown as Abi,
    functionName: 'platformFeeVestingEnabled',
    query: {
      enabled: mounted && factoryAddress !== '0x0000000000000000000000000000000000000000',
    }
  }) as { data: boolean | undefined };

  // Write Contract Functions
  const { writeContract } = useWriteContract();

  // Load contract info
  useEffect(() => {
    if (mounted && factoryAddress && publicClient) {
      const fetchBalance = async () => {
        try {
          const balance = await publicClient.getBalance({ address: factoryAddress });
          setAccumulatedFees(formatUnits(balance.toString(), 'ether'));
        } catch (err) {
          console.error('Error fetching balance:', err);
        }
      };
      fetchBalance();
    }
  }, [mounted, factoryAddress, publicClient]);

  // Update states when contract data changes
  useEffect(() => {
    if (deploymentFee) {
      setCurrentFee(formatUnits(deploymentFee.toString(), 'ether'));
    }
    if (currentPlatformFeePercentage) {
      setPlatformFeePercentage((Number(currentPlatformFeePercentage) / 100).toString());
    }
    if (currentPlatformFeeRecipient) {
      setPlatformFeeRecipient(currentPlatformFeeRecipient);
    }
    if (currentVestingEnabled !== undefined) {
      setVestingEnabled(currentVestingEnabled);
    }
  }, [deploymentFee, currentPlatformFeePercentage, currentPlatformFeeRecipient, currentVestingEnabled]);

  const handleUpdateFee = async () => {
    if (!newFee) {
      toast({
        title: 'Error',
        description: 'Please enter a new fee amount',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);
      await writeContract({
        address: factoryAddress,
        abi: TokenFactory_v2.abi as unknown as Abi,
        functionName: 'setDeploymentFee',
        args: [parseUnits(newFee, 'ether')]
      });
      toast({
        title: 'Success',
        description: 'Deployment fee updated successfully',
      });
      setNewFee('');
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to update fee',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePlatformFee = async () => {
    if (!newPlatformFeePercentage) {
      toast({
        title: 'Error',
        description: 'Please enter a new platform fee percentage',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);
      const feePercentageWithDecimals = Math.floor(Number(newPlatformFeePercentage) * 100);
      await writeContract({
        address: factoryAddress,
        abi: TokenFactory_v2.abi as unknown as Abi,
        functionName: 'setPlatformFeePercentage',
        args: [feePercentageWithDecimals]
      });
      toast({
        title: 'Success',
        description: 'Platform fee percentage updated successfully',
      });
      setNewPlatformFeePercentage('');
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to update platform fee',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePlatformFeeRecipient = async () => {
    if (!newPlatformFeeRecipient) {
      toast({
        title: 'Error',
        description: 'Please enter a new platform fee recipient address',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);
      await writeContract({
        address: factoryAddress,
        abi: TokenFactory_v2.abi as unknown as Abi,
        functionName: 'setPlatformFeeRecipient',
        args: [newPlatformFeeRecipient]
      });
      toast({
        title: 'Success',
        description: 'Platform fee recipient updated successfully',
      });
      setNewPlatformFeeRecipient('');
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to update platform fee recipient',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateVestingConfig = async () => {
    if (!vestingDuration || !cliffDuration) {
      toast({
        title: 'Error',
        description: 'Please enter both vesting and cliff duration',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);
      const vestingDurationSeconds = Number(vestingDuration) * 24 * 60 * 60; // Convert days to seconds
      const cliffDurationSeconds = Number(cliffDuration) * 24 * 60 * 60; // Convert days to seconds
      
      await writeContract({
        address: factoryAddress,
        abi: TokenFactory_v2.abi as unknown as Abi,
        functionName: 'configurePlatformFeeVesting',
        args: [vestingDurationSeconds, cliffDurationSeconds, vestingEnabled]
      });
      toast({
        title: 'Success',
        description: 'Vesting configuration updated successfully',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to update vesting configuration',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    try {
      setLoading(true);
      await writeContract({
        address: factoryAddress,
        abi: TokenFactory_v2.abi as unknown as Abi,
        functionName: 'withdrawFees',
        args: []
      });
      toast({
        title: 'Success',
        description: 'Fees withdrawn successfully',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to withdraw fees',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return null;
  }

  if (!isConnected) {
    return (
      <div className="form-card">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Factory Controls (V2)</h2>
        <p className="text-sm text-text-secondary">Please connect your wallet to access admin controls.</p>
      </div>
    );
  }

  if (!factoryAddr) {
    return (
      <div className="form-card">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Factory Controls (V2)</h2>
        <p className="text-sm text-text-secondary">No V2 factory deployed on this network.</p>
      </div>
    );
  }

  const isOwnerResult = address && owner && address.toLowerCase() === (owner as string).toLowerCase();

  if (!isOwnerResult) {
    return (
      <div className="form-card">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Factory Controls (V2)</h2>
        <p className="text-sm text-text-secondary">You do not have admin access to this contract.</p>
      </div>
    );
  }

  return (
    <div className="form-card">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Factory Controls (V2)</h2>
          <p className="text-xs text-text-secondary mt-1">
            Contract: <a 
              href={getExplorerUrl(chainId || 0, factoryAddr, 'address')} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300"
            >
              {factoryAddr.slice(0, 6)}...{factoryAddr.slice(-4)}
            </a>
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div>
            <p className="text-xs text-text-secondary">Current Fee</p>
            <p className="text-sm font-medium text-text-primary">{currentFee} ETH</p>
          </div>
          <div>
            <p className="text-xs text-text-secondary">Accumulated</p>
            <p className="text-sm font-medium text-text-primary">{accumulatedFees} ETH</p>
          </div>
          <div>
            <p className="text-xs text-text-secondary">Platform Fee</p>
            <p className="text-sm font-medium text-text-primary">{platformFeePercentage}%</p>
          </div>
          <div>
            <p className="text-xs text-text-secondary">Vesting</p>
            <p className="text-sm font-medium text-text-primary">{vestingEnabled ? 'Enabled' : 'Disabled'}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {/* Deployment Fee Control */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-text-primary">Deployment Fee</h3>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <input
                  type="number"
                  value={newFee}
                  onChange={(e) => setNewFee(e.target.value)}
                  placeholder="Enter new fee (ETH)"
                  className="form-input"
                  step="0.001"
                />
              </div>
              <button
                onClick={handleUpdateFee}
                disabled={loading || !newFee}
                className="form-button-primary h-9"
              >
                {loading ? <Spinner className="w-4 h-4" /> : 'Update Fee'}
              </button>
            </div>
          </div>

          {/* Platform Fee Control */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-text-primary">Platform Fee</h3>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <input
                  type="number"
                  value={newPlatformFeePercentage}
                  onChange={(e) => setNewPlatformFeePercentage(e.target.value)}
                  placeholder="Enter new platform fee (%)"
                  className="form-input"
                  step="0.01"
                  min="0"
                  max="100"
                />
              </div>
              <button
                onClick={handleUpdatePlatformFee}
                disabled={loading || !newPlatformFeePercentage}
                className="form-button-primary h-9"
              >
                {loading ? <Spinner className="w-4 h-4" /> : 'Update Fee'}
              </button>
            </div>
          </div>

          {/* Platform Fee Recipient Control */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-text-primary">Platform Fee Recipient</h3>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <input
                  type="text"
                  value={newPlatformFeeRecipient}
                  onChange={(e) => setNewPlatformFeeRecipient(e.target.value)}
                  placeholder="Enter new recipient address"
                  className="form-input"
                />
              </div>
              <button
                onClick={handleUpdatePlatformFeeRecipient}
                disabled={loading || !newPlatformFeeRecipient}
                className="form-button-primary h-9"
              >
                {loading ? <Spinner className="w-4 h-4" /> : 'Update Recipient'}
              </button>
            </div>
          </div>

          {/* Vesting Configuration */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-text-primary">Vesting Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <input
                  type="number"
                  value={vestingDuration}
                  onChange={(e) => setVestingDuration(e.target.value)}
                  placeholder="Vesting duration (days)"
                  className="form-input"
                  min="1"
                />
              </div>
              <div>
                <input
                  type="number"
                  value={cliffDuration}
                  onChange={(e) => setCliffDuration(e.target.value)}
                  placeholder="Cliff duration (days)"
                  className="form-input"
                  min="0"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={vestingEnabled}
                onChange={(e) => setVestingEnabled(e.target.checked)}
                className="form-checkbox"
              />
              <label className="text-sm text-text-secondary">Enable Vesting</label>
            </div>
            <button
              onClick={handleUpdateVestingConfig}
              disabled={loading || !vestingDuration || !cliffDuration}
              className="form-button-primary w-full h-9"
            >
              {loading ? <Spinner className="w-4 h-4" /> : 'Update Vesting'}
            </button>
          </div>

          {/* Withdraw Fees */}
          <button
            onClick={handleWithdraw}
            disabled={loading || Number(accumulatedFees) === 0}
            className="form-button-secondary w-full h-9"
          >
            {loading ? <Spinner className="w-4 h-4" /> : 'Withdraw Fees'}
          </button>
        </div>
      </div>
    </div>
  );
} 