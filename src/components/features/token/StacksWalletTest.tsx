import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast/use-toast';
import { Spinner } from '@/components/ui/Spinner';
import { useStacksWallet } from '@/contexts/StacksWalletContext';
import { connect, request, disconnect } from '@stacks/connect';

// Absolutely minimal test component for Stacks wallets
export default function StacksWalletTest() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { isConnected, address, disconnectWallet } = useStacksWallet();
  const { toast } = useToast();

  // Test wallet connect using the latest connect method
  const testConnect = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      console.log('[WalletTest] Testing modern Connect API');
      
      // Modern connect method from @stacks/connect 8+
      const response = await connect({
        // Force the user to select a wallet even if they've previously selected one
        forceWalletSelect: true,
        // Persist the selected wallet for future connections
        persistWalletSelect: true
      });
      
      console.log('[WalletTest] Connection successful:', response);
      
      // Add this info to the result
      setResult(JSON.stringify(response, null, 2));
      
      toast({
        title: 'Connection Successful',
        description: 'Connected with wallet. Page will refresh to update status.'
      });
      
      // Wait a bit then refresh to update wallet context
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err) {
      console.error('[WalletTest] Error in connect:', err);
      setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      toast({
        variant: 'destructive',
        title: 'Connection Failed',
        description: 'Could not connect to wallet'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Test getting wallet addresses with request method
  const testGetAddresses = async () => {
    if (!isConnected) {
      toast({ 
        variant: "destructive", 
        title: "Wallet Error", 
        description: "Please connect your wallet first using the Connect button." 
      });
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setResult(null);
    
    try {
      // Use the modern request API to get addresses
      const response = await request('getAddresses');
      
      console.log('[WalletTest] Get addresses response:', response);
      setResult(JSON.stringify(response, null, 2));
      
      toast({
        title: 'Get Addresses Success',
        description: 'Successfully retrieved wallet addresses'
      });
    } catch (err) {
      console.error('[WalletTest] Error getting addresses:', err);
      setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      toast({
        variant: 'destructive',
        title: 'Get Addresses Failed',
        description: 'Failed to get wallet addresses'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Test a simple message signing
  const testSignMessage = async () => {
    if (!isConnected) {
      toast({ 
        variant: "destructive", 
        title: "Wallet Error", 
        description: "Please connect your wallet first using the Connect button." 
      });
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setResult(null);
    
    try {
      // Use the modern request API to sign a message
      const message = "Test message: " + new Date().toISOString();
      
      // Use proper parameter format without messageType
      const response = await request('stx_signMessage', {
        message,
        // The messageType is not needed in the latest API
      });
      
      console.log('[WalletTest] Sign message response:', response);
      setResult(JSON.stringify(response, null, 2));
      
      toast({
        title: 'Message Signed',
        description: 'Successfully signed test message'
      });
    } catch (err) {
      console.error('[WalletTest] Error signing message:', err);
      setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      toast({
        variant: 'destructive',
        title: 'Sign Message Failed',
        description: 'Failed to sign test message'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Disconnect wallet using modern API
  const handleDisconnect = () => {
    try {
      // Modern disconnect method from @stacks/connect 8+
      disconnect();
      
      // Also call the context method to ensure UI updates
      disconnectWallet();
      
      toast({
        title: 'Wallet Disconnected',
        description: 'Successfully disconnected wallet'
      });
    } catch (err) {
      console.error('[WalletTest] Error disconnecting:', err);
      toast({
        variant: 'destructive',
        title: 'Disconnect Failed',
        description: 'Failed to disconnect wallet'
      });
    }
  };

  return (
    <Card className="bg-gradient-to-br from-blue-900/20 via-gray-900 to-gray-900 border border-blue-600/30 p-6 shadow-lg">
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-white">Stacks Wallet Test</h2>
          <p className="text-gray-400 text-sm">
            Modern API test for Stacks wallet integration
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-sm text-gray-300">
            Wallet Status: <span className={isConnected ? "text-green-400" : "text-red-400"}>
              {isConnected ? "Connected" : "Disconnected"}
            </span>
          </p>
          {address && (
            <p className="text-sm text-gray-300">
              Address: <span className="font-mono text-blue-300">{address}</span>
            </p>
          )}
        </div>

        <div className="space-y-3 mt-4">
          <Button
            onClick={testConnect}
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? <Spinner /> : 'Connect Wallet'}
          </Button>
          
          {isConnected && (
            <>
              <Button
                onClick={testGetAddresses}
                disabled={isLoading}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {isLoading ? <Spinner /> : 'Get Wallet Addresses'}
              </Button>
              
              <Button
                onClick={testSignMessage}
                disabled={isLoading}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                {isLoading ? <Spinner /> : 'Sign Test Message'}
              </Button>
              
              <Button
                onClick={handleDisconnect}
                className="w-full bg-red-600 hover:bg-red-700"
              >
                Disconnect Wallet
              </Button>
            </>
          )}
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-900/20 border border-red-500/30 rounded-md">
            <h3 className="text-red-400 font-medium text-sm">Error:</h3>
            <p className="text-xs text-red-300 whitespace-pre-wrap">{error}</p>
          </div>
        )}

        {result && (
          <div className="mt-4 p-3 bg-green-900/20 border border-green-500/30 rounded-md">
            <h3 className="text-green-400 font-medium text-sm">Result:</h3>
            <pre className="text-xs text-green-300 whitespace-pre-wrap overflow-auto max-h-[200px]">
              {result}
            </pre>
          </div>
        )}
      </div>
    </Card>
  );
} 