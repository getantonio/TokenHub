import { useEffect, useState } from 'react';
import { useAccount, useContractRead, useWriteContract } from 'wagmi';
import { formatEther, parseEther } from 'viem';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast/use-toast';
import TokenV3ABI from '@/contracts/abi/TokenTemplate_v3.json';
import { Abi } from 'viem';
import { Spinner } from '@/components/ui/Spinner';
import { useNetwork } from '@/contexts/NetworkContext';
import { getExplorerUrl } from '@/config/networks';
import { InfoIcon } from '@/components/ui/InfoIcon';
import { UseReadContractReturnType } from 'wagmi';

interface TokenAdminTestProps {
  tokenAddress: `0x${string}`;
}

interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  totalSupply: bigint;
}

export default function TCAP_v3({ tokenAddress }: TokenAdminTestProps) {
  const { address } = useAccount();
  const { chainId } = useNetwork();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedToken, setSelectedToken] = useState<string | null>(null);
  const [transferAmount, setTransferAmount] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [isTransferPending, setIsTransferPending] = useState(false);

  // Token Info
  const { 
    data: name, 
    isError: nameError,
    refetch: refetchName 
  } = useContractRead({
    address: tokenAddress,
    abi: TokenV3ABI.abi as unknown as Abi,
    functionName: 'name',
  }) as UseReadContractReturnType<typeof TokenV3ABI.abi, 'name'>;

  const { 
    data: symbol, 
    isError: symbolError,
    refetch: refetchSymbol 
  } = useContractRead({
    address: tokenAddress,
    abi: TokenV3ABI.abi as unknown as Abi,
    functionName: 'symbol',
  }) as UseReadContractReturnType<typeof TokenV3ABI.abi, 'symbol'>;

  const { 
    data: totalSupply, 
    isError: totalSupplyError,
    refetch: refetchSupply 
  } = useContractRead({
    address: tokenAddress,
    abi: TokenV3ABI.abi as unknown as Abi,
    functionName: 'totalSupply',
  }) as UseReadContractReturnType<typeof TokenV3ABI.abi, 'totalSupply'>;

  // Transfer functionality
  const { writeContract, isPending } = useWriteContract();

  const refreshData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        refetchName(),
        refetchSymbol(),
        refetchSupply()
      ]);
      toast({
        title: 'Success',
        description: 'Token data refreshed',
      });
    } catch (err) {
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
    if (nameError || symbolError || totalSupplyError) {
      setError('Failed to load token data. Please check if the token contract is deployed correctly.');
      setLoading(false);
      return;
    }

    if (name && symbol && totalSupply) {
      setLoading(false);
      setError(null);
    }
  }, [name, symbol, totalSupply, nameError, symbolError, totalSupplyError]);

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

  if (!address) {
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
          <h2 className="text-sm font-medium text-text-primary">Token Creator Admin Controls (V3)</h2>
          <span className="text-xs text-text-secondary">
            {name && symbol ? `${String(name)} (${String(symbol)})` : 'Loading...'}
          </span>
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
        loading ? (
          <div className="flex justify-center items-center py-1">
            <Spinner className="w-4 h-4 text-text-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-2 text-red-400">
            {error}
          </div>
        ) : (
          <div className="space-y-1 mt-2">
            <div className="border border-border rounded-lg p-2 bg-gray-800">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <h3 className="text-sm font-medium text-text-primary">
                    {name && symbol ? `${String(name)} (${String(symbol)})` : 'Loading...'}
                  </h3>
                  <p className="text-xs text-text-secondary mt-0.5">Token: {tokenAddress}</p>
                  <p className="text-xs text-text-secondary">
                    Supply: {totalSupply ? formatEther(totalSupply as bigint) : '0'} {symbol ? String(symbol) : ''}
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
                  <div className="space-y-1">
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
          </div>
        )
      )}
    </div>
  );
} 