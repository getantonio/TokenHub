import { useState, useEffect } from 'react';
import { BrowserProvider, Contract, formatUnits, parseUnits } from 'ethers';
import { useNetwork } from '@contexts/NetworkContext';
import TokenFactory_v1 from '@contracts/abi/TokenFactory_v1.json';
import TokenFactory_v2 from '@contracts/abi/TokenFactory_v2.1.0.json';
import { contractAddresses } from '@config/contracts';
import { Spinner } from '@components/ui/Spinner';
import { useToast } from '@/components/ui/toast/use-toast';
import { Button } from '@components/ui/button';
import { Card } from '@components/ui/card';

interface Props {
  isConnected: boolean;
  address?: string;
  provider: BrowserProvider | null;
}

interface ToastMessage {
  type: 'success' | 'error';
  message: string;
}

export default function FactoryOwnerControls_v1({ isConnected, address, provider: externalProvider }: Props) {
  const { chainId } = useNetwork();
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [currentFee, setCurrentFee] = useState<string>('0');
  const [newFee, setNewFee] = useState<string>('');
  const [accumulatedFees, setAccumulatedFees] = useState<string>('0');
  const [discountAddress, setDiscountAddress] = useState<string>('');
  const [discountPercentage, setDiscountPercentage] = useState<string>('');

  useEffect(() => {
    checkOwnership();
    loadFees();
  }, [chainId, isConnected]);

  const showToast = (type: 'success' | 'error', message: string) => {
    toast({
      variant: type === 'error' ? 'destructive' : 'default',
      title: type === 'error' ? 'Error' : 'Success',
      description: message,
    });
  };

  async function checkOwnership() {
    if (!externalProvider || !isConnected || !chainId) return;

    try {
      const signer = await externalProvider.getSigner();
      const userAddress = await signer.getAddress();
      
      const factoryAddress = contractAddresses[chainId]['factoryAddress'];
      if (!factoryAddress) return;

      const factory = new Contract(
        factoryAddress,
        TokenFactory_v1.abi,
        externalProvider
      );

      const owner = await factory.owner();
      setIsOwner(owner.toLowerCase() === userAddress.toLowerCase());
    } catch (error) {
      console.error('Error checking ownership:', error);
    }
  }

  async function loadFees() {
    if (!externalProvider || !isConnected || !chainId) return;

    try {
      const factoryAddress = contractAddresses[chainId]['factoryAddress'];
      if (!factoryAddress) return;

      const factory = new Contract(
        factoryAddress,
        TokenFactory_v1.abi,
        externalProvider
      );

      const fee = await factory.deploymentFee();
      setCurrentFee(formatUnits(fee, 'ether'));

      const balance = await externalProvider.getBalance(factoryAddress);
      setAccumulatedFees(formatUnits(balance, 'ether'));
    } catch (error) {
      console.error('Error loading fees:', error);
    }
  }

  async function updateDeploymentFee() {
    if (!externalProvider || !isConnected || !chainId) return;

    try {
      setLoading(true);
      const signer = await externalProvider.getSigner();
      
      const factoryAddress = contractAddresses[chainId]['factoryAddress'];
      if (!factoryAddress) throw new Error('Factory not deployed on this network');

      const factory = new Contract(
        factoryAddress,
        TokenFactory_v1.abi,
        signer
      );

      const tx = await factory.setDeploymentFee(parseUnits(newFee, 'ether'));
      showToast('success', 'Updating deployment fee...');
      
      await tx.wait();
      showToast('success', 'Deployment fee updated successfully');
      
      await loadFees();
      setNewFee('');
    } catch (error: any) {
      showToast('error', error.message || 'Failed to update deployment fee');
    } finally {
      setLoading(false);
    }
  }

  async function withdrawFees() {
    if (!externalProvider || !isConnected || !chainId) return;

    try {
      setLoading(true);
      const signer = await externalProvider.getSigner();
      
      const factoryAddress = contractAddresses[chainId]['factoryAddress'];
      if (!factoryAddress) throw new Error('Factory not deployed on this network');

      const factory = new Contract(
        factoryAddress,
        TokenFactory_v1.abi,
        signer
      );

      const tx = await factory.withdrawFees();
      showToast('success', 'Withdrawing fees...');
      
      await tx.wait();
      showToast('success', 'Fees withdrawn successfully');
      
      await loadFees();
    } catch (error: any) {
      showToast('error', error.message || 'Failed to withdraw fees');
    } finally {
      setLoading(false);
    }
  }

  async function setAddressDiscount() {
    if (!externalProvider || !isConnected || !chainId) return;

    try {
      setLoading(true);
      const signer = await externalProvider.getSigner();
      
      const factoryAddress = contractAddresses[chainId]['factoryAddress'];
      if (!factoryAddress) throw new Error('Factory not deployed on this network');

      const factory = new Contract(
        factoryAddress,
        TokenFactory_v1.abi,
        signer
      );

      // Calculate the discounted fee amount
      const currentFeeWei = await factory.deploymentFee();
      const discountedFee = currentFeeWei * BigInt(Number(discountPercentage)) / BigInt(100);
      
      // Use setDeploymentFee for v1 and setCustomDeploymentFee for v2
      const tx = await factory.setDeploymentFee(discountedFee);
        
      showToast('success', 'Setting address discount...');
      
      await tx.wait();
      showToast('success', 'Address discount set successfully');
      
      setDiscountAddress('');
      setDiscountPercentage('');
    } catch (error: any) {
      console.error('Error setting discount:', error);
      showToast('error', error.message || 'Failed to set address discount');
    } finally {
      setLoading(false);
    }
  }

  if (!isOwner) return null;

  return (
    <div className="form-card">
      <h2 className="text-lg font-semibold text-text-primary mb-4">Factory Controls (V1)</h2>
      <div className="space-y-2">
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <p className="text-xs text-text-secondary">Current Fee</p>
              <p className="text-sm font-medium text-text-primary">{currentFee} ETH</p>
            </div>
            <div>
              <p className="text-xs text-text-secondary">Accumulated</p>
              <p className="text-sm font-medium text-text-primary">{accumulatedFees} ETH</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="form-label">
                New Fee (ETH)
              </label>
              <input
                type="number"
                value={newFee}
                onChange={(e) => setNewFee(e.target.value)}
                placeholder="Enter new fee"
                className="form-input"
              />
            </div>
            <button
              onClick={updateDeploymentFee}
              disabled={loading || !newFee}
              className="form-button-primary h-7"
            >
              {loading ? <Spinner className="w-3 h-3" /> : 'Update'}
            </button>
          </div>

          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="form-label">
                Address
              </label>
              <input
                type="text"
                value={discountAddress}
                onChange={(e) => setDiscountAddress(e.target.value)}
                placeholder="0x..."
                className="form-input"
              />
            </div>
            <div className="w-24">
              <label className="form-label">
                Discount %
              </label>
              <input
                type="number"
                value={discountPercentage}
                onChange={(e) => setDiscountPercentage(e.target.value)}
                placeholder="0-100"
                min="0"
                max="100"
                className="form-input"
              />
            </div>
            <button
              onClick={setAddressDiscount}
              disabled={loading || !discountAddress || !discountPercentage}
              className="form-button-primary h-7"
            >
              Set
            </button>
          </div>
        </div>

        <button
          onClick={withdrawFees}
          disabled={loading || Number(accumulatedFees) === 0}
          className="form-button-secondary w-full h-7"
        >
          {loading ? <Spinner className="w-3 h-3" /> : 'Withdraw Fees'}
        </button>
      </div>
    </div>
  );
} 