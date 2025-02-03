import { useState, useEffect } from 'react';
import { BrowserProvider, Contract, parseUnits } from 'ethers';
import TokenFactory_v3 from '@contracts/abi/TokenFactory_v3.0.0.json';
import { getNetworkContractAddress } from '@config/contracts';
import { getExplorerUrl } from '@config/networks';
import { useNetwork } from '@contexts/NetworkContext';
import { Toast } from '@components/ui/Toast';
import { Spinner } from '@components/ui/Spinner';
import { Input } from '@components/ui/input';
import { Button } from '@components/ui/button';
import { Card } from '@components/ui/card';
import { Switch } from '@components/ui/switch';
import { Label } from '@components/ui/label';
import { Slider } from '@components/ui/slider';

interface TokenFormProps {
  isConnected: boolean;
  address?: string;
  provider: BrowserProvider | null;
}

interface ToastMessage {
  type: 'success' | 'error';
  message: string;
  link?: string;
}

interface GovernanceConfig {
  votingDelay: number;
  votingPeriod: number;
  proposalThreshold: string;
  quorumNumerator: number;
  timelockDelay: number;
}

export default function TokenForm({ isConnected, address, provider: externalProvider }: TokenFormProps) {
  const { chainId } = useNetwork();
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Token basic info
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [initialSupply, setInitialSupply] = useState('');
  const [maxSupply, setMaxSupply] = useState('');

  // Governance configuration
  const [useCustomConfig, setUseCustomConfig] = useState(false);
  const [governanceConfig, setGovernanceConfig] = useState<GovernanceConfig>({
    votingDelay: 1,
    votingPeriod: 7,
    proposalThreshold: '100000',
    quorumNumerator: 4,
    timelockDelay: 2
  });

  const showToast = (type: 'success' | 'error', message: string, link?: string) => {
    setToast({ type, message, link });
    setTimeout(() => setToast(null), 5000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected || !chainId || !externalProvider || !address) {
      showToast('error', 'Please connect your wallet first');
      return;
    }

    try {
      setIsLoading(true);
      const signer = await externalProvider.getSigner();
      const factory = new Contract(address, TokenFactory_v3.abi, signer);

      // Convert supply to wei
      const initialSupplyWei = parseUnits(initialSupply, 18);
      const maxSupplyWei = parseUnits(maxSupply, 18);
      const proposalThresholdWei = parseUnits(governanceConfig.proposalThreshold, 18);

      // Convert time periods to blocks (assuming 12 second block time)
      const blocksPerDay = 7200; // 24 * 60 * 60 / 12
      const votingDelayBlocks = governanceConfig.votingDelay * blocksPerDay;
      const votingPeriodBlocks = governanceConfig.votingPeriod * blocksPerDay;
      const timelockDelaySeconds = governanceConfig.timelockDelay * 24 * 60 * 60;

      // Get deployment fee
      const fee = await factory.getDeploymentFee(await signer.getAddress());

      // Prepare governance config
      const config = useCustomConfig ? {
        votingDelay: votingDelayBlocks,
        votingPeriod: votingPeriodBlocks,
        proposalThreshold: proposalThresholdWei,
        quorumNumerator: governanceConfig.quorumNumerator,
        timelockDelay: timelockDelaySeconds
      } : {
        votingDelay: 0,
        votingPeriod: 0,
        proposalThreshold: 0,
        quorumNumerator: 0,
        timelockDelay: 0
      };

      // Deploy token
      const tx = await factory.createToken(
        name,
        symbol,
        initialSupplyWei,
        maxSupplyWei,
        config,
        { value: fee }
      );

      showToast('success', 'Transaction submitted...');
      
      const receipt = await tx.wait();
      const event = receipt.logs.find(
        (log: any) => log.fragment?.name === 'TokenCreated'
      );

      if (event) {
        const tokenAddress = event.args[0];
        showToast(
          'success',
          'Token deployed successfully!',
          `${getExplorerUrl(chainId, tokenAddress, 'token')}`
        );
      }

      // Reset form
      setName('');
      setSymbol('');
      setInitialSupply('');
      setMaxSupply('');
      setUseCustomConfig(false);
      setGovernanceConfig({
        votingDelay: 1,
        votingPeriod: 7,
        proposalThreshold: '100000',
        quorumNumerator: 4,
        timelockDelay: 2
      });
    } catch (error: any) {
      console.error('Error deploying token:', error);
      showToast('error', error.message || 'Failed to deploy token');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Create Token (V3)</h2>
        <p className="text-gray-400">Please connect your wallet to create a token.</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h2 className="text-xl font-bold mb-4">Create Token (V3)</h2>
      <p className="text-sm text-gray-400 mb-6">
        Create a governance token with DAO features. This version includes voting, proposals, timelock, and treasury management.
      </p>

      {toast && <Toast type={toast.type} message={toast.message} link={toast.link} />}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Token Info */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Token Information</h3>
          
          <div className="space-y-2">
            <Label htmlFor="name">Token Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. My Governance Token"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="symbol">Token Symbol</Label>
            <Input
              id="symbol"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              placeholder="e.g. MGT"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="initialSupply">Initial Supply</Label>
            <Input
              id="initialSupply"
              type="number"
              value={initialSupply}
              onChange={(e) => setInitialSupply(e.target.value)}
              placeholder="e.g. 1000000"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxSupply">Maximum Supply</Label>
            <Input
              id="maxSupply"
              type="number"
              value={maxSupply}
              onChange={(e) => setMaxSupply(e.target.value)}
              placeholder="e.g. 10000000"
              required
            />
          </div>
        </div>

        {/* Governance Configuration */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Governance Configuration</h3>
            <div className="flex items-center space-x-2">
              <Switch
                checked={useCustomConfig}
                onCheckedChange={setUseCustomConfig}
                id="custom-config"
              />
              <Label htmlFor="custom-config">Custom Configuration</Label>
            </div>
          </div>

          {useCustomConfig && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>
                  Voting Delay (days): {governanceConfig.votingDelay}
                </Label>
                <Slider
                  value={[governanceConfig.votingDelay]}
                  onValueChange={([value]: [number]) => setGovernanceConfig({
                    ...governanceConfig,
                    votingDelay: value
                  })}
                  min={1}
                  max={7}
                  step={1}
                />
              </div>

              <div className="space-y-2">
                <Label>
                  Voting Period (days): {governanceConfig.votingPeriod}
                </Label>
                <Slider
                  value={[governanceConfig.votingPeriod]}
                  onValueChange={([value]: [number]) => setGovernanceConfig({
                    ...governanceConfig,
                    votingPeriod: value
                  })}
                  min={1}
                  max={14}
                  step={1}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="proposalThreshold">
                  Proposal Threshold (tokens)
                </Label>
                <Input
                  id="proposalThreshold"
                  type="number"
                  value={governanceConfig.proposalThreshold}
                  onChange={(e) => setGovernanceConfig({
                    ...governanceConfig,
                    proposalThreshold: e.target.value
                  })}
                  placeholder="e.g. 100000"
                />
              </div>

              <div className="space-y-2">
                <Label>
                  Quorum Percentage: {governanceConfig.quorumNumerator}%
                </Label>
                <Slider
                  value={[governanceConfig.quorumNumerator]}
                  onValueChange={([value]: [number]) => setGovernanceConfig({
                    ...governanceConfig,
                    quorumNumerator: value
                  })}
                  min={1}
                  max={10}
                  step={1}
                />
              </div>

              <div className="space-y-2">
                <Label>
                  Timelock Delay (days): {governanceConfig.timelockDelay}
                </Label>
                <Slider
                  value={[governanceConfig.timelockDelay]}
                  onValueChange={([value]: [number]) => setGovernanceConfig({
                    ...governanceConfig,
                    timelockDelay: value
                  })}
                  min={1}
                  max={7}
                  step={1}
                />
              </div>
            </div>
          )}
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? (
            <Spinner className="w-4 h-4 mr-2" />
          ) : null}
          {isLoading ? 'Deploying...' : 'Deploy Token'}
        </Button>
      </form>
    </Card>
  );
} 