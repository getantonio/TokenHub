import { useAccount } from 'wagmi';
import { parseEther } from 'viem';
import { useTokenFactory } from '@/hooks/useTokenFactory';

export default function TestSubmit() {
  const { address } = useAccount();
  const { createToken } = useTokenFactory();

  const handleTestSubmit = async () => {
    try {
      console.log('Creating test token...');
      
      // Set start time to 24 hours from now and end time to 14 days after start
      const now = Math.floor(Date.now() / 1000);
      const startTime = BigInt(now + 24 * 60 * 60); // 24 hours from now
      const endTime = BigInt(now + 14 * 24 * 60 * 60); // 14 days from now

      if (!address) {
        throw new Error('Please connect your wallet');
      }

      const params = {
        name: 'Test Token',
        symbol: 'TEST',
        initialSupply: parseEther('1000000'),
        maxSupply: parseEther('1000000'),
        owner: address as `0x${string}`,
        enableBlacklist: false,
        enableTimeLock: false,
        presaleRate: parseEther('1000'), // 1000 tokens per ETH
        minContribution: parseEther('0.1'), // 0.1 ETH
        maxContribution: parseEther('10'), // 10 ETH
        presaleCap: parseEther('100'), // 100 ETH
        startTime,
        endTime,
        presalePercentage: BigInt(35), // 35%
        liquidityPercentage: BigInt(40), // 40%
        liquidityLockDuration: BigInt(180), // 180 days
        marketingWallet: address as `0x${string}`, // Using connected wallet for testing
        marketingPercentage: BigInt(10), // 10%
        teamWallet: address as `0x${string}`, // Using connected wallet for testing
        teamPercentage: BigInt(10) // 10%
      };

      // Validate total percentage
      const totalPercentage = Number(params.presalePercentage) + 
                            Number(params.liquidityPercentage) + 
                            Number(params.marketingPercentage) + 
                            Number(params.teamPercentage);
                            
      if (totalPercentage !== 95) {
        throw new Error(`Total percentage must be 95% (5% platform fee). Current total: ${totalPercentage}%`);
      }

      // Log all parameters with their types for debugging
      console.log('Params:', {
        ...params,
        initialSupply: `${params.initialSupply.toString()} (${typeof params.initialSupply})`,
        maxSupply: `${params.maxSupply.toString()} (${typeof params.maxSupply})`,
        presaleRate: `${params.presaleRate.toString()} (${typeof params.presaleRate})`,
        minContribution: `${params.minContribution.toString()} (${typeof params.minContribution})`,
        maxContribution: `${params.maxContribution.toString()} (${typeof params.maxContribution})`,
        presaleCap: `${params.presaleCap.toString()} (${typeof params.presaleCap})`,
        startTime: `${params.startTime.toString()} (${typeof params.startTime})`,
        endTime: `${params.endTime.toString()} (${typeof params.endTime})`,
        presalePercentage: `${params.presalePercentage.toString()} (${typeof params.presalePercentage})`,
        liquidityPercentage: `${params.liquidityPercentage.toString()} (${typeof params.liquidityPercentage})`,
        liquidityLockDuration: `${params.liquidityLockDuration.toString()} (${typeof params.liquidityLockDuration})`,
        marketingWallet: `${params.marketingWallet} (${typeof params.marketingWallet})`,
        marketingPercentage: `${params.marketingPercentage.toString()} (${typeof params.marketingPercentage})`,
        teamWallet: `${params.teamWallet} (${typeof params.teamWallet})`,
        teamPercentage: `${params.teamPercentage.toString()} (${typeof params.teamPercentage})`
      });

      const hash = await createToken(params);
      console.log('Transaction hash:', hash);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-8">Test Token Creation</h1>
      <button
        onClick={handleTestSubmit}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      >
        Create Test Token
      </button>
    </div>
  );
} 