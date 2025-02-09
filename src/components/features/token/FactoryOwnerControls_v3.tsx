import { useEffect, useState } from 'react';
import { useAccount, useContractRead, useWriteContract, usePublicClient } from 'wagmi';
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
import { BrowserProvider } from 'ethers';

interface FactoryAddresses {
  [chainId: number]: {
    v1?: `0x${string}`;
    v2?: `0x${string}`;
    v3?: `0x${string}`;
  };
}

interface FactoryOwnerControlsV3Props {
  isConnected: boolean;
  address: string;
  provider: BrowserProvider | null;
}

export default function FactoryOwnerControls_v3({ isConnected, address: factoryAddr, provider }: FactoryOwnerControlsV3Props) {
  const { address } = useAccount();
  const { chainId } = useNetwork();
  const { toast } = useToast();
  const publicClient = usePublicClient();
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [newFee, setNewFee] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [balance, setBalance] = useState<bigint>(BigInt(0));

  const factoryAddress = factoryAddr as `0x${string}`;

  // Initialize mounting and fetch balance
  useEffect(() => {
    setMounted(true);
    if (mounted && factoryAddress && publicClient) {
      const fetchBalance = async () => {
        try {
          const balance = await publicClient.getBalance({ address: factoryAddress });
          setBalance(balance);
        } catch (err) {
          console.error('Error fetching balance:', err);
        }
      };
      fetchBalance();
    }
  }, [mounted, factoryAddress, publicClient]);

  // Refresh balance periodically
  useEffect(() => {
    if (!mounted || !factoryAddress || !publicClient) return;
    
    const interval = setInterval(async () => {
      try {
        const balance = await publicClient.getBalance({ address: factoryAddress });
        setBalance(balance);
      } catch (err) {
        console.error('Error fetching balance:', err);
      }
    }, 10000); // Refresh every 10 seconds

    return () => clearInterval(interval);
  }, [mounted, factoryAddress, publicClient]);

  if (!isConnected || !factoryAddr) {
    return null;
  }

  // Factory Owner Info
  const { data: owner } = useContractRead({
    address: factoryAddress,
    abi: TokenFactoryV3ABI.abi as unknown as Abi,
    functionName: 'owner',
    query: {
      enabled: mounted && factoryAddress !== '0x0000000000000000000000000000000000000000',
    }
  }) as { data: string | undefined };

  const { data: currentFee } = useContractRead({
    address: factoryAddress,
    abi: TokenFactoryV3ABI.abi as unknown as Abi,
    functionName: 'deploymentFee',
    query: {
      enabled: mounted && factoryAddress !== '0x0000000000000000000000000000000000000000',
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

  const handleWithdraw = async () => {
    if (!balance || balance <= BigInt(0)) {
      toast({
        title: 'Error',
        description: 'No fees available to withdraw',
        variant: 'destructive'
      });
      return;
    }

    if (!publicClient) {
      toast({
        title: 'Error',
        description: 'Client not available',
        variant: 'destructive'
      });
      return;
    }

    try {
      console.log('Attempting to withdraw fees from:', factoryAddress);
      
      // Use a minimal ABI for just the withdrawFees function
      const withdrawFeesABI = [{
        inputs: [],
        name: 'withdrawFees',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function'
      }] as const;

      const { request } = await publicClient.simulateContract({
        address: factoryAddress,
        abi: withdrawFeesABI,
        functionName: 'withdrawFees',
        account: address,
      });

      console.log('Simulation successful, proceeding with transaction');

      const result = await writeContract(request);
      const hash = result as unknown as `0x${string}`;
      console.log('Transaction hash:', hash);

      toast({
        title: 'Transaction Submitted',
        description: 'Withdrawal transaction has been submitted. Please wait for confirmation.',
      });

      // Wait for transaction confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log('Transaction receipt:', receipt);

      if (receipt.status === 'success') {
        toast({
          title: 'Success',
          description: 'Fees have been withdrawn successfully',
        });

        // Refresh the balance
        const newBalance = await publicClient.getBalance({ address: factoryAddress });
        setBalance(newBalance);
      } else {
        throw new Error('Transaction failed');
      }
    } catch (err) {
      console.error('Withdraw error:', err);
      console.error('Error details:', {
        message: err instanceof Error ? err.message : 'Unknown error',
        error: err
      });
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to withdraw fees',
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
    <div className="form-card">
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
                <p>Contract Balance: {balance ? formatEther(balance) : '0'} ETH</p>
                <a
                  href={getExplorerUrl(chainId, factoryAddress, 'address')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300"
                >
                  View on Explorer
                </a>
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
              </div>
            </div>

            {/* Withdraw Funds */}
            <div className="border border-border rounded-lg p-2 bg-gray-800">
              <h3 className="text-sm font-medium text-text-primary mb-2">Withdraw Funds</h3>
              <div className="flex gap-2">
                <Button
                  onClick={handleWithdraw}
                  className="h-7 text-xs px-3"
                  disabled={!balance || balance <= BigInt(0)}
                >
                  Withdraw All Fees ({balance ? formatEther(balance) : '0'} ETH)
                </Button>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
} 