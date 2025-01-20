'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { useAccount, useChainId, usePublicClient } from 'wagmi';
import { BrowserProvider, Contract } from 'ethers';
import { formatEther, parseUnits } from 'ethers';
import TokenFactoryABI from '@/contracts/abis/TokenFactory.json';
import { TokenConfig } from './types';
import { CheckCircle, XCircle } from 'lucide-react';

interface DeploymentSimulatorProps {
  config: TokenConfig;
}

export function DeploymentSimulator({ config }: DeploymentSimulatorProps) {
  const [isSimulating, setIsSimulating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [estimatedGas, setEstimatedGas] = useState<string | null>(null);
  const [simulationSteps, setSimulationSteps] = useState({
    validation: false,
    deployment: false,
    configuration: false,
    vesting: false
  });

  const { address } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();

  useEffect(() => {
    const simulateDeployment = async () => {
      if (!address || !window.ethereum) return;

      setIsSimulating(true);
      setError(null);
      setEstimatedGas(null);
      setSimulationSteps({
        validation: false,
        deployment: false,
        configuration: false,
        vesting: false
      });

      try {
        // Parameter Validation
        setSimulationSteps(prev => ({ ...prev, validation: true }));
        
        const provider = new BrowserProvider(window.ethereum);
        const contractAddress = process.env.NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS;
        
        if (!contractAddress) {
          throw new Error('Contract address not configured');
        }

        const factory = new Contract(contractAddress, TokenFactoryABI, provider);
        
        // Prepare token configuration
        const tokenConfig = {
          name: config.name,
          symbol: config.symbol,
          maxSupply: parseUnits(config.totalSupply, config.decimals),
          initialSupply: parseUnits(config.totalSupply, config.decimals),
          tokenPrice: parseUnits(config.initialPrice || '0', 18),
          maxTransferAmount: config.maxTransferAmount ? parseUnits(config.maxTransferAmount, config.decimals) : parseUnits(config.totalSupply, config.decimals),
          cooldownTime: BigInt(config.cooldownTime || 0),
          transfersEnabled: config.transfersEnabled,
          antiBot: config.antiBot,
          teamVestingDuration: BigInt(config.vestingSchedule.team.duration * 30 * 24 * 60 * 60),
          teamVestingCliff: BigInt(config.vestingSchedule.team.cliff * 30 * 24 * 60 * 60),
          teamAllocation: BigInt(config.teamAllocation),
          teamWallet: config.teamWallet || address
        };

        // Get creation fee
        const creationFee = await factory.creationFee();
        
        // Contract Deployment
        setSimulationSteps(prev => ({ ...prev, deployment: true }));
        
        // Estimate gas
        const gasEstimate = await factory.createToken.estimateGas(
          tokenConfig,
          { value: creationFee }
        );

        // Token Configuration
        setSimulationSteps(prev => ({ ...prev, configuration: true }));
        
        // Vesting Setup
        setSimulationSteps(prev => ({ ...prev, vesting: true }));

        setEstimatedGas(formatEther(gasEstimate));
      } catch (err: any) {
        console.error('Simulation error:', err);
        setError(err.message || 'Failed to simulate deployment');
      } finally {
        setIsSimulating(false);
      }
    };

    simulateDeployment();
  }, [address, config]);

  const StepIndicator = ({ completed }: { completed: boolean }) => (
    completed ? 
      <CheckCircle className="h-4 w-4 text-green-500" /> : 
      <XCircle className="h-4 w-4 text-red-500" />
  );

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-lg">Deployment Simulation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-gray-400">
          Network: {chainId === 11155111 ? 'Sepolia (Testnet)' : 'Unknown Network'}
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <StepIndicator completed={simulationSteps.validation} />
            <span>Parameter Validation</span>
          </div>
          <div className="flex items-center gap-2">
            <StepIndicator completed={simulationSteps.deployment} />
            <span>Contract Deployment</span>
          </div>
          <div className="flex items-center gap-2">
            <StepIndicator completed={simulationSteps.configuration} />
            <span>Token Configuration</span>
          </div>
          <div className="flex items-center gap-2">
            <StepIndicator completed={simulationSteps.vesting} />
            <span>Vesting Setup</span>
          </div>
        </div>

        {isSimulating && (
          <div className="flex items-center gap-2 text-blue-400">
            <Spinner className="h-4 w-4" />
            <span>Simulating deployment...</span>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {estimatedGas && (
          <div className="space-y-1">
            <div className="text-sm font-medium">Estimated Gas Cost</div>
            <div className="text-2xl font-bold">{estimatedGas} ETH</div>
            <div className="text-xs text-gray-400">
              Estimated total gas: {estimatedGas} ETH ({(Number(estimatedGas) * 2000).toFixed(2)} USD)
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 