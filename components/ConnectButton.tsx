import { useNetwork } from '../contexts/NetworkContext';

export function ConnectButton() {
  const { isConnected, connectWallet } = useNetwork();

  return (
    <button
      onClick={connectWallet}
      className={`px-4 py-2 rounded-md text-sm font-medium text-white ${
        isConnected
          ? 'bg-[#1B4D3E] hover:bg-[#2C614F]'
          : 'bg-[#1B4D3E] hover:bg-[#2C614F]'
      }`}
    >
      {isConnected ? 'Connected' : 'Connect Wallet'}
    </button>
  );
} 