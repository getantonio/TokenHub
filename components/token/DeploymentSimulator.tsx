'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { useAccount, useChainId } from 'wagmi';
import { BrowserProvider, Contract } from 'ethers';
import { formatEther, parseUnits } from 'ethers';
import TokenFactoryABI from '@/contracts/abis/TokenFactory.json';
import { TokenConfig } from './types';
import { CheckCircle, XCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";

interface DeploymentSimulatorProps {
  config: TokenConfig;
}

interface SimulationStep {
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message?: string;
}

export function DeploymentSimulator({ config }: DeploymentSimulatorProps) {
  const [isSimulating, setIsSimulating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [steps, setSteps] = useState<SimulationStep[]>([
    { name: 'Wallet Connection', status: 'pending' },
    { name: 'Contract Connection', status: 'pending' },
    { name: 'Parameter Validation', status: 'pending' },
    { name: 'Gas Estimation', status: 'pending' },
    { name: 'Deployment Simulation', status: 'pending' }
  ]);

  const { address } = useAccount();
  const chainId = useChainId();

  const updateStep = (index: number, status: SimulationStep['status'], message?: string) => {
    setSteps(current => 
      current.map((step, i) => 
        i === index ? { ...step, status, message } : step
      )
    );
  };

  const resetSimulation = () => {
    setIsSimulating(false);
      setError(null);
    setSteps(steps.map(step => ({ ...step, status: 'pending', message: undefined })));
  };

  const simulateDeployment = async () => {
    try {
      resetSimulation();
      setIsSimulating(true);

      // Step 1: Wallet Connection
      updateStep(0, 'running');
      if (!window.ethereum) {
        throw new Error('Please install MetaMask');
      }
      if (!address) {
        throw new Error('Please connect your wallet');
      }
      const provider = new BrowserProvider(window.ethereum);
      const balance = await provider.getBalance(address);
      if (balance === BigInt(0)) {
        throw new Error('Your wallet has no Sepolia ETH. Please get some from a Sepolia faucet: https://sepoliafaucet.com');
      }
      updateStep(0, 'success', `Connected: ${address.slice(0, 6)}...${address.slice(-4)}`);

      // Step 2: Contract Connection
      updateStep(1, 'running');
      const contractAddress = process.env.NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS;
      if (!contractAddress) {
        throw new Error('Contract address not configured');
      }
      const signer = await provider.getSigner();
      const factory = new Contract(contractAddress, TokenFactoryABI, signer);
      updateStep(1, 'success', `Connected to ${contractAddress.slice(0, 6)}...${contractAddress.slice(-4)}`);

      // Step 3: Parameter Validation
      updateStep(2, 'running');
      if (!config.name || !config.symbol || !config.totalSupply) {
        throw new Error('Missing required token parameters');
      }

      // Get creation fee first to check balance
      const creationFee = await factory.creationFee();
      if (balance < creationFee) {
        throw new Error(`Insufficient funds. You need at least ${formatEther(creationFee)} Sepolia ETH for the creation fee. Get some from https://sepoliafaucet.com`);
      }

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
        teamVestingDuration: BigInt(config.vestingSchedule.team.duration * 30 * 24 * 60 * 60), // months to seconds
        teamVestingCliff: BigInt(config.vestingSchedule.team.cliff * 30 * 24 * 60 * 60), // months to seconds
        teamAllocation: BigInt(config.teamAllocation),
        teamWallet: address, // Use connected wallet
        developerAllocation: BigInt(0),
        developerVestingDuration: BigInt(0),
        developerVestingCliff: BigInt(0),
        developerWallet: address // Use connected wallet
      };
      updateStep(2, 'success', 'Parameters validated');

      // Step 4: Gas Estimation
      updateStep(3, 'running');
      const gasEstimate = await factory.createToken.estimateGas(tokenConfig, { value: creationFee });
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice || parseUnits('50', 9);
      const gasCost = gasEstimate * gasPrice;
      const totalCost = gasCost + creationFee;
      updateStep(3, 'success', `Estimated total cost: ${formatEther(totalCost)} ETH`);

      // Step 5: Deployment Simulation
      updateStep(4, 'running');
      await factory.createToken.staticCall(tokenConfig, { value: creationFee });
      updateStep(4, 'success', 'Deployment simulation successful');

      setError(null);
    } catch (err: any) {
      console.error('Simulation error:', err);
      const currentStep = steps.findIndex(step => step.status === 'running');
      if (currentStep !== -1) {
        let errorMessage = err.message || 'Simulation failed';
        // Improve insufficient funds error message
        if (errorMessage.includes('insufficient funds')) {
          errorMessage = 'Insufficient Sepolia ETH. Please get some from https://sepoliafaucet.com';
        }
        updateStep(currentStep, 'error', errorMessage);
      }
      setError(err.message || 'Simulation failed');
    } finally {
      setIsSimulating(false);
    }
  };

  const StepIndicator = ({ status }: { status: SimulationStep['status'] }) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running':
        return <Spinner className="h-4 w-4" />;
      default:
        return <div className="h-4 w-4 rounded-full border border-gray-600" />;
    }
  };

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
          <CardTitle className="text-lg">Deployment Simulation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>
              {error.includes('insufficient funds') || error.includes('no Sepolia ETH') ? (
                <div>
                  <p>{error}</p>
                  <a 
                    href="https://sepoliafaucet.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 underline mt-2 inline-block"
                  >
                    Get Sepolia ETH from Faucet
                  </a>
                </div>
              ) : error}
            </AlertDescription>
          </Alert>
        )}

        <div className="text-sm text-gray-400 space-y-1">
          <div>Network: {chainId === 11155111 ? 'Sepolia (Testnet)' : 'Wrong Network - Please switch to Sepolia'}</div>
          <div>Wallet: {address ? `Connected (${address.slice(0, 6)}...${address.slice(-4)})` : 'Not Connected'}</div>
          <div>Factory Address: {process.env.NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS || 'Not Configured'}</div>
        </div>

            <Button
          onClick={simulateDeployment} 
          disabled={isSimulating || !address || chainId !== 11155111}
          className="w-full"
        >
          {isSimulating ? 'Simulating...' : 'Run Simulation'}
              </Button>

        <div className="space-y-2">
          {steps.map((step, index) => (
            <div key={index} className="flex items-center gap-2">
              <StepIndicator status={step.status} />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className={step.status === 'running' ? 'text-blue-400' : ''}>{step.name}</span>
                  {step.message && (
                    <span className="text-xs text-gray-500">{step.message}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
          </div>
      </CardContent>
    </Card>
  );
} 