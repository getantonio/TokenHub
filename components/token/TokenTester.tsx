'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TokenConfig } from './types';
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { 
  BrowserProvider, 
  parseUnits, 
  formatEther, 
  parseEther,
  Contract,
  ZeroAddress 
} from 'ethers';
import TokenFactoryABI from '@/contracts/abis/TokenFactory.json';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  message?: string;
  details?: string[];
}

interface TokenTesterProps {
  config: TokenConfig;
}

export function TokenTester({ config }: TokenTesterProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState(0);
  const [results, setResults] = useState<TestResult[]>([]);

  const tests = [
    // Basic Validation
    {
      name: "Basic Token Parameters",
      run: async () => {
        const details = [];
        if (!config.name || config.name.length < 3) {
          throw new Error("Token name should be at least 3 characters");
        }
        if (!config.symbol || config.symbol.length > 6) {
          throw new Error("Symbol should be 1-6 characters");
        }
        if (!config.totalSupply || parseFloat(config.totalSupply) <= 0) {
          throw new Error("Total supply must be greater than 0");
        }
        
        details.push(`Name: ${config.name}`);
        details.push(`Symbol: ${config.symbol}`);
        details.push(`Total Supply: ${config.totalSupply}`);
        
        return { message: "Basic parameters validated", details };
      }
    },

    // Gas Estimation
    {
      name: "Gas Cost Estimation",
      run: async () => {
        if (!window.ethereum) {
          throw new Error("Web3 provider required for gas estimation");
        }

        const factoryAddress = process.env.NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS;
        if (!factoryAddress) {
          throw new Error("Token factory address not configured");
        }

        const provider = new BrowserProvider(window.ethereum as any);
        const details = [];

        try {
          // Get contract interface
          const factoryContract = new Contract(
            factoryAddress,
            TokenFactoryABI,
            provider
          );

          // Validate parameters before estimation
          if (!config.name || !config.symbol || !config.totalSupply) {
            throw new Error("Missing required token parameters");
          }

          // Format parameters carefully
          const params = {
            name: config.name,
            symbol: config.symbol,
            maxSupply: parseUnits(config.totalSupply, config.decimals),
            initialSupply: parseUnits(config.totalSupply, config.decimals),
            tokenPrice: parseUnits(config.initialPrice || '0', 18),
            maxTransferAmount: config.maxTransferAmount 
              ? parseUnits(config.maxTransferAmount, config.decimals) 
              : 0n,
            cooldownTime: BigInt(config.cooldownTime || 0),
            transfersEnabled: config.transfersEnabled,
            antiBot: config.antiBot,
            teamVestingDuration: BigInt(config.vestingSchedule.team.duration),
            teamVestingCliff: BigInt(config.vestingSchedule.team.cliff),
            teamAllocation: BigInt(config.teamAllocation),
            teamWallet: config.teamWallet || ZeroAddress,
          };

          // Get creation data
          const createData = factoryContract.interface.encodeFunctionData(
            'createToken',
            [params]
          );

          // Estimate gas with proper value
          const estimatedGas = await provider.estimateGas({
            to: factoryAddress,
            data: createData,
            value: parseEther('0.1')
          });

          const feeData = await provider.getFeeData();
          const gasPrice = feeData.gasPrice || 0n;
          const totalCost = estimatedGas * gasPrice;

          // Add detailed breakdown
          details.push('Gas Estimation Breakdown:');
          details.push(`• Base Gas Units: ${estimatedGas.toString()}`);
          details.push(`• Current Gas Price: ${formatEther(gasPrice)} ETH/gas`);
          details.push(`• Creation Fee: 0.1 ETH`);
          details.push(`• Estimated Gas Cost: ${formatEther(totalCost)} ETH`);
          details.push(`• Total Estimated Cost: ${formatEther(totalCost + parseEther('0.1'))} ETH`);
          details.push('\nNote: Actual costs may vary based on:');
          details.push('• Network congestion');
          details.push('• Gas price fluctuations');
          details.push('• Contract complexity');

          return { 
            message: "Gas estimation completed successfully", 
            details 
          };
        } catch (error) {
          console.error('Gas estimation error:', error);
          
          // Provide more helpful error messages
          let errorMessage = 'Gas estimation failed: ';
          if (error instanceof Error) {
            if (error.message.includes('CALL_EXCEPTION')) {
              errorMessage += 'Contract interaction failed. Please verify:';
              details.push('• All token parameters are valid');
              details.push('• You have enough ETH for gas');
              details.push('• The contract address is correct');
            } else {
              errorMessage += error.message;
            }
          } else {
            errorMessage += 'Unknown error occurred';
          }

          throw new Error(errorMessage);
        }
      }
    },

    // Vesting Schedule Simulation
    {
      name: "Vesting Schedule Simulation",
      run: async () => {
        const details = [];
        const { team } = config.vestingSchedule;
        const totalMonths = team.duration;
        const cliffMonths = team.cliff;
        const teamTokens = (parseFloat(config.totalSupply) * config.teamAllocation) / 100;
        
        // Calculate monthly vesting
        const monthlyVesting = teamTokens / totalMonths;
        const vestingSchedule = [];
        
        for (let month = 0; month <= totalMonths; month++) {
          const available = month < cliffMonths 
            ? 0 
            : monthlyVesting * (month - cliffMonths + 1);
          
          vestingSchedule.push({
            month,
            available: Math.min(available, teamTokens)
          });
        }

        details.push(`Cliff Period: ${cliffMonths} months`);
        details.push(`Monthly Vesting: ${monthlyVesting.toFixed(2)} tokens`);
        details.push(`Total Team Tokens: ${teamTokens.toFixed(2)}`);

        return { 
          message: "Vesting schedule simulated successfully", 
          details 
        };
      }
    },

    // Security Checks
    {
      name: "Security Analysis",
      run: async () => {
        const details = [];
        const risks: { 
          severity: 'HIGH' | 'MEDIUM' | 'LOW';
          message: string;
          impact: string;
          mitigation: string;
        }[] = [];

        // Enhanced security checks with detailed explanations
        if (!config.antiBot) {
          risks.push({
            severity: 'HIGH',
            message: "Anti-bot protection disabled",
            impact: "Vulnerable to front-running and sandwich attacks during launch",
            mitigation: "Enable anti-bot protection to prevent automated trading exploitation"
          });
        }

        if (!config.maxTransferAmount) {
          risks.push({
            severity: 'MEDIUM',
            message: "No transfer limit set",
            impact: "Large holders can significantly impact price through large transfers",
            mitigation: "Set a reasonable max transfer limit (e.g., 1% of total supply)"
          });
        }

        // Format details with comprehensive information
        risks.forEach(risk => {
          details.push(`${
            risk.severity === 'HIGH' ? '🔴' :
            risk.severity === 'MEDIUM' ? '🟡' : '🟢'
          } ${risk.message}`);
          details.push(`  Impact: ${risk.impact}`);
          details.push(`  Recommendation: ${risk.mitigation}`);
        });

        if (risks.length > 0) {
          const highRisks = risks.filter(r => r.severity === 'HIGH').length;
          const mediumRisks = risks.filter(r => r.severity === 'MEDIUM').length;
          
          throw new Error(
            `Security risks found: ${risks.length} (${highRisks} High, ${mediumRisks} Medium)\n` +
            'Review the details below and consider implementing the suggested mitigations.'
          );
        }

        return { 
          message: "All security checks passed", 
          details: ["✅ No security risks detected"]
        };
      }
    },

    // Best Practices
    {
      name: "Best Practices Validation",
      run: async () => {
        const details = [];
        const recommendations = [];

        // Token name and symbol
        if (!/^[A-Z0-9\s]+$/i.test(config.name)) {
          recommendations.push("Token name should only contain letters, numbers, and spaces");
        }

        if (!/^[A-Z0-9]+$/i.test(config.symbol)) {
          recommendations.push("Symbol should only contain letters and numbers");
        }

        // Supply checks
        const supply = parseFloat(config.totalSupply);
        if (supply > 1_000_000_000_000) {
          recommendations.push("Consider reducing total supply");
        }

        // Decimals
        if (config.decimals > 18) {
          recommendations.push("Decimals should not exceed 18");
        }

        // Vesting
        if (config.vestingSchedule.team.cliff < 3) {
          recommendations.push("Consider longer cliff period for team tokens");
        }

        details.push(...recommendations);

        return { 
          message: recommendations.length === 0 ? "All best practices met" : "Recommendations found",
          details 
        };
      }
    },

    // Token Distribution Analysis
    {
      name: "Distribution Analysis",
      run: async () => {
        const details = [];
        const warnings = [];
        
        // Check distribution percentages
        const total = config.presaleAllocation + 
                     config.liquidityAllocation + 
                     config.teamAllocation + 
                     config.marketingAllocation;

        if (total !== 100) {
          throw new Error("Token distribution must equal 100%");
        }

        details.push(`Current Distribution:`);
        details.push(`• Presale: ${config.presaleAllocation}%`);
        details.push(`• Liquidity: ${config.liquidityAllocation}%`);
        details.push(`• Team: ${config.teamAllocation}%`);
        details.push(`• Marketing: ${config.marketingAllocation}%`);

        // Detailed analysis with recommendations
        if (config.liquidityAllocation < 30) {
          warnings.push({
            type: 'LIQUIDITY',
            message: "Low liquidity allocation detected",
            details: [
              "Recommended: Minimum 30% for initial liquidity",
              "Impact: Lower liquidity can lead to higher price volatility",
              "Suggestion: Consider increasing liquidity allocation to improve trading stability"
            ]
          });
        }

        if (config.presaleAllocation < 40) {
          warnings.push({
            type: 'PRESALE',
            message: "Low public allocation detected",
            details: [
              "Recommended: Minimum 40% for public distribution",
              "Impact: Limited public access can affect token adoption",
              "Suggestion: Consider increasing presale allocation for better token distribution"
            ]
          });
        }

        // Add warnings to details with proper formatting
        if (warnings.length > 0) {
          details.push('\nWarnings:');
          warnings.forEach(warning => {
            details.push(`⚠️ ${warning.message}`);
            warning.details.forEach(detail => {
              details.push(`  • ${detail}`);
            });
          });
        }

        return { 
          message: warnings.length > 0 
            ? `Distribution analysis completed with ${warnings.length} warnings`
            : "Distribution analysis completed successfully",
          details 
        };
      }
    }
  ];

  const runTests = async () => {
    setIsRunning(true);
    setResults([]);
    setCurrentTest(0);

    for (let i = 0; i < tests.length; i++) {
      const test = tests[i];
      setCurrentTest(i);
      
      try {
        const result = await test.run();
        setResults(prev => [...prev, {
          name: test.name,
          status: 'success',
          message: result.message,
          details: result.details
        }]);
      } catch (error) {
        setResults(prev => [...prev, {
          name: test.name,
          status: 'error',
          message: error instanceof Error ? error.message : 'Test failed',
          details: error instanceof Error ? [error.message] : undefined
        }]);
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    setIsRunning(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Token Configuration Tester</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {!isRunning && results.length === 0 && (
            <button
              onClick={runTests}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium text-sm"
            >
              Run Tests
            </button>
          )}

          {isRunning && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">{tests[currentTest].name}</span>
                <Spinner size="sm" />
              </div>
              <Progress value={(currentTest + 1) / tests.length * 100} />
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-2">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${
                    result.status === 'success' 
                      ? 'border-green-600 bg-green-600/10' 
                      : 'border-red-600 bg-red-600/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{result.name}</span>
                    <span className={result.status === 'success' ? 'text-green-400' : 'text-red-400'}>
                      {result.status === 'success' ? '✓' : '✗'}
                    </span>
                  </div>
                  {result.message && (
                    <p className="text-sm mt-1 text-gray-400">{result.message}</p>
                  )}
                  {result.details && result.details.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {result.details.map((detail, i) => (
                        <p key={i} className="text-xs text-gray-500">• {detail}</p>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {!isRunning && (
                <button
                  onClick={runTests}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium text-sm"
                >
                  Run Tests Again
                </button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 