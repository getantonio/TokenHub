"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { TokenPreview } from './TokenPreview';
import { validateTokenConfig } from '@/lib/utils';
import { TokenConfig } from './types';
import { Tooltip } from '@/components/ui/tooltip';
import { tooltips } from './tooltips';
import { VestingExampleModal } from './VestingExampleModal';
import { ethers } from 'ethers';
import { useAccount, useChainId, useWriteContract } from 'wagmi';
import TokenFactoryABI from '@/contracts/abis/TokenFactory.json';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { parseEther, parseUnits } from 'viem';
import { BrowserProvider } from 'ethers';
import { formatEther } from 'ethers';
import { TokenTester } from './TokenTester';
import { ZeroAddress } from 'ethers';
import { InfoIcon } from 'lucide-react';
import { AlertTitle } from "@/components/ui/alert";
import { NetworkRequirements } from '../network/NetworkRequirements';
import { FEE_STRUCTURE_DOC_URL } from '@/lib/constants';
import Link from 'next/link';
import { DeploymentSimulator } from './DeploymentSimulator';
import { TokenTracker } from './TokenTracker';
import { LocalTestnetInstructions } from '../network/LocalTestnetInstructions';

// Add platform fee configuration
const PLATFORM_TEAM_WALLET = "YOUR_WALLET_ADDRESS"; // Replace with your wallet address
const PLATFORM_TEAM_ALLOCATION = 2; // 2% of total supply for platform team

// Add near the top with other tooltips
const MAINNET_INFO = {
  title: "Mainnet Deployment Fee",
  description: "A 2% platform fee is applied to team allocation on mainnet deployments. This helps support ongoing platform development and maintenance.",
};

// Add near the top with other utility functions
const isMobileDevice = () => {
  if (typeof window === 'undefined') return false; // SSR check
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
};

// Update all input fields to use smaller padding
const inputClassName = "w-full p-1.5 rounded bg-gray-700 text-white text-sm";

export function CreateTokenForm() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [currentStep, setCurrentStep] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { address } = useAccount();
  const chainId = useChainId();
  const isMainnet = chainId === 1;
  const [useMinimalFeatures, setUseMinimalFeatures] = useState(false);

  const [config, setConfig] = useState<TokenConfig>({
    name: '',
    symbol: '',
    description: '',
    website: '',
    totalSupply: '',
    decimals: 18,
    initialPrice: '',
    presaleAllocation: 0,
    liquidityAllocation: 0,
    teamAllocation: 0,
    marketingAllocation: 0,
    developerAllocation: 0,
    maxTransferAmount: '',
    cooldownTime: 0,
    transfersEnabled: true,
    antiBot: true,
    vestingSchedule: {
      team: {
        duration: 12,
        cliff: 3
      },
      advisors: {
        duration: 12,
        cliff: 3
      }
    },
    teamWallet: '',
    developerWallet: '',
    developerVesting: {
      duration: 12,
      cliff: 3
    }
  });

  const [isVestingModalOpen, setIsVestingModalOpen] = useState(false);

  const totalAllocation = 
    config.presaleAllocation + 
    config.liquidityAllocation + 
    config.teamAllocation + 
    config.marketingAllocation +
    config.developerAllocation;

  const validationErrors = validateTokenConfig(config);
  const isValid = validationErrors.length === 0;

  const LabelWithTooltip = ({ label, tooltip }: { label: string; tooltip: string }) => (
    <Tooltip content={tooltip}>
      <label className="text-xs font-medium mb-1">{label}</label>
    </Tooltip>
  );

  // Contract interaction setup
  const { writeContract } = useWriteContract();

  // Add gas impact information
  const gasImpactTooltips = {
    antiBot: "Enabling anti-bot protection adds additional security but increases gas costs by ~15-20%",
    vesting: "Vesting schedules increase deployment gas costs. Each vesting period adds ~5-10% to base gas costs",
    maxTransfer: "Setting max transfer limits increases gas costs by ~5-10%",
    cooldown: "Transaction cooldown features increase gas costs by ~8-12%",
    decimals: "Lower decimals (e.g., 8 instead of 18) can slightly reduce gas costs for transfers",
  };

  // Add gas impact indicator component
  const GasImpactIndicator = ({ impact }: { impact: 'high' | 'medium' | 'low' }) => {
    const colors = {
      high: 'text-red-400',
      medium: 'text-yellow-400',
      low: 'text-green-400'
    };
    return (
      <span className={`ml-2 text-xs ${colors[impact]}`}>
        Gas Impact: {impact.toUpperCase()}
      </span>
    );
  };

  // Add state for tracking deployment
  const [deployedToken, setDeployedToken] = useState<{
    address?: string;
    txHash?: string;
  }>();

  const handleCreateToken = async () => {
    try {
      setIsCreating(true);
      setError(null);

      if (!writeContract) {
        throw new Error('Contract write not available. Please connect your wallet.');
      }

      console.log('Creating token with config:', config);

      // Prepare token creation parameters
      const tokenParams = {
        name: config.name,
        symbol: config.symbol,
        maxSupply: parseUnits(config.totalSupply || '0', config.decimals),
        initialSupply: parseUnits(config.totalSupply || '0', config.decimals),
        tokenPrice: parseUnits(config.initialPrice || '0', 18),
        maxTransferAmount: config.maxTransferAmount ? parseUnits(config.maxTransferAmount, config.decimals) : 0n,
        cooldownTime: BigInt(config.cooldownTime),
        transfersEnabled: config.transfersEnabled,
        antiBot: config.antiBot,
        teamVestingDuration: BigInt(config.vestingSchedule.team.duration),
        teamVestingCliff: BigInt(config.vestingSchedule.team.cliff),
        teamAllocation: BigInt(config.teamAllocation),
        teamWallet: config.teamWallet || address || '0x',
        developerAllocation: BigInt(config.developerAllocation),
        developerVestingDuration: BigInt(config.developerVesting?.duration || 12),
        developerVestingCliff: BigInt(config.developerVesting?.cliff || 3),
        developerWallet: config.developerWallet || address || ZeroAddress,
        platformTeamAllocation: isMainnet ? BigInt(PLATFORM_TEAM_ALLOCATION) : 0n,
        platformTeamWallet: isMainnet ? PLATFORM_TEAM_WALLET : ZeroAddress,
      };

      console.log('Token parameters:', tokenParams);

      // Call writeContract without checking the return value
      await writeContract({
        abi: TokenFactoryABI,
        address: process.env.NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS as `0x${string}`,
        functionName: 'createToken',
        args: [tokenParams],
        value: parseEther('0.1'),
      });

      // If we get here, the transaction was submitted successfully
      setError('Token creation transaction submitted successfully!');

      // Note: We won't have the transaction hash immediately
      // You might want to use useWaitForTransaction hook to track the status
      
    } catch (error) {
      console.error('Token creation error:', error);
      let errorMessage = 'Failed to create token';
      
      if (error instanceof Error) {
        if (error.message.includes('insufficient funds')) {
          errorMessage = 'Insufficient funds to pay for gas and creation fee';
        } else if (error.message.includes('user rejected')) {
          errorMessage = 'Transaction was rejected by user';
        } else if (error.message.includes('nonce')) {
          errorMessage = 'Transaction nonce error. Please reset your wallet connection and try again.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  const handleNetworkSwitch = async (networkId: number) => {
    try {
      if (!window.ethereum) {
        throw new Error('Please install MetaMask');
      }

      // Check if already on network
      const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
      if (currentChainId === `0x${networkId.toString(16)}`) {
        return;
      }

      // Switch network
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${networkId.toString(16)}` }],
      });

    } catch (error: any) {
      console.error('Network switch error:', error);
      setError(error.message || 'Failed to switch network');
    }
  };

  const handleSwitchToSepolia = () => {
    return handleNetworkSwitch(11155111); // Sepolia chainId
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-2">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
          <TabsTrigger value="test">Test & Deploy</TabsTrigger>
        </TabsList>

        <TabsContent value="basic">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="py-3 border-b border-gray-700">
              <CardTitle className="text-lg">Token Configuration</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {/* Basic Info Fields */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <LabelWithTooltip label="Token Name" tooltip={tooltips.name} />
                    <input
                      type="text"
                      value={config.name}
                      onChange={(e) => setConfig({ ...config, name: e.target.value })}
                      className={inputClassName}
                      placeholder="MyToken"
                    />
                  </div>
                  <div className="space-y-2">
                    <LabelWithTooltip label="Token Symbol" tooltip={tooltips.symbol} />
                    <input
                      type="text"
                      value={config.symbol}
                      onChange={(e) => setConfig({ ...config, symbol: e.target.value })}
                      className={inputClassName}
                      placeholder="MTK"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <LabelWithTooltip label="Total Supply" tooltip={tooltips.totalSupply} />
                    <input
                      type="text"
                      value={config.totalSupply}
                      onChange={(e) => setConfig({ ...config, totalSupply: e.target.value })}
                      className={inputClassName}
                      placeholder="1000000"
                    />
                  </div>
                  <div className="space-y-2">
                    <LabelWithTooltip label="Initial Price (ETH)" tooltip={tooltips.initialPrice} />
                    <input
                      type="text"
                      value={config.initialPrice}
                      onChange={(e) => setConfig({ ...config, initialPrice: e.target.value })}
                      className={inputClassName}
                      placeholder="0.0001"
                    />
                  </div>
                </div>
              </div>

              {/* Token Distribution */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium">Token Distribution</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <LabelWithTooltip label="Presale %" tooltip={tooltips.presaleAllocation} />
                    <input
                      type="number"
                      value={config.presaleAllocation}
                      onChange={(e) => setConfig({ ...config, presaleAllocation: Number(e.target.value) })}
                      className={inputClassName}
                    />
                  </div>
                  <div className="space-y-2">
                    <LabelWithTooltip label="Liquidity %" tooltip={tooltips.liquidityAllocation} />
                    <input
                      type="number"
                      value={config.liquidityAllocation}
                      onChange={(e) => setConfig({ ...config, liquidityAllocation: Number(e.target.value) })}
                      className={inputClassName}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <LabelWithTooltip label="Team %" tooltip={tooltips.teamAllocation} />
                    <input
                      type="number"
                      value={config.teamAllocation}
                      onChange={(e) => setConfig({ ...config, teamAllocation: Number(e.target.value) })}
                      className={inputClassName}
                    />
                  </div>
                  <div className="space-y-2">
                    <LabelWithTooltip label="Marketing %" tooltip={tooltips.marketingAllocation} />
                    <input
                      type="number"
                      value={config.marketingAllocation}
                      onChange={(e) => setConfig({ ...config, marketingAllocation: Number(e.target.value) })}
                      className={inputClassName}
                    />
                  </div>
                  <div className="space-y-2">
                    <LabelWithTooltip label="Developer %" tooltip={tooltips.developerAllocation} />
                    <input
                      type="number"
                      value={config.developerAllocation}
                      onChange={(e) => setConfig({ ...config, developerAllocation: Number(e.target.value) })}
                      className={inputClassName}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="py-3 border-b border-gray-700">
              <CardTitle className="text-lg">Advanced Settings</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {/* Vesting Configuration */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">Vesting Schedule</h3>
                  <button
                    onClick={() => setIsVestingModalOpen(true)}
                    className="text-sm text-blue-400 hover:text-blue-300"
                  >
                    View Example
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <LabelWithTooltip label="Team Vesting Duration (months)" tooltip={tooltips.vestingDuration} />
                    <input
                      type="number"
                      value={config.vestingSchedule.team.duration}
                      onChange={(e) => setConfig({
                        ...config,
                        vestingSchedule: {
                          ...config.vestingSchedule,
                          team: { ...config.vestingSchedule.team, duration: Number(e.target.value) }
                        }
                      })}
                      className={inputClassName}
                    />
                  </div>
                  <div className="space-y-2">
                    <LabelWithTooltip label="Team Vesting Cliff (months)" tooltip={tooltips.vestingCliff} />
                    <input
                      type="number"
                      value={config.vestingSchedule.team.cliff}
                      onChange={(e) => setConfig({
                        ...config,
                        vestingSchedule: {
                          ...config.vestingSchedule,
                          team: { ...config.vestingSchedule.team, cliff: Number(e.target.value) }
                        }
                      })}
                      className={inputClassName}
                    />
                  </div>
                </div>
              </div>

              {/* Security Features */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium">Security Features</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={config.antiBot}
                        onChange={(e) => setConfig({ ...config, antiBot: e.target.checked })}
                        className="rounded bg-gray-700"
                      />
                      <LabelWithTooltip label="Anti-Bot Protection" tooltip={tooltips.antiBot} />
                    </div>
                    <GasImpactIndicator impact="medium" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={config.transfersEnabled}
                        onChange={(e) => setConfig({ ...config, transfersEnabled: e.target.checked })}
                        className="rounded bg-gray-700"
                      />
                      <LabelWithTooltip label="Enable Transfers at Launch" tooltip={tooltips.transfersEnabled} />
                    </div>
                    <GasImpactIndicator impact="low" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="test">
          <div className="space-y-4">
            <NetworkRequirements />
            <TokenTester config={config} />
            <DeploymentSimulator config={config} />
          </div>
        </TabsContent>
      </Tabs>

      {/* Token Preview */}
      <TokenPreview
        config={config}
        isValid={isValid}
        validationErrors={validationErrors}
      />

      {/* Error Display */}
      {error && (
        <Alert variant={error.includes('success') ? 'success' : 'destructive'}>
          <AlertTitle>
            {error.includes('success') ? 'Success' : 'Error'}
          </AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Create Button */}
      <div className="flex justify-end">
        <button
          onClick={handleCreateToken}
          disabled={!isValid || isCreating || !address}
          className={`px-6 py-2 rounded-lg font-medium ${
            !isValid || isCreating || !address
              ? 'bg-gray-600 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isCreating ? (
            <div className="flex items-center gap-2">
              <Spinner />
              <span>Creating...</span>
            </div>
          ) : (
            'Create Token'
          )}
        </button>
      </div>

      {/* Vesting Example Modal */}
      {isVestingModalOpen && (
        <VestingExampleModal onClose={() => setIsVestingModalOpen(false)} />
      )}
    </div>
  );
} 