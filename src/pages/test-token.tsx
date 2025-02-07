import { useState } from 'react';
import { useNetwork } from '@contexts/NetworkContext';
import { useAccount } from 'wagmi';
import { useToast } from '@/components/ui/toast/use-toast';
import { parseEther } from 'viem';
import { useTokenFactory } from '@/hooks/useTokenFactory';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from '@/components/ui/Spinner';

export default function TestToken() {
  const { chainId } = useNetwork();
  const { address } = useAccount();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const { createToken } = useTokenFactory('v3');

  const [formData, setFormData] = useState({
    name: 'Simple Test Token',
    symbol: 'STT',
    initialSupply: '1000000',
    maxSupply: '1000000', // Same as initial supply for simplicity
    tokensPerEth: '1000',
    minContribution: '0.1',
    maxContribution: '10',
    presaleCap: '100',
    presalePercentage: 45, // 45% for presale
    liquidityPercentage: 30, // 30% for liquidity
    teamPercentage: 20, // 20% for team (platform fee is 5%)
    liquidityLockDuration: 180,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);

      if (!chainId || !address) {
        throw new Error('Please connect your wallet');
      }

      // Set times
      const now = new Date();
      const startTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow
      const endTime = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days from now

      const params = {
        name: formData.name,
        symbol: formData.symbol,
        initialSupply: BigInt(parseEther(formData.initialSupply)),
        maxSupply: BigInt(parseEther(formData.maxSupply)),
        owner: address as `0x${string}`,
        enableBlacklist: false,
        enableTimeLock: false,
        tokensPerEth: BigInt(parseEther(formData.tokensPerEth)),
        minContribution: BigInt(parseEther(formData.minContribution)),
        maxContribution: BigInt(parseEther(formData.maxContribution)),
        presaleCap: BigInt(parseEther(formData.presaleCap)),
        startTime: BigInt(Math.floor(startTime.getTime() / 1000)),
        endTime: BigInt(Math.floor(endTime.getTime() / 1000)),
        presalePercentage: BigInt(formData.presalePercentage * 100), // Convert to basis points
        liquidityPercentage: BigInt(formData.liquidityPercentage * 100), // Convert to basis points
        liquidityLockDuration: BigInt(formData.liquidityLockDuration),
        teamPercentage: BigInt(formData.teamPercentage * 100), // Convert to basis points
        marketingPercentage: BigInt(0), // Not using marketing allocation
        developmentPercentage: BigInt(0) // Not using development allocation
      };

      // Log parameters for debugging
      console.log('Simple Test Token Parameters:', {
        ...params,
        initialSupply: params.initialSupply.toString(),
        maxSupply: params.maxSupply.toString(),
        tokensPerEth: params.tokensPerEth.toString(),
        minContribution: params.minContribution.toString(),
        maxContribution: params.maxContribution.toString(),
        presaleCap: params.presaleCap.toString(),
        startTime: params.startTime.toString(),
        endTime: params.endTime.toString(),
        presalePercentage: params.presalePercentage.toString(),
        liquidityPercentage: params.liquidityPercentage.toString(),
        teamPercentage: params.teamPercentage.toString()
      });

      // Verify total percentage (including 5% platform fee)
      const totalPercentage = 
        formData.presalePercentage +
        formData.liquidityPercentage +
        formData.teamPercentage +
        5; // Platform fee

      console.log('Total Percentage:', totalPercentage);

      if (totalPercentage !== 100) {
        throw new Error(`Total allocation must equal 100%. Current total: ${totalPercentage}%`);
      }

      await createToken(params);
      toast({
        title: "Success",
        description: "Token created successfully!",
      });

    } catch (err) {
      console.error('Error creating test token:', err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : 'Failed to create token',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-white mb-8">Simple Test Token Creation</h1>
      
      <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Name</label>
            <Input
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Symbol</label>
            <Input
              name="symbol"
              value={formData.symbol}
              onChange={handleInputChange}
              className="w-full"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Initial Supply</label>
            <Input
              name="initialSupply"
              value={formData.initialSupply}
              onChange={handleInputChange}
              className="w-full"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Tokens per ETH</label>
            <Input
              name="tokensPerEth"
              value={formData.tokensPerEth}
              onChange={handleInputChange}
              className="w-full"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Min Contribution (ETH)</label>
            <Input
              name="minContribution"
              value={formData.minContribution}
              onChange={handleInputChange}
              className="w-full"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Max Contribution (ETH)</label>
            <Input
              name="maxContribution"
              value={formData.maxContribution}
              onChange={handleInputChange}
              className="w-full"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Presale Cap (ETH)</label>
          <Input
            name="presaleCap"
            value={formData.presaleCap}
            onChange={handleInputChange}
            className="w-full"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Presale %</label>
            <Input
              name="presalePercentage"
              value={formData.presalePercentage}
              onChange={handleInputChange}
              type="number"
              className="w-full"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Liquidity %</label>
            <Input
              name="liquidityPercentage"
              value={formData.liquidityPercentage}
              onChange={handleInputChange}
              type="number"
              className="w-full"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Team %</label>
            <Input
              name="teamPercentage"
              value={formData.teamPercentage}
              onChange={handleInputChange}
              type="number"
              className="w-full"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Liquidity Lock (days)</label>
          <Input
            name="liquidityLockDuration"
            value={formData.liquidityLockDuration}
            onChange={handleInputChange}
            type="number"
            className="w-full"
          />
        </div>

        <div className="pt-4">
          <Button 
            type="submit"
            disabled={loading || !address}
            className="w-full"
          >
            {!address ? (
              'Connect Wallet to Continue'
            ) : loading ? (
              <>
                <Spinner className="w-4 h-4 mr-2" />
                Creating Token...
              </>
            ) : (
              'Create Simple Test Token'
            )}
          </Button>
        </div>

        <div className="mt-4 p-4 bg-gray-800 rounded-lg">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Total Allocation</h3>
          <p className="text-white">
            {formData.presalePercentage + formData.liquidityPercentage + formData.teamPercentage + 5}%
          </p>
          <p className="text-xs text-gray-400 mt-1">
            (Including 5% platform fee)
          </p>
        </div>
      </form>
    </div>
  );
} 