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
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useAccount, useReadContract, useContractReads, useWalletClient, usePublicClient } from 'wagmi';
import { formatEther, parseEther, Abi, Address } from 'viem';
import { Loader2, RefreshCw, Plus, Search } from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

// Define ABIs for the liquidity mining contracts
const LIQUIDITY_MINING_FACTORY_ABI = [
  {
    "inputs": [],
    "name": "getMiningProgramCount",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getAllMiningPrograms",
    "outputs": [{"internalType": "address[]", "name": "", "type": "address[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "", "type": "address"}],
    "name": "poolToMiningProgram",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "", "type": "address"}],
    "name": "miningProgramToToken",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "_pool", "type": "address"},
      {"internalType": "string", "name": "_tokenName", "type": "string"},
      {"internalType": "string", "name": "_tokenSymbol", "type": "string"},
      {"internalType": "uint256", "name": "_rewardRate", "type": "uint256"},
      {"internalType": "uint256", "name": "_maxSupply", "type": "uint256"},
      {"internalType": "uint256", "name": "_initialSupply", "type": "uint256"}
    ],
    "name": "createMiningProgram",
    "outputs": [
      {"internalType": "address", "name": "miningProgram", "type": "address"},
      {"internalType": "address", "name": "rewardToken", "type": "address"}
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

const LIQUIDITY_MINING_ABI = [
  {
    "inputs": [],
    "name": "rewardToken",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "poolLength",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "name": "activePools",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "_pool", "type": "address"}],
    "name": "getRewardPool",
    "outputs": [
      {"internalType": "uint256", "name": "rewardRate", "type": "uint256"},
      {"internalType": "uint256", "name": "lastUpdateTime", "type": "uint256"},
      {"internalType": "uint256", "name": "rewardPerShareStored", "type": "uint256"},
      {"internalType": "uint256", "name": "totalStaked", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "_pool", "type": "address"},
      {"internalType": "address", "name": "_user", "type": "address"}
    ],
    "name": "pendingRewards",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "_pool", "type": "address"},
      {"internalType": "uint256", "name": "_amount", "type": "uint256"}
    ],
    "name": "stake",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "_pool", "type": "address"},
      {"internalType": "uint256", "name": "_amount", "type": "uint256"}
    ],
    "name": "withdraw",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "_pool", "type": "address"}],
    "name": "claim",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

const REWARD_TOKEN_ABI = [
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
  },
  {
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "MAX_SUPPLY",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

// Pool data interface
interface MiningProgramData {
  address: `0x${string}`;
  rewardToken: `0x${string}`;
  pools: `0x${string}`[];
  totalStaked: bigint;
  rewardRate: bigint;
  tokenName: string;
  tokenSymbol: string;
  rewardBalance?: bigint;
  userStaked?: bigint;
  pendingRewards?: bigint;
}

interface LiquidityMiningDashboardProps {
  factoryAddress: `0x${string}`;
}

export function LiquidityMiningDashboard({ factoryAddress }: LiquidityMiningDashboardProps) {
  const { address: userAddress } = useAccount();
  const [miningPrograms, setMiningPrograms] = useState<MiningProgramData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [stakeDialogOpen, setStakeDialogOpen] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<string | null>(null);
  const [selectedPool, setSelectedPool] = useState<string | null>(null);
  const [stakeAmount, setStakeAmount] = useState('');
  const [formState, setFormState] = useState({
    poolAddress: '',
    tokenName: 'Reward Token',
    tokenSymbol: 'RWD',
    rewardRate: '0.1',
    maxSupply: '10000000',
    initialSupply: '1000000'
  });

  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  // Get mining programs from the contract
  const { data: programAddresses, refetch: refetchPrograms } = useReadContract({
    address: factoryAddress as `0x${string}`,
    abi: LIQUIDITY_MINING_FACTORY_ABI,
    functionName: 'getAllMiningPrograms',
  });

  // Get program count as a separate check
  const { data: programCount } = useReadContract({
    address: factoryAddress as `0x${string}`,
    abi: LIQUIDITY_MINING_FACTORY_ABI,
    functionName: 'getMiningProgramCount',
  });

  // Fetch data for all mining programs
  useEffect(() => {
    const fetchMiningPrograms = async () => {
      if (!programAddresses || !publicClient) return;

      setLoading(true);
      try {
        const programsData: MiningProgramData[] = [];

        for (const programAddress of programAddresses) {
          try {
            if (!publicClient) continue;
            
            // Get reward token address
            const rewardToken = await publicClient.readContract({
              address: programAddress,
              abi: LIQUIDITY_MINING_ABI,
              functionName: 'rewardToken',
            }) as `0x${string}`;

            // Get pools count
            const poolCount = await publicClient.readContract({
              address: programAddress,
              abi: LIQUIDITY_MINING_ABI,
              functionName: 'poolLength',
            }) as bigint;

            // Get pools
            const pools: `0x${string}`[] = [];
            for (let i = 0; i < Number(poolCount); i++) {
              const pool = await publicClient.readContract({
                address: programAddress,
                abi: LIQUIDITY_MINING_ABI,
                functionName: 'activePools',
                args: [BigInt(i)],
              }) as `0x${string}`;
              pools.push(pool);
            }

            // Get token name and symbol
            const tokenName = await publicClient.readContract({
              address: rewardToken,
              abi: REWARD_TOKEN_ABI,
              functionName: 'name',
            }) as string;

            const tokenSymbol = await publicClient.readContract({
              address: rewardToken,
              abi: REWARD_TOKEN_ABI,
              functionName: 'symbol',
            }) as string;

            // Get reward rate and staked amount for first pool
            let totalStaked = BigInt(0);
            let rewardRate = BigInt(0);

            if (pools.length > 0) {
              const poolInfo = await publicClient.readContract({
                address: programAddress,
                abi: LIQUIDITY_MINING_ABI,
                functionName: 'getRewardPool',
                args: [pools[0]],
              }) as [bigint, bigint, bigint, bigint];

              rewardRate = poolInfo[0];
              totalStaked = poolInfo[3];
            }

            // If user is connected, get their data
            let userStaked = undefined;
            let pendingRewards = undefined;
            let rewardBalance = undefined;

            if (userAddress) {
              try {
                // Get reward balance
                rewardBalance = await publicClient.readContract({
                  address: rewardToken,
                  abi: REWARD_TOKEN_ABI,
                  functionName: 'balanceOf',
                  args: [userAddress],
                }) as bigint;

                // Get pending rewards for first pool
                if (pools.length > 0) {
                  pendingRewards = await publicClient.readContract({
                    address: programAddress,
                    abi: LIQUIDITY_MINING_ABI,
                    functionName: 'pendingRewards',
                    args: [pools[0], userAddress],
                  }) as bigint;
                }
              } catch (error) {
                console.error("Error fetching user data:", error);
              }
            }

            programsData.push({
              address: programAddress,
              rewardToken,
              pools,
              totalStaked,
              rewardRate,
              tokenName,
              tokenSymbol,
              rewardBalance,
              userStaked,
              pendingRewards
            });
          } catch (error) {
            console.error(`Error fetching data for program ${programAddress}:`, error);
          }
        }

        setMiningPrograms(programsData);
      } catch (error) {
        console.error("Error fetching mining programs:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMiningPrograms();
  }, [programAddresses, publicClient, userAddress]);

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await refetchPrograms();
    setRefreshing(false);
  };

  // Format amount with proper decimals
  const formatAmount = (amount: bigint, decimals: number = 18) => {
    return Number(formatEther(amount)).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 6
    });
  };

  // Format reward rate (tokens per second) to a human-readable format
  const formatRewardRate = (rate: bigint) => {
    // Convert from tokens per second to tokens per day
    const tokensPerDay = Number(formatEther(rate)) * 86400; // 86400 seconds in a day
    
    if (tokensPerDay >= 1000000) {
      return `${(tokensPerDay / 1000000).toFixed(2)}M per day`;
    } else if (tokensPerDay >= 1000) {
      return `${(tokensPerDay / 1000).toFixed(2)}K per day`;
    } else {
      return `${tokensPerDay.toFixed(2)} per day`;
    }
  };

  // Handle create mining program
  const handleCreateProgram = async () => {
    if (!walletClient || !publicClient) return;

    try {
      const params = [
        formState.poolAddress as `0x${string}`,
        formState.tokenName,
        formState.tokenSymbol,
        parseEther(formState.rewardRate),
        parseEther(formState.maxSupply),
        parseEther(formState.initialSupply)
      ] as const;

      // Prepare the transaction
      const { request } = await publicClient.simulateContract({
        account: walletClient.account.address,
        address: factoryAddress as `0x${string}`,
        abi: LIQUIDITY_MINING_FACTORY_ABI,
        functionName: 'createMiningProgram',
        args: params,
      });

      // Send the transaction
      const hash = await walletClient.writeContract(request);
      console.log("Transaction sent:", hash);

      // Close dialog and refresh
      setCreateDialogOpen(false);
      handleRefresh();
    } catch (error) {
      console.error("Error creating mining program:", error);
    }
  };

  // Handle stake tokens
  const handleStake = async () => {
    if (!walletClient || !selectedProgram || !selectedPool || !publicClient) return;

    try {
      // Prepare the transaction
      const { request } = await publicClient.simulateContract({
        account: walletClient.account.address,
        address: selectedProgram as `0x${string}`,
        abi: LIQUIDITY_MINING_ABI,
        functionName: 'stake',
        args: [selectedPool as `0x${string}`, parseEther(stakeAmount)],
      });

      // Send the transaction
      const hash = await walletClient.writeContract(request);
      console.log("Transaction sent:", hash);

      // Close dialog and refresh
      setStakeDialogOpen(false);
      handleRefresh();
    } catch (error) {
      console.error("Error staking tokens:", error);
    }
  };

  // Handle claim rewards
  const handleClaim = async (programAddress: string, poolAddress: string) => {
    if (!walletClient || !publicClient) return;

    try {
      // Prepare the transaction
      const { request } = await publicClient.simulateContract({
        account: walletClient.account.address,
        address: programAddress as `0x${string}`,
        abi: LIQUIDITY_MINING_ABI,
        functionName: 'claim',
        args: [poolAddress as `0x${string}`],
      });

      // Send the transaction
      const hash = await walletClient.writeContract(request);
      console.log("Transaction sent:", hash);
      
      // Refresh data
      handleRefresh();
    } catch (error) {
      console.error("Error claiming rewards:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Liquidity Mining Programs</h2>
        <div className="flex space-x-2">
          <Button 
            variant="secondary"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Refresh
          </Button>
          <Button 
            onClick={() => setCreateDialogOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Program
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="ml-2 text-gray-400">Loading liquidity mining programs...</p>
        </div>
      ) : miningPrograms.length === 0 ? (
        <Card className="border border-gray-800 bg-gray-900/50">
          <CardContent className="p-6">
            <div className="text-center py-8">
              <h3 className="text-xl font-semibold text-gray-300 mb-2">No Liquidity Mining Programs</h3>
              <p className="text-gray-400 mb-6">Create your first liquidity mining program to incentivize liquidity providers.</p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Program
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {miningPrograms.map((program) => (
            <Card key={program.address} className="border border-gray-800 bg-gray-900/50">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl text-white flex items-center">
                      {program.tokenName} ({program.tokenSymbol})
                      <Badge className="ml-2" variant="outline">{program.pools.length} Pool(s)</Badge>
                    </CardTitle>
                    <CardDescription>
                      Reward Rate: {formatRewardRate(program.rewardRate)}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-400">Total Staked</div>
                    <div className="text-lg font-semibold text-white">{formatAmount(program.totalStaked)} LP</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {program.pools.map((pool, index) => (
                    <div key={pool} className="p-3 bg-gray-800 rounded-lg">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between">
                        <div className="mb-2 lg:mb-0">
                          <div className="text-gray-300">Pool {index + 1}: {pool.slice(0, 6)}...{pool.slice(-4)}</div>
                          {userAddress && program.pendingRewards && (
                            <div className="text-sm text-gray-400">
                              Pending Rewards: <span className="text-green-400">{formatAmount(program.pendingRewards)}</span> {program.tokenSymbol}
                            </div>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          <Button 
                            variant="secondary"
                            onClick={() => {
                              setSelectedProgram(program.address);
                              setSelectedPool(pool);
                              setStakeDialogOpen(true);
                            }}
                          >
                            Stake
                          </Button>
                          {userAddress && program.pendingRewards && program.pendingRewards > BigInt(0) && (
                            <Button 
                              variant="default"
                              onClick={() => handleClaim(program.address, pool)}
                            >
                              Claim Rewards
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="pt-0 text-sm text-gray-500">
                <div className="w-full flex justify-between">
                  <span>Program ID: {program.address.slice(0, 6)}...{program.address.slice(-4)}</span>
                  <span>Token: {program.rewardToken.slice(0, 6)}...{program.rewardToken.slice(-4)}</span>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Create Mining Program Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="bg-gray-900 text-white border-gray-700">
          <DialogHeader>
            <DialogTitle>Create Liquidity Mining Program</DialogTitle>
            <DialogDescription className="text-gray-400">
              Create a new liquidity mining program for a lending pool to incentivize liquidity providers.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="poolAddress">Lending Pool Address</Label>
              <Input 
                id="poolAddress" 
                placeholder="0x..." 
                value={formState.poolAddress}
                onChange={(e) => setFormState({...formState, poolAddress: e.target.value})}
                className="bg-gray-800 border-gray-700"
              />
              <p className="text-xs text-gray-400">The address of the lending pool to create a mining program for</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tokenName">Reward Token Name</Label>
                <Input 
                  id="tokenName" 
                  placeholder="Reward Token" 
                  value={formState.tokenName}
                  onChange={(e) => setFormState({...formState, tokenName: e.target.value})}
                  className="bg-gray-800 border-gray-700"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tokenSymbol">Reward Token Symbol</Label>
                <Input 
                  id="tokenSymbol" 
                  placeholder="RWD" 
                  value={formState.tokenSymbol}
                  onChange={(e) => setFormState({...formState, tokenSymbol: e.target.value})}
                  className="bg-gray-800 border-gray-700"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rewardRate">Reward Rate (tokens per second)</Label>
              <Input 
                id="rewardRate" 
                type="number" 
                placeholder="0.1" 
                value={formState.rewardRate}
                onChange={(e) => setFormState({...formState, rewardRate: e.target.value})}
                className="bg-gray-800 border-gray-700"
              />
              <p className="text-xs text-gray-400">
                {Number(formState.rewardRate) * 86400} tokens per day
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxSupply">Maximum Supply</Label>
                <Input 
                  id="maxSupply" 
                  type="number" 
                  placeholder="10000000" 
                  value={formState.maxSupply}
                  onChange={(e) => setFormState({...formState, maxSupply: e.target.value})}
                  className="bg-gray-800 border-gray-700"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="initialSupply">Initial Supply</Label>
                <Input 
                  id="initialSupply" 
                  type="number" 
                  placeholder="1000000" 
                  value={formState.initialSupply}
                  onChange={(e) => setFormState({...formState, initialSupply: e.target.value})}
                  className="bg-gray-800 border-gray-700"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateProgram}>Create Program</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stake Dialog */}
      <Dialog open={stakeDialogOpen} onOpenChange={setStakeDialogOpen}>
        <DialogContent className="bg-gray-900 text-white border-gray-700">
          <DialogHeader>
            <DialogTitle>Stake LP Tokens</DialogTitle>
            <DialogDescription className="text-gray-400">
              Stake your LP tokens to earn rewards.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="stakeAmount">Amount to Stake</Label>
              <Input 
                id="stakeAmount" 
                type="number" 
                placeholder="0.0" 
                value={stakeAmount}
                onChange={(e) => setStakeAmount(e.target.value)}
                className="bg-gray-800 border-gray-700"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setStakeDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleStake}>Stake</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 