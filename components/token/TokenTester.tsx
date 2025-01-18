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
          details: string[];
          examples?: string[];
        }[] = [];

        // Anti-bot protection check
        if (!config.antiBot) {
          risks.push({
            severity: 'HIGH',
            message: "Anti-bot Protection Disabled",
            impact: "High vulnerability to front-running and sandwich attacks during launch",
            mitigation: "Enable anti-bot protection mechanisms",
            details: [
              "Front-running bots can manipulate token price at launch",
              "MEV bots can extract value through sandwich attacks",
              "Initial traders may face unfair pricing due to bot manipulation"
            ],
            examples: [
              "Example attack: Bot monitors mempool for buy transactions",
              "Bot front-runs with higher gas, buys before user",
              "Bot immediately sells after user's transaction, profiting from price impact"
            ]
          });
        }

        // Transfer limit check
        if (!config.maxTransferAmount) {
          risks.push({
            severity: 'MEDIUM',
            message: "No Transfer Limit Set",
            impact: "Potential for price manipulation through large transfers",
            mitigation: "Implement maximum transfer limits",
            details: [
              "Whales can dump large amounts instantly",
              "No protection against flash crashes",
              "Market manipulation through coordinated large transfers"
            ],
            examples: [
              "Recommended: Set max transfer to 1-2% of total supply",
              "Consider dynamic limits based on liquidity",
              "Example: 100,000 tokens or 1% per transaction, whichever is lower"
            ]
          });
        }

        // Cooldown period check
        if (config.cooldownTime < 60) {
          risks.push({
            severity: 'MEDIUM',
            message: "Insufficient Cooldown Period",
            impact: "Enables rapid trading manipulation",
            mitigation: "Set appropriate cooldown periods",
            details: [
              "Allows rapid buy/sell manipulation",
              "No protection against trading bots",
              "Can lead to artificial price volatility"
            ],
            examples: [
              "Recommended: 60-300 seconds between trades",
              "Consider variable cooldowns based on transfer size",
              "Example: 60s for small trades, 300s for large trades"
            ]
          });
        }

        // Team token concentration check
        if (config.teamAllocation + config.marketingAllocation > 30) {
          risks.push({
            severity: 'HIGH',
            message: "High Token Concentration Risk",
            impact: "Centralized control over large token supply",
            mitigation: "Reduce team/marketing allocations and implement longer vesting",
            details: [
              "Team controls significant voting power",
              "Risk of large sell pressure after vesting",
              "Reduced community confidence"
            ],
            examples: [
              "Recommended: Max 20-25% combined team/marketing allocation",
              "Implement 2-3 year vesting with 6-month cliff",
              "Consider linear vesting instead of cliff-based"
            ]
          });
        }

        // Format details with comprehensive information
        risks.forEach(risk => {
          details.push(`\n${
            risk.severity === 'HIGH' ? '🔴' :
            risk.severity === 'MEDIUM' ? '🟡' : '🟢'
          } ${risk.message.toUpperCase()}`);
          
          details.push(`  Severity: ${risk.severity}`);
          details.push(`  Impact: ${risk.impact}`);
          
          details.push('\n  Details:');
          risk.details.forEach(detail => {
            details.push(`   • ${detail}`);
          });
          
          details.push('\n  Mitigation Strategy:');
          details.push(`   • ${risk.mitigation}`);
          
          if (risk.examples) {
            details.push('\n  Implementation Examples:');
            risk.examples.forEach(example => {
              details.push(`   • ${example}`);
            });
          }
          
          details.push('\n  Additional Resources:');
          details.push('   • OpenZeppelin Security Best Practices');
          details.push('   • DeFi Security Alliance Guidelines');
          details.push('   • CertiK Security Assessment Examples');
        });

        if (risks.length > 0) {
          const highRisks = risks.filter(r => r.severity === 'HIGH').length;
          const mediumRisks = risks.filter(r => r.severity === 'MEDIUM').length;
          
          throw new Error(
            `Security Analysis: ${risks.length} risks found (${highRisks} High, ${mediumRisks} Medium)\n` +
            'Review the detailed analysis below and implement suggested mitigations before deployment.'
          );
        }

        return { 
          message: "All security checks passed", 
          details: [
            "✅ Anti-bot protection enabled",
            "✅ Transfer limits configured",
            "✅ Adequate cooldown periods",
            "✅ Balanced token distribution",
            "\nRecommended Next Steps:",
            "• Consider professional security audit",
            "• Test on testnet before mainnet deployment",
            "• Monitor for unusual trading patterns after launch"
          ]
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
                     config.marketingAllocation +
                     config.developerAllocation;

        if (total !== 100) {
          throw new Error("Token distribution must equal 100%");
        }

        details.push(`Current Distribution:`);
        details.push(`• Presale: ${config.presaleAllocation}%`);
        details.push(`• Liquidity: ${config.liquidityAllocation}%`);
        details.push(`• Team: ${config.teamAllocation}%`);
        details.push(`• Marketing: ${config.marketingAllocation}%`);
        details.push(`• Developers: ${config.developerAllocation}%`);

        // Add developer-specific checks
        if (config.developerAllocation > 10) {
          warnings.push({
            type: 'DEVELOPER',
            message: "High developer allocation detected",
            details: [
              "Recommended: Maximum 5-10% for developer allocation",
              "Impact: High developer allocation may concern investors",
              "Suggestion: Consider reducing developer allocation or extending vesting period"
            ]
          });
        }

        // Check developer vesting
        if (!config.developerVesting || config.developerVesting.duration < 12) {
          warnings.push({
            type: 'VESTING',
            message: "Short developer vesting period",
            details: [
              "Recommended: Minimum 12 months vesting for developers",
              "Impact: Short vesting may indicate lack of long-term commitment",
              "Suggestion: Implement longer vesting schedule with appropriate cliff"
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