import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { formatEther, formatUnits, parseEther, Abi } from 'viem';
import { LOAN_POOL_FACTORY_ABI, LENDING_POOL_ABI } from '@/contracts/defi/abis';
import { Loader2 } from 'lucide-react';

interface PoolData {
  address: `0x${string}`;
  assetAddress: `0x${string}`;
  name: string;
  symbol: string;
  totalDeposits: bigint;
  totalBorrows: bigint;
  utilizationRate: number;
  collateralFactorBps: bigint;
  reserveFactorBps: bigint;
  reserveBalance: bigint;
  decimals: number;
}

interface PoolDashboardProps {
  factoryAddress: `0x${string}`;
}

export function PoolDashboard({ factoryAddress }: PoolDashboardProps) {
  const { address: userAddress } = useAccount();
  const [pools, setPools] = useState<PoolData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPool, setSelectedPool] = useState<string | null>(null);
  const [feeData, setFeeData] = useState<{ creationFee: string, protocolFee: number } | null>(null);

  // Load fee data
  const { data: feeCollectorAddress } = useReadContract({
    address: factoryAddress,
    abi: LOAN_POOL_FACTORY_ABI as Abi,
    functionName: 'feeCollector',
  });

  // Get pool addresses
  const { data: poolAddresses } = useReadContract({
    address: factoryAddress,
    abi: LOAN_POOL_FACTORY_ABI as Abi,
    functionName: 'getAllPools',
  });

  // Fetch fee information
  useEffect(() => {
    const fetchFeeData = async () => {
      if (feeCollectorAddress) {
        // In a real app, you would fetch this from the contract
        // For simplicity, we're using static values
        setFeeData({
          creationFee: '0.05',
          protocolFee: 10 // 10%
        });
      }
    };

    fetchFeeData();
  }, [feeCollectorAddress]);

  // Load pool data
  useEffect(() => {
    const fetchPoolData = async () => {
      if (!poolAddresses || !userAddress || poolAddresses.length === 0) {
        setLoading(false);
        return;
      }

      try {
        const poolDataPromises = (poolAddresses as `0x${string}`[]).map(async (poolAddress) => {
          // For each pool, fetch its details
          const [
            assetAddress,
            name,
            symbol,
            totalAssets,
            totalBorrowed,
            collateralFactorBps,
            reserveFactorBps,
            reserveBalance,
            decimals
          ] = await Promise.all([
            readPoolData(poolAddress, 'asset'),
            readPoolData(poolAddress, 'name'),
            readPoolData(poolAddress, 'symbol'),
            readPoolData(poolAddress, 'totalAssets'),
            readPoolData(poolAddress, 'totalBorrowed'),
            readPoolData(poolAddress, 'collateralFactorBps'),
            readPoolData(poolAddress, 'reserveFactorBps'),
            readPoolData(poolAddress, 'reserveBalance'),
            readTokenDecimals(await readPoolData(poolAddress, 'asset') as `0x${string}`)
          ]);

          // Calculate utilization rate
          let utilizationRate = 0;
          if ((totalAssets as bigint) > 0n) {
            utilizationRate = Number((totalBorrowed as bigint) * 100n / (totalAssets as bigint));
          }

          return {
            address: poolAddress,
            assetAddress: assetAddress as `0x${string}`,
            name: name as string,
            symbol: symbol as string,
            totalDeposits: totalAssets as bigint,
            totalBorrows: totalBorrowed as bigint,
            utilizationRate,
            collateralFactorBps: collateralFactorBps as bigint,
            reserveFactorBps: reserveFactorBps as bigint,
            reserveBalance: reserveBalance as bigint,
            decimals: decimals as number
          };
        });

        const poolsData = await Promise.all(poolDataPromises);
        setPools(poolsData);
      } catch (error) {
        console.error('Error fetching pool data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPoolData();
  }, [poolAddresses, userAddress]);

  // Helper function to read pool data
  const readPoolData = async (poolAddress: `0x${string}`, functionName: string) => {
    try {
      const data = await fetch(`/api/readContract?address=${poolAddress}&functionName=${functionName}`);
      const result = await data.json();
      return result.data;
    } catch (error) {
      console.error(`Error reading ${functionName}:`, error);
      return null;
    }
  };

  // Helper function to read token decimals
  const readTokenDecimals = async (tokenAddress: `0x${string}`) => {
    try {
      const data = await fetch(`/api/readContract?address=${tokenAddress}&functionName=decimals`);
      const result = await data.json();
      return result.data || 18; // Default to 18 if not available
    } catch (error) {
      console.error('Error reading decimals:', error);
      return 18; // Default to 18 if error
    }
  };

  // Format amounts with correct decimals
  const formatAmount = (amount: bigint, decimals: number) => {
    return parseFloat(formatUnits(amount, decimals)).toFixed(2);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-400">Loading pools...</span>
      </div>
    );
  }

  if (pools.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Lending Pools</CardTitle>
          <CardDescription>
            No pools have been created yet. Be the first to create one!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-6 text-center border border-dashed rounded-lg border-gray-600">
            <h3 className="text-xl font-medium text-gray-300 mb-2">Get Started with DeFi Lending</h3>
            <p className="text-gray-400 mb-4">
              Create a pool for any ERC20 token to enable lending and borrowing functionality.
            </p>
            {feeData && (
              <div className="mb-4 p-4 bg-blue-900/20 border border-blue-700 rounded-lg text-blue-300 text-sm">
                <p><span className="font-semibold">Pool Creation Fee:</span> {feeData.creationFee} ETH</p>
                <p><span className="font-semibold">Protocol Fee:</span> {feeData.protocolFee}% of interest earned</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Protocol Overview</CardTitle>
          <CardDescription>
            Summary of all lending pools in the protocol
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="bg-blue-900/20 border-blue-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Total Value Locked</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatEther(pools.reduce((acc, pool) => acc + pool.totalDeposits, 0n))} ETH
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-green-900/20 border-green-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Total Borrowed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatEther(pools.reduce((acc, pool) => acc + pool.totalBorrows, 0n))} ETH
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-purple-900/20 border-purple-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Protocol Fees</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {feeData ? `${feeData.protocolFee}%` : '10%'} of Interest
                </div>
                <div className="text-sm text-gray-400">
                  Pool Creation: {feeData ? feeData.creationFee : '0.05'} ETH
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pool</TableHead>
                <TableHead>Asset</TableHead>
                <TableHead className="text-right">TVL</TableHead>
                <TableHead className="text-right">Borrowed</TableHead>
                <TableHead className="text-right">Utilization</TableHead>
                <TableHead className="text-right">Collateral Factor</TableHead>
                <TableHead className="text-right">Reserve Factor</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pools.map((pool) => (
                <TableRow key={pool.address}>
                  <TableCell className="font-medium">{pool.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Badge variant="outline" className="mr-2">{pool.symbol}</Badge>
                      <span className="text-xs text-gray-400">{pool.assetAddress.slice(0, 6)}...{pool.assetAddress.slice(-4)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{formatAmount(pool.totalDeposits, pool.decimals)}</TableCell>
                  <TableCell className="text-right">{formatAmount(pool.totalBorrows, pool.decimals)}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={pool.utilizationRate > 80 ? "destructive" : pool.utilizationRate > 50 ? "warning" : "success"}>
                      {pool.utilizationRate}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{Number(pool.collateralFactorBps) / 100}%</TableCell>
                  <TableCell className="text-right">{Number(pool.reserveFactorBps) / 100}%</TableCell>
                  <TableCell>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedPool(pool.address)}
                    >
                      Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {selectedPool && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle>
              {pools.find(p => p.address === selectedPool)?.name} Details
            </CardTitle>
            <CardDescription>
              Pool address: {selectedPool}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-1">Asset</h3>
                <p className="mb-4">{pools.find(p => p.address === selectedPool)?.assetAddress}</p>
                
                <h3 className="text-sm font-medium text-gray-400 mb-1">Total Value Locked</h3>
                <p className="text-xl font-semibold mb-4">
                  {formatAmount(
                    pools.find(p => p.address === selectedPool)?.totalDeposits || 0n,
                    pools.find(p => p.address === selectedPool)?.decimals || 18
                  )} {pools.find(p => p.address === selectedPool)?.symbol}
                </p>
                
                <h3 className="text-sm font-medium text-gray-400 mb-1">Total Borrowed</h3>
                <p className="text-xl font-semibold">
                  {formatAmount(
                    pools.find(p => p.address === selectedPool)?.totalBorrows || 0n,
                    pools.find(p => p.address === selectedPool)?.decimals || 18
                  )} {pools.find(p => p.address === selectedPool)?.symbol}
                </p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-1">Collateral Factor</h3>
                <p className="mb-4">{Number(pools.find(p => p.address === selectedPool)?.collateralFactorBps || 0n) / 100}%</p>
                
                <h3 className="text-sm font-medium text-gray-400 mb-1">Reserve Factor</h3>
                <p className="mb-4">{Number(pools.find(p => p.address === selectedPool)?.reserveFactorBps || 0n) / 100}%</p>
                
                <h3 className="text-sm font-medium text-gray-400 mb-1">Reserve Balance</h3>
                <p className="text-xl font-semibold">
                  {formatAmount(
                    pools.find(p => p.address === selectedPool)?.reserveBalance || 0n,
                    pools.find(p => p.address === selectedPool)?.decimals || 18
                  )} {pools.find(p => p.address === selectedPool)?.symbol}
                </p>
              </div>
            </div>
            
            <div className="p-4 bg-blue-900/20 border border-blue-700 rounded-lg">
              <h3 className="font-medium text-gray-200 mb-2">Fee Structure</h3>
              <p className="text-sm text-gray-400">
                <span className="font-semibold">Protocol Fee:</span> {feeData?.protocolFee || 10}% of all interest earned
              </p>
              <p className="text-sm text-gray-400">
                <span className="font-semibold">Reserve Factor:</span> {Number(pools.find(p => p.address === selectedPool)?.reserveFactorBps || 0n) / 100}% of interest goes to reserves
              </p>
              <p className="text-sm text-gray-400 mt-2">
                Remaining interest ({100 - (feeData?.protocolFee || 10) - Number(pools.find(p => p.address === selectedPool)?.reserveFactorBps || 0n) / 100}%) is distributed to depositors
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              variant="secondary"
              onClick={() => setSelectedPool(null)}
            >
              Close Details
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
} 