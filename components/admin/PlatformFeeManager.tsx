'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAccount, useContractRead } from 'wagmi';
import { formatEther } from 'ethers';
import { FeeMonitorABI } from '@/contracts/abis/FeeMonitor';

interface FeeTransaction {
  timestamp: number;
  amount: bigint;
  address: string;
}

interface FeeAnalytics {
  totalFees: bigint;
  totalDeployments: number;
  averageFee: bigint;
  recentTransactions: FeeTransaction[];
}

export function PlatformFeeManager() {
  const [analytics, setAnalytics] = useState<FeeAnalytics | null>(null);
  const { address } = useAccount();

  // Updated for wagmi v2
  const { data: feeData } = useContractRead({
    address: process.env.NEXT_PUBLIC_FEE_MONITOR_ADDRESS as `0x${string}`,
    abi: FeeMonitorABI,
    functionName: 'getAnalytics',
  });

  // Handle data transformation in useEffect
  useEffect(() => {
    if (feeData) {
      const [totalFees, totalDeployments, recentTx] = feeData as [bigint, bigint, FeeTransaction[]];
      
      setAnalytics({
        totalFees,
        totalDeployments: Number(totalDeployments),
        averageFee: totalFees / (totalDeployments || 1n),
        recentTransactions: recentTx
      });
    }
  }, [feeData]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Platform Fee Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          {analytics && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium">Total Fees Collected</h3>
                <p className="text-2xl font-bold">{formatEther(analytics.totalFees)} ETH</p>
              </div>
              <div>
                <h3 className="text-sm font-medium">Total Deployments</h3>
                <p className="text-2xl font-bold">{analytics.totalDeployments}</p>
              </div>
              {/* Add more analytics displays */}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {analytics?.recentTransactions.map((tx, i) => (
              <div key={i} className="flex justify-between p-2 bg-gray-800 rounded">
                <span>{new Date(tx.timestamp * 1000).toLocaleDateString()}</span>
                <span>{formatEther(tx.amount)} ETH</span>
                <span className="text-xs truncate">{tx.address}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 