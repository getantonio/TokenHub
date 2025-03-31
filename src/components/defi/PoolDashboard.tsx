import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAccount, useReadContract, useBalance, usePublicClient } from 'wagmi';
import { formatEther, formatUnits, parseEther, Abi, zeroAddress } from 'viem';
import { LOAN_POOL_FACTORY_ABI, LENDING_POOL_ABI } from '@/contracts/defi/abis';
import { formatUSD } from '@/lib/utils';
import { AlertCircle, CircleAlert, Loader2 } from 'lucide-react';

// Placeholder component - in a real app this would be implemented
const LoanPoolDetailsDialog = ({ pool, isOpen, onClose }: any) => {
  return <div>Placeholder for pool details dialog</div>;
};

interface PoolDashboardProps {
  factoryAddress: `0x${string}`;
}

interface Pool {
  address: string;
  name: string;
  symbol: string;
  assetAddress: string;
  assetSymbol?: string;
  assetDecimals?: number;
  totalAssets: bigint;
  totalBorrowed: bigint;
  collateralFactorBps: bigint;
  reserveFactorBps: bigint;
  reserveBalance: bigint;
  utilizationRate: number;
}

export function PoolDashboard({ factoryAddress }: PoolDashboardProps) {
  const { address: userAddress } = useAccount();
  const publicClient = usePublicClient();
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [selectedPool, setSelectedPool] = useState<Pool | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [debugData, setDebugData] = useState<{ [key: string]: any }>({});
  // Flag for debug mode
  const debug = true;

  // Get pool addresses from the factory
  const { 
    data: poolAddresses = [], 
    isLoading: isLoadingPools,
    error: poolsError
  } = useReadContract({
    address: factoryAddress,
    abi: LOAN_POOL_FACTORY_ABI as Abi,
    functionName: 'getAllPools',
  });

  // Get pool count for validation
  const { 
    data: poolCount = 0n, 
    isLoading: isLoadingCount,
    error: countError
  } = useReadContract({
    address: factoryAddress,
    abi: LOAN_POOL_FACTORY_ABI as Abi,
    functionName: 'poolCount',
  });

  // Check if factory contract exists
  const {
    data: factoryImplementation,
    isLoading: isLoadingImplementation,
    error: implementationError
  } = useReadContract({
    address: factoryAddress,
    abi: LOAN_POOL_FACTORY_ABI as Abi,
    functionName: 'implementation',
  });

  // Validate owner
  const {
    data: factoryOwner,
    isLoading: isLoadingOwner,
    error: ownerError
  } = useReadContract({
    address: factoryAddress,
    abi: LOAN_POOL_FACTORY_ABI as Abi,
    functionName: 'owner',
  });

  useEffect(() => {
    // Log factory contract state
    setDebugData({
      factoryAddress,
      implementationAddress: factoryImplementation || 'Loading...',
      poolCount: poolCount || 'Loading...',
      owner: factoryOwner || 'Loading...',
      poolAddresses: poolAddresses || 'Loading...',
    });

    console.log("Factory Debug Information:", {
      factoryAddress,
      implementationAddress: factoryImplementation,
      poolCount,
      owner: factoryOwner,
      publicClient: !!publicClient,
      loadingStates: {
        implementation: isLoadingImplementation,
        count: isLoadingCount,
        owner: isLoadingOwner,
        pools: isLoadingPools
      },
      errors: {
        implementation: implementationError,
        count: countError,
        owner: ownerError,
        pools: poolsError
      },
      poolAddresses
    });
  }, [
    factoryAddress, 
    factoryImplementation, 
    poolCount, 
    factoryOwner, 
    poolAddresses, 
    publicClient,
    isLoadingImplementation,
    isLoadingCount,
    isLoadingOwner,
    isLoadingPools,
    implementationError,
    countError,
    ownerError,
    poolsError
  ]);
  
  // Fetch data for each pool
  useEffect(() => {
    const fetchPoolData = async () => {
      if (poolsError || countError || implementationError) {
        setLoadingError(`Contract Error: ${poolsError?.message || countError?.message || implementationError?.message || "Unknown error"}`);
        setLoading(false);
        return;
      }

      if (isLoadingPools || isLoadingCount || isLoadingImplementation || !publicClient) {
        return; // Wait for data to load
      }
      
      setLoading(true);
      setLoadingError(null);
      
      try {
        // Validate expected data
        if (!factoryImplementation) {
          setLoadingError("Factory contract not properly initialized (implementation not found)");
          setLoading(false);
          return;
        }
        
        console.log(`Public client available: ${!!publicClient}`);
        
        // There might be no pools yet, that's valid
        if (!poolAddresses || poolAddresses.length === 0) {
          console.log("No pools found in the factory");
          if (poolCount && poolCount > 0n) {
            console.warn(`Pool count is ${poolCount} but no pool addresses returned. This suggests a contract issue.`);
            setLoadingError(`Contract inconsistency: Pool count is ${poolCount} but no pool addresses returned`);
          } else {
            console.log("Pool count is 0, as expected with no pools");
          }
          setPools([]);
          setLoading(false);
          return;
        }
        
        console.log(`Processing ${poolAddresses.length} pool addresses`);
        
        // Map over all pool addresses and fetch data
        const poolDataPromises = poolAddresses.map(async (poolAddress: string) => {
          try {
            console.log(`Fetching data for pool: ${poolAddress}`);
            
            // Fetch basic pool data
            const [
              assetAddress,
              name,
              symbol,
              totalAssets,
              totalBorrowed,
              collateralFactorBps,
              reserveFactorBps,
              reserveBalance
            ] = await Promise.all([
              publicClient.readContract({
                address: poolAddress as `0x${string}`,
                abi: LENDING_POOL_ABI as Abi,
                functionName: 'asset'
              }).catch((e) => {
                console.error(`Error reading asset for pool ${poolAddress}:`, e);
                return zeroAddress;
              }),
              
              publicClient.readContract({
                address: poolAddress as `0x${string}`,
                abi: LENDING_POOL_ABI as Abi,
                functionName: 'name'
              }).catch((e) => {
                console.error(`Error reading name for pool ${poolAddress}:`, e);
                return 'Unknown Pool';
              }),
              
              publicClient.readContract({
                address: poolAddress as `0x${string}`,
                abi: LENDING_POOL_ABI as Abi,
                functionName: 'symbol'
              }).catch((e) => {
                console.error(`Error reading symbol for pool ${poolAddress}:`, e);
                return 'UNK';
              }),
              
              publicClient.readContract({
                address: poolAddress as `0x${string}`,
                abi: LENDING_POOL_ABI as Abi,
                functionName: 'totalAssets'
              }).catch((e) => {
                console.error(`Error reading totalAssets for pool ${poolAddress}:`, e);
                return 0n;
              }),
              
              publicClient.readContract({
                address: poolAddress as `0x${string}`,
                abi: LENDING_POOL_ABI as Abi,
                functionName: 'totalBorrowed'
              }).catch((e) => {
                console.error(`Error reading totalBorrowed for pool ${poolAddress}:`, e);
                return 0n;
              }),
              
              publicClient.readContract({
                address: poolAddress as `0x${string}`,
                abi: LENDING_POOL_ABI as Abi,
                functionName: 'collateralFactorBps'
              }).catch((e) => {
                console.error(`Error reading collateralFactorBps for pool ${poolAddress}:`, e);
                return 7500n;
              }),
              
              publicClient.readContract({
                address: poolAddress as `0x${string}`,
                abi: LENDING_POOL_ABI as Abi,
                functionName: 'reserveFactorBps'
              }).catch((e) => {
                console.error(`Error reading reserveFactorBps for pool ${poolAddress}:`, e);
                return 1000n;
              }),
              
              publicClient.readContract({
                address: poolAddress as `0x${string}`,
                abi: LENDING_POOL_ABI as Abi,
                functionName: 'reserveBalance'
              }).catch((e) => {
                console.error(`Error reading reserveBalance for pool ${poolAddress}:`, e);
                return 0n;
              })
            ]);
            
            // Try to get asset info (symbol, decimals) if asset address is valid
            let assetSymbol = undefined;
            let assetDecimals = undefined;
            
            if (assetAddress !== zeroAddress) {
              try {
                const erc20Abi = [
                  {
                    "inputs": [],
                    "name": "symbol",
                    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
                    "stateMutability": "view",
                    "type": "function"
                  },
                  {
                    "inputs": [],
                    "name": "decimals",
                    "outputs": [{"internalType": "uint8", "name": "", "type": "uint8"}],
                    "stateMutability": "view",
                    "type": "function"
                  }
                ] as const;
                
                [assetSymbol, assetDecimals] = await Promise.all([
                  publicClient.readContract({
                    address: assetAddress as `0x${string}`,
                    abi: erc20Abi,
                    functionName: 'symbol'
                  }).catch(() => undefined),
                  
                  publicClient.readContract({
                    address: assetAddress as `0x${string}`,
                    abi: erc20Abi,
                    functionName: 'decimals'
                  }).catch(() => 18)
                ]);
              } catch (err) {
                console.error(`Error fetching token info for ${assetAddress}:`, err);
              }
            }
            
            // Calculate utilization rate
            const utilizationRate = totalAssets > 0n
              ? Number(totalBorrowed * 10000n / totalAssets) / 100
              : 0;
            
            console.log(`Pool ${poolAddress} data:`, {
              name, 
              symbol, 
              assetAddress,
              assetSymbol,
              totalAssets: totalAssets.toString(),
              totalBorrowed: totalBorrowed.toString(),
              utilizationRate
            });
            
            return {
              address: poolAddress,
              name,
              symbol,
              assetAddress,
              assetSymbol,
              assetDecimals,
              totalAssets,
              totalBorrowed,
              collateralFactorBps,
              reserveFactorBps,
              reserveBalance,
              utilizationRate
            };
          } catch (err) {
            console.error(`Failed to fetch data for pool ${poolAddress}:`, err);
            return null;
          }
        });
        
        const poolResults = await Promise.all(poolDataPromises);
        const validPools = poolResults.filter((pool): pool is Pool => pool !== null);
        
        setPools(validPools);
        console.log(`Successfully loaded ${validPools.length} pools`);
      } catch (err: any) {
        console.error('Error fetching pool data:', err);
        setLoadingError(`Failed to fetch pool data: ${err.message || "Unknown error"}`);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPoolData();
  }, [
    poolAddresses, 
    publicClient, 
    factoryImplementation, 
    poolCount,
    isLoadingPools,
    isLoadingCount,
    isLoadingImplementation,
    poolsError,
    countError,
    implementationError
  ]);
  
  const viewPoolDetails = (pool: Pool) => {
    setSelectedPool(pool);
    setIsDetailsOpen(true);
  };
  
  // Calculate total value locked across all pools
  const totalValueLocked = pools.reduce((sum, pool) => sum + pool.totalAssets, 0n);
  
  // Format utilization rate display
  const formatUtilization = (rate: number) => {
    return `${rate.toFixed(2)}%`;
  };
  
  return (
    <div className="space-y-4">
      {/* Debug information for admin/development use */}
      {(loadingError || debug) && (
        <Card className="bg-amber-900/20 border-amber-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2 text-amber-500">
              <CircleAlert className="h-5 w-5" />
              Debug Information
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-amber-200/70 space-y-2">
            {loadingError && (
              <div className="bg-red-900/20 p-2 rounded border border-red-700 text-red-300">
                <strong>Error:</strong> {loadingError}
              </div>
            )}
            <div className="space-y-1">
              <div><strong>Factory:</strong> {factoryAddress}</div>
              <div><strong>Implementation:</strong> {String(factoryImplementation || "Not found")}</div>
              <div><strong>Pool Count:</strong> {String(poolCount || "0")}</div>
              <div><strong>Owner:</strong> {String(factoryOwner || "Not found")}</div>
              <div><strong>Public Client:</strong> {publicClient ? "Available" : "Not available"}</div>
              <div><strong>Pool Addresses:</strong> {poolAddresses?.length || 0}</div>
            </div>
          </CardContent>
        </Card>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Total Value Locked</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {formatEther(totalValueLocked)} ETH
            </div>
            <p className="text-gray-400 text-sm">
              {formatUSD(Number(formatEther(totalValueLocked)) * 3500)}
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Total Pools</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{pools.length}</div>
            <p className="text-gray-400 text-sm">Active lending pools</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Average Utilization</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {pools.length > 0
                ? formatUtilization(pools.reduce((sum, pool) => sum + pool.utilizationRate, 0) / pools.length)
                : '0%'}
            </div>
            <p className="text-gray-400 text-sm">Across all pools</p>
          </CardContent>
        </Card>
      </div>
      
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle>Lending Pools</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-60">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
                <p className="text-gray-400">Loading pools...</p>
              </div>
            </div>
          ) : pools.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-gray-700 rounded-md">
              <div className="flex justify-center">
                <AlertCircle className="h-10 w-10 text-amber-500 mb-2" />
              </div>
              <h3 className="text-lg font-medium text-gray-300 mb-1">No Pools Found</h3>
              <p className="text-gray-400 max-w-md mx-auto mb-4">
                {loadingError 
                  ? "An error occurred while loading pools. See above for details."
                  : "There are no lending pools available yet. Create a new pool to get started."}
              </p>
              
              {!loadingError && (
                <Button
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                >
                  Create Your First Pool
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pool</TableHead>
                    <TableHead>Asset</TableHead>
                    <TableHead>Total Supply</TableHead>
                    <TableHead>Total Borrowed</TableHead>
                    <TableHead>Utilization</TableHead>
                    <TableHead>Collateral Factor</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pools.map((pool) => (
                    <TableRow key={pool.address}>
                      <TableCell className="font-medium">
                        <div>{pool.name}</div>
                        <div className="text-xs text-gray-400">{pool.symbol}</div>
                      </TableCell>
                      <TableCell>
                        <div>{pool.assetSymbol || '???'}</div>
                        <div className="text-xs text-gray-400">
                          {pool.assetAddress.slice(0, 6)}...{pool.assetAddress.slice(-4)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatUnits(pool.totalAssets, pool.assetDecimals || 18)}
                      </TableCell>
                      <TableCell>
                        {formatUnits(pool.totalBorrowed, pool.assetDecimals || 18)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            pool.utilizationRate > 80
                              ? 'bg-red-600'
                              : pool.utilizationRate > 50
                              ? 'bg-amber-600'
                              : 'bg-green-600'
                          }
                        >
                          {formatUtilization(pool.utilizationRate)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {Number(pool.collateralFactorBps) / 100}%
                      </TableCell>
                      <TableCell>
                        <Button variant="secondary" onClick={() => viewPoolDetails(pool)}>
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pool details dialog */}
      {selectedPool && (
        <LoanPoolDetailsDialog
          pool={selectedPool}
          isOpen={isDetailsOpen}
          onClose={() => setIsDetailsOpen(false)}
        />
      )}
    </div>
  );
} 