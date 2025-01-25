import { useState, FormEvent, ChangeEvent } from 'react';
import { BrowserProvider, Contract, parseUnits } from 'ethers';
import TokenFactory from '../artifacts/contracts/TokenFactory_v1.sol/TokenFactory_v1.json';
import { getContractAddress } from '../config/contracts';

interface TokenFormProps {
  isConnected: boolean;
}

interface FormData {
  name: string;
  symbol: string;
  initialSupply: string;
  maxSupply: string;
  blacklistEnabled: boolean;
  timeLockEnabled: boolean;
}

declare global {
  interface Window {
    ethereum?: any;
  }
}

export default function TokenForm({ isConnected }: TokenFormProps) {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    symbol: '',
    initialSupply: '',
    maxSupply: '',
    blacklistEnabled: false,
    timeLockEnabled: false
  });

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isConnected) return;

    try {
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      
      // Get the current network's chainId
      const network = await provider.getNetwork();
      const chainId = Number(network.chainId);
      
      // Get factory address for current network
      const factoryAddress = getContractAddress(chainId, 'factoryAddress');

      const factory = new Contract(factoryAddress, TokenFactory.abi, signer);
      
      const initialSupplyWei = parseUnits(formData.initialSupply, 18);
      const maxSupplyWei = parseUnits(formData.maxSupply, 18);

      // Get deployment fee
      const deploymentFee = await factory.deploymentFee();

      const tx = await factory.createToken(
        formData.name,
        formData.symbol,
        initialSupplyWei,
        maxSupplyWei,
        formData.blacklistEnabled,
        formData.timeLockEnabled,
        { value: deploymentFee }
      );

      await tx.wait();
      // Handle success (e.g. show notification, reset form)
      
    } catch (error) {
      console.error('Error deploying token:', error);
      // Handle error (e.g. show error message)
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-6">Create New Token</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Token Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            className="w-full p-2 border rounded"
            placeholder="My Token"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Token Symbol</label>
          <input
            type="text"
            name="symbol"
            value={formData.symbol}
            onChange={handleInputChange}
            className="w-full p-2 border rounded"
            placeholder="MTK"
            maxLength={5}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Initial Supply</label>
          <input
            type="text"
            name="initialSupply"
            value={formData.initialSupply}
            onChange={handleInputChange}
            className="w-full p-2 border rounded"
            placeholder="1000000"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Maximum Supply</label>
          <input
            type="text"
            name="maxSupply"
            value={formData.maxSupply}
            onChange={handleInputChange}
            className="w-full p-2 border rounded"
            placeholder="2000000"
            required
          />
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            name="blacklistEnabled"
            checked={formData.blacklistEnabled}
            onChange={handleInputChange}
            className="rounded"
          />
          <label className="text-sm font-medium">Enable Blacklist</label>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            name="timeLockEnabled"
            checked={formData.timeLockEnabled}
            onChange={handleInputChange}
            className="rounded"
          />
          <label className="text-sm font-medium">Enable Time Lock</label>
        </div>

        <button
          type="submit"
          disabled={!isConnected}
          className={`w-full py-2 px-4 rounded font-medium ${
            isConnected 
              ? 'bg-blue-600 text-white hover:bg-blue-700' 
              : 'bg-gray-400 text-gray-200 cursor-not-allowed'
          }`}
        >
          {isConnected ? 'Deploy Token' : 'Connect Wallet to Deploy'}
        </button>
      </form>
    </div>
  );
} 