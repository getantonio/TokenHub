import { useState, useEffect } from 'react';
import { BrowserProvider, Contract, formatUnits, parseUnits } from 'ethers';
import { useNetwork } from '@contexts/NetworkContext';
import TokenFactory_v2 from '@contracts/abi/TokenFactory_v2.1.0.json';
import { contractAddresses } from '@config/contracts';
import { Spinner } from '@components/ui/Spinner';
import { Toast } from '@components/ui/Toast';
import { Button } from '@components/ui/button';
import { Card } from '@components/ui/card';

interface FactoryOwnerControlsV2Props {
  isConnected: boolean;
}

interface ToastMessage {
  type: 'success' | 'error';
  message: string;
}

export default function FactoryOwnerControlsV2({ isConnected }: FactoryOwnerControlsV2Props) {
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
  }, [chainId, isConnected]);

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
      
      const factoryAddress = contractAddresses[chainId]?.factoryAddressV2;
      if (!factoryAddress) return;

      const factory = new Contract(factoryAddress, TokenFactory_v2.abi, provider);
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
      const factoryAddress = contractAddresses[chainId]?.factoryAddressV2;
      if (!factoryAddress) return;

      const factory = new Contract(factoryAddress, TokenFactory_v2.abi, provider);

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
      
      const factoryAddress = contractAddresses[chainId]?.factoryAddressV2;
      if (!factoryAddress) throw new Error('Factory not deployed on this network');

      const factory = new Contract(factoryAddress, TokenFactory_v2.abi, signer);

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
      
      const factoryAddress = contractAddresses[chainId]?.factoryAddressV2;
      if (!factoryAddress) throw new Error('Factory not deployed on this network');

      const factory = new Contract(factoryAddress, TokenFactory_v2.abi, signer);

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
      
      const factoryAddress = contractAddresses[chainId]?.factoryAddressV2;
      if (!factoryAddress) throw new Error('Factory not deployed on this network');

      const factory = new Contract(factoryAddress, TokenFactory_v2.abi, signer);

      const discountBips = Math.floor(Number(discountPercentage) * 100);
      const tx = await factory.setAddressDiscount(discountAddress, discountBips);
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
    <Card className="p-6">
      <h2 className="text-xl font-bold text-white mb-4">Factory Owner Controls (V2)</h2>
      
      {toast && <Toast {...toast} />}
      
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-white mb-2">Fee Management</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-400 mb-1">Current Fee</p>
              <p className="text-lg font-medium text-white">{currentFee} ETH</p>
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-1">Accumulated</p>
              <p className="text-lg font-medium text-white">{accumulatedFees} ETH</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-400 mb-1">
                New Fee (ETH)
              </label>
              <input
                type="number"
                value={newFee}
                onChange={(e) => setNewFee(e.target.value)}
                placeholder="Enter new fee"
                className="w-full px-3 py-2 bg-background-primary border border-border rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <Button
              onClick={updateDeploymentFee}
              disabled={loading || !newFee}
              className="h-10"
            >
              {loading ? <Spinner className="w-4 h-4" /> : 'Update'}
            </Button>
          </div>

          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Address
              </label>
              <input
                type="text"
                value={discountAddress}
                onChange={(e) => setDiscountAddress(e.target.value)}
                placeholder="0x..."
                className="w-full px-3 py-2 bg-background-primary border border-border rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="w-24">
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Discount %
              </label>
              <input
                type="number"
                value={discountPercentage}
                onChange={(e) => setDiscountPercentage(e.target.value)}
                placeholder="0-100"
                min="0"
                max="100"
                className="w-full px-3 py-2 bg-background-primary border border-border rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <Button
              onClick={setAddressDiscount}
              disabled={loading || !discountAddress || !discountPercentage}
              className="h-10"
            >
              Set
            </Button>
          </div>
        </div>

        <div>
          <Button
            onClick={withdrawFees}
            disabled={loading || Number(accumulatedFees) === 0}
            variant="secondary"
            className="w-full"
          >
            {loading ? <Spinner className="w-4 h-4" /> : 'Withdraw Fees'}
          </Button>
        </div>
      </div>
    </Card>
  );
} 