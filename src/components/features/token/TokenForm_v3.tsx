import { useState, useEffect } from 'react';
import { BrowserProvider, Contract, parseUnits, formatUnits } from 'ethers';
import TokenFactory_v3 from '@contracts/abi/TokenFactory_v3.0.0.json';
import { getNetworkContractAddress } from '@config/contracts';
import { getExplorerUrl } from '@config/networks';
import { useNetwork } from '@contexts/NetworkContext';
import { useToast } from '@/components/ui/toast/use-toast';
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
  const { toast } = useToast();

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
    toast({
      variant: type === 'error' ? 'destructive' : 'default',
      title: type === 'error' ? 'Error' : 'Success',
      description: (
        <div>
          {message}
          {link && (
            <a href={link} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700 ml-2">
              View Transaction
            </a>
          )}
        </div>
      ),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected || !chainId || !externalProvider || !address) {
      showToast('error', 'Please connect your wallet first');
      return;
    }

    try {
      setIsLoading(true);
      console.log('Creating token with params:', {
        name,
        symbol,
        initialSupply,
        maxSupply,
        governanceConfig
      });

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
      const fee = await factory.deploymentFee();
      console.log('Deployment fee:', formatUnits(fee, 18), 'ETH');

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

      showToast('success', 'Creating token...');

      // Deploy token
      const tx = await factory.createToken(
        name,
        symbol,
        initialSupplyWei,
        maxSupplyWei,
        config,
        { value: fee }
      );

      showToast('success', 'Transaction submitted, waiting for confirmation...');
      console.log('Transaction submitted:', tx.hash);
      
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);

      const event = receipt.logs.find(
        (log: any) => log.fragment?.name === 'TokenCreated'
      );

      if (event) {
        const tokenAddress = event.args[0];
        const explorerUrl = getExplorerUrl(chainId, tokenAddress, 'token');
        console.log('Token created at:', tokenAddress);
        console.log('Explorer URL:', explorerUrl);

        showToast(
          'success',
          'Token deployed successfully!',
          explorerUrl
        );
      } else {
        console.error('TokenCreated event not found in logs');
        showToast('error', 'Token created but event not found in logs');
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Create Token (V3)</h2>
        <p className="text-sm text-gray-400 mb-6">
          Create a governance token with DAO features. This version includes voting, proposals, timelock, and treasury management.
        </p>

        <form onSubmit={handleSubmit} className="form-compact">
          {/* Basic Token Info */}
          <div className="form-group">
            <h3 className="text-lg font-semibold mb-4">Token Information</h3>
            
            <div className="form-group">
              <Label htmlFor="name">Token Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. My Governance Token"
                required
              />
            </div>

            <div className="form-group">
              <Label htmlFor="symbol">Token Symbol</Label>
              <Input
                id="symbol"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                placeholder="e.g. MGT"
                required
              />
            </div>

            <div className="form-group">
              <Label htmlFor="initialSupply">Initial Supply</Label>
              <Input
                id="initialSupply"
                type="number"
                value={initialSupply}
                onChange={(e) => setInitialSupply(e.target.value)}
                placeholder="e.g. 1000000"
                required
              />
              <p className="help-text">Each token has 18 decimals</p>
            </div>

            <div className="form-group">
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
          <div className="form-group mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Governance Configuration</h3>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={useCustomConfig}
                  onCheckedChange={setUseCustomConfig}
                  id="custom-config"
                />
                <Label htmlFor="custom-config" className="text-sm">Custom Configuration</Label>
              </div>
            </div>

            {useCustomConfig && (
              <div className="space-y-4">
                <div className="form-group">
                  <Label className="mb-2">
                    Voting Delay: {governanceConfig.votingDelay} days
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
                    className="my-2"
                  />
                </div>

                <div className="form-group">
                  <Label className="mb-2">
                    Voting Period: {governanceConfig.votingPeriod} days
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
                    className="my-2"
                  />
                </div>

                <div className="form-group">
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

                <div className="form-group">
                  <Label className="mb-2">
                    Quorum: {governanceConfig.quorumNumerator}%
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
                    className="my-2"
                  />
                </div>

                <div className="form-group">
                  <Label className="mb-2">
                    Timelock Delay: {governanceConfig.timelockDelay} days
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
                    className="my-2"
                  />
                </div>
              </div>
            )}
          </div>

          <Button
            type="submit"
            className="w-full mt-6"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Spinner className="w-4 h-4 mr-2" />
                Deploying...
              </>
            ) : (
              'Deploy Token'
            )}
          </Button>
        </form>
      </Card>

      {/* Preview Section */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Token Preview</h3>
        <div className="space-y-4">
          <div className="p-4 bg-gray-800 rounded-lg">
            <h4 className="text-sm font-medium text-gray-300 mb-2">Token Details</h4>
            <div className="space-y-2">
              <p className="text-sm"><span className="text-gray-400">Name:</span> {name || 'Not set'}</p>
              <p className="text-sm"><span className="text-gray-400">Symbol:</span> {symbol || 'Not set'}</p>
              <p className="text-sm"><span className="text-gray-400">Initial Supply:</span> {initialSupply || '0'}</p>
              <p className="text-sm"><span className="text-gray-400">Max Supply:</span> {maxSupply || '0'}</p>
            </div>
          </div>

          {useCustomConfig && (
            <div className="p-4 bg-gray-800 rounded-lg">
              <h4 className="text-sm font-medium text-gray-300 mb-2">Governance Settings</h4>
              <div className="space-y-2">
                <p className="text-sm"><span className="text-gray-400">Voting Delay:</span> {governanceConfig.votingDelay} days</p>
                <p className="text-sm"><span className="text-gray-400">Voting Period:</span> {governanceConfig.votingPeriod} days</p>
                <p className="text-sm"><span className="text-gray-400">Proposal Threshold:</span> {governanceConfig.proposalThreshold} tokens</p>
                <p className="text-sm"><span className="text-gray-400">Quorum:</span> {governanceConfig.quorumNumerator}%</p>
                <p className="text-sm"><span className="text-gray-400">Timelock Delay:</span> {governanceConfig.timelockDelay} days</p>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
} 