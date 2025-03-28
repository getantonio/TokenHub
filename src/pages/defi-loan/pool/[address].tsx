import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAccount, useContractRead, useWriteContract, usePublicClient } from 'wagmi';
import { parseEther, formatEther, Abi } from 'viem';
import { LENDING_POOL_ABI } from '@/contracts/defi/abis';
import { Footer } from '@/components/layouts/Footer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

interface PoolData {
  name: string;
  symbol: string;
  asset: string;
  totalDeposits: bigint;
  totalBorrows: bigint;
  collateralFactor: number;
  reserveFactor: number;
}

interface UserData {
  deposited: bigint;
  borrowed: bigint;
  isCollateral: boolean;
  healthFactor: bigint;
}

interface Account {
  deposited: bigint;
  borrowed: bigint;
  isCollateral: boolean;
}

export default function PoolPage() {
  const router = useRouter();
  const { address: poolAddress } = router.query;
  const { address: userAddress } = useAccount();
  const publicClient = usePublicClient();
  const [activeTab, setActiveTab] = useState('deposit');
  const [poolData, setPoolData] = useState<PoolData | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Contract reads
  const { 
    data: name,
    isError: nameError,
    refetch: refetchName 
  } = useContractRead({
    address: poolAddress as `0x${string}`,
    abi: LENDING_POOL_ABI as unknown as Abi,
    functionName: 'name',
    query: {
      enabled: !!poolAddress,
    }
  }) as { data: string | undefined; isError: boolean; refetch: () => void };

  const { 
    data: symbol,
    isError: symbolError,
    refetch: refetchSymbol 
  } = useContractRead({
    address: poolAddress as `0x${string}`,
    abi: LENDING_POOL_ABI as unknown as Abi,
    functionName: 'symbol',
    query: {
      enabled: !!poolAddress,
    }
  }) as { data: string | undefined; isError: boolean; refetch: () => void };

  const { 
    data: asset,
    isError: assetError,
    refetch: refetchAsset 
  } = useContractRead({
    address: poolAddress as `0x${string}`,
    abi: LENDING_POOL_ABI as unknown as Abi,
    functionName: 'asset',
    query: {
      enabled: !!poolAddress,
    }
  }) as { data: string | undefined; isError: boolean; refetch: () => void };

  const { 
    data: totalDeposits,
    isError: totalDepositsError,
    refetch: refetchTotalDeposits 
  } = useContractRead({
    address: poolAddress as `0x${string}`,
    abi: LENDING_POOL_ABI as unknown as Abi,
    functionName: 'totalDeposits',
    query: {
      enabled: !!poolAddress,
    }
  }) as { data: bigint | undefined; isError: boolean; refetch: () => void };

  const { 
    data: totalBorrows,
    isError: totalBorrowsError,
    refetch: refetchTotalBorrows 
  } = useContractRead({
    address: poolAddress as `0x${string}`,
    abi: LENDING_POOL_ABI as unknown as Abi,
    functionName: 'totalBorrows',
    query: {
      enabled: !!poolAddress,
    }
  }) as { data: bigint | undefined; isError: boolean; refetch: () => void };

  const { 
    data: collateralFactor,
    isError: collateralFactorError,
    refetch: refetchCollateralFactor 
  } = useContractRead({
    address: poolAddress as `0x${string}`,
    abi: LENDING_POOL_ABI as unknown as Abi,
    functionName: 'collateralFactor',
    query: {
      enabled: !!poolAddress,
    }
  }) as { data: bigint | undefined; isError: boolean; refetch: () => void };

  const { 
    data: reserveFactor,
    isError: reserveFactorError,
    refetch: refetchReserveFactor 
  } = useContractRead({
    address: poolAddress as `0x${string}`,
    abi: LENDING_POOL_ABI as unknown as Abi,
    functionName: 'reserveFactor',
    query: {
      enabled: !!poolAddress,
    }
  }) as { data: bigint | undefined; isError: boolean; refetch: () => void };

  // Contract writes
  const { writeContract } = useWriteContract();

  // User data reads
  const { 
    data: account,
    isError: accountError,
    refetch: refetchAccount 
  } = useContractRead({
    address: poolAddress as `0x${string}`,
    abi: LENDING_POOL_ABI as unknown as Abi,
    functionName: 'accounts',
    args: [userAddress as `0x${string}`],
    query: {
      enabled: !!poolAddress && !!userAddress,
    }
  }) as { data: Account | undefined; isError: boolean; refetch: () => void };

  const { 
    data: healthFactor,
    isError: healthFactorError,
    refetch: refetchHealthFactor 
  } = useContractRead({
    address: poolAddress as `0x${string}`,
    abi: LENDING_POOL_ABI as unknown as Abi,
    functionName: 'calculateHealthFactor',
    args: [userAddress as `0x${string}`],
    query: {
      enabled: !!poolAddress && !!userAddress,
    }
  }) as { data: bigint | undefined; isError: boolean; refetch: () => void };

  useEffect(() => {
    if (!poolAddress || !name || !symbol || !asset || !totalDeposits || !totalBorrows || !collateralFactor || !reserveFactor) return;

    setPoolData({
      name,
      symbol,
      asset,
      totalDeposits,
      totalBorrows,
      collateralFactor: Number(collateralFactor) / 100,
      reserveFactor: Number(reserveFactor) / 100,
    });
  }, [poolAddress, name, symbol, asset, totalDeposits, totalBorrows, collateralFactor, reserveFactor]);

  useEffect(() => {
    if (!account || !healthFactor) return;

    setUserData({
      deposited: account.deposited,
      borrowed: account.borrowed,
      isCollateral: account.isCollateral,
      healthFactor,
    });
  }, [account, healthFactor]);

  const handleDeposit = async () => {
    if (!amount || !poolAddress) return;

    try {
      setIsLoading(true);
      const amountWei = parseEther(amount);
      await writeContract({
        address: poolAddress as `0x${string}`,
        abi: LENDING_POOL_ABI as unknown as Abi,
        functionName: 'deposit',
        args: [amountWei],
      });
      toast.success('Deposit successful!');
      refetchName();
      refetchSymbol();
      refetchAsset();
      refetchTotalDeposits();
      refetchTotalBorrows();
      refetchCollateralFactor();
      refetchReserveFactor();
      refetchAccount();
      refetchHealthFactor();
    } catch (error) {
      console.error('Error depositing:', error);
      toast.error('Failed to deposit');
    } finally {
      setIsLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!amount || !poolAddress) return;

    try {
      setIsLoading(true);
      const amountWei = parseEther(amount);
      await writeContract({
        address: poolAddress as `0x${string}`,
        abi: LENDING_POOL_ABI as unknown as Abi,
        functionName: 'withdraw',
        args: [amountWei],
      });
      toast.success('Withdrawal successful!');
      refetchName();
      refetchSymbol();
      refetchAsset();
      refetchTotalDeposits();
      refetchTotalBorrows();
      refetchCollateralFactor();
      refetchReserveFactor();
      refetchAccount();
      refetchHealthFactor();
    } catch (error) {
      console.error('Error withdrawing:', error);
      toast.error('Failed to withdraw');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBorrow = async () => {
    if (!amount || !poolAddress) return;

    try {
      setIsLoading(true);
      const amountWei = parseEther(amount);
      await writeContract({
        address: poolAddress as `0x${string}`,
        abi: LENDING_POOL_ABI as unknown as Abi,
        functionName: 'borrow',
        args: [amountWei],
      });
      toast.success('Borrow successful!');
      refetchName();
      refetchSymbol();
      refetchAsset();
      refetchTotalDeposits();
      refetchTotalBorrows();
      refetchCollateralFactor();
      refetchReserveFactor();
      refetchAccount();
      refetchHealthFactor();
    } catch (error) {
      console.error('Error borrowing:', error);
      toast.error('Failed to borrow');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRepay = async () => {
    if (!amount || !poolAddress) return;

    try {
      setIsLoading(true);
      const amountWei = parseEther(amount);
      await writeContract({
        address: poolAddress as `0x${string}`,
        abi: LENDING_POOL_ABI as unknown as Abi,
        functionName: 'repay',
        args: [amountWei],
      });
      toast.success('Repayment successful!');
      refetchName();
      refetchSymbol();
      refetchAsset();
      refetchTotalDeposits();
      refetchTotalBorrows();
      refetchCollateralFactor();
      refetchReserveFactor();
      refetchAccount();
      refetchHealthFactor();
    } catch (error) {
      console.error('Error repaying:', error);
      toast.error('Failed to repay');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCollateral = async () => {
    if (!userData || !poolAddress) return;

    try {
      setIsLoading(true);
      await writeContract({
        address: poolAddress as `0x${string}`,
        abi: LENDING_POOL_ABI as unknown as Abi,
        functionName: 'setUseAsCollateral',
        args: [!userData.isCollateral],
      });
      toast.success('Collateral setting updated!');
      refetchName();
      refetchSymbol();
      refetchAsset();
      refetchTotalDeposits();
      refetchTotalBorrows();
      refetchCollateralFactor();
      refetchReserveFactor();
      refetchAccount();
      refetchHealthFactor();
    } catch (error) {
      console.error('Error toggling collateral:', error);
      toast.error('Failed to update collateral setting');
    } finally {
      setIsLoading(false);
    }
  };

  if (!poolData) {
    return (
      <div className="min-h-screen bg-gray-900">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-gray-400">Loading pool data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Head>
        <title>{poolData.name} - DeFi Loan Factory</title>
        <meta name="description" content={`Manage your position in ${poolData.name}`} />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-4">{poolData.name}</h1>
            <p className="text-xl text-gray-400">{poolData.symbol}</p>
          </div>

          {/* Pool Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-white mb-2">Total Deposits</h3>
                <p className="text-2xl font-bold text-blue-400">
                  {formatEther(poolData.totalDeposits)} {poolData.symbol}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-white mb-2">Total Borrows</h3>
                <p className="text-2xl font-bold text-purple-400">
                  {formatEther(poolData.totalBorrows)} {poolData.symbol}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-white mb-2">Collateral Factor</h3>
                <p className="text-2xl font-bold text-green-400">
                  {poolData.collateralFactor}%
                </p>
              </CardContent>
            </Card>
          </div>

          {/* User Position */}
          {userData && (
            <Card className="bg-gray-800 border-gray-700 mb-8">
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Your Position</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-400">Deposited</p>
                    <p className="text-lg font-medium text-white">
                      {formatEther(userData.deposited)} {poolData.symbol}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Borrowed</p>
                    <p className="text-lg font-medium text-white">
                      {formatEther(userData.borrowed)} {poolData.symbol}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Health Factor</p>
                    <p className="text-lg font-medium text-white">
                      {formatEther(userData.healthFactor)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Collateral</p>
                    <Button
                      variant={userData.isCollateral ? "default" : "secondary"}
                      onClick={toggleCollateral}
                      disabled={isLoading}
                    >
                      {userData.isCollateral ? "Using as Collateral" : "Not Using as Collateral"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-gray-800 border-gray-700">
              <TabsTrigger value="deposit" className="data-[state=active]:bg-blue-600">
                Deposit
              </TabsTrigger>
              <TabsTrigger value="withdraw" className="data-[state=active]:bg-blue-600">
                Withdraw
              </TabsTrigger>
              <TabsTrigger value="borrow" className="data-[state=active]:bg-blue-600">
                Borrow
              </TabsTrigger>
              <TabsTrigger value="repay" className="data-[state=active]:bg-blue-600">
                Repay
              </TabsTrigger>
            </TabsList>

            <TabsContent value="deposit" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="depositAmount" className="text-gray-300">Amount</Label>
                <Input
                  id="depositAmount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.0"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
              <Button
                onClick={handleDeposit}
                disabled={isLoading || !amount}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isLoading ? 'Depositing...' : 'Deposit'}
              </Button>
            </TabsContent>

            <TabsContent value="withdraw" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="withdrawAmount" className="text-gray-300">Amount</Label>
                <Input
                  id="withdrawAmount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.0"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
              <Button
                onClick={handleWithdraw}
                disabled={isLoading || !amount}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isLoading ? 'Withdrawing...' : 'Withdraw'}
              </Button>
            </TabsContent>

            <TabsContent value="borrow" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="borrowAmount" className="text-gray-300">Amount</Label>
                <Input
                  id="borrowAmount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.0"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
              <Button
                onClick={handleBorrow}
                disabled={isLoading || !amount}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isLoading ? 'Borrowing...' : 'Borrow'}
              </Button>
            </TabsContent>

            <TabsContent value="repay" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="repayAmount" className="text-gray-300">Amount</Label>
                <Input
                  id="repayAmount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.0"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
              <Button
                onClick={handleRepay}
                disabled={isLoading || !amount}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isLoading ? 'Repaying...' : 'Repay'}
              </Button>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
} 