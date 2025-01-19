import { useAccount, useBalance, useChainId } from 'wagmi';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { InfoIcon, AlertTriangle } from 'lucide-react';
import { NETWORKS_WITH_COSTS } from '@/app/providers';
import { Button } from "@/components/ui/button";
import { ethers } from 'ethers';
import { useState } from 'react';

export function NetworkRequirements() {
  const [error, setError] = useState<string | null>(null);
  const chainId = useChainId();
  const { address } = useAccount();
  const { data: balance } = useBalance({
    address,
  });

  const requestTestEth = async () => {
    try {
      if (!address) return;

      const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545', {
        chainId: 31337,
      });

      // Test connection first
      try {
        const network = await provider.getNetwork();
        console.log('Connected to network:', network);
      } catch (e) {
        setError('Local node not running. Please start your local Hardhat node with: npm run local-testnet');
        return;
      }

      // Create signer with Hardhat's default first account
      const signer = new ethers.Wallet(
        '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
        provider
      );

      console.log('Sending test ETH from:', signer.address);

      const tx = await signer.sendTransaction({
        to: address,
        value: ethers.parseEther("100.0")
      });

      console.log('Faucet TX:', tx.hash);
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);

      // Show success message
      setError('Successfully sent 100 test ETH! Please wait a few seconds for your balance to update.');
    } catch (error) {
      console.error('Error requesting test ETH:', error);
      setError(error instanceof Error ? error.message : 'Failed to request test ETH');
    }
  };

  const getNetworkRequirements = () => {
    if (!chainId) return null;
    
    const currentNetwork = NETWORKS_WITH_COSTS.find(n => n.id === chainId);
    if (!currentNetwork) return null;
    
    switch (chainId) {
      case 1: // Ethereum
        return {
          token: 'ETH',
          minBalance: '0.5',
          gasEstimate: '300-800',
          warning: 'High gas fees on mainnet',
          name: currentNetwork.name
        };
      case 137: // Polygon
        return {
          token: 'MATIC',
          minBalance: '5',
          gasEstimate: '2-4',
          warning: 'Ensure you have MATIC for gas',
          name: currentNetwork.name
        };
      case 56: // BSC
        return {
          token: 'BNB',
          minBalance: '0.1',
          gasEstimate: '2-4',
          warning: 'BNB required for transactions',
          name: currentNetwork.name
        };
      case 11155111: // Sepolia
        return {
          token: 'SepoliaETH',
          minBalance: '0.1',
          gasEstimate: '0',
          warning: 'Get testnet ETH from faucet',
          name: currentNetwork.name
        };
      case 31337: // Local Hardhat
        return {
          token: 'ETH',
          minBalance: '0.1',
          gasEstimate: '0',
          warning: 'Local testnet - for development only',
          name: 'Local Testnet',
          isLocal: true,
          faucetAvailable: true
        };
      default:
        return null;
    }
  };

  const requirements = getNetworkRequirements();
  const hasInsufficientBalance = balance && requirements && 
    parseFloat(balance.formatted) < parseFloat(requirements.minBalance);

  if (!requirements) return null;

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Alert variant={hasInsufficientBalance ? "destructive" : "default"}>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Network Requirements</AlertTitle>
        <AlertDescription>
          <ul className="list-disc pl-4 space-y-1">
            <li>Current Network: {requirements.name}</li>
            <li>Required Token: {requirements.token}</li>
            <li>Minimum Balance: {requirements.minBalance} {requirements.token}</li>
            <li>Estimated Gas Cost: {requirements.gasEstimate} {requirements.token}</li>
            {hasInsufficientBalance && (
              <li className="text-red-400">
                Warning: Insufficient balance ({balance?.formatted} {balance?.symbol})
              </li>
            )}
          </ul>
          {requirements.isLocal && (
            <div className="mt-2">
              <Button 
                onClick={requestTestEth}
                size="sm"
                variant="outline"
              >
                Request Test ETH
              </Button>
              <p className="text-xs mt-1 text-gray-400">
                Local testnet automatically funds accounts with test ETH
              </p>
            </div>
          )}
        </AlertDescription>
      </Alert>

      {requirements.warning && (
        <Alert>
          <InfoIcon className="h-4 w-4" />
          <AlertDescription>
            {requirements.warning}
            {requirements.isLocal && (
              <div className="mt-1 text-sm">
                • Test accounts are automatically funded
                • Network resets when stopped
                • All transactions are free
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
} 