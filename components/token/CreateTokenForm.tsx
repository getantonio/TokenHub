"use client";

import React, { useState, useEffect, useMemo } from 'react';
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
import { 
  useAccount, 
  useChainId,
  usePublicClient,
  useWriteContract,
  useWatchPendingTransactions,
} from 'wagmi';
import { type Hash, type Address } from 'viem';
import TokenFactoryABI from '@/contracts/abis/TokenFactory.json';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { parseUnits } from 'viem';
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
import { formatNumber } from '@/lib/utils';
import { CheckCircle } from 'lucide-react';
import { Contract } from 'ethers';

// Add platform fee configuration
const PLATFORM_TEAM_WALLET = "0xb6083258E7E7B04Bdc72640E1a75E1F40541e83F"; // TokenHub platform wallet
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

interface DeployedToken {
  address: string;
}

interface TransactionLog {
  topics: string[];
}

interface TransactionReceipt {
  logs: TransactionLog[];
}

interface ContractWriteConfig {
  address: Address;
  abi: typeof TokenFactoryABI;
  functionName: 'createToken';
  args: [{
    name: string;
    symbol: string;
    maxSupply: bigint;
    initialSupply: bigint;
    tokenPrice: bigint;
    maxTransferAmount: bigint;
    cooldownTime: bigint;
    transfersEnabled: boolean;
    antiBot: boolean;
    teamVestingDuration: bigint;
    teamVestingCliff: bigint;
    teamAllocation: bigint;
    teamWallet: string;
    developerAllocation: bigint;
    developerVestingDuration: bigint;
    developerVestingCliff: bigint;
    developerWallet: string;
  }];
  value: bigint;
}

// Platform fee message component
function PlatformFeeMessage() {
  const chainId = useChainId();
  const isMainnet = chainId === 1;

  return (
    <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
      <p className="text-yellow-400 text-sm">
        2% Platform Fee Applied on Mainnet
      </p>
    </div>
  );
}

export function CreateTokenForm() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isWriting, setIsWriting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [writeError, setWriteError] = useState<Error | null>(null);
  const [deployedToken, setDeployedToken] = useState<DeployedToken | null>(null);
  const [isVestingModalOpen, setIsVestingModalOpen] = useState(false);
  const [isPlatformFeeExpanded, setIsPlatformFeeExpanded] = useState(false);
  const [isPresaleMechanismExpanded, setIsPresaleMechanismExpanded] = useState(false);
  const [isVerifyExpanded, setIsVerifyExpanded] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [discountAddress, setDiscountAddress] = useState('');
  const [discountAmount, setDiscountAmount] = useState('');
  const [ethPrice, setEthPrice] = useState<number | null>(null);

  const { address } = useAccount();
  const chainId = useChainId();
  const isMainnet = chainId === 1;
  const publicClient = usePublicClient();
  const { writeContract } = useWriteContract();

  const [useMinimalFeatures, setUseMinimalFeatures] = useState(false);

  const [config, setConfig] = useState<TokenConfig>({
    name: '',
    symbol: '',
    description: '',
    website: '',
    totalSupply: '',
    decimals: 18,
    initialPrice: '',
    presaleAllocation: 45,    // 45% for presale
    liquidityAllocation: 35,  // 35% for liquidity
    teamAllocation: 2,       // 2% minimum for team (platform fee)
    marketingAllocation: 10,  // 10% for marketing
    developerAllocation: 8,   // 8% for development
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
    marketingWallet: '',
    developerWallet: '',
    developerVesting: {
      duration: 12,
      cliff: 3
    },
    presaleDuration: 7, // Default 7 days
  });

  const totalAllocation = 
    config.presaleAllocation + 
    config.liquidityAllocation + 
    config.teamAllocation + 
    config.marketingAllocation +
    config.developerAllocation;

  const validationErrors = validateTokenConfig(config);
  const isValid = useMemo(() => {
    return (
      validationErrors.length === 0 &&
      config.teamAllocation >= 2 &&
      totalAllocation <= 100
    );
  }, [validationErrors, config.teamAllocation, totalAllocation]);

  const LabelWithTooltip = ({ label, tooltip }: { label: string; tooltip: string }) => (
    <Tooltip content={tooltip}>
      <label className="text-xs font-medium mb-1">{label}</label>
    </Tooltip>
  );

  // Watch for transaction confirmation
  useWatchPendingTransactions({
    onTransactions: (transactions) => {
      const hash = transactions[0];
      if (hash) {
        // Update status
        setError(`Transaction confirmed. Processing token creation... (${hash.slice(0, 6)}...${hash.slice(-4)})`);

        // Transaction confirmed
        if (publicClient) {
          publicClient.getTransactionReceipt({ hash }).then((receipt) => {
            console.log('Transaction receipt:', receipt);
            
            const tokenCreatedEvent = receipt.logs.find(log => 
              log.topics[0] === ethers.id("TokenCreated(address,address,string,string)")
            );

            if (tokenCreatedEvent?.topics[1]) {
              const tokenAddress = `0x${tokenCreatedEvent.topics[1].slice(26)}`;
              setDeployedToken({ address: tokenAddress });
              setIsWriting(false);
              setError(null); // Clear any error/status messages
            } else {
              console.error('TokenCreated event not found in logs:', receipt.logs);
              setWriteError(new Error('Token creation transaction succeeded but token address not found'));
              setIsWriting(false);
            }
          }).catch(err => {
            console.error('Receipt error:', err);
            setWriteError(err as Error);
            setError('Failed to process transaction receipt. Please check Etherscan for details.');
            setIsWriting(false);
          });
        }
      }
    }
  });

  // Check if current user is admin (contract owner)
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!address || !window.ethereum) return;
      try {
        const provider = new BrowserProvider(window.ethereum as any);
        const factory = new Contract(
          process.env.NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS as string,
          TokenFactoryABI,
          provider
        );
        const owner = await factory.owner();
        setIsAdmin(owner.toLowerCase() === address.toLowerCase());
      } catch (err) {
        console.error('Error checking admin status:', err);
      }
    };
    checkAdminStatus();
  }, [address]);

  // Add ETH price fetching
  useEffect(() => {
    const fetchEthPrice = async () => {
      try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
        const data = await response.json();
        const price = data.ethereum.usd;
        setEthPrice(price);
      } catch (error) {
        console.error('Failed to fetch ETH price:', error);
      }
    };

    fetchEthPrice();
    // Refresh price every 5 minutes
    const interval = setInterval(fetchEthPrice, 300000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateToken = async () => {
    if (!address || !window.ethereum) {
      throw new Error('Contract interaction not available');
    }

    try {
      setIsSubmitting(true);
      setIsWriting(true);
      setWriteError(null);
      setError(null);

      if (!writeContract || !publicClient) {
        throw new Error('Contract interaction not available');
      }

      // Prepare contract parameters
      const params = {
        name: config.name,
        symbol: config.symbol,
        maxSupply: parseUnits(config.totalSupply, config.decimals),
        initialSupply: parseUnits(config.totalSupply, config.decimals),
        tokenPrice: parseUnits(config.initialPrice || '0', 18),
        maxTransferAmount: config.maxTransferAmount ? parseUnits(config.maxTransferAmount, config.decimals) : parseUnits(config.totalSupply, config.decimals),
        cooldownTime: BigInt(config.cooldownTime || 0),
        transfersEnabled: config.transfersEnabled,
        antiBot: config.antiBot,
        teamVestingDuration: BigInt(config.vestingSchedule.team.duration * 30 * 24 * 60 * 60), // Convert months to seconds
        teamVestingCliff: BigInt(config.vestingSchedule.team.cliff * 30 * 24 * 60 * 60),
        teamAllocation: BigInt(config.teamAllocation),
        teamWallet: config.teamWallet || address,
        developerWallet: config.developerWallet || address,
        developerAllocation: BigInt(config.developerAllocation),
        developerVestingDuration: BigInt(config.developerVesting.duration * 30 * 24 * 60 * 60),
        developerVestingCliff: BigInt(config.developerVesting.cliff * 30 * 24 * 60 * 60),
        presaleDuration: BigInt(config.presaleDuration || 7),
      };

      const contractConfig = {
        address: process.env.NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS as Address,
        abi: TokenFactoryABI,
        functionName: 'createToken',
        args: [params],
        value: parseUnits('0.1', 18), // Standard creation fee
      };

      console.log('Creating token with params:', params);

      const hash = await writeContract(contractConfig);
      
      // Update status
      setError('Transaction submitted. Waiting for confirmation...');

    } catch (err: any) {
      console.error('Token creation error:', err);
      setWriteError(err);
      
      // Provide more specific error messages
      if (err.message?.includes('network changed')) {
        setError('Network changed during transaction. Please try again.');
      } else if (err.message?.includes('no matching fragment')) {
        setError('Contract interaction failed. Please check if you are on the correct network.');
      } else if (err.message?.includes('Failed to fetch')) {
        setError('Network connection error. Please check your internet connection and try again.');
      } else {
        setError(err.message || 'Failed to create token. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
      // Note: isWriting will be set to false by the transaction watcher
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

  const handleSetDiscount = async () => {
    if (!address || !window.ethereum) return;
    
    try {
      setIsSubmitting(true);
      setError(null);

      const provider = new BrowserProvider(window.ethereum as any);
      const signer = await provider.getSigner();
      const factory = new Contract(
        process.env.NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS as string,
        TokenFactoryABI,
        signer
      );

      const tx = await factory.setDiscountedFee(
        discountAddress,
        parseUnits(discountAmount || '0', 18)
      );

      await tx.wait();
      setDiscountAddress('');
      setDiscountAmount('');
      
    } catch (err: any) {
      console.error('Error setting discount:', err);
      setError(err.message || 'Failed to set discount');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto">
      {isAdmin && (
        <Card className="bg-gray-800 border-gray-700 mb-4">
          <CardHeader className="py-3 border-b border-gray-700">
            <CardTitle className="text-lg">Admin Controls</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Discount Address</label>
                <input
                  type="text"
                  value={discountAddress}
                  onChange={(e) => setDiscountAddress(e.target.value)}
                  placeholder="0x..."
                  className={inputClassName}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Discount Amount (ETH)</label>
                <input
                  type="text"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value)}
                  placeholder="0.05"
                  className={inputClassName}
                />
              </div>
              <Button
                onClick={handleSetDiscount}
                disabled={isSubmitting || !discountAddress || !discountAmount}
                className="w-full"
              >
                {isSubmitting ? <Spinner /> : 'Set Discount'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      <div className="max-w-3xl mx-auto space-y-4">
        {/* Only show platform fee message in token distribution section */}
        {currentStep === 2 && <PlatformFeeMessage />}
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
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">Token Distribution</h3>
                  </div>

                  <div className="flex gap-4">
                    <div className="space-y-2 flex-1">
                      <LabelWithTooltip 
                        label="Presale %" 
                        tooltip="Percentage of tokens available for initial public sale before trading begins" 
                      />
                      <input
                        type="number"
                        value={config.presaleAllocation}
                        onChange={(e) => setConfig({ ...config, presaleAllocation: Number(e.target.value) })}
                        className={inputClassName}
                      />
                    </div>
                    <div className="space-y-2 flex-1">
                      <LabelWithTooltip 
                        label="Liquidity %" 
                        tooltip="Percentage locked in trading pair to enable token trading" 
                      />
                      <input
                        type="number"
                        value={config.liquidityAllocation}
                        onChange={(e) => setConfig({ ...config, liquidityAllocation: Number(e.target.value) })}
                        className={inputClassName}
                      />
                    </div>
                    <div className="space-y-2 flex-1">
                      <LabelWithTooltip 
                        label="Presale Duration" 
                        tooltip="Duration of the presale period in days. After this period, unsold tokens remain locked and presale ends automatically." 
                      />
                      <input
                        type="number"
                        value={config.presaleDuration}
                        onChange={(e) => setConfig({ ...config, presaleDuration: Math.max(1, Math.min(30, Number(e.target.value))) })}
                        min="1"
                        max="30"
                        className={inputClassName}
                        placeholder="7"
                      />
                      <p className="text-[10px] text-gray-400">1-30 days</p>
                    </div>
                  </div>

                  {/* Presale Mechanism - Foldable */}
                  <div className="p-2 rounded bg-blue-900/20 border border-blue-800 text-xs">
                    <div 
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => setIsPresaleMechanismExpanded(!isPresaleMechanismExpanded)}
                    >
                      <div className="flex items-center gap-2">
                        <InfoIcon className="h-4 w-4 text-blue-400" />
                        <span className="font-medium">Presale Mechanism</span>
                      </div>
                      {isPresaleMechanismExpanded ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                    </div>
                    {isPresaleMechanismExpanded && (
                      <div className="mt-2 space-y-2 text-gray-300">
                        <p>1. <strong>Initial Setup</strong>: {config.presaleAllocation}% of total supply ({config.totalSupply ? formatNumber(Number(config.totalSupply) * config.presaleAllocation / 100) : '0'} tokens) allocated for presale</p>
                        <p>2. <strong>Fixed Price</strong>: {config.initialPrice || '0'} ETH per token</p>
                        <p>3. <strong>Duration</strong>:</p>
                        <ul className="list-disc list-inside pl-4 space-y-1">
                          <li>Starts immediately after token creation</li>
                          <li>Automatic countdown for {config.presaleDuration} days</li>
                          <li>Ends when either:
                            <ul className="list-[circle] list-inside pl-4 mt-1 text-gray-400">
                              <li>All tokens are sold (hard cap reached)</li>
                              <li>Timer reaches {config.presaleDuration} days</li>
                              <li>Contract owner manually ends sale</li>
                            </ul>
                          </li>
                        </ul>
                        <p>4. <strong>Automatic Process</strong>:</p>
                        <ul className="list-disc list-inside pl-4 space-y-1">
                          <li>Investors send ETH to participate</li>
                          <li>Tokens are distributed instantly upon payment</li>
                          <li>Progress and time remaining tracked via smart contract</li>
                        </ul>
                        <p>5. <strong>After Presale</strong>:</p>
                        <ul className="list-disc list-inside pl-4 space-y-1">
                          <li>{config.liquidityAllocation}% of tokens automatically paired with ETH for liquidity</li>
                          <li>Trading becomes enabled on DEX</li>
                          <li>Any unsold tokens remain locked in the contract</li>
                        </ul>
                        <div className="mt-2 p-2 bg-yellow-900/20 border border-yellow-800 rounded">
                          <p className="text-yellow-400 flex items-center gap-1">
                            <InfoIcon className="h-3 w-3" />
                            Important: Presale ends automatically after {config.presaleDuration} days or when all tokens are sold.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-4">
                    <div className="space-y-2 flex-1">
                      <LabelWithTooltip 
                        label="Team %" 
                        tooltip="Percentage allocated to the project team (minimum 2% for platform fee)" 
                      />
                      <input
                        type="number"
                        min="2"
                        max="100"
                        value={config.teamAllocation}
                        onChange={(e) => setConfig({ ...config, teamAllocation: Number(e.target.value) })}
                        className={inputClassName}
                        placeholder="2"
                      />
                    </div>
                    <div className="space-y-2 flex-1">
                      <LabelWithTooltip 
                        label="Marketing %" 
                        tooltip="Percentage allocated for marketing and promotional activities" 
                      />
                      <input
                        type="number"
                        value={config.marketingAllocation}
                        onChange={(e) => setConfig({ ...config, marketingAllocation: Number(e.target.value) })}
                        className={inputClassName}
                      />
                    </div>
                    <div className="space-y-2 flex-1">
                      <LabelWithTooltip 
                        label="Creator %" 
                        tooltip="Percentage allocated to you (the token creator) for development and maintenance" 
                      />
                      <input
                        type="number"
                        value={config.developerAllocation}
                        onChange={(e) => setConfig({ ...config, developerAllocation: Number(e.target.value) })}
                        className={inputClassName}
                      />
                    </div>
                  </div>

                  <div className="mt-4 p-2 rounded bg-gray-900/50 border border-gray-700">
                    <h4 className="text-sm font-medium mb-2">Wallet Address Requirements:</h4>
                    <ul className="text-xs space-y-1 text-gray-300">
                      <li>• Presale - Handled automatically by the contract</li>
                      <li>• Liquidity - Locked in the trading pair automatically</li>
                      <li>• Team - Separate wallet recommended for team funds</li>
                      <li>• Marketing - Separate wallet recommended for tracking expenses</li>
                      <li>• Creator - Your development/maintenance wallet</li>
                    </ul>
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

                  {/* Marketing Wallet */}
                  <div className="space-y-2">
                    <LabelWithTooltip 
                      label="Marketing Wallet Address" 
                      tooltip="Address that will receive the marketing allocation" 
                    />
                    <input
                      type="text"
                      value={config.marketingWallet}
                      onChange={(e) => setConfig({ ...config, marketingWallet: e.target.value })}
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

        {/* Create Button and Status */}
        <div className="space-y-4">
          <div>
            <Button
              onClick={handleCreateToken}
              disabled={!isValid || isWriting || !address}
              className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-base"
            >
              <div className="flex items-center justify-center gap-2">
                {isWriting && <Spinner className="h-5 w-5" />}
                {isWriting ? 'Creating Token...' : 'Create Token'}
              </div>
            </Button>
          </div>

          {writeError && (
            <Alert variant="destructive">
              <AlertDescription>
                {writeError.message}
              </AlertDescription>
            </Alert>
          )}

          {deployedToken && (
            <div className="space-y-4">
              <Alert className="bg-green-900/20 border-green-800">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                  <div className="space-y-2">
                    <h3 className="font-medium">Token Created Successfully! 🎉</h3>
                    <div className="space-y-1 text-sm">
                      <p>Your token has been created with the following details:</p>
                      <div className="bg-black/20 p-2 rounded font-mono text-xs">
                        <div className="flex items-center justify-between">
                          <span>Token Address:</span>
                          <div className="flex items-center gap-2">
                            <code>{deployedToken.address}</code>
                            <Copy 
                              className="h-3 w-3 cursor-pointer hover:text-white" 
                              onClick={() => navigator.clipboard.writeText(deployedToken.address)}
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-3">
                        <p className="font-medium mb-1">Next Steps:</p>
                        <ol className="list-decimal list-inside space-y-1 pl-2 text-gray-300">
                          <li>Add token to MetaMask:
                            <ul className="list-disc list-inside pl-4 mt-1 text-xs text-gray-400">
                              <li>Open MetaMask</li>
                              <li>Click "Import tokens"</li>
                              <li>Paste the token address above</li>
                              <li>Click "Add Custom Token"</li>
                            </ul>
                          </li>
                          <li>View on{' '}
                            <a 
                              href={`${chainId === 11155111 ? 'https://sepolia.etherscan.io' : 'https://etherscan.io'}/address/${deployedToken.address}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300"
                            >
                              Etherscan
                            </a>
                          </li>
                          <li>Test token transfers and vesting schedules</li>
                          <li>Deploy to mainnet when ready</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                </div>
              </Alert>

              {/* Move Verify & Publish section to the end */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="py-3 border-b border-gray-700">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ExternalLink className="h-5 w-5" />
                      Verify & Publish Contract
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setIsVerifyExpanded(!isVerifyExpanded);
                      }}
                      className="h-7"
                    >
                      {isVerifyExpanded ? 'Hide Details' : 'Show Details'}
                    </Button>
                  </CardTitle>
                </CardHeader>
                {isVerifyExpanded && (
                  <CardContent className="p-4 space-y-3">
                    <div className="text-sm">
                      <p>Verify your contract on {chainId === 11155111 ? 'Sepolia' : 'Ethereum Mainnet'} Etherscan:</p>
                      <ul className="list-disc list-inside mt-2 space-y-1 text-gray-300">
                        <li>Make your contract source code public</li>
                        <li>Enable direct interaction through Etherscan</li>
                        <li>Build trust with your community</li>
                      </ul>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Steps to Verify:</h4>
                      <ol className="list-decimal list-inside space-y-2 text-sm text-gray-300">
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
                          </div>
                        </li>
                        <li>Go to your contract on Etherscan:
                          <div className="ml-4 mt-1">
                            <a 
                              href={`${chainId === 11155111 ? 'https://sepolia.etherscan.io' : 'https://etherscan.io'}/address/${deployedToken.address}#code`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300 inline-flex items-center gap-1"
                            >
                              View Contract
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        </li>
                        <li>Click "Verify & Publish"</li>
                        <li>Select Solidity (Single file)</li>
                        <li>Choose compiler version 0.8.19</li>
                        <li>Enable optimization (200 runs)</li>
                        <li>Copy contract source code</li>
                        <li>Submit for verification</li>
                      </ol>
                    </div>

                    <Alert variant="default" className="bg-blue-900/20 border-blue-800 mt-4">
                      <AlertTitle className="flex items-center gap-2">
                        <InfoIcon className="h-4 w-4" />
                        Important
                      </AlertTitle>
                      <AlertDescription className="mt-2 text-sm">
                        Keep your Etherscan API key private and never share it publicly.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                )}
              </Card>
            </div>
          )}
        </div>

        {/* Vesting Example Modal */}
        {isVestingModalOpen && (
          <VestingExampleModal onClose={() => setIsVestingModalOpen(false)} />
        )}
      </div>
    </div>
  );
} 