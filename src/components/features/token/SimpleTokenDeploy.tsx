import { useState } from 'react';
import { ethers, Contract, BrowserProvider, Log } from 'ethers';
import TokenFactoryV3ABI from '@/contracts/artifacts/src/contracts/TokenFactory_v3.sol/TokenFactory_v3.json';

interface SimpleTokenDeployProps {
  provider: BrowserProvider;
  address: string;
}

export const SimpleTokenDeploy = ({ provider, address }: SimpleTokenDeployProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const deployToken = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      console.log('Starting token deployment...');
      
      const signer = await provider.getSigner();
      const factoryAddress = '0xc9dE01F826649bbB1A54d2a00Ce91D046791AdE1'; // Polygon Amoy testnet
      
      console.log('Using factory address:', factoryAddress);

      const factory = new Contract(factoryAddress, TokenFactoryV3ABI.abi, signer);
      
      // Get deployment fee
      const deploymentFee = await factory.deploymentFee();
      console.log('Deployment fee:', ethers.formatEther(deploymentFee), 'ETH');

      // Minimal token parameters
      const tokenParams = {
        name: 'Test Token',
        symbol: 'TEST',
        initialSupply: ethers.parseEther('100000'), // 100k tokens
        maxSupply: ethers.parseEther('200000'), // 200k tokens
        owner: address,
        presaleEnabled: false,
        presaleConfig: {
          softCap: 0,
          hardCap: 0,
          minContribution: 0,
          maxContribution: 0,
          presaleRate: 0,
          startTime: 0,
          endTime: 0,
          whitelistEnabled: false
        },
        liquidityConfig: {
          percentage: 100,
          lockDuration: 30 * 24 * 60 * 60, // 30 days
          unlockTime: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60)
        },
        wallets: []
      };

      console.log('Creating token with parameters:', tokenParams);

      const tx = await factory.createToken(
        tokenParams.name,
        tokenParams.symbol,
        tokenParams.initialSupply,
        tokenParams.maxSupply,
        tokenParams.owner,
        tokenParams.presaleEnabled,
        tokenParams.presaleConfig,
        tokenParams.liquidityConfig,
        tokenParams.wallets,
        {
          value: deploymentFee,
          gasLimit: 3000000
        }
      );

      console.log('Transaction sent:', tx.hash);
      
      const receipt = await tx.wait();
      console.log('Transaction receipt:', receipt);

      const tokenCreatedEvent = receipt.logs
        .map((log: Log) => {
          try {
            return factory.interface.parseLog(log);
          } catch (e) {
            return null;
          }
        })
        .find((event: any) => event && event.name === 'TokenCreated');

      if (tokenCreatedEvent) {
        const tokenAddress = tokenCreatedEvent.args.token;
        setSuccess(`Token deployed successfully at ${tokenAddress}`);
      }

    } catch (err: any) {
      console.error('Error deploying token:', err);
      setError(err.message || 'Failed to deploy token');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Simple Token Deployment</h2>
      <button
        onClick={deployToken}
        disabled={loading}
        className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {loading ? 'Deploying...' : 'Deploy Test Token'}
      </button>
      
      {error && (
        <div className="mt-4 p-4 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}
      
      {success && (
        <div className="mt-4 p-4 bg-green-100 text-green-700 rounded">
          {success}
        </div>
      )}
    </div>
  );
}; 