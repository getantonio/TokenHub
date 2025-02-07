import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useSplitTokenFactory } from '@/hooks/useSplitTokenFactory';
import { useToast } from '@/components/ui/toast/use-toast';
import { parseEther } from 'viem';
import TokenPreview from '@/components/features/token/TokenPreview';
import { useAccount } from 'wagmi';
import TCAP_test from '@/components/features/token/TCAP_test';

interface WalletEntry {
  address: string;
  percentage: number;
}

export default function TestToken() {
  const { address } = useAccount();
  const { toast } = useToast();
  const { createToken, isLoading: isCreating, error: createError } = useSplitTokenFactory();
  const [tokenName, setTokenName] = useState('Split Test Token');
  const [tokenSymbol, setTokenSymbol] = useState('SPLIT');
  const [totalSupply, setTotalSupply] = useState('1000000');
  const [createdTokens, setCreatedTokens] = useState<`0x${string}`[]>(() => {
    // Initialize from localStorage if available
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('createdTokens');
      return saved ? JSON.parse(saved) as `0x${string}`[] : [];
    }
    return [];
  });
  const [selectedToken, setSelectedToken] = useState<`0x${string}` | null>(() => {
    // Initialize from localStorage if available
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('selectedToken');
      return saved ? (saved as `0x${string}`) : null;
    }
    return null;
  });
  const [wallets, setWallets] = useState<WalletEntry[]>([
    { address: '', percentage: 50 },
    { address: '', percentage: 50 }
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) return;

    try {
      // Filter out any wallets with 0% allocation
      const validWallets = wallets.filter(w => Number(w.percentage) > 0);
      
      // Create arrays for contract call
      const walletAddresses = validWallets.map(w => w.address as `0x${string}`);
      const percentages = validWallets.map(w => Number(w.percentage)); // Already in 0-100 format

      const result = await createToken({
        name: tokenName,
        symbol: tokenSymbol,
        totalSupply: parseEther(totalSupply.toString()),
        wallets: walletAddresses,
        percentages: percentages
      });

      if (result) {
        const newTokens = [...createdTokens, result];
        setCreatedTokens(newTokens);
        setSelectedToken(result);
        localStorage.setItem('createdTokens', JSON.stringify(newTokens));
        localStorage.setItem('selectedToken', result);
        toast({
          title: 'Success',
          description: 'Token created successfully!',
        });
      }
    } catch (err) {
      console.error('Error creating token:', err);
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to create token',
        variant: 'destructive'
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    switch (name) {
      case 'name':
        setTokenName(value);
        break;
      case 'symbol':
        setTokenSymbol(value);
        break;
      case 'totalSupply':
        setTotalSupply(value);
        break;
    }
  };

  const handleWalletChange = (index: number, field: 'address' | 'percentage', value: string) => {
    setWallets(prev => prev.map((wallet, i) => {
      if (i === index) {
        return {
          ...wallet,
          [field]: field === 'percentage' ? Number(value) : value
        };
      }
      return wallet;
    }));
  };

  const addWallet = () => {
    setWallets(prev => [...prev, { address: '', percentage: 0 }]);
  };

  const removeWallet = (index: number) => {
    if (wallets.length > 2) {
      setWallets(prev => prev.filter((_, i) => i !== index));
    } else {
      toast({
        title: 'Info',
        description: 'Minimum two wallets required',
        variant: 'default'
      });
    }
  };

  const totalPercentage = wallets.reduce((sum, w) => sum + w.percentage, 0);

  const clearCreatedToken = () => {
    setSelectedToken(null);
    localStorage.removeItem('selectedToken');
    toast({
      title: 'Info',
      description: 'Selected token cleared',
    });
  };

  const clearAllTokens = () => {
    setCreatedTokens([]);
    setSelectedToken(null);
    localStorage.removeItem('createdTokens');
    localStorage.removeItem('selectedToken');
    toast({
      title: 'Info',
      description: 'All tokens cleared',
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-white mb-8">Create Split Token</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Form Section */}
        <div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <Card className="p-6 bg-background-dark border-border">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    Token Name
                  </label>
                  <Input
                    name="name"
                    value={tokenName}
                    onChange={handleInputChange}
                    className="w-full bg-gray-800 border-gray-700 text-white"
                    placeholder="My Token"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    Token Symbol
                  </label>
                  <Input
                    name="symbol"
                    value={tokenSymbol}
                    onChange={handleInputChange}
                    className="w-full bg-gray-800 border-gray-700 text-white"
                    placeholder="MTK"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    Total Supply
                  </label>
                  <Input
                    name="totalSupply"
                    type="number"
                    value={totalSupply}
                    onChange={handleInputChange}
                    className="w-full bg-gray-800 border-gray-700 text-white"
                    placeholder="1000000"
                    required
                  />
                </div>
              </div>
            </Card>

            {/* Wallet Distribution */}
            <Card className="p-6 bg-background-dark border-border">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-white">Wallet Distribution</h3>
                  <Button
                    type="button"
                    onClick={addWallet}
                    className="text-xs bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
                  >
                    Add Wallet
                  </Button>
                </div>

                <div className="space-y-4">
                  {wallets.map((wallet, index) => (
                    <div
                      key={index}
                      className="p-4 rounded-lg border border-border bg-background-dark transition-colors hover:border-border-hover"
                    >
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-sm font-medium text-white">Wallet {index + 1}</span>
                        {wallets.length > 2 && (
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => removeWallet(index)}
                            className="h-7 text-xs text-red-400 hover:text-red-300 hover:bg-red-400/10"
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                      <div className="space-y-3">
                        <Input
                          value={wallet.address}
                          onChange={(e) => handleWalletChange(index, 'address', e.target.value)}
                          className="w-full bg-gray-800 border-gray-700 text-white"
                          placeholder="0x..."
                          required
                        />
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={wallet.percentage}
                            onChange={(e) => handleWalletChange(index, 'percentage', e.target.value)}
                            className="w-full bg-gray-800 border-gray-700 text-white"
                            min="0"
                            max="100"
                            required
                          />
                          <span className="text-gray-200">%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-white">Total Percentage:</span>
                  <span className={totalPercentage === 100 ? 'text-green-400' : 'text-red-400'}>
                    {totalPercentage}%
                  </span>
                </div>
              </div>
            </Card>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={isCreating || totalPercentage !== 100 || !address}
                className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 disabled:opacity-50"
              >
                {!address ? (
                  'Connect Wallet'
                ) : isCreating ? (
                  'Creating...'
                ) : (
                  'Create Token'
                )}
              </Button>
            </div>
          </form>
        </div>

        {/* Preview Section */}
        <div className="space-y-4">
          <TokenPreview
            name={tokenName}
            symbol={tokenSymbol}
            initialSupply={totalSupply}
            maxSupply={totalSupply}
            distributionSegments={wallets.map((wallet, index) => ({
              name: `Wallet ${index + 1}`,
              amount: wallet.percentage,
              percentage: wallet.percentage,
              color: getWalletColor(index)
            }))}
            totalAllocation={totalPercentage}
          />
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-white">Token Management</h2>
            <div className="flex gap-2">
              {createdTokens.length > 0 && (
                <Button
                  onClick={clearAllTokens}
                  variant="ghost"
                  className="text-xs text-red-400 hover:text-red-300 hover:bg-red-400/10"
                >
                  Clear All
                </Button>
              )}
              {selectedToken && (
                <Button
                  onClick={clearCreatedToken}
                  variant="ghost"
                  className="text-xs text-red-400 hover:text-red-300 hover:bg-red-400/10"
                >
                  Clear Selected
                </Button>
              )}
            </div>
          </div>
          {createdTokens.length > 0 ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {createdTokens.map((token) => (
                  <Button
                    key={token}
                    onClick={() => {
                      setSelectedToken(token);
                      localStorage.setItem('selectedToken', token);
                    }}
                    variant={selectedToken === token ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {token.slice(0, 6)}...{token.slice(-4)}
                  </Button>
                ))}
              </div>
              {selectedToken ? (
                <TCAP_test tokenAddress={selectedToken} />
              ) : (
                <Card className="p-4 bg-gray-800 border-gray-700">
                  <p className="text-sm text-gray-400">Select a token to manage</p>
                </Card>
              )}
            </div>
          ) : (
            <Card className="p-4 bg-gray-800 border-gray-700">
              <p className="text-sm text-gray-400">Create a token to manage it here</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function getWalletColor(index: number): string {
  const colors = [
    '#3B82F6', // blue-500
    '#10B981', // emerald-500
    '#F59E0B', // amber-500
    '#EC4899', // pink-500
    '#8B5CF6', // violet-500
  ];
  return colors[index % colors.length];
} 