import { useState } from 'react';
import TokenForm_V3 from '../components/features/token/TokenForm_V3';
import TCAP_v3 from '../components/features/token/TCAP_v3';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast/use-toast';

export default function V3() {
  const { isConnected, address } = useAccount();
  const { toast } = useToast();
  const [createdTokens, setCreatedTokens] = useState<`0x${string}`[]>(() => {
    // Initialize from localStorage if available
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('v3CreatedTokens');
      return saved ? JSON.parse(saved) as `0x${string}`[] : [];
    }
    return [];
  });
  const [selectedToken, setSelectedToken] = useState<`0x${string}` | null>(() => {
    // Initialize from localStorage if available
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('v3SelectedToken');
      return saved ? (saved as `0x${string}`) : null;
    }
    return null;
  });

  const handleSuccess = (result: `0x${string}`) => {
    const newTokens = [...createdTokens, result];
    setCreatedTokens(newTokens);
    setSelectedToken(result);
    localStorage.setItem('v3CreatedTokens', JSON.stringify(newTokens));
    localStorage.setItem('v3SelectedToken', result);
    toast({
      title: 'Success',
      description: 'Token created successfully!',
    });
  };

  const clearCreatedToken = () => {
    setSelectedToken(null);
    localStorage.removeItem('v3SelectedToken');
    toast({
      title: 'Info',
      description: 'Selected token cleared',
    });
  };

  const clearAllTokens = () => {
    setCreatedTokens([]);
    setSelectedToken(null);
    localStorage.removeItem('v3CreatedTokens');
    localStorage.removeItem('v3SelectedToken');
    toast({
      title: 'Info',
      description: 'All tokens cleared',
    });
  };

  return (
    <div className="container mx-auto px-4 py-2">
      <h1 className="text-3xl font-bold text-white mb-8">Create Token V3</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <TokenForm_V3 
            isConnected={isConnected} 
            onSuccess={handleSuccess}
          />
        </div>
        <div className="space-y-4">
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
                      localStorage.setItem('v3SelectedToken', token);
                    }}
                    variant={selectedToken === token ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {token.slice(0, 6)}...{token.slice(-4)}
                  </Button>
                ))}
              </div>
              {selectedToken ? (
                <TCAP_v3 tokenAddress={selectedToken} />
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