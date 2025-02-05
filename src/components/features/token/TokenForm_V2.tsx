import { useState, useEffect } from 'react';
import { BrowserProvider, Contract, parseUnits, formatUnits } from 'ethers';
import { useNetwork } from '@contexts/NetworkContext';
import TokenFactory_v2 from '@contracts/abi/TokenFactory_v2.1.0.json';
import { getExplorerUrl } from '@config/networks';
import { getNetworkContractAddress } from '@config/contracts';
import { useToast } from '@/components/ui/toast/use-toast';
import TokenPreview from '@components/features/token/TokenPreview';
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

interface SuccessInfo {
  tokenAddress: string;
  tokenName: string;
  tokenSymbol: string;
}

const TOKEN_DECIMALS = 18;

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
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<SuccessInfo | null>(null);
  const { toast: useToastToast } = useToast();
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
    if (!isConnected) {
      setError("Please connect your wallet first");
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccessInfo(null);

    try {
      if (!window.ethereum) {
        throw new Error("Please install MetaMask");
      }

      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();
      const chainId = Number(await window.ethereum.request({ method: 'eth_chainId' }));
      
      const factoryAddress = getNetworkContractAddress(chainId, 'factoryAddressV2');
      if (!factoryAddress) {
        throw new Error("TokenFactory V2 is not yet deployed on this network.");
      }

      const factory = new Contract(factoryAddress, TokenFactory_v2.abi, signer);
      const fee = await factory.deploymentFee();
      
      const initialSupplyWei = parseUnits(formData.initialSupply, TOKEN_DECIMALS);
      const maxSupplyWei = parseUnits(formData.maxSupply, TOKEN_DECIMALS);

      showToast('success', 'Preparing transaction...');

      const tx = await factory.createToken(
        formData.name,
        formData.symbol,
        initialSupplyWei,
        maxSupplyWei,
        formData.enableBlacklist,
        formData.enableTimeLock,
        parseUnits(formData.presaleRate, 18),
        parseUnits(formData.minContribution, 18),
        parseUnits(formData.maxContribution, 18),
        parseUnits(formData.presaleCap, 18),
        Math.floor(Date.now() / 1000) + 3600,
        Math.floor(Date.now() / 1000) + 86400,
        await signer.getAddress(),
        { value: BigInt(fee) }
      );

      showToast('success', 'Transaction submitted. Waiting for confirmation...', getExplorerUrl(chainId, tx.hash, 'tx'));
      
      const receipt = await tx.wait();
      let tokenAddress = null;
      
      for (const log of receipt.logs) {
        try {
          const parsedLog = factory.interface.parseLog({
            topics: log.topics ? log.topics.map((t: string) => t || '') : [],
            data: log.data || '0x'
          });
          if (parsedLog?.name === "TokenCreated") {
            tokenAddress = parsedLog.args[0];
            break;
          }
        } catch (e) {
          continue;
        }
      }

      if (!tokenAddress) {
        for (const log of receipt.logs) {
          if (log.address !== factoryAddress) {
            tokenAddress = log.address;
            break;
          }
        }
      }

      if (!tokenAddress) {
        throw new Error("Could not find token address in transaction logs");
      }

      const explorerUrl = getExplorerUrl(chainId, tokenAddress, 'token');
      showToast('success', 'Token created successfully!', explorerUrl);

      setSuccessInfo({
        tokenAddress,
        tokenName: formData.name,
        tokenSymbol: formData.symbol,
      });

    } catch (error: any) {
      console.error('Error creating token:', error);
      showToast('error', error.message || 'Failed to create token');
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
      <div className="p-1 bg-gray-100 rounded-lg shadow-lg">
        <div className="rounded-md bg-yellow-100/20 p-1 border border-yellow-100">
          <h3 className="text-sm font-medium text-yellow-100">TokenFactory V2.1.0 is not yet deployed on this network.</h3>
          <p className="text-xs text-yellow-100">Note: V2.1.0 is currently only available on specific networks.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-1 py-1">
      <div className="max-w-4xl mx-auto space-y-2">
        <div className="form-container form-compact">
          <form onSubmit={handleSubmit} className="space-y-1">
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="name" className="form-label">Token Name</label>
                <input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="My Token"
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="symbol" className="form-label">Token Symbol</label>
                <input
                  id="symbol"
                  name="symbol"
                  value={formData.symbol}
                  onChange={handleChange}
                  placeholder="TKN"
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="initialSupply" className="form-label">Initial Supply</label>
                <input
                  id="initialSupply"
                  name="initialSupply"
                  value={formData.initialSupply}
                  onChange={handleChange}
                  placeholder="1000000"
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="maxSupply" className="form-label">Max Supply</label>
                <input
                  id="maxSupply"
                  name="maxSupply"
                  value={formData.maxSupply}
                  onChange={handleChange}
                  placeholder="2000000"
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="initialPrice" className="form-label">Initial Price (ETH)</label>
                <input
                  id="initialPrice"
                  name="initialPrice"
                  value={formData.initialPrice}
                  onChange={handleChange}
                  placeholder="0.001"
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="presaleRate" className="form-label">Presale Rate (Tokens per ETH)</label>
                <input
                  id="presaleRate"
                  name="presaleRate"
                  value={formData.presaleRate}
                  onChange={handleChange}
                  placeholder="100"
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="minContribution" className="form-label">Min Contribution (ETH)</label>
                <input
                  id="minContribution"
                  name="minContribution"
                  value={formData.minContribution}
                  onChange={handleChange}
                  placeholder="0.1"
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="maxContribution" className="form-label">Max Contribution (ETH)</label>
                <input
                  id="maxContribution"
                  name="maxContribution"
                  value={formData.maxContribution}
                  onChange={handleChange}
                  placeholder="1"
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="presaleCap" className="form-label">Presale Cap (ETH)</label>
                <input
                  id="presaleCap"
                  name="presaleCap"
                  value={formData.presaleCap}
                  onChange={handleChange}
                  placeholder="10"
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="startTime" className="form-label">Start Time</label>
                <input
                  type="datetime-local"
                  id="startTime"
                  name="startTime"
                  value={formData.startTime}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="endTime" className="form-label">End Time</label>
                <input
                  type="datetime-local"
                  id="endTime"
                  name="endTime"
                  value={formData.endTime}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="customOwner" className="form-label">Custom Owner (Optional)</label>
                <input
                  id="customOwner"
                  name="customOwner"
                  value={formData.customOwner}
                  onChange={handleChange}
                  placeholder="0x..."
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-grid">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="enableBlacklist"
                  name="enableBlacklist"
                  checked={formData.enableBlacklist}
                  onChange={(e) => handleChange({
                    target: { name: 'enableBlacklist', value: e.target.checked },
                  } as any)}
                  className="form-checkbox"
                />
                <label htmlFor="enableBlacklist" className="form-label">Enable Blacklist</label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="enableTimeLock"
                  name="enableTimeLock"
                  checked={formData.enableTimeLock}
                  onChange={(e) => handleChange({
                    target: { name: 'enableTimeLock', value: e.target.checked },
                  } as any)}
                  className="form-checkbox"
                />
                <label htmlFor="enableTimeLock" className="form-label">Enable Time Lock</label>
              </div>
            </div>

            <div className="form-actions">
              <div className="flex items-center mr-2">
                <InfoIcon content="Deployment fee will be charged in ETH. Make sure you have enough ETH to cover the fee and gas costs." />
              </div>
              <button
                type="submit"
                disabled={!isConnected || loading}
                className="form-button-primary"
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
              </button>
            </div>
          </form>
        </div>

        {/* Preview Section */}
        <div className="space-y-2">
          <TokenPreview
            name={formData.name}
            symbol={formData.symbol}
            initialSupply={formData.maxSupply}
            maxSupply={formData.maxSupply}
          />
          
          <div className="form-card">
            <h2 className="form-card-header">Token Creator Admin Panel</h2>
            <div className="form-card-body">
              <TokenAdminV2
                isConnected={isConnected}
                address={successInfo?.tokenAddress}
                provider={provider}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}