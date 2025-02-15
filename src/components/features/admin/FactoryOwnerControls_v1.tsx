import { useState, useEffect } from 'react';
import { BrowserProvider, Contract, formatUnits, parseUnits } from 'ethers';
import { useNetwork } from '@contexts/NetworkContext';
import TokenFactory_v1 from '@contracts/abi/TokenFactory_v1.json';
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

export default function FactoryOwnerControls_v1({ isConnected, address: factoryAddr, provider: externalProvider }: Props) {
  const { address } = useAccount();
  const { chainId } = useNetwork();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [currentFee, setCurrentFee] = useState<string>('0');
  const [newFee, setNewFee] = useState<string>('');
  const [accumulatedFees, setAccumulatedFees] = useState<string>('0');
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
    abi: TokenFactory_v1.abi as unknown as Abi,
    functionName: 'owner',
    query: {
      enabled: mounted && factoryAddress !== '0x0000000000000000000000000000000000000000',
    }
  }) as { data: string | undefined };

  const { data: deploymentFee } = useContractRead({
    address: factoryAddress,
    abi: TokenFactory_v1.abi as unknown as Abi,
    functionName: 'deploymentFee',
    query: {
      enabled: mounted && factoryAddress !== '0x0000000000000000000000000000000000000000',
    }
  }) as { data: bigint | undefined };

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

  // Update current fee when deploymentFee changes
  useEffect(() => {
    if (deploymentFee) {
      setCurrentFee(formatUnits(deploymentFee.toString(), 'ether'));
    }
  }, [deploymentFee]);

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
        abi: TokenFactory_v1.abi as unknown as Abi,
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

  const handleWithdraw = async () => {
    try {
      setLoading(true);
      await writeContract({
        address: factoryAddress,
        abi: TokenFactory_v1.abi as unknown as Abi,
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
        <h2 className="text-lg font-semibold text-text-primary mb-4">Factory Controls (V1)</h2>
        <p className="text-sm text-text-secondary">Please connect your wallet to access admin controls.</p>
      </div>
    );
  }

  if (!factoryAddr) {
    return (
      <div className="form-card">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Factory Controls (V1)</h2>
        <p className="text-sm text-text-secondary">No V1 factory deployed on this network.</p>
      </div>
    );
  }

  const isOwnerResult = address && owner && address.toLowerCase() === (owner as string).toLowerCase();

  if (!isOwnerResult) {
    return (
      <div className="form-card">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Factory Controls (V1)</h2>
        <p className="text-sm text-text-secondary">You do not have admin access to this contract.</p>
      </div>
    );
  }

  return (
    <div className="form-card">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Factory Controls (V1)</h2>
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
            <p className="text-xs text-text-secondary">Total Tokens</p>
            <p className="text-sm font-medium text-text-primary">{contractInfo.totalTokens}</p>
          </div>
          <div>
            <p className="text-xs text-text-secondary">Total Deployments</p>
            <p className="text-sm font-medium text-text-primary">{contractInfo.totalDeployments}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="form-label">
                New Fee (ETH)
              </label>
              <input
                type="number"
                value={newFee}
                onChange={(e) => setNewFee(e.target.value)}
                placeholder="Enter new fee"
                className="form-input"
              />
            </div>
            <button
              onClick={handleUpdateFee}
              disabled={loading || !newFee}
              className="form-button-primary h-7"
            >
              {loading ? <Spinner className="w-3 h-3" /> : 'Update'}
            </button>
          </div>

          <button
            onClick={handleWithdraw}
            disabled={loading || Number(accumulatedFees) === 0}
            className="form-button-secondary w-full h-7"
          >
            {loading ? <Spinner className="w-3 h-3" /> : 'Withdraw Fees'}
          </button>
        </div>
      </div>
    </div>
  );
} 