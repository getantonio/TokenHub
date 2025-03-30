import React, { useState, useEffect, useCallback } from 'react';
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
import { useAccount, useReadContract, useContractReads, usePublicClient } from 'wagmi';
import { formatEther, formatUnits, parseEther, Abi, Address } from 'viem';
import { LOAN_POOL_FACTORY_ABI, LENDING_POOL_ABI } from '@/contracts/defi/abis';
import { Loader2, RefreshCw } from 'lucide-react';

// Basic ERC20 ABI with just the functions we need
const erc20Abi = [
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [{"internalType": "uint8", "name": "", "type": "uint8"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

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
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPool, setSelectedPool] = useState<string | null>(null);
  const [feeData, setFeeData] = useState<{ creationFee: string, protocolFee: number } | null>(null);
  const publicClient = usePublicClient();

  // Get pool addresses from the contract
  const { data: poolAddresses, refetch: refetchPools, error: poolAddressError } = useReadContract({
    address: factoryAddress,
    abi: LOAN_POOL_FACTORY_ABI as Abi,
    functionName: 'getAllPools',
  });

  // Get pool count as a separate check
  const { data: poolCount, error: poolCountError } = useReadContract({
    address: factoryAddress,
    abi: LOAN_POOL_FACTORY_ABI as Abi,
    functionName: 'getPoolCount',
  });

  // Check if contract exists at the factory address
  useEffect(() => {
    const checkContractExists = async () => {
      if (!publicClient) return;
      
      console.log("Checking if contract exists at address:", factoryAddress);
      try {
        const bytecode = await publicClient.getBytecode({ address: factoryAddress });
        const exists = bytecode && bytecode !== '0x';
        console.log("Contract exists:", exists);
        console.log("Bytecode length:", bytecode ? bytecode.length : 0);
        
        if (!exists) {
          console.error("No contract deployed at the factory address. Please check the address and network.");
          return;
        }

        // Try to get the implementation address (since it's likely a proxy)
        try {
          const implementation = await publicClient.readContract({
            address: factoryAddress,
            abi: LOAN_POOL_FACTORY_ABI as Abi,
            functionName: 'implementation'
          });
          console.log("Implementation address:", implementation);
        } catch (error) {
          console.error("Error reading implementation address:", error);
        }

        // Try to check if contract is initialized by testing owner
        try {
          // Assuming the contract might be Ownable
          const ownerAbi = [
            {
              "inputs": [],
              "name": "owner",
              "outputs": [{"internalType": "address", "name": "", "type": "address"}],
              "stateMutability": "view",
              "type": "function"
            }
          ] as const;
          
          const owner = await publicClient.readContract({
            address: factoryAddress,
            abi: ownerAbi,
            functionName: 'owner'
          });
          console.log("Contract owner:", owner);
        } catch (error) {
          console.error("Error reading owner:", error);
        }

        // Try another function directly - a lower level call to see what's going on
        try {
          console.log("Trying low-level call to implementation()...");
          const data = await publicClient.call({
            to: factoryAddress,
            data: '0x5c60da1b' // function selector for implementation()
          });
          console.log("Raw implementation call result:", data);
        } catch (error) {
          console.error("Error with low-level call:", error);
        }

        // Check for EIP-1967 implementation slot
        try {
          console.log("Checking EIP-1967 implementation slot...");
          // EIP-1967 implementation slot: 0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc
          const implementationSlot = await publicClient.getStorageAt({
            address: factoryAddress,
            slot: '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc'
          });
          console.log("EIP-1967 implementation slot value:", implementationSlot);
          
          if (implementationSlot && implementationSlot !== '0x' && implementationSlot !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
            // Convert to address format
            const paddedAddress = implementationSlot.slice(-40); // Take last 40 chars (20 bytes)
            const implementationAddress = `0x${paddedAddress}`;
            console.log("Potential implementation address from EIP-1967:", implementationAddress);
          }
        } catch (error) {
          console.error("Error checking EIP-1967 slot:", error);
        }

        // Check for OpenZeppelin's older proxy implementation slot
        try {
          console.log("Checking OpenZeppelin legacy implementation slot...");
          // OpenZeppelin's implementation slot (older versions): 0x7050c9e0f4ca769c69bd3a8ef740bc37934f8e2c036e5a723fd8ee048ed3f8c3
          const ozImplementationSlot = await publicClient.getStorageAt({
            address: factoryAddress,
            slot: '0x7050c9e0f4ca769c69bd3a8ef740bc37934f8e2c036e5a723fd8ee048ed3f8c3'
          });
          console.log("OpenZeppelin implementation slot value:", ozImplementationSlot);
          
          if (ozImplementationSlot && ozImplementationSlot !== '0x' && ozImplementationSlot !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
            // Convert to address format
            const paddedAddress = ozImplementationSlot.slice(-40); // Take last 40 chars (20 bytes)
            const implementationAddress = `0x${paddedAddress}`;
            console.log("Potential implementation address from OZ proxy:", implementationAddress);
          }
        } catch (error) {
          console.error("Error checking OpenZeppelin slot:", error);
        }

        // Check if it's an ERC-20 token
        try {
          console.log("Checking if contract might be an ERC-20 token...");
          const erc20Abi = [
            {
              "inputs": [],
              "name": "name",
              "outputs": [{"internalType": "string", "name": "", "type": "string"}],
              "stateMutability": "view",
              "type": "function"
            },
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
          
          const name = await publicClient.readContract({
            address: factoryAddress,
            abi: erc20Abi,
            functionName: 'name'
          });
          console.log("ERC-20 name:", name);
          
          const symbol = await publicClient.readContract({
            address: factoryAddress,
            abi: erc20Abi,
            functionName: 'symbol'
          });
          console.log("ERC-20 symbol:", symbol);
          
          const decimals = await publicClient.readContract({
            address: factoryAddress,
            abi: erc20Abi,
            functionName: 'decimals'
          });
          console.log("ERC-20 decimals:", decimals);
          
          console.log("This might be an ERC-20 token, not a LoanPoolFactory");
        } catch (error) {
          console.log("Contract is not an ERC-20 token");
        }
        
        // Check if it's an ERC-721 token
        try {
          console.log("Checking if contract might be an ERC-721 token...");
          const erc721Abi = [
            {
              "inputs": [],
              "name": "name",
              "outputs": [{"internalType": "string", "name": "", "type": "string"}],
              "stateMutability": "view",
              "type": "function"
            },
            {
              "inputs": [],
              "name": "symbol",
              "outputs": [{"internalType": "string", "name": "", "type": "string"}],
              "stateMutability": "view",
              "type": "function"
            },
            {
              "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
              "name": "ownerOf",
              "outputs": [{"internalType": "address", "name": "", "type": "address"}],
              "stateMutability": "view",
              "type": "function"
            }
          ] as const;
          
          // Test name and symbol first
          const name = await publicClient.readContract({
            address: factoryAddress,
            abi: erc721Abi,
            functionName: 'name'
          });
          console.log("ERC-721 name:", name);
          
          const symbol = await publicClient.readContract({
            address: factoryAddress,
            abi: erc721Abi,
            functionName: 'symbol'
          });
          console.log("ERC-721 symbol:", symbol);
          
          console.log("This might be an ERC-721 token, not a LoanPoolFactory");
        } catch (error) {
          console.log("Contract is not an ERC-721 token");
        }

        // Check for EIP-1967 admin slot
        try {
          console.log("Checking EIP-1967 admin slot...");
          // EIP-1967 admin slot: 0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103
          const adminSlot = await publicClient.getStorageAt({
            address: factoryAddress,
            slot: '0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103'
          });
          console.log("EIP-1967 admin slot value:", adminSlot);
          
          if (adminSlot && adminSlot !== '0x' && adminSlot !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
            // Convert to address format
            const paddedAddress = adminSlot.slice(-40); // Take last 40 chars (20 bytes)
            const adminAddress = `0x${paddedAddress}`;
            console.log("Potential admin address from EIP-1967:", adminAddress);
          }
        } catch (error) {
          console.error("Error checking EIP-1967 admin slot:", error);
        }

        // Read first few storage slots to see what's in the contract
        console.log("Reading first 5 storage slots to analyze contract data");
        for (let i = 0; i < 5; i++) {
          try {
            const slot = `0x${i.toString(16).padStart(64, '0')}` as `0x${string}`;
            const value = await publicClient.getStorageAt({
              address: factoryAddress,
              slot
            });
            console.log(`Storage slot ${i}:`, value);
          } catch (error) {
            console.error(`Error reading storage slot ${i}:`, error);
          }
        }
        
      } catch (error) {
        console.error("Error checking contract existence:", error);
      }
    };
    
    checkContractExists();
  }, [factoryAddress, publicClient]);

  // Log factory address and pool addresses
  useEffect(() => {
    console.log("Factory address:", factoryAddress);
    console.log("Pool addresses from contract:", poolAddresses);
    if (poolAddressError) {
      console.error("Error fetching pool addresses:", poolAddressError);
      console.error("Error details:", JSON.stringify(poolAddressError, null, 2));
    }
  }, [factoryAddress, poolAddresses, poolAddressError]);

  // Log pool count
  useEffect(() => {
    console.log("Pool count from contract:", poolCount);
    if (poolCountError) {
      console.error("Error fetching pool count:", poolCountError);
    }
  }, [poolCount, poolCountError]);

  // Get fee collector address
  const { data: feeCollectorAddress } = useReadContract({
    address: factoryAddress,
    abi: LOAN_POOL_FACTORY_ABI as Abi,
    functionName: 'feeCollector',
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

  // Function to load pool data using direct contract calls
  const fetchPoolData = useCallback(async () => {
    console.log("Starting fetchPoolData...");
    console.log("Public client available:", !!publicClient);
    console.log("Pool addresses:", poolAddresses);
    
    if (!poolAddresses || (poolAddresses as any[]).length === 0) {
      console.log("No pool addresses found or empty array");
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (!publicClient) {
      console.error("Public client is not available");
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      console.log("Processing pools:", (poolAddresses as `0x${string}`[]).length);
      
      // Process each pool address
      const poolData = await Promise.all(
        (poolAddresses as `0x${string}`[]).map(async (poolAddress, index) => {
          console.log(`Processing pool ${index + 1}/${(poolAddresses as any[]).length}: ${poolAddress}`);
          
          try {
            // Read basic pool info directly from contracts
            console.log(`Reading data for pool ${poolAddress}...`);
            
            // Log contract call parameters
            console.log("Contract call params:", {
              address: poolAddress,
              abi: "LENDING_POOL_ABI (length: " + LENDING_POOL_ABI.length + ")",
              functionName: 'asset'
            });
            
            const [
              assetAddressResult,
              nameResult,
              symbolResult,
              totalAssetsResult,
              totalBorrowedResult,
              collateralFactorBpsResult,
              reserveFactorBpsResult,
              reserveBalanceResult
            ] = await Promise.all([
              publicClient.readContract({
                address: poolAddress,
                abi: LENDING_POOL_ABI as Abi,
                functionName: 'asset'
              }).catch(e => {
                console.error(`Error reading asset for pool ${poolAddress}:`, e);
                return null;
              }),
              publicClient.readContract({
                address: poolAddress,
                abi: LENDING_POOL_ABI as Abi,
                functionName: 'name'
              }).catch(e => {
                console.error(`Error reading name for pool ${poolAddress}:`, e);
                return "Unknown Pool";
              }),
              publicClient.readContract({
                address: poolAddress,
                abi: LENDING_POOL_ABI as Abi,
                functionName: 'symbol'
              }).catch(e => {
                console.error(`Error reading symbol for pool ${poolAddress}:`, e);
                return "???";
              }),
              publicClient.readContract({
                address: poolAddress,
                abi: LENDING_POOL_ABI as Abi,
                functionName: 'totalAssets'
              }).catch(e => {
                console.error(`Error reading totalAssets for pool ${poolAddress}:`, e);
                return BigInt(0);
              }),
              publicClient.readContract({
                address: poolAddress,
                abi: LENDING_POOL_ABI as Abi,
                functionName: 'totalBorrowed'
              }).catch(e => {
                console.error(`Error reading totalBorrowed for pool ${poolAddress}:`, e);
                return BigInt(0);
              }),
              publicClient.readContract({
                address: poolAddress,
                abi: LENDING_POOL_ABI as Abi,
                functionName: 'collateralFactorBps'
              }).catch(e => {
                console.error(`Error reading collateralFactorBps for pool ${poolAddress}:`, e);
                return BigInt(0);
              }),
              publicClient.readContract({
                address: poolAddress,
                abi: LENDING_POOL_ABI as Abi,
                functionName: 'reserveFactorBps'
              }).catch(e => {
                console.error(`Error reading reserveFactorBps for pool ${poolAddress}:`, e);
                return BigInt(0);
              }),
              publicClient.readContract({
                address: poolAddress,
                abi: LENDING_POOL_ABI as Abi,
                functionName: 'reserveBalance'
              }).catch(e => {
                console.error(`Error reading reserveBalance for pool ${poolAddress}:`, e);
                return BigInt(0);
              })
            ]);

            console.log(`Received basic data for pool ${poolAddress}:`, {
              assetAddress: assetAddressResult,
              name: nameResult,
              symbol: symbolResult,
              totalAssets: totalAssetsResult ? totalAssetsResult.toString() : null,
              totalBorrowed: totalBorrowedResult ? totalBorrowedResult.toString() : null
            });

            // Get the asset token info
            if (!assetAddressResult) {
              console.error(`Asset address is null for pool ${poolAddress}`);
              return null;
            }
            
            const assetAddress = assetAddressResult as `0x${string}`;
            console.log(`Reading decimals for token ${assetAddress}...`);
            
            // Get token decimals
            let decimals = 18; // Default to 18 if we can't read it
            try {
              const decimalsResult = await publicClient.readContract({
                address: assetAddress,
                abi: erc20Abi,
                functionName: 'decimals'
              });
              decimals = Number(decimalsResult);
              console.log(`Decimals for token ${assetAddress}: ${decimals}`);
            } catch (error) {
              console.error(`Error reading decimals for token ${assetAddress}, using default 18:`, error);
            }

            // Calculate utilization rate
            let utilizationRate = 0;
            const totalAssets = totalAssetsResult as bigint || BigInt(0);
            const totalBorrowed = totalBorrowedResult as bigint || BigInt(0);
            
            if (totalAssets > BigInt(0)) {
              utilizationRate = Number(totalBorrowed * BigInt(100) / totalAssets);
              console.log(`Utilization rate for pool ${poolAddress}: ${utilizationRate}%`);
            }

            const poolInfo = {
              address: poolAddress,
              assetAddress,
              name: nameResult as string || "Unknown Pool",
              symbol: symbolResult as string || "???",
              totalDeposits: totalAssets,
              totalBorrows: totalBorrowed,
              utilizationRate,
              collateralFactorBps: collateralFactorBpsResult as bigint || BigInt(0),
              reserveFactorBps: reserveFactorBpsResult as bigint || BigInt(0),
              reserveBalance: reserveBalanceResult as bigint || BigInt(0),
              decimals
            };
            
            console.log(`Successfully processed pool ${poolAddress}:`, poolInfo);
            return poolInfo;
          } catch (error) {
            console.error(`Error loading pool data for ${poolAddress}:`, error);
            return null;
          }
        })
      );

      // Log the raw pool data
      console.log("Raw pool data:", poolData);

      // Filter out nulls (failed pools)
      const validPools = poolData.filter(pool => pool !== null) as PoolData[];
      console.log(`Found ${validPools.length} valid pools out of ${poolData.length} total pools`);
      
      setPools(validPools);
      console.log("Updated state with pools:", validPools);
    } catch (error) {
      console.error('Error fetching pool data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      console.log("Finished fetchPoolData");
    }
  }, [poolAddresses, publicClient]);

  // Initial load of pool data
  useEffect(() => {
    if (publicClient) {
      fetchPoolData();
    }
  }, [fetchPoolData, publicClient]);

  // Handle manual refresh
  const handleRefresh = async () => {
    console.log("Refresh button clicked");
    setRefreshing(true);
    
    console.log("Refetching pools...");
    try {
      const result = await refetchPools();
      console.log("Refetch result:", result);
      if (result.error) {
        console.error("Refetch error details:", result.error);
        console.error("Error message:", result.error.message);
        console.error("Error stack:", result.error.stack);
        console.error("Full error object:", JSON.stringify(result.error, null, 2));
      }
    } catch (error) {
      console.error("Error refetching pools:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
    }
    
    console.log("Fetching pool data...");
    await fetchPoolData();
    console.log("Refresh complete");
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
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Lending Pools</CardTitle>
            <CardDescription>
              No pools have been created yet. Be the first to create one!
            </CardDescription>
          </div>
          <Button 
            variant="secondary" 
            onClick={handleRefresh}
            disabled={refreshing}
            className="ml-auto text-sm py-1 px-3"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
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
            <div className="mt-6 bg-amber-900/20 border border-amber-700 rounded-lg p-4 text-amber-300 text-sm">
              <p className="font-semibold">Just created a pool?</p>
              <p className="mt-1">If you recently created a pool and don't see it here, click the Refresh button above.</p>
              <p className="mt-1">It may take a few moments for the blockchain to process your transaction.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Protocol Overview</CardTitle>
            <CardDescription>
              Summary of all lending pools in the protocol
            </CardDescription>
          </div>
          <Button 
            variant="secondary" 
            onClick={handleRefresh}
            disabled={refreshing}
            className="ml-auto text-sm py-1 px-3"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="bg-blue-900/20 border-blue-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Total Value Locked</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatEther(pools.reduce((acc, pool) => acc + pool.totalDeposits, BigInt(0)))} ETH
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-green-900/20 border-green-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Total Borrowed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatEther(pools.reduce((acc, pool) => acc + pool.totalBorrows, BigInt(0)))} ETH
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
                    <Badge variant={pool.utilizationRate > 80 ? "destructive" : pool.utilizationRate > 50 ? "default" : "secondary"}>
                      {pool.utilizationRate}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{Number(pool.collateralFactorBps) / 100}%</TableCell>
                  <TableCell className="text-right">{Number(pool.reserveFactorBps) / 100}%</TableCell>
                  <TableCell>
                    <Button 
                      variant="secondary"
                      onClick={() => setSelectedPool(pool.address)}
                      className="text-sm py-1 px-3"
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
                    pools.find(p => p.address === selectedPool)?.totalDeposits || BigInt(0),
                    pools.find(p => p.address === selectedPool)?.decimals || 18
                  )} {pools.find(p => p.address === selectedPool)?.symbol}
                </p>
                
                <h3 className="text-sm font-medium text-gray-400 mb-1">Total Borrowed</h3>
                <p className="text-xl font-semibold">
                  {formatAmount(
                    pools.find(p => p.address === selectedPool)?.totalBorrows || BigInt(0),
                    pools.find(p => p.address === selectedPool)?.decimals || 18
                  )} {pools.find(p => p.address === selectedPool)?.symbol}
                </p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-1">Collateral Factor</h3>
                <p className="mb-4">{Number(pools.find(p => p.address === selectedPool)?.collateralFactorBps || BigInt(0)) / 100}%</p>
                
                <h3 className="text-sm font-medium text-gray-400 mb-1">Reserve Factor</h3>
                <p className="mb-4">{Number(pools.find(p => p.address === selectedPool)?.reserveFactorBps || BigInt(0)) / 100}%</p>
                
                <h3 className="text-sm font-medium text-gray-400 mb-1">Reserve Balance</h3>
                <p className="text-xl font-semibold">
                  {formatAmount(
                    pools.find(p => p.address === selectedPool)?.reserveBalance || BigInt(0),
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
                <span className="font-semibold">Reserve Factor:</span> {Number(pools.find(p => p.address === selectedPool)?.reserveFactorBps || BigInt(0)) / 100}% of interest goes to reserves
              </p>
              <p className="text-sm text-gray-400 mt-2">
                Remaining interest ({100 - (feeData?.protocolFee || 10) - Number(pools.find(p => p.address === selectedPool)?.reserveFactorBps || BigInt(0)) / 100}%) is distributed to depositors
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