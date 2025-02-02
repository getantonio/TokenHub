import { useState, useEffect } from 'react';
import { BrowserProvider, Contract, formatUnits, parseUnits } from 'ethers';
import { useNetwork } from '../contexts/NetworkContext';
import TokenFactoryV1 from '../contracts/abi/TokenFactory_v1.json';
import TokenFactoryV2 from '../contracts/abi/TokenFactory_v2.1.0.json';
import { getNetworkContractAddress } from '../config/contracts';
import { Spinner } from './ui/Spinner';
import { Toast } from './ui/Toast';

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
      
      const factoryAddress = getNetworkContractAddress(chainId, version === 'v1' ? 'factoryAddress' : 'factoryAddressV2');
      if (!factoryAddress) return;

      const factory = new Contract(
        factoryAddress,
        version === 'v1' ? TokenFactoryV1.abi : TokenFactoryV2.abi,
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
      const factoryAddress = getNetworkContractAddress(chainId, version === 'v1' ? 'factoryAddress' : 'factoryAddressV2');
      if (!factoryAddress) return;

      const factory = new Contract(
        factoryAddress,
        version === 'v1' ? TokenFactoryV1.abi : TokenFactoryV2.abi,
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
      
      const factoryAddress = getNetworkContractAddress(chainId, version === 'v1' ? 'factoryAddress' : 'factoryAddressV2');
      if (!factoryAddress) throw new Error('Factory not deployed on this network');

      const factory = new Contract(
        factoryAddress,
        version === 'v1' ? TokenFactoryV1.abi : TokenFactoryV2.abi,
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
      
      const factoryAddress = getNetworkContractAddress(chainId, version === 'v1' ? 'factoryAddress' : 'factoryAddressV2');
      if (!factoryAddress) throw new Error('Factory not deployed on this network');

      const factory = new Contract(
        factoryAddress,
        version === 'v1' ? TokenFactoryV1.abi : TokenFactoryV2.abi,
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
    <div className="bg-background-secondary rounded-lg p-6 border border-border mb-6">
      <h2 className="text-xl font-bold text-white mb-4">Factory Owner Controls ({version.toUpperCase()})</h2>
      
      {toast && <Toast {...toast} />}

      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-white mb-2">Fee Management</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-400 mb-1">Current Deployment Fee</p>
              <p className="text-lg font-medium text-white">{currentFee} ETH</p>
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-1">Accumulated Fees</p>
              <p className="text-lg font-medium text-white">{accumulatedFees} ETH</p>
            </div>
          </div>
        </div>

        <div className="flex items-end space-x-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-400 mb-1">
              New Deployment Fee (ETH)
            </label>
            <input
              type="number"
              value={newFee}
              onChange={(e) => setNewFee(e.target.value)}
              placeholder="Enter new fee in ETH"
              className="w-full px-3 py-2 bg-background-primary border border-border rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={updateDeploymentFee}
            disabled={loading || !newFee}
            className="px-4 py-2 text-sm font-medium rounded-md bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Spinner className="w-4 h-4" /> : 'Update Fee'}
          </button>
        </div>

        <div>
          <button
            onClick={withdrawFees}
            disabled={loading || Number(accumulatedFees) === 0}
            className="px-4 py-2 text-sm font-medium rounded-md bg-green-500 text-white hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Spinner className="w-4 h-4" /> : 'Withdraw Fees'}
          </button>
        </div>
      </div>
    </div>
  );
} 