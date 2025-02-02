import { useState, useEffect } from 'react';
import { BrowserProvider, Contract, formatUnits, parseUnits } from 'ethers';
import { useNetwork } from '../contexts/NetworkContext';
import TokenFactoryV1 from '../contracts/abi/TokenFactory_v1.json';
import { getNetworkContractAddress } from '../config/contracts';
import { Spinner } from './ui/Spinner';
import { Toast } from './ui/Toast';

interface FactoryOwnerControlsProps {
  isConnected: boolean;
}

interface ToastMessage {
  type: 'success' | 'error';
  message: string;
}

export default function FactoryOwnerControls({ isConnected }: FactoryOwnerControlsProps) {
  const { chainId } = useNetwork();
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [currentFee, setCurrentFee] = useState<string>('0');
  const [newFee, setNewFee] = useState<string>('');
  const [accumulatedFees, setAccumulatedFees] = useState<string>('0');
  const [discountAddress, setDiscountAddress] = useState('');
  const [discountFee, setDiscountFee] = useState('');

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
      
      const factoryAddress = getNetworkContractAddress(chainId, 'factoryAddress');
      if (!factoryAddress) return;

      const factory = new Contract(
        factoryAddress,
        TokenFactoryV1.abi,
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
      const factoryAddress = getNetworkContractAddress(chainId, 'factoryAddress');
      if (!factoryAddress) return;

      const factory = new Contract(
        factoryAddress,
        TokenFactoryV1.abi,
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
      
      const factoryAddress = getNetworkContractAddress(chainId, 'factoryAddress');
      if (!factoryAddress) throw new Error('Factory not deployed on this network');

      const factory = new Contract(
        factoryAddress,
        TokenFactoryV1.abi,
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

  async function setWalletDiscount() {
    if (!window.ethereum || !isConnected || !chainId || !discountAddress || !discountFee) return;

    try {
      setLoading(true);
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      const factoryAddress = getNetworkContractAddress(chainId, 'factoryAddress');
      if (!factoryAddress) throw new Error('Factory not deployed on this network');

      const factory = new Contract(
        factoryAddress,
        TokenFactoryV1.abi,
        signer
      );

      const tx = await factory.setWalletDeploymentFee(discountAddress, parseUnits(discountFee, 'ether'));
      showToast('success', 'Setting wallet discount...');
      
      await tx.wait();
      showToast('success', 'Wallet discount set successfully');
      
      setDiscountAddress('');
      setDiscountFee('');
    } catch (error: any) {
      showToast('error', error.message || 'Failed to set wallet discount');
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
      
      const factoryAddress = getNetworkContractAddress(chainId, 'factoryAddress');
      if (!factoryAddress) throw new Error('Factory not deployed on this network');

      const factory = new Contract(
        factoryAddress,
        TokenFactoryV1.abi,
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

  if (!isOwner) return null;

  return (
    <div className="bg-background-secondary rounded-lg p-4 border border-border">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-sm font-bold text-white">Factory Controls (V1)</h2>
        {toast && <Toast {...toast} />}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <div>
            <label className="text-xs text-gray-400">Current Fee</label>
            <p className="text-sm font-medium text-white">{currentFee} ETH</p>
          </div>
          
          <div>
            <label className="text-xs text-gray-400">New Fee</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={newFee}
                onChange={(e) => setNewFee(e.target.value)}
                placeholder="0.1"
                className="flex-1 px-2 py-1 text-xs bg-background-primary border border-border rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                onClick={updateDeploymentFee}
                disabled={loading || !newFee}
                className="px-2 py-1 text-xs font-medium rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Spinner className="w-3 h-3" /> : 'Update'}
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div>
            <label className="text-xs text-gray-400">Accumulated Fees</label>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-white">{accumulatedFees} ETH</p>
              <button
                onClick={withdrawFees}
                disabled={loading || Number(accumulatedFees) === 0}
                className="px-2 py-1 text-xs font-medium rounded bg-green-500 text-white hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Spinner className="w-3 h-3" /> : 'Withdraw'}
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400">Wallet Discount</label>
            <div className="flex flex-col gap-1">
              <input
                type="text"
                value={discountAddress}
                onChange={(e) => setDiscountAddress(e.target.value)}
                placeholder="Wallet Address"
                className="w-full px-2 py-1 text-xs bg-background-primary border border-border rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  value={discountFee}
                  onChange={(e) => setDiscountFee(e.target.value)}
                  placeholder="Fee (ETH)"
                  className="flex-1 px-2 py-1 text-xs bg-background-primary border border-border rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  onClick={setWalletDiscount}
                  disabled={loading || !discountAddress || !discountFee}
                  className="px-2 py-1 text-xs font-medium rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? <Spinner className="w-3 h-3" /> : 'Set'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 