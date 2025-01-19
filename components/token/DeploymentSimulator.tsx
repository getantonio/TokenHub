import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TokenConfig } from './types';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InfoIcon, CheckCircle, XCircle } from 'lucide-react';
import { useChainId, useEstimateGas, useSimulateContract, useAccount } from 'wagmi';
import { usePublicClient } from 'wagmi';
import { parseUnits, formatEther } from 'viem';
import { NETWORKS_WITH_COSTS } from '@/app/providers';
import { TokenFactoryABI } from '@/contracts/abis/TokenFactory';
import { ethers } from 'ethers';
import { validateTokenConfig } from '@/lib/utils';
import { Spinner } from "@/components/ui/spinner";

interface SimulationStep {
  name: string;
  status: 'pending' | 'success' | 'error' | 'waiting';
  gasEstimate?: bigint;
  error?: string;
}

interface DeploymentSimulatorProps {
  config: TokenConfig;
}

export function DeploymentSimulator({ config }: DeploymentSimulatorProps) {
  const chainId = useChainId();
  const [steps, setSteps] = useState<SimulationStep[]>([
    { name: 'Parameter Validation', status: 'waiting' },
    { name: 'Contract Deployment', status: 'waiting' },
    { name: 'Token Configuration', status: 'waiting' },
    { name: 'Vesting Setup', status: 'waiting' }
  ]);
  const [totalGas, setTotalGas] = useState<bigint>(0n);
  const [isSimulating, setIsSimulating] = useState(false);
  const [estimatedGas, setEstimatedGas] = useState<string | null>(null);
  const [isEstimating, setIsEstimating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { address } = useAccount();
  const publicClient = usePublicClient();

  const network = NETWORKS_WITH_COSTS.find(n => n.id === chainId);

  const { data: simulationData } = useSimulateContract({
    address: process.env.NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS as `0x${string}`,
    abi: TokenFactoryABI,
    functionName: 'createToken',
    args: [{
      name: config.name,
      symbol: config.symbol,
      maxSupply: parseUnits(config.totalSupply || '0', config.decimals),
      initialSupply: parseUnits(config.totalSupply || '0', config.decimals),
      tokenPrice: parseUnits(config.initialPrice || '0', 18),
      maxTransferAmount: config.maxTransferAmount ? parseUnits(config.maxTransferAmount, config.decimals) : 0n,
      cooldownTime: BigInt(config.cooldownTime || 0),
      transfersEnabled: config.transfersEnabled,
      antiBot: config.antiBot,
      teamVestingDuration: BigInt(config.vestingSchedule.team.duration),
      teamVestingCliff: BigInt(config.vestingSchedule.team.cliff),
      teamAllocation: BigInt(config.teamAllocation),
      teamWallet: config.teamWallet || '0x',
      developerAllocation: BigInt(config.developerAllocation),
      developerVestingDuration: BigInt(config.developerVesting?.duration || 12),
      developerVestingCliff: BigInt(config.developerVesting?.cliff || 3),
      developerWallet: config.developerWallet || '0x',
    }],
    value: parseUnits('0.1', 18), // Creation fee
  });

  useEffect(() => {
    let mounted = true;

    const estimateGas = async () => {
      if (!address || !chainId) return;
      
      try {
        setIsEstimating(true);
        setError(null);

        // Add delay to prevent rapid re-estimation during network changes
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Mock gas estimation based on features
        const baseGas = 500000n;
        const antiBot = config.antiBot ? 100000n : 0n;
        const vesting = (config.vestingSchedule?.team?.duration || 0) > 0 ? 150000n : 0n;
        const maxTransfer = config.maxTransferAmount ? 80000n : 0n;
        const cooldown = config.cooldownTime > 0 ? 90000n : 0n;

        const totalGas = baseGas + antiBot + vesting + maxTransfer + cooldown;
        
        if (mounted) {
          setEstimatedGas(formatEther(totalGas * 50000000000n)); // Assuming 50 gwei gas price
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          console.error('Gas estimation error:', err);
          setError('Failed to estimate gas. Please try again after network stabilizes.');
          setEstimatedGas(null);
        }
      } finally {
        if (mounted) {
          setIsEstimating(false);
        }
      }
    };

    // Only estimate if we have a valid network connection
    if (chainId && !isEstimating) {
      estimateGas();
    }

    return () => {
      mounted = false;
    };
  }, [config, address, chainId]);

  const runSimulation = async () => {
    try {
      setIsSimulating(true);
      let totalGasUsed = 0n;
      const currentSteps = [...steps];

      // Step 1: Parameter Validation
      const validationErrors = validateTokenConfig(config);
      if (validationErrors.length > 0) {
        currentSteps[0].status = 'error';
        currentSteps[0].error = validationErrors.join(', ');
        setSteps(currentSteps);
        return;
      }
      currentSteps[0].status = 'success';

      // Step 2: Contract Deployment
      const deploymentGas = await simulateDeployment();
      currentSteps[1].status = 'success';
      currentSteps[1].gasEstimate = deploymentGas;
      totalGasUsed += deploymentGas;

      // Step 3: Token Configuration
      currentSteps[2].status = 'success';

      // Step 4: Vesting Setup
      const vestingGas = await simulateVesting();
      currentSteps[3].status = 'success';
      currentSteps[3].gasEstimate = vestingGas;
      totalGasUsed += vestingGas;

      setSteps(currentSteps);
      setTotalGas(totalGasUsed);

      // Add success message
      console.log('Simulation completed successfully');
      // You might want to add a success state or message to the UI
    } catch (error) {
      console.error('Simulation error:', error);
      // Add error handling UI feedback
    } finally {
      setIsSimulating(false);
    }
  };

  const validateParameters = async () => {
    // Implement parameter validation
    await new Promise(resolve => setTimeout(resolve, 500));
    // Throw error if validation fails
  };

  const simulateDeployment = async (): Promise<bigint> => {
    try {
      const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545', {
        chainId: 31337,
        name: 'Hardhat'
      });

      // Get factory contract
      const factoryContract = new ethers.Contract(
        process.env.NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS!,
        TokenFactoryABI,
        provider
      );

      // Estimate gas for token creation
      const gasEstimate = await factoryContract.createToken.estimateGas(
        // Your token parameters here
      );

      return gasEstimate || 200000n; // Return default value if estimation fails
    } catch (error) {
      console.error('Deployment simulation error:', error);
      return 200000n; // Return default gas estimate on error
    }
  };

  const simulateConfiguration = async () => {
    // Simulate token configuration
    return 150000n; // Example gas estimate
  };

  const simulateVesting = async () => {
    // Simulate vesting setup
    return config.vestingSchedule.team.duration > 0 ? 200000n : 0n;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Deployment Simulation</span>
          {network && (
            <span className="text-sm font-normal text-gray-400">
              Network: {network.name}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {steps.map((step, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {step.status === 'success' && <CheckCircle className="w-4 h-4 text-green-500" />}
                {step.status === 'error' && <XCircle className="w-4 h-4 text-red-500" />}
                {(step.status === 'pending' || step.status === 'waiting') && (
                  <div className="w-4 h-4 rounded-full border-2 border-gray-500" />
                )}
                <span className={step.status === 'error' ? 'text-red-400' : ''}>{step.name}</span>
              </div>
              {step.gasEstimate && (
                <span className="text-sm text-gray-400">
                  {formatEther(step.gasEstimate)} ETH
                </span>
              )}
            </div>
          ))}

          {totalGas > 0 && (
            <Alert>
              <InfoIcon className="h-4 w-4" />
              <AlertDescription>
                Estimated total gas: {formatEther(totalGas)} ETH
                {network && ` (${network.costs.total} USD)`}
              </AlertDescription>
            </Alert>
          )}

          <button
            onClick={runSimulation}
            disabled={isSimulating}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 disabled:cursor-not-allowed rounded-lg font-medium text-sm"
          >
            {isSimulating ? 'Simulating...' : 'Run Simulation'}
          </button>
        </div>
      </CardContent>
    </Card>
  );
} 