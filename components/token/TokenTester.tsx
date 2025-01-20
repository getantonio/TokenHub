'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TokenConfig, SecurityRisk } from './types';
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
  const [error, setError] = useState<string | null>(null);

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
        try {
          const details: string[] = [];
          
          if (!window.ethereum) {
            throw new Error("Web3 provider required for gas estimation");
          }

          // Validate parameters first
          if (!config.name || !config.symbol || !config.totalSupply) {
            throw new Error("Missing required token parameters: name, symbol, and total supply are required");
          }

          const provider = new BrowserProvider(window.ethereum as any, {
            name: 'Local Test Network',
            chainId: 31337
          });

          // Get current chain ID
          const network = await provider.getNetwork();
          const chainId = Number(network.chainId);

          // Check if we're on the right network
          if (chainId !== 31337 && chainId !== 11155111) { // Local or Sepolia
            throw new Error(`Please switch to a test network. Current network ID: ${chainId}`);
          }

          const factoryAddress = process.env.NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS;
          if (!factoryAddress) {
            throw new Error("Token factory address not configured in environment");
          }

          // Get contract interface
          const factoryContract = new Contract(
            factoryAddress,
            TokenFactoryABI,
            provider
          );

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

          // Get gas estimate with proper value parameter
          const gasEstimate = await provider.estimateGas({
            to: factoryAddress,
            data: factoryContract.interface.encodeFunctionData('createToken', [params]),
            value: parseUnits('0.1', 18) // Include creation fee
          });

          const feeData = await provider.getFeeData();
          const gasPrice = feeData.gasPrice || parseUnits('50', 9); // Default to 50 gwei if not available
          const totalCost = gasEstimate * gasPrice;

          details.push('Gas Estimation Breakdown:');
          details.push(`• Base Gas Units: ${gasEstimate.toString()}`);
          details.push(`• Current Gas Price: ${formatEther(gasPrice)} ETH/gas`);
          details.push(`• Creation Fee: 0.1 ETH`);
          details.push(`• Estimated Gas Cost: ${formatEther(totalCost)} ETH`);
          details.push(`• Total Estimated Cost: ${formatEther(totalCost + parseUnits('0.1', 18))} ETH`);
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
          throw error;
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
        const risks: SecurityRisk[] = [];

        // Check each security feature and add clear explanations
        if (!config.maxTransferAmount) {
          risks.push({
            severity: 'MEDIUM',
            message: "Maximum Transfer Limit Not Set",
            impact: "Your token is vulnerable to whale manipulation",
            mitigation: "Add a max transfer limit of 1-2% of total supply",
            details: [
              "Current Setting: No limit",
              "Recommended: Set to 1-2% of total supply",
              "How to fix: Add maxTransferAmount in token configuration"
            ]
          });
        }

        if (!config.antiBot) {
          risks.push({
            severity: 'HIGH',
            message: "Anti-Bot Protection Disabled",
            impact: "Your token launch could be exploited by bots",
            mitigation: "Enable anti-bot protection",
            details: [
              "Current Setting: Disabled",
              "Recommended: Enable anti-bot protection",
              "How to fix: Set antiBot to true in configuration"
            ]
          });
        }

        if (config.cooldownTime < 60) {
          risks.push({
            severity: 'MEDIUM',
            message: "Insufficient Cooldown Period",
            impact: "Allows rapid trading manipulation",
            mitigation: "Set cooldown to minimum 60 seconds",
            details: [
              `Current Setting: ${config.cooldownTime} seconds`,
              "Recommended: Minimum 60 seconds",
              "How to fix: Increase cooldownTime in configuration"
            ]
          });
        }

        // Format the output with clear sections
        if (risks.length > 0) {
          details.push("🚨 SECURITY ISSUES FOUND:\n");
          risks.forEach((risk, index) => {
            details.push(`ISSUE ${index + 1}: ${risk.message}`);
            details.push(`Severity: ${risk.severity}`);
            details.push(`Impact: ${risk.impact}`);
            details.push("\nHow to Fix:");
            risk.details.forEach(detail => details.push(`• ${detail}`));
            details.push(""); // Add spacing between issues
          });
          
          details.push("\nREQUIRED ACTIONS:");
          details.push("1. Fix the issues above before deployment");
          details.push("2. Run the security check again to verify fixes");
        } else {
          details.push("✅ All security checks passed");
          details.push("\nRecommended Next Steps:");
          details.push("1. Consider a professional audit");
          details.push("2. Test thoroughly on testnet");
          details.push("3. Monitor post-deployment");
        }

        return {
          message: risks.length > 0 
            ? `Security Issues Found: ${risks.length} (${risks.filter(r => r.severity === 'HIGH').length} High, ${risks.filter(r => r.severity === 'MEDIUM').length} Medium)`
            : "Security Check Passed ✅",
          details,
          hasIssues: risks.length > 0
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
        const total = 
          config.presaleAllocation + 
          config.liquidityAllocation + 
          config.teamAllocation + // Team allocation (platform fee will be taken from this)
          config.marketingAllocation +
          config.developerAllocation;

        console.log('Distribution Analysis:', {
          presale: config.presaleAllocation,
          liquidity: config.liquidityAllocation,
          team: config.teamAllocation,
          marketing: config.marketingAllocation,
          developer: config.developerAllocation,
          total: total,
          platformFee: '2% (taken from team allocation)'
        });

        details.push(`Current Distribution:`);
        details.push(`• Presale: ${config.presaleAllocation}%`);
        details.push(`• Liquidity: ${config.liquidityAllocation}%`);
        details.push(`• Team: ${config.teamAllocation}% (includes 2% platform fee)`);
        details.push(`• Marketing: ${config.marketingAllocation}%`);
        details.push(`• Developers: ${config.developerAllocation}%`);
        details.push(`\nNote: 2% platform fee is taken from team allocation`);

        if (total !== 100) {
          throw new Error(`Token distribution must equal 100% (currently ${total}%)`);
        }

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

  const simulateDeployment = async () => {
    try {
      if (!window.ethereum) throw new Error('Web3 provider required');
      
      const provider = new BrowserProvider(window.ethereum as any, {
        name: 'Local Test Network',
        chainId: 31337
      });
      
      // Rest of simulation logic
      const gasEstimate = await provider.estimateGas({
        to: null, // Contract deployment
        data: '0x', // Contract bytecode would go here
      });

      return gasEstimate;
    } catch (error) {
      console.error('Deployment simulation error:', error);
      throw error;
    }
  };

  useEffect(() => {
    const checkNetwork = async () => {
      if (!window.ethereum) return;
      
      try {
        const provider = new BrowserProvider(window.ethereum);
        const network = await provider.getNetwork();
        const chainId = Number(network.chainId);
        
        if (chainId !== 31337 && chainId !== 11155111) {
          setError('Please switch to a test network (Local or Sepolia)');
        } else {
          setError(null);
        }
      } catch (err) {
        console.error('Network check error:', err);
      }
    };

    checkNetwork();
    window.ethereum?.on('chainChanged', checkNetwork);
    
    return () => {
      window.ethereum?.removeListener('chainChanged', checkNetwork);
    };
  }, []);

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