import React, { useState, useEffect } from 'react';
import { TokenConfig } from '../token/types';

interface DeploymentSimulatorProps {
  config: TokenConfig;
}

interface SimulationState {
  gasEstimate: string;
  deploymentCost: string;
  isLoading: boolean;
  error: string | null;
}

const initialState: SimulationState = {
  gasEstimate: '0',
  deploymentCost: '0',
  isLoading: false,
  error: null
};

export function DeploymentSimulator({ config }: DeploymentSimulatorProps) {
  const [state, setState] = useState(initialState);

  const updateSimulation = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // Simulate deployment costs based on config
      const baseGas = 500000; // Base gas for token deployment
      let additionalGas = 0;

      // Add gas for features
      if (config.antiBot) additionalGas += 100000;
      if (config.vestingSchedule) additionalGas += 150000;
      if (config.maxTransferAmount) additionalGas += 50000;
      if (config.cooldownTime > 0) additionalGas += 75000;

      const totalGas = baseGas + additionalGas;
      const avgGasPrice = 50; // gwei
      const estimatedCost = (totalGas * avgGasPrice) / 1e9; // Convert to ETH

      setState(prev => ({
        ...prev,
        gasEstimate: totalGas.toLocaleString(),
        deploymentCost: estimatedCost.toFixed(4),
        isLoading: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Failed to simulate deployment',
        isLoading: false
      }));
    }
  };

  useEffect(() => {
    updateSimulation();
  }, [
    config.antiBot,
    config.vestingSchedule,
    config.maxTransferAmount,
    config.cooldownTime
  ]);

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Deployment Simulation</h3>
      {state.isLoading ? (
        <div>Calculating...</div>
      ) : state.error ? (
        <div className="text-red-400">{state.error}</div>
      ) : (
        <div className="text-sm space-y-1">
          <div>Estimated Gas: {state.gasEstimate}</div>
          <div>Estimated Cost: {state.deploymentCost} ETH</div>
        </div>
      )}
    </div>
  );
} 