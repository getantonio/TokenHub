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
import { tooltips as tooltipTexts } from './tooltips';
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
import { Button } from "@/components/ui/button";
import { Terminal } from 'lucide-react';
import { Copy } from 'lucide-react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { ExternalLink } from 'lucide-react';

// Add platform fee configuration
const PLATFORM_TEAM_WALLET = "0xc1039a6754B15188E3728a97C4E7fF04C652c28c"; // TokenHub platform wallet
const PLATFORM_TEAM_ALLOCATION = 2; // 2% of total supply for platform

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

// Update tooltips near the top of the file
const tooltips = {
  // ... existing tooltips ...
  teamAllocation: "Percentage allocated to the project team (founders, core team members)",
  developerAllocation: "Percentage allocated to the token creator (you) for development and maintenance",
  marketingAllocation: "Percentage allocated for marketing and promotional activities",
};

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
    presaleAllocation: 40,    // 40% for presale - common for fair launches
    liquidityAllocation: 30,  // 30% for liquidity - ensures good trading depth
    teamAllocation: 10,      // 10% for team - reasonable for small/medium projects
    marketingAllocation: 10, // 10% for marketing - standard allocation
    developerAllocation: 10, // 10% for development - covers future improvements
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
  const [isPlatformFeeExpanded, setIsPlatformFeeExpanded] = useState(false);

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

  // Remove transaction tracking code
  const [deployedToken, setDeployedToken] = useState<{
    txHash?: string;
  }>();

  const handleCreateToken = async () => {
    try {
      setIsCreating(true);
      setError(null);
      setDeployedToken(undefined);

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

      // Call writeContract to submit transaction
      await writeContract({
        abi: TokenFactoryABI,
        address: process.env.NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS as `0x${string}`,
        functionName: 'createToken',
        args: [tokenParams],
        value: parseEther('0.1'),
      });

      setError('success: Token creation transaction submitted! Please check your wallet and Etherscan for the transaction details.');
      
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
                    <LabelWithTooltip label="Token Name" tooltip={tooltipTexts.name} />
                    <input
                      type="text"
                      value={config.name}
                      onChange={(e) => setConfig({ ...config, name: e.target.value })}
                      className={inputClassName}
                      placeholder="MyToken"
                    />
                  </div>
                  <div className="space-y-2">
                    <LabelWithTooltip label="Token Symbol" tooltip={tooltipTexts.symbol} />
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
                    <LabelWithTooltip label="Total Supply" tooltip={tooltipTexts.totalSupply} />
                    <input
                      type="text"
                      value={config.totalSupply}
                      onChange={(e) => setConfig({ ...config, totalSupply: e.target.value })}
                      className={inputClassName}
                      placeholder="1000000"
                    />
                  </div>
                  <div className="space-y-2">
                    <LabelWithTooltip label="Initial Price (ETH)" tooltip={tooltipTexts.initialPrice} />
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
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <LabelWithTooltip 
                      label="Team %" 
                      tooltip={tooltipTexts.teamAllocation} 
                    />
                    <input
                      type="number"
                      value={config.teamAllocation}
                      onChange={(e) => setConfig({ ...config, teamAllocation: Number(e.target.value) })}
                      className={inputClassName}
                    />
                  </div>
                  <div className="space-y-2">
                    <LabelWithTooltip 
                      label="Marketing %" 
                      tooltip={tooltipTexts.marketingAllocation} 
                    />
                    <input
                      type="number"
                      value={config.marketingAllocation}
                      onChange={(e) => setConfig({ ...config, marketingAllocation: Number(e.target.value) })}
                      className={inputClassName}
                    />
                  </div>
                  <div className="space-y-2">
                    <LabelWithTooltip 
                      label="Creator %" 
                      tooltip={tooltipTexts.developerAllocation} 
                    />
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
                  <h3 className="text-sm font-medium">Vesting & Distribution</h3>
                  <button
                    onClick={() => setIsVestingModalOpen(true)}
                    className="text-sm text-blue-400 hover:text-blue-300"
                  >
                    View Example
                  </button>
                </div>

                {/* Team Wallet */}
                <div className="space-y-2">
                  <LabelWithTooltip 
                    label="Team Wallet Address" 
                    tooltip="Address that will receive the team allocation (founders, core team)" 
                  />
                  <input
                    type="text"
                    value={config.teamWallet}
                    onChange={(e) => setConfig({ ...config, teamWallet: e.target.value })}
                    className={inputClassName}
                    placeholder="0x..."
                  />
                </div>

                {/* Creator Wallet */}
                <div className="space-y-2">
                  <LabelWithTooltip 
                    label="Creator Wallet Address" 
                    tooltip="Your wallet address that will receive the creator allocation" 
                  />
                  <input
                    type="text"
                    value={config.developerWallet}
                    onChange={(e) => setConfig({ ...config, developerWallet: e.target.value })}
                    className={inputClassName}
                    placeholder="0x..."
                  />
                </div>

                {/* Vesting Schedules */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <LabelWithTooltip label="Team Vesting Duration (months)" tooltip={tooltipTexts.vestingDuration} />
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
                    <LabelWithTooltip label="Team Vesting Cliff (months)" tooltip={tooltipTexts.vestingCliff} />
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

                {/* Platform Fee Info */}
                {isMainnet && (
                  <div className="mt-2 p-2 rounded bg-blue-900/20 border border-blue-800 text-xs">
                    <div 
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => setIsPlatformFeeExpanded(!isPlatformFeeExpanded)}
                    >
                      <div className="flex items-center gap-2">
                        <InfoIcon className="h-4 w-4 text-blue-400" />
                        <span>Platform Fee: 2% of total supply</span>
                      </div>
                      {isPlatformFeeExpanded ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                    </div>
                    {isPlatformFeeExpanded && (
                      <div className="mt-1 text-gray-400 space-y-1">
                        <p>This fee is automatically allocated to the TokenHub platform:</p>
                        <div className="font-mono bg-gray-900/50 p-1 rounded">
                          {PLATFORM_TEAM_WALLET.slice(0, 8)}...{PLATFORM_TEAM_WALLET.slice(-6)}
                        </div>
                        <p>Fee is only applied on mainnet deployments.</p>
                      </div>
                    )}
                  </div>
                )}
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
                      <LabelWithTooltip label="Anti-Bot Protection" tooltip={tooltipTexts.antiBot} />
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
                      <LabelWithTooltip label="Enable Transfers at Launch" tooltip={tooltipTexts.transfersEnabled} />
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
            
            {/* Verify & Publish Section */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="py-3 border-b border-gray-700">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ExternalLink className="h-5 w-5" />
                  Verify & Publish Contract
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="text-sm">
                  <div className="flex items-center justify-between">
                    <p>After deployment, verify your contract on {chainId === 11155111 ? 'Sepolia' : 'Ethereum Mainnet'} Etherscan:</p>
                    {chainId !== 11155111 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleSwitchToSepolia}
                        className="text-xs h-7"
                      >
                        Switch to Sepolia
                      </Button>
                    )}
                  </div>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-gray-300">
                    <li>Make your contract source code public</li>
                    <li>Enable direct interaction through Etherscan</li>
                    <li>Build trust with your community</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Steps to Verify:</h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-gray-300">
                    <li>Wait for contract deployment to be confirmed</li>
                    <li>Get your personal Etherscan API key:
                      <div className="ml-4 mt-1">
                        <a 
                          href={chainId === 11155111 ? "https://sepolia.etherscan.io/apis" : "https://etherscan.io/apis"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 inline-flex items-center gap-1"
                        >
                          Create Your API Key
                          <ExternalLink className="h-3 w-3" />
                        </a>
                        <div className="text-xs text-gray-400 mt-1 space-y-1">
                          <p>Each creator needs their own API key:</p>
                          <ul className="list-disc list-inside pl-2">
                            <li>Sign up for a free Etherscan account</li>
                            <li>Create your personal API key</li>
                            <li>Use this key for all your contract verifications</li>
                          </ul>
                          <p className="text-yellow-400 mt-2">Note: Keep your API key private and never share it</p>
                        </div>
                      </div>
                    </li>
                    <li>Go to Etherscan:
                      {chainId === 11155111 ? (
                        <div className="ml-4 mt-1">
                          <a 
                            href="https://sepolia.etherscan.io" 
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 inline-flex items-center gap-1"
                          >
                            Sepolia Etherscan
                            <ExternalLink className="h-3 w-3" />
                          </a>
                          <p className="text-xs text-gray-400 mt-1">Use Sepolia Etherscan for testnet deployments</p>
                        </div>
                      ) : (
                        <div className="ml-4 mt-1">
                          <a 
                            href="https://etherscan.io" 
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 inline-flex items-center gap-1"
                          >
                            Ethereum Mainnet Etherscan
                            <ExternalLink className="h-3 w-3" />
                          </a>
                          <p className="text-xs text-gray-400 mt-1">Use Mainnet Etherscan for production deployments</p>
                        </div>
                      )}
                    </li>
                    <li>Click on "Verify Contract" in the contract page</li>
                    <li>Enter your Etherscan API key when prompted</li>
                    <li>Select Solidity (Single file) as compiler type</li>
                    <li>Choose compiler version 0.8.19</li>
                    <li>Enable optimization (200 runs)</li>
                    <li>Copy contract source code from GitHub</li>
                    <li>Verify and publish</li>
                  </ol>
                </div>

                <Alert variant="default" className="bg-blue-900/20 border-blue-800 mt-4">
                  <AlertTitle className="flex items-center gap-2">
                    <InfoIcon className="h-4 w-4" />
                    Important Notes
                  </AlertTitle>
                  <AlertDescription className="mt-2 text-sm space-y-2">
                    <p>
                      {chainId === 11155111 ? (
                        <>You're currently on Sepolia testnet - perfect for testing your token before mainnet deployment.</>
                      ) : (
                        <>You're currently on mainnet. For testing, switch to Sepolia testnet using the button above.</>
                      )}
                    </p>
                    <p className="text-yellow-400">
                      Make sure to keep your Etherscan API key private and never share it publicly.
                    </p>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Token Preview */}
      <TokenPreview
        config={config}
        isValid={isValid}
        validationErrors={validationErrors}
      />

      {/* Create Button and Status */}
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button
            onClick={handleCreateToken}
            disabled={!isValid || isCreating || !address}
            size="default"
            className="w-[200px] bg-blue-600 hover:bg-blue-700"
          >
            {isCreating ? (
              <div className="flex items-center gap-2">
                <Spinner className="h-4 w-4" />
                <span>Creating Token...</span>
              </div>
            ) : (
              <>
                <Terminal className="mr-2 h-4 w-4" />
                Create Token
              </>
            )}
          </Button>
        </div>

        {/* Status and Next Steps */}
        {error && (
          <Alert variant={error.includes('success') ? 'default' : 'destructive'} className={error.includes('success') ? 'bg-green-900/20 border-green-800' : ''}>
            <AlertTitle className="flex items-center gap-2">
              {error.includes('success') ? (
                <>
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  Token Creation Started
                </>
              ) : (
                <>
                  <div className="h-2 w-2 rounded-full bg-red-500" />
                  Error Creating Token
                </>
              )}
            </AlertTitle>
            <AlertDescription>
              {error.includes('success') ? (
                <div className="space-y-2 mt-2">
                  <p>Your token creation transaction has been submitted!</p>
                  <div className="mt-2">
                    <p className="font-medium mb-1">Next steps:</p>
                    <ol className="list-decimal list-inside space-y-1 pl-2">
                      <li>Check your wallet for the transaction details</li>
                      <li>View the transaction on <a 
                        href="https://sepolia.etherscan.io" 
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300"
                      >Sepolia Etherscan</a></li>
                      <li>Once confirmed, copy your token address from the transaction details</li>
                      <li>Add the token to MetaMask using the token address</li>
                      <li>Test token transfers and vesting schedules</li>
                      <li>Deploy to mainnet when ready</li>
                    </ol>
                  </div>
                </div>
              ) : (
                error
              )}
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Vesting Example Modal */}
      {isVestingModalOpen && (
        <VestingExampleModal onClose={() => setIsVestingModalOpen(false)} />
      )}
    </div>
  );
} 