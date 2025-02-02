import { useState, useEffect } from 'react';
import { BrowserProvider, Contract, parseUnits, formatUnits } from 'ethers';
import { useNetwork } from '@contexts/NetworkContext';
import TokenFactory_v2 from '@contracts/abi/TokenFactory_v2.1.0.json';
import { getExplorerUrl } from '@config/networks';
import { getNetworkContractAddress } from '@config/contracts';
import { Toast } from '@components/ui/Toast';
import { TokenPreview } from '@components/features/token/TokenPreview';
import TokenAdminV2 from '@components/features/token/TCAP_v2';
import { InfoIcon } from '@components/ui/InfoIcon';
import type { TokenConfig } from '../../../types/token-config';
import { Spinner } from '@components/ui/Spinner';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { Switch } from '@components/ui/switch';
import { Button } from '@components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/card';

interface TokenFormV2Props {
  isConnected: boolean;
}

interface FormData {
  name: string;
  symbol: string;
  initialSupply: string;
  maxSupply: string;
  initialPrice: string;
  presaleRate: string;
  minContribution: string;
  maxContribution: string;
  presaleCap: string;
  startTime: string;
  endTime: string;
  enableBlacklist: boolean;
  enableTimeLock: boolean;
  customOwner: string;
}

interface ToastMessage {
  type: 'success' | 'error';
  message: string;
  link?: string;
}

const getDefaultTimes = () => {
  const now = new Date();
  const startTime = new Date(now.getTime() + 3600000);
  const endTime = new Date(now.getTime() + 86400000);
  return {
    startTime: startTime.toISOString().slice(0, 16),
    endTime: endTime.toISOString().slice(0, 16)
  };
};

const defaultValues: FormData = {
  name: 'Test Token',
  symbol: 'TEST',
  initialSupply: '1000000',
  maxSupply: '2000000',
  initialPrice: '0.001',
  presaleRate: '100',
  minContribution: '0.1',
  maxContribution: '1',
  presaleCap: '10',
  ...getDefaultTimes(),
  enableBlacklist: false,
  enableTimeLock: false,
  customOwner: ''
};

export function TokenFormV2({ isConnected }: TokenFormV2Props) {
  const { chainId } = useNetwork();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [v2Available, setV2Available] = useState<boolean>(false);
  const [deploymentFee, setDeploymentFee] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(defaultValues);
  const [successInfo, setSuccessInfo] = useState<{
    message: string;
    tokenAddress: string;
    explorerUrl: string;
    symbol: string;
    initialSupply: string;
    owner: string | null;
  } | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);

  const [previewConfig, setPreviewConfig] = useState<TokenConfig>({
    name: formData.name,
    symbol: formData.symbol,
    totalSupply: formData.maxSupply,
    initialPrice: formData.initialPrice,
    presaleAllocation: 40,
    liquidityAllocation: 30,
    teamAllocation: 10,
    marketingAllocation: 10,
    developerAllocation: 10
  });

  // Update preview whenever form data changes
  useEffect(() => {
    setPreviewConfig({
      ...previewConfig,
      name: formData.name,
      symbol: formData.symbol,
      totalSupply: formData.maxSupply,
      initialPrice: formData.initialPrice
    });
  }, [formData]);

  // Check V2 availability
  useEffect(() => {
    const checkV2Availability = async () => {
      if (!chainId) {
        setV2Available(false);
        return;
      }

      try {
        const factoryAddress = getNetworkContractAddress(chainId, 'factoryAddressV2');
        if (!factoryAddress || factoryAddress === '') {
          setV2Available(false);
          return;
        }

        if (window.ethereum) {
          const provider = new BrowserProvider(window.ethereum);
          try {
            const code = await provider.getCode(factoryAddress);
            const hasCode = code !== '0x' && code !== '0x0';
            setV2Available(hasCode);
          } catch (error) {
            setV2Available(false);
          }
        }
      } catch (error) {
        setV2Available(false);
      }
    };

    checkV2Availability();
  }, [chainId]);

  // Fetch deployment fee
  useEffect(() => {
    const fetchDeploymentFee = async () => {
      if (!window.ethereum || !chainId) {
        setDeploymentFee('Not available on this network');
        return;
      }

      try {
        const factoryAddress = getNetworkContractAddress(chainId, 'factoryAddressV2');
        if (!factoryAddress) {
          setDeploymentFee('Not available on this network');
          return;
        }

        const provider = new BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const factoryV2 = new Contract(factoryAddress, TokenFactory_v2.abi, signer);
        const userAddress = await signer.getAddress();
        const fee = await factoryV2.getDeploymentFee(userAddress);
        if (!fee) {
          setDeploymentFee('0');
        } else {
          setDeploymentFee(formatUnits(fee, 'ether'));
        }
      } catch (error) {
        console.error('Error fetching deployment fee:', error);
        setDeploymentFee('Error fetching fee. Please try again.');
      }
    };

    fetchDeploymentFee();
  }, [chainId]);

  useEffect(() => {
    if (window.ethereum && isConnected) {
      const provider = new BrowserProvider(window.ethereum);
      setProvider(provider);
    }
  }, [isConnected]);

  const showToast = (type: 'success' | 'error', message: string, link?: string) => {
    setToast({ type, message, link });
    setTimeout(() => setToast(null), 5000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected || !chainId) return;

    setLoading(true);
    setToast(null);
    setSuccessInfo(null);

    try {
      const now = Math.floor(Date.now() / 1000);
      const startTimeSeconds = Math.floor(new Date(formData.startTime).getTime() / 1000);
      const endTimeSeconds = Math.floor(new Date(formData.endTime).getTime() / 1000);
      
      if (startTimeSeconds <= now) throw new Error('Start time must be in the future');
      if (endTimeSeconds <= startTimeSeconds) throw new Error('End time must be after start time');
      if (!window.ethereum) throw new Error("Please install MetaMask");

      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const factoryAddress = getNetworkContractAddress(chainId, 'factoryAddressV2');
      if (!factoryAddress) throw new Error("TokenFactory V2.1.0 is not yet deployed on this network.");

      const factoryV2 = new Contract(factoryAddress, TokenFactory_v2.abi, signer);

      // Get required deployment fee
      const userAddress = await signer.getAddress();
      const fee = await factoryV2.getDeploymentFee(userAddress);
      if (!fee) {
        throw new Error('Failed to get deployment fee');
      }

      // Handle custom owner address
      let ownerAddress = "0x0000000000000000000000000000000000000000";
      if (formData.customOwner) {
        if (!formData.customOwner.match(/^0x[0-9a-fA-F]{40}$/)) throw new Error('Invalid owner address format');
        ownerAddress = formData.customOwner;
      }

      // Convert amounts to BigInt with proper decimals and scaling
      const initialSupplyAmount = parseUnits(formData.initialSupply || '0', 18);
      const hardCapAmount = parseUnits(formData.maxSupply || '0', 18);
      const presaleRateAmount = BigInt(formData.presaleRate || '0');
      const minContribAmount = parseUnits(formData.minContribution || '0', 18);
      const maxContribAmount = parseUnits(formData.maxContribution || '0', 18);
      const presaleCapAmount = parseUnits(formData.presaleCap || '0', 18);
      const startTimeBigInt = BigInt(startTimeSeconds);
      const endTimeBigInt = BigInt(endTimeSeconds);

      // Create token
      const tx = await factoryV2.createToken(
        formData.name,
        formData.symbol,
        initialSupplyAmount,
        hardCapAmount,
        formData.enableBlacklist,
        formData.enableTimeLock,
        presaleRateAmount,
        minContribAmount,
        maxContribAmount,
        presaleCapAmount,
        startTimeBigInt,
        endTimeBigInt,
        ownerAddress,
        { value: BigInt(fee) }
      );
      
      const receipt = await tx.wait();
      const tokenDeployedEvent = receipt.logs
        .map((log: any) => {
          try {
            return factoryV2.interface.parseLog({
              topics: log.topics,
              data: log.data
            });
          } catch (e) {
            return null;
          }
        })
        .find((event: any) => event?.name === 'TokenCreated');

      if (!tokenDeployedEvent) throw new Error('Token deployment event not found in transaction logs');

      const tokenAddress = tokenDeployedEvent.args.token;
      const explorerUrl = getExplorerUrl(chainId, tokenAddress, 'token');
      const txExplorerUrl = getExplorerUrl(chainId, tx.hash, 'tx');

      setSuccessInfo({
        message: 'Token created successfully!',
        tokenAddress,
        explorerUrl,
        symbol: formData.symbol,
        initialSupply: formData.initialSupply,
        owner: tokenDeployedEvent.args.owner
      });

      showToast('success', 'Token created successfully!', txExplorerUrl);
      setFormData({ ...defaultValues, ...getDefaultTimes() });
    } catch (error: any) {
      console.error("Error creating token:", error);
      showToast('error', `Failed to create token: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  if (!v2Available) {
    return (
      <div className="p-2 bg-gray-800 rounded-lg shadow-lg">
        <div className="rounded-md bg-yellow-900/20 p-2 border border-yellow-700">
          <h3 className="text-sm font-medium text-yellow-500">TokenFactory V2.1.0 is not yet deployed on this network.</h3>
          <p className="text-xs text-yellow-400">Note: V2.1.0 is currently only available on specific networks.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Create Token (V2)</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Token Name</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="My Token"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="symbol">Token Symbol</Label>
                  <Input
                    id="symbol"
                    name="symbol"
                    value={formData.symbol}
                    onChange={handleChange}
                    placeholder="TKN"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="initialSupply">Initial Supply</Label>
                  <Input
                    id="initialSupply"
                    name="initialSupply"
                    value={formData.initialSupply}
                    onChange={handleChange}
                    placeholder="1000000"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxSupply">Max Supply</Label>
                  <Input
                    id="maxSupply"
                    name="maxSupply"
                    value={formData.maxSupply}
                    onChange={handleChange}
                    placeholder="2000000"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="initialPrice">Initial Price (ETH)</Label>
                  <Input
                    id="initialPrice"
                    name="initialPrice"
                    value={formData.initialPrice}
                    onChange={handleChange}
                    placeholder="0.001"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="presaleRate">Presale Rate (Tokens per ETH)</Label>
                  <Input
                    id="presaleRate"
                    name="presaleRate"
                    value={formData.presaleRate}
                    onChange={handleChange}
                    placeholder="100"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="minContribution">Min Contribution (ETH)</Label>
                  <Input
                    id="minContribution"
                    name="minContribution"
                    value={formData.minContribution}
                    onChange={handleChange}
                    placeholder="0.1"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxContribution">Max Contribution (ETH)</Label>
                  <Input
                    id="maxContribution"
                    name="maxContribution"
                    value={formData.maxContribution}
                    onChange={handleChange}
                    placeholder="1"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="presaleCap">Presale Cap (ETH)</Label>
                  <Input
                    id="presaleCap"
                    name="presaleCap"
                    value={formData.presaleCap}
                    onChange={handleChange}
                    placeholder="10"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="startTime">Start Time</Label>
                  <Input
                    type="datetime-local"
                    id="startTime"
                    name="startTime"
                    value={formData.startTime}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endTime">End Time</Label>
                  <Input
                    type="datetime-local"
                    id="endTime"
                    name="endTime"
                    value={formData.endTime}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customOwner">Custom Owner (Optional)</Label>
                  <Input
                    id="customOwner"
                    name="customOwner"
                    value={formData.customOwner}
                    onChange={handleChange}
                    placeholder="0x..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="enableBlacklist"
                    name="enableBlacklist"
                    checked={formData.enableBlacklist}
                    onCheckedChange={(checked) =>
                      handleChange({
                        target: { name: 'enableBlacklist', value: checked },
                      } as any)
                    }
                  />
                  <Label htmlFor="enableBlacklist">Enable Blacklist</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="enableTimeLock"
                    name="enableTimeLock"
                    checked={formData.enableTimeLock}
                    onCheckedChange={(checked) =>
                      handleChange({
                        target: { name: 'enableTimeLock', value: checked },
                      } as any)
                    }
                  />
                  <Label htmlFor="enableTimeLock">Enable Time Lock</Label>
                </div>
              </div>

              <div className="flex justify-end items-center space-x-2">
                <InfoIcon content="Deployment fee will be charged in ETH. Make sure you have enough ETH to cover the fee and gas costs." />
                <Button
                  type="submit"
                  disabled={!isConnected || loading}
                  className={loading ? 'opacity-50 cursor-wait' : ''}
                >
                  {loading ? (
                    <>
                      <Spinner className="mr-2" />
                      Creating...
                    </>
                  ) : !isConnected ? (
                    'Connect Wallet to Deploy'
                  ) : (
                    'Create Token'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Preview Section */}
        <div className="space-y-6">
          <TokenPreview
            config={previewConfig}
            isValid={true}
            validationErrors={[]}
          />
          
          <Card>
            <CardHeader>
              <CardTitle>Token Creator Admin Panel</CardTitle>
            </CardHeader>
            <CardContent>
              <TokenAdminV2
                isConnected={isConnected}
                address={successInfo?.tokenAddress}
                provider={provider}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}