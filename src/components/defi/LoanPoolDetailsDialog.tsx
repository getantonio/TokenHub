import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { formatUnits } from 'viem';
import { formatUSD } from '@/lib/utils';
import { useAccount } from 'wagmi';
import { ChevronRight, PiggyBank, TrendingUp, Users, Wallet } from 'lucide-react';

// Define the Pool interface
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

interface LoanPoolDetailsDialogProps {
  pool: Pool;
  isOpen: boolean;
  onClose: () => void;
}

export function LoanPoolDetailsDialog({ pool, isOpen, onClose }: LoanPoolDetailsDialogProps) {
  const { address: userAddress } = useAccount();
  const [activeTab, setActiveTab] = useState('overview');

  // Format numbers for display
  const formatAmount = (amount: bigint, decimals: number = 18) => {
    return Number(formatUnits(amount, decimals)).toFixed(4);
  };

  // Format percentage
  const formatPercent = (bps: bigint) => {
    return (Number(bps) / 100).toFixed(2) + '%';
  };

  // Calculate estimated APY (this is a simplified model)
  const depositAPY = pool.utilizationRate * (0.8 - Number(pool.reserveFactorBps) / 10000);
  const borrowAPY = pool.utilizationRate > 80 
    ? pool.utilizationRate * 0.2 + 5 // Higher rate when high utilization
    : pool.utilizationRate * 0.15;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl bg-gray-800 text-white border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-xl text-white">{pool.name}</DialogTitle>
          <DialogDescription className="text-gray-400">
            Pool Address: <span className="font-mono">{pool.address}</span>
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
          <TabsList className="bg-gray-700">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="deposit">Deposit</TabsTrigger>
            <TabsTrigger value="borrow">Borrow</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <Card className="bg-gray-700 border-gray-600">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-md flex items-center gap-2">
                      <PiggyBank className="h-4 w-4 text-blue-400" />
                      Pool Statistics
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Asset</span>
                      <span className="font-medium">
                        {pool.assetSymbol || 'Unknown'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Supply</span>
                      <span className="font-medium">
                        {formatAmount(pool.totalAssets, pool.assetDecimals)} {pool.assetSymbol}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Borrowed</span>
                      <span className="font-medium">
                        {formatAmount(pool.totalBorrowed, pool.assetDecimals)} {pool.assetSymbol}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Utilization Rate</span>
                      <Badge className={
                        pool.utilizationRate > 80
                          ? 'bg-red-600'
                          : pool.utilizationRate > 50
                          ? 'bg-amber-600'
                          : 'bg-green-600'
                      }>
                        {pool.utilizationRate.toFixed(2)}%
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Reserve Balance</span>
                      <span className="font-medium">
                        {formatAmount(pool.reserveBalance, pool.assetDecimals)} {pool.assetSymbol}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gray-700 border-gray-600">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-md flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-400" />
                      Interest Rates
                    </CardTitle>
                    <CardDescription className="text-gray-400 text-xs">
                      Current rates based on utilization and protocol settings
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Deposit APY</span>
                      <span className="font-medium text-green-400">
                        {depositAPY.toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Borrow APY</span>
                      <span className="font-medium text-amber-400">
                        {borrowAPY.toFixed(2)}%
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                <Card className="bg-gray-700 border-gray-600">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-md flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-purple-400" />
                      Pool Configuration
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Collateral Factor</span>
                      <span className="font-medium">
                        {formatPercent(pool.collateralFactorBps)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Reserve Factor</span>
                      <span className="font-medium">
                        {formatPercent(pool.reserveFactorBps)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Protocol Fee</span>
                      <span className="font-medium">10%</span>
                    </div>
                    <Separator className="my-2 bg-gray-600" />
                    <div className="flex justify-between">
                      <span className="text-gray-400">Asset Address</span>
                      <span className="font-mono text-xs">
                        {`${pool.assetAddress.slice(0, 6)}...${pool.assetAddress.slice(-4)}`}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {userAddress && (
                  <Card className="bg-gray-700 border-gray-600">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-md flex items-center gap-2">
                        <Users className="h-4 w-4 text-blue-400" />
                        Your Position
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="text-center py-6 text-gray-400">
                        <p>Connect wallet to view your position</p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <Button variant="secondary" className="w-full" disabled>
                    <Wallet className="mr-2 h-4 w-4" /> Deposit
                  </Button>
                  <Button variant="secondary" className="w-full" disabled>
                    <TrendingUp className="mr-2 h-4 w-4" /> Borrow
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="deposit" className="mt-4">
            <Card className="bg-gray-700 border-gray-600">
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <p className="text-gray-400 mb-4">
                    Deposit functionality will be available soon
                  </p>
                  <Button disabled>Deposit {pool.assetSymbol}</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="borrow" className="mt-4">
            <Card className="bg-gray-700 border-gray-600">
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <p className="text-gray-400 mb-4">
                    Borrow functionality will be available soon
                  </p>
                  <Button disabled>Borrow {pool.assetSymbol}</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="history" className="mt-4">
            <Card className="bg-gray-700 border-gray-600">
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <p className="text-gray-400">
                    No transaction history available
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700">
            View on Explorer <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 