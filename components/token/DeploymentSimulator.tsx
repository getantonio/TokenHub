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
import { Contract } from 'ethers';

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

        // Base gas costs per network
        const networkGasCosts = {
          1: 1000000n, // Mainnet
          11155111: 500000n, // Sepolia
        };

        const baseGas = networkGasCosts[chainId as keyof typeof networkGasCosts] || 500000n;
        const antiBot = config.antiBot ? 100000n : 0n;
        const vesting = (config.vestingSchedule?.team?.duration || 0) > 0 ? 150000n : 0n;
        const maxTransfer = config.maxTransferAmount ? 80000n : 0n;
        const cooldown = config.cooldownTime > 0 ? 90000n : 0n;

        const totalGas = baseGas + antiBot + vesting + maxTransfer + cooldown;
        
        if (mounted) {
          // Use network-specific gas price
          const gasPrice = chainId === 1 ? 50000000000n : 2500000000n; // 50 gwei mainnet, 2.5 gwei testnet
          setEstimatedGas(formatEther(totalGas * gasPrice));
          setError(null);
        }
      } catch (err: any) {
        if (mounted) {
          console.error('Gas estimation error:', err);
          setError(err?.message || 'Failed to estimate gas');
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
      const deploymentResult = await simulateDeployment();
      if (deploymentResult.success) {
        currentSteps[1].status = 'success';
        currentSteps[1].gasEstimate = deploymentResult.gasEstimate;
        totalGasUsed += deploymentResult.gasEstimate;
      } else {
        currentSteps[1].status = 'error';
        currentSteps[1].error = deploymentResult.error || 'Failed to estimate gas';
      }

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

  const simulateDeployment = async () => {
    try {
      // Check for ethereum provider
      if (!window.ethereum) {
        throw new Error('MetaMask not installed');
      }

      // Check and switch network first if needed
      const provider = new ethers.BrowserProvider(window.ethereum as any);
      
      const network = await provider.getNetwork();
      const chainId = Number(network.chainId);
      
      if (chainId !== 11155111) {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0xaa36a7' }], // 11155111 in hex
        });
        
        // Wait for network switch to complete
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Get new provider after network switch
        const updatedProvider = new ethers.BrowserProvider(window.ethereum as any);
        return await simulateWithProvider(updatedProvider);
      }
      
      return await simulateWithProvider(provider);
    } catch (err: any) {
      console.error('Deployment simulation error:', err);
      return {
        success: false,
        gasEstimate: 0n,
        error: err.message
      };
    }
  };

  const simulateWithProvider = async (provider: ethers.Provider) => {
    try {
      // Create contract instance with proper ABI
      const factory = new Contract(
        process.env.NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS as string,
        TokenFactoryABI,
        provider
      );

      // Prepare parameters for gas estimation
      const params = {
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
        teamWallet: config.teamWallet || address,
        marketingWallet: config.marketingWallet || address,
        developerAllocation: BigInt(config.developerAllocation),
        developerVestingDuration: BigInt(config.developerVesting?.duration || 12),
        developerVestingCliff: BigInt(config.developerVesting?.cliff || 3),
        developerWallet: config.developerWallet || address,
        presaleDuration: BigInt(config.presaleDuration || 7),
      };

      // Estimate gas with proper parameters
      const gasEstimate = await factory.createToken.estimateGas(
        params,
        { value: parseUnits('0.1', 18) }
      );

      return {
        success: true,
        gasEstimate: gasEstimate,
        error: null
      };
    } catch (err: any) {
      console.error('Gas estimation error:', err);
      return {
        success: false,
        gasEstimate: 0n,
        error: err.message
      };
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