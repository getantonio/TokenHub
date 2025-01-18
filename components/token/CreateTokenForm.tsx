"use client";

import React, { useState } from 'react';
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

export const CreateTokenForm = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { address } = useAccount();
  const chainId = useChainId();

  const [config, setConfig] = useState<TokenConfig>({
    name: '',
    symbol: '',
    description: '',
    website: '',
    totalSupply: '',
    decimals: 18,
    initialPrice: '',
    presaleAllocation: 60,
    liquidityAllocation: 20,
    teamAllocation: 10,
    marketingAllocation: 10,
    maxTransferAmount: '',
    cooldownTime: 0,
    transfersEnabled: true,
    antiBot: true,
    vestingSchedule: {
      team: { duration: 12, cliff: 1 },
      advisors: { duration: 6, cliff: 1 }
    },
    teamWallet: '',
  });

  const [isVestingModalOpen, setIsVestingModalOpen] = useState(false);

  const totalAllocation = 
    config.presaleAllocation + 
    config.liquidityAllocation + 
    config.teamAllocation + 
    config.marketingAllocation;

  const validationErrors = validateTokenConfig(config);
  const isValid = validationErrors.length === 0;

  const LabelWithTooltip = ({ label, tooltip }: { label: string; tooltip: string }) => (
    <Tooltip content={tooltip}>
      <label className="text-xs font-medium mb-1">{label}</label>
    </Tooltip>
  );

  // Contract interaction setup
  const { writeContract, isPending } = useWriteContract();

  const handleCreateToken = async () => {
    try {
      setIsCreating(true);
      setError(null);

      if (!address) {
        throw new Error('Please connect your wallet');
      }

      if (!chainId) {
        throw new Error('Please connect to a supported network');
      }

      // Validate total allocation
      const totalAllocation = 
        config.presaleAllocation + 
        config.liquidityAllocation + 
        config.teamAllocation + 
        config.marketingAllocation;

      if (totalAllocation !== 100) {
        throw new Error('Total allocation must equal 100%');
      }

      // Call the contract
      await writeContract({
        abi: TokenFactoryABI,
        address: process.env.NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS as `0x${string}`,
        functionName: 'createToken',
        args: [
          {
            name: config.name,
            symbol: config.symbol,
            maxSupply: parseUnits(config.totalSupply || '0', config.decimals),
            initialSupply: parseUnits(config.totalSupply || '0', config.decimals),
            tokenPrice: parseUnits(config.initialPrice || '0', 18), // ETH has 18 decimals
            maxTransferAmount: config.maxTransferAmount ? parseUnits(config.maxTransferAmount, config.decimals) : 0n,
            cooldownTime: BigInt(config.cooldownTime),
            transfersEnabled: config.transfersEnabled,
            antiBot: config.antiBot,
            teamVestingDuration: BigInt(config.vestingSchedule.team.duration),
            teamVestingCliff: BigInt(config.vestingSchedule.team.cliff),
            teamAllocation: BigInt(config.teamAllocation),
            teamWallet: config.teamWallet || address || '0x',
          }
        ],
        value: parseEther('0.1'), // Creation fee - should be fetched from contract
      });

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create token';
      setError(errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card className="w-full bg-gray-800 text-white">
        <CardHeader className="py-3">
          <CardTitle className="text-lg">Create Your Token</CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-2">
              <TabsTrigger value="basic">Basic</TabsTrigger>
              <TabsTrigger value="tokenomics">Token</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>

            <TabsContent value="basic">
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <LabelWithTooltip label="Name" tooltip={tooltips.name} />
                    <input
                      type="text"
                      className="w-full px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-sm"
                      placeholder="e.g., My Awesome Token"
                      value={config.name}
                      onChange={(e) => setConfig({...config, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <LabelWithTooltip label="Symbol" tooltip={tooltips.symbol} />
                    <input
                      type="text"
                      className="w-full px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-sm"
                      placeholder="e.g., MAT"
                      value={config.symbol}
                      onChange={(e) => setConfig({...config, symbol: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg"
                    placeholder="Describe your token's purpose..."
                    value={config.description}
                    onChange={(e) => setConfig({...config, description: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Website</label>
                  <input
                    type="url"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg"
                    placeholder="https://..."
                    value={config.website}
                    onChange={(e) => setConfig({...config, website: e.target.value})}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="tokenomics">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <LabelWithTooltip label="Total Supply" tooltip={tooltips.totalSupply} />
                    <input
                      type="number"
                      className="w-full px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-sm"
                      placeholder="1000000"
                      value={config.totalSupply}
                      onChange={(e) => setConfig({...config, totalSupply: e.target.value})}
                    />
                  </div>

                  <div>
                    <LabelWithTooltip label="Initial Price" tooltip={tooltips.initialPrice} />
                    <div className="relative">
                      <input
                        type="number"
                        className="w-full px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-sm"
                        placeholder="0.0001"
                        value={config.initialPrice}
                        onChange={(e) => setConfig({...config, initialPrice: e.target.value})}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                        ETH
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <LabelWithTooltip 
                      label="Token Distribution" 
                      tooltip={tooltips.distribution}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <LabelWithTooltip 
                        label="Presale (%)" 
                        tooltip={tooltips.presaleAllocation}
                      />
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          className="w-full px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-sm"
                          value={config.presaleAllocation}
                          onChange={(e) => setConfig({...config, presaleAllocation: Number(e.target.value)})}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                          %
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Recommended: 40-60%</p>
                    </div>

                    <div>
                      <LabelWithTooltip 
                        label="Liquidity (%)" 
                        tooltip={tooltips.liquidityAllocation}
                      />
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          className="w-full px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-sm"
                          value={config.liquidityAllocation}
                          onChange={(e) => setConfig({...config, liquidityAllocation: Number(e.target.value)})}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                          %
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Recommended: 20-30%</p>
                    </div>

                    <div>
                      <LabelWithTooltip 
                        label="Team (%)" 
                        tooltip={tooltips.teamAllocation}
                      />
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          className="w-full px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-sm"
                          value={config.teamAllocation}
                          onChange={(e) => setConfig({...config, teamAllocation: Number(e.target.value)})}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                          %
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Recommended: 10-15%</p>
                    </div>

                    <div>
                      <LabelWithTooltip 
                        label="Marketing (%)" 
                        tooltip={tooltips.marketingAllocation}
                      />
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          className="w-full px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-sm"
                          value={config.marketingAllocation}
                          onChange={(e) => setConfig({...config, marketingAllocation: Number(e.target.value)})}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                          %
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Recommended: 5-15%</p>
                    </div>
                  </div>

                  {/* Distribution Total Validation */}
                  <div className="mt-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span>Total Distribution</span>
                      <span className={totalAllocation === 100 ? 'text-green-400' : 'text-red-400'}>
                        {totalAllocation}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-lg h-3 overflow-hidden">
                      <div className="h-full flex">
                        <div className="bg-blue-500 h-full" style={{ width: `${config.presaleAllocation}%` }} />
                        <div className="bg-green-500 h-full" style={{ width: `${config.liquidityAllocation}%` }} />
                        <div className="bg-yellow-500 h-full" style={{ width: `${config.teamAllocation}%` }} />
                        <div className="bg-purple-500 h-full" style={{ width: `${config.marketingAllocation}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="security">
              <div className="space-y-4">
                <div>
                  <LabelWithTooltip label="Max Transfer Amount" tooltip={tooltips.maxTransferAmount} />
                  <input
                    type="number"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg"
                    placeholder="% of total supply"
                    value={config.maxTransferAmount}
                    onChange={(e) => setConfig({...config, maxTransferAmount: e.target.value})}
                  />
                </div>

                <div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={config.antiBot}
                      onChange={(e) => setConfig({...config, antiBot: e.target.checked})}
                    />
                    <Tooltip content={tooltips.antiBot}>
                      <span>Enable Anti-Bot Protection</span>
                    </Tooltip>
                  </div>
                </div>

                <div>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={config.transfersEnabled}
                      onChange={(e) => setConfig({...config, transfersEnabled: e.target.checked})}
                    />
                    <span>Enable Transfers on Launch</span>
                  </label>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="advanced">
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <LabelWithTooltip 
                      label="Team Vesting Schedule" 
                      tooltip={tooltips.teamVesting}
                    />
                    <button
                      type="button"
                      onClick={() => setIsVestingModalOpen(true)}
                      className="text-xs text-blue-400 hover:text-blue-300"
                    >
                      View Example
                    </button>
                  </div>

                  <VestingExampleModal 
                    isOpen={isVestingModalOpen}
                    onClose={() => setIsVestingModalOpen(false)}
                  />

                  <div className="bg-gray-700/50 p-3 rounded-lg mb-4">
                    <p className="text-xs text-gray-300 mb-2">
                      {tooltips.vestingExample}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <LabelWithTooltip 
                        label="Duration (months)" 
                        tooltip={tooltips.vestingDuration}
                      />
                      <div className="relative">
                        <input
                          type="number"
                          min="1"
                          max="60"
                          className="w-full px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-sm"
                          value={config.vestingSchedule.team.duration}
                          onChange={(e) => setConfig({
                            ...config,
                            vestingSchedule: {
                              ...config.vestingSchedule,
                              team: { ...config.vestingSchedule.team, duration: Number(e.target.value) }
                            }
                          })}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                          months
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        Recommended: 12-24 months
                      </p>
                    </div>

                    <div>
                      <LabelWithTooltip 
                        label="Cliff Period" 
                        tooltip={tooltips.vestingCliff}
                      />
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max={config.vestingSchedule.team.duration}
                          className="w-full px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-sm"
                          value={config.vestingSchedule.team.cliff}
                          onChange={(e) => setConfig({
                            ...config,
                            vestingSchedule: {
                              ...config.vestingSchedule,
                              team: { ...config.vestingSchedule.team, cliff: Number(e.target.value) }
                            }
                          })}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                          months
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        Recommended: 3-6 months
                      </p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <LabelWithTooltip 
                      label="Team Wallet Address" 
                      tooltip="The wallet address that will receive the vested team tokens"
                    />
                    <input
                      type="text"
                      className="w-full px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-sm"
                      placeholder="0x..."
                      value={config.teamWallet}
                      onChange={(e) => setConfig({
                        ...config,
                        teamWallet: e.target.value
                      })}
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Leave empty to use your connected wallet
                    </p>
                  </div>

                  {/* Vesting Schedule Preview */}
                  <div className="mt-4">
                    <h4 className="text-sm font-medium mb-2">Release Schedule Preview</h4>
                    <div className="w-full bg-gray-700 rounded-lg h-6 overflow-hidden">
                      <div 
                        className="h-full bg-gray-600"
                        style={{ width: `${(config.vestingSchedule.team.cliff / config.vestingSchedule.team.duration) * 100}%` }}
                      />
                      <div 
                        className="h-full bg-blue-500"
                        style={{ 
                          width: `${((config.vestingSchedule.team.duration - config.vestingSchedule.team.cliff) / config.vestingSchedule.team.duration) * 100}%`,
                          marginLeft: `${(config.vestingSchedule.team.cliff / config.vestingSchedule.team.duration) * 100}%`
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>Start</span>
                      <span>{`${config.vestingSchedule.team.cliff}m Cliff`}</span>
                      <span>{`${config.vestingSchedule.team.duration}m Total`}</span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="mt-4">
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <button
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 disabled:cursor-not-allowed rounded-lg font-medium text-sm"
              onClick={handleCreateToken}
              disabled={isCreating || !isValid || !writeContract || isPending}
            >
              {isCreating || isPending ? (
                <div className="flex items-center justify-center gap-2">
                  <Spinner size="sm" />
                  <span>Creating Token...</span>
                </div>
              ) : (
                'Create Token'
              )}
            </button>
          </div>
        </CardContent>
      </Card>

      <TokenPreview 
        config={config}
        isValid={isValid}
        validationErrors={validationErrors}
      />
    </div>
  );
}; 