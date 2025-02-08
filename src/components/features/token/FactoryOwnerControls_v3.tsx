import { useEffect, useState } from 'react';
import { useAccount, useContractRead, useWriteContract } from 'wagmi';
import { formatEther, parseEther, Abi } from 'viem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast/use-toast';
import TokenFactoryV3ABI from '@/contracts/abi/TokenFactory_v3.json';
import { Spinner } from '@/components/ui/Spinner';
import { useNetwork } from '@/contexts/NetworkContext';
import { getExplorerUrl } from '@/config/networks';
import { InfoIcon } from '@/components/ui/InfoIcon';
import { FACTORY_ADDRESSES } from '@/config/contracts';

interface FactoryAddresses {
  [chainId: number]: {
    v1?: `0x${string}`;
    v2?: `0x${string}`;
    v3?: `0x${string}`;
  };
}

export default function FactoryOwnerControls_v3() {
  const { address } = useAccount();
  const { chainId } = useNetwork();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [newFee, setNewFee] = useState('');
  const [newRecipient, setNewRecipient] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');

  const factoryAddress = chainId ? 
    ((FACTORY_ADDRESSES as FactoryAddresses)[chainId]?.v3 || '0x0000000000000000000000000000000000000000' as `0x${string}`) :
    '0x0000000000000000000000000000000000000000' as `0x${string}`;

  // Initialize mounting
  useEffect(() => {
    setMounted(true);
  }, []);

  // Factory Owner Info
  const { data: owner } = useContractRead({
    address: factoryAddress,
    abi: TokenFactoryV3ABI.abi as unknown as Abi,
    functionName: 'owner',
    query: {
      enabled: mounted,
    }
  }) as { data: string | undefined };

  const { data: currentFee } = useContractRead({
    address: factoryAddress,
    abi: TokenFactoryV3ABI.abi as unknown as Abi,
    functionName: 'deploymentFee',
    query: {
      enabled: mounted,
    }
  }) as { data: bigint | undefined };

  const { data: feeRecipient } = useContractRead({
    address: factoryAddress,
    abi: TokenFactoryV3ABI.abi as unknown as Abi,
    functionName: 'feeRecipient',
    query: {
      enabled: mounted,
    }
  }) as { data: string | undefined };

  const { data: balance } = useContractRead({
    address: factoryAddress,
    abi: TokenFactoryV3ABI.abi as unknown as Abi,
    functionName: 'getBalance',
    query: {
      enabled: mounted,
    }
  }) as { data: bigint | undefined };

  // Write Contract Functions
  const { writeContract } = useWriteContract();

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
      await writeContract({
        address: factoryAddress,
        abi: TokenFactoryV3ABI.abi as unknown as Abi,
        functionName: 'setDeploymentFee',
        args: [parseEther(newFee)]
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
    }
  };

  const handleUpdateRecipient = async () => {
    if (!newRecipient) {
      toast({
        title: 'Error',
        description: 'Please enter a new recipient address',
        variant: 'destructive'
      });
      return;
    }

    try {
      await writeContract({
        address: factoryAddress,
        abi: TokenFactoryV3ABI.abi as unknown as Abi,
        functionName: 'setFeeRecipient',
        args: [newRecipient as `0x${string}`]
      });
      toast({
        title: 'Success',
        description: 'Fee recipient updated successfully',
      });
      setNewRecipient('');
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to update recipient',
        variant: 'destructive'
      });
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount) {
      toast({
        title: 'Error',
        description: 'Please enter an amount to withdraw',
        variant: 'destructive'
      });
      return;
    }

    try {
      await writeContract({
        address: factoryAddress,
        abi: TokenFactoryV3ABI.abi as unknown as Abi,
        functionName: 'withdraw',
        args: [parseEther(withdrawAmount)]
      });
      toast({
        title: 'Success',
        description: 'Funds withdrawn successfully',
      });
      setWithdrawAmount('');
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to withdraw funds',
        variant: 'destructive'
      });
    }
  };

  // Update loading state
  useEffect(() => {
    if (!mounted) return;
    setLoading(false);
  }, [mounted]);

  if (!mounted) {
    return null;
  }

  const isOwner = address && owner && address.toLowerCase() === (owner as string).toLowerCase();

  if (!isOwner) {
    return null;
  }

  return (
    <div className="form-card mt-4">
      <div
        className="flex justify-between items-center cursor-pointer py-1"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-1">
          <h2 className="text-sm font-medium text-text-primary">Factory Owner Controls (V3)</h2>
          <InfoIcon content="These controls are only available to the factory owner." />
        </div>
        <span className="text-text-accent hover:text-blue-400">
          {isExpanded ? '▼' : '▶'}
        </span>
      </div>

      {isExpanded && (
        loading ? (
          <div className="flex justify-center items-center py-1">
            <Spinner className="w-4 h-4 text-text-primary" />
          </div>
        ) : (
          <div className="space-y-4 mt-2">
            {/* Factory Info */}
            <div className="border border-border rounded-lg p-2 bg-gray-800">
              <h3 className="text-sm font-medium text-text-primary mb-2">Factory Information</h3>
              <div className="space-y-1 text-xs text-text-secondary">
                <p>Factory Address: {factoryAddress}</p>
                <p>Current Fee: {currentFee ? formatEther(currentFee) : '0'} ETH</p>
                <p>Fee Recipient: {String(feeRecipient || 'Not set')}</p>
                <p>Contract Balance: {balance ? formatEther(balance) : '0'} ETH</p>
              </div>
            </div>

            {/* Fee Management */}
            <div className="border border-border rounded-lg p-2 bg-gray-800">
              <h3 className="text-sm font-medium text-text-primary mb-2">Fee Management</h3>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="New Fee (ETH)"
                    value={newFee}
                    onChange={(e) => setNewFee(e.target.value)}
                    className="flex-1 h-7 text-xs bg-gray-900 border-gray-700 text-white"
                  />
                  <Button
                    onClick={handleUpdateFee}
                    className="h-7 text-xs px-3"
                  >
                    Update Fee
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="New Recipient (0x...)"
                    value={newRecipient}
                    onChange={(e) => setNewRecipient(e.target.value)}
                    className="flex-1 h-7 text-xs bg-gray-900 border-gray-700 text-white"
                  />
                  <Button
                    onClick={handleUpdateRecipient}
                    className="h-7 text-xs px-3"
                  >
                    Update Recipient
                  </Button>
                </div>
              </div>
            </div>

            {/* Withdraw Funds */}
            <div className="border border-border rounded-lg p-2 bg-gray-800">
              <h3 className="text-sm font-medium text-text-primary mb-2">Withdraw Funds</h3>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Amount (ETH)"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="flex-1 h-7 text-xs bg-gray-900 border-gray-700 text-white"
                />
                <Button
                  onClick={handleWithdraw}
                  className="h-7 text-xs px-3"
                >
                  Withdraw
                </Button>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
} 