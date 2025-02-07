import { useEffect, useState } from 'react';
import { useAccount, useContractRead } from 'wagmi';
import { formatEther } from 'viem';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import TokenTemplateV3ABI from '@/contracts/abi/TokenTemplate_v3.json';
import { Abi } from 'viem';

interface TokenAdminV3Props {
  tokenAddress: `0x${string}`;
}

interface PresaleInfo {
  softCap: bigint;
  hardCap: bigint;
  minContribution: bigint;
  maxContribution: bigint;
  presaleRate: bigint;
  startTime: bigint;
  endTime: bigint;
  whitelistEnabled: boolean;
  finalized: boolean;
  totalContributed: bigint;
  totalTokensSold: bigint;
}

interface LiquidityInfo {
  percentage: bigint;
  lockDuration: bigint;
  unlockTime: bigint;
  locked: boolean;
}

export default function TCAP_v3({ tokenAddress }: TokenAdminV3Props) {
  const { address } = useAccount();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Token Info
  const { data: name, isError: nameError } = useContractRead({
    address: tokenAddress,
    abi: TokenTemplateV3ABI.abi as unknown as Abi,
    functionName: 'name'
  }) as { data: string; isError: boolean };

  const { data: symbol, isError: symbolError } = useContractRead({
    address: tokenAddress,
    abi: TokenTemplateV3ABI.abi as unknown as Abi,
    functionName: 'symbol'
  }) as { data: string; isError: boolean };

  const { data: totalSupply, isError: totalSupplyError } = useContractRead({
    address: tokenAddress,
    abi: TokenTemplateV3ABI.abi as unknown as Abi,
    functionName: 'totalSupply'
  }) as { data: bigint; isError: boolean };

  const { data: maxSupply, isError: maxSupplyError } = useContractRead({
    address: tokenAddress,
    abi: TokenTemplateV3ABI.abi as unknown as Abi,
    functionName: 'maxSupply'
  }) as { data: bigint; isError: boolean };

  // Presale Info
  const { data: presaleInfo, isError: presaleError } = useContractRead({
    address: tokenAddress,
    abi: TokenTemplateV3ABI.abi as unknown as Abi,
    functionName: 'presaleInfo'
  }) as { data: PresaleInfo; isError: boolean };

  // Liquidity Info
  const { data: liquidityInfo, isError: liquidityError } = useContractRead({
    address: tokenAddress,
    abi: TokenTemplateV3ABI.abi as unknown as Abi,
    functionName: 'liquidityInfo'
  }) as { data: LiquidityInfo; isError: boolean };

  useEffect(() => {
    console.log('TCAP_v3 Data:', {
      name,
      symbol,
      totalSupply: totalSupply ? formatEther(totalSupply) : null,
      maxSupply: maxSupply ? formatEther(maxSupply) : null,
      presaleInfo,
      liquidityInfo,
      errors: {
        name: nameError,
        symbol: symbolError,
        totalSupply: totalSupplyError,
        maxSupply: maxSupplyError,
        presale: presaleError,
        liquidity: liquidityError
      }
    });

    if (nameError || symbolError || totalSupplyError || maxSupplyError || presaleError || liquidityError) {
      setError('Failed to load token data. Please check if the token contract is deployed correctly.');
      setLoading(false);
      return;
    }

    if (name && symbol && totalSupply && maxSupply && presaleInfo && liquidityInfo) {
      setLoading(false);
      setError(null);
    }
  }, [
    name, symbol, totalSupply, maxSupply, presaleInfo, liquidityInfo,
    nameError, symbolError, totalSupplyError, maxSupplyError, presaleError, liquidityError
  ]);

  if (loading) {
    return (
      <Card>
        <CardContent>
          <div className="w-full h-48 animate-pulse bg-gray-800 rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <div className="text-red-500 p-4">
            <h3 className="text-lg font-semibold mb-2">Error</h3>
            <p>{error}</p>
            <p className="text-sm mt-2">Token Address: {tokenAddress}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const presaleProgress = presaleInfo ? 
    (Number(presaleInfo.totalContributed) / Number(presaleInfo.hardCap)) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>{String(name)} ({String(symbol)})</span>
          <span className="text-sm bg-primary/10 text-primary px-2 py-1 rounded">
            {totalSupply && maxSupply ? 
              `${formatEther(totalSupply)} / ${formatEther(maxSupply)}` : 
              'Loading...'
            }
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Presale Status</h3>
            <div className="w-full h-2 bg-gray-800 rounded">
              <div 
                className="h-full bg-primary rounded transition-all duration-500"
                style={{ width: `${Math.min(presaleProgress, 100)}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-sm">
              <span>
                Raised: {presaleInfo ? formatEther(presaleInfo.totalContributed) : '0'} ETH
              </span>
              <span>
                Hard Cap: {presaleInfo ? formatEther(presaleInfo.hardCap) : '0'} ETH
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Presale Details</h3>
              {presaleInfo && (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Rate:</span>
                    <span>{formatEther(presaleInfo.presaleRate)} tokens/ETH</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Min Contribution:</span>
                    <span>{formatEther(presaleInfo.minContribution)} ETH</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Max Contribution:</span>
                    <span>{formatEther(presaleInfo.maxContribution)} ETH</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Start Time:</span>
                    <span>{new Date(Number(presaleInfo.startTime) * 1000).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>End Time:</span>
                    <span>{new Date(Number(presaleInfo.endTime) * 1000).toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Liquidity Info</h3>
              {liquidityInfo && (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Percentage:</span>
                    <span>{Number(liquidityInfo.percentage) / 100}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Lock Duration:</span>
                    <span>{Number(liquidityInfo.lockDuration)} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span>{liquidityInfo.locked ? 'Locked' : 'Unlocked'}</span>
                  </div>
                  {liquidityInfo.locked && (
                    <div className="flex justify-between">
                      <span>Unlock Time:</span>
                      <span>{new Date(Number(liquidityInfo.unlockTime) * 1000).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 