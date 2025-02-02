import { useState, useEffect } from 'react';
import { BrowserProvider, Contract, formatUnits, parseUnits } from 'ethers';
import { useNetwork } from '@contexts/NetworkContext';
import TokenFactory_v1 from '@contracts/abi/TokenFactory_v1.json';
import TokenFactory_v2 from '@contracts/abi/TokenFactory_v2.1.0.json';
import { contractAddresses } from '@config/contracts';
import { Spinner } from '@components/ui/Spinner';
import { Toast } from '@components/ui/Toast';
import { Button } from '@components/ui/button';
import { Card } from '@components/ui/card';

interface FactoryOwnerControlsProps {
  version: 'v1' | 'v2';
  isConnected: boolean;
}

interface ToastMessage {
  type: 'success' | 'error';
  message: string;
}

export default function FactoryOwnerControls({ version, isConnected }: FactoryOwnerControlsProps) {
  const { chainId } = useNetwork();
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [currentFee, setCurrentFee] = useState<string>('0');
  const [newFee, setNewFee] = useState<string>('');
  const [accumulatedFees, setAccumulatedFees] = useState<string>('0');
  const [discountAddress, setDiscountAddress] = useState<string>('');
  const [discountPercentage, setDiscountPercentage] = useState<string>('');

  useEffect(() => {
    checkOwnership();
    loadFees();
  }, [chainId, isConnected, version]);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  async function checkOwnership() {
    if (!window.ethereum || !isConnected || !chainId) return;

    try {
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();
      
      const factoryAddress = contractAddresses[chainId][version === 'v1' ? 'factoryAddress' : 'factoryAddressV2'];
      if (!factoryAddress) return;

      const factory = new Contract(
        factoryAddress,
        version === 'v1' ? TokenFactory_v1.abi : TokenFactory_v2.abi,
        provider
      );

      const owner = await factory.owner();
      setIsOwner(owner.toLowerCase() === userAddress.toLowerCase());
    } catch (error) {
      console.error('Error checking ownership:', error);
    }
  }

  async function loadFees() {
    if (!window.ethereum || !isConnected || !chainId) return;

    try {
      const provider = new BrowserProvider(window.ethereum);
      const factoryAddress = contractAddresses[chainId][version === 'v1' ? 'factoryAddress' : 'factoryAddressV2'];
      if (!factoryAddress) return;

      const factory = new Contract(
        factoryAddress,
        version === 'v1' ? TokenFactory_v1.abi : TokenFactory_v2.abi,
        provider
      );

      const fee = await factory.deploymentFee();
      setCurrentFee(formatUnits(fee, 'ether'));

      const balance = await provider.getBalance(factoryAddress);
      setAccumulatedFees(formatUnits(balance, 'ether'));
    } catch (error) {
      console.error('Error loading fees:', error);
    }
  }

  async function updateDeploymentFee() {
    if (!window.ethereum || !isConnected || !chainId) return;

    try {
      setLoading(true);
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const factoryAddress = contractAddresses[chainId][version === 'v1' ? 'factoryAddress' : 'factoryAddressV2'];
      if (!factoryAddress) throw new Error('Factory not deployed on this network');

      const factory = new Contract(
        factoryAddress,
        version === 'v1' ? TokenFactory_v1.abi : TokenFactory_v2.abi,
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
    if (!window.ethereum || !isConnected || !chainId) return;

    try {
      setLoading(true);
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const factoryAddress = contractAddresses[chainId][version === 'v1' ? 'factoryAddress' : 'factoryAddressV2'];
      if (!factoryAddress) throw new Error('Factory not deployed on this network');

      const factory = new Contract(
        factoryAddress,
        version === 'v1' ? TokenFactory_v1.abi : TokenFactory_v2.abi,
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
    if (!window.ethereum || !isConnected || !chainId) return;

    try {
      setLoading(true);
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const factoryAddress = contractAddresses[chainId][version === 'v1' ? 'factoryAddress' : 'factoryAddressV2'];
      if (!factoryAddress) throw new Error('Factory not deployed on this network');

      const factory = new Contract(
        factoryAddress,
        version === 'v1' ? TokenFactory_v1.abi : TokenFactory_v2.abi,
        signer
      );

      const discountBips = Math.floor(Number(discountPercentage) * 100);
      const tx = await factory.setCustomDeploymentFee(discountAddress, discountBips);
      showToast('success', 'Setting address discount...');
      
      await tx.wait();
      showToast('success', 'Address discount set successfully');
      
      setDiscountAddress('');
      setDiscountPercentage('');
    } catch (error: any) {
      showToast('error', error.message || 'Failed to set address discount');
    } finally {
      setLoading(false);
    }
  }

  if (!isOwner) return null;

  return (
    <div className="form-card">
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
      
      {toast && <Toast {...toast} />}
    </div>
  );
} 