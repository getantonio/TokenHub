import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useNetwork } from '../contexts/NetworkContext';
import { SUPPORTED_NETWORKS, ChainId } from '../config/networks';
import { NetworkIndicator } from './NetworkIndicator';
import { ConnectButton } from './ConnectButton';

export function Header() {
  const { chainId, isConnected, switchNetwork } = useNetwork();
  const [mounted, setMounted] = useState(false);
  const [showNetworkMenu, setShowNetworkMenu] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const handleNetworkSwitch = async (networkId: number) => {
    try {
      await switchNetwork(networkId);
      setShowNetworkMenu(false);
    } catch (error) {
      console.error('Failed to switch network:', error);
    }
  };

  const currentNetwork = chainId ? SUPPORTED_NETWORKS[chainId as ChainId] : null;

  return (
    <header className="bg-gray-800 border-b border-gray-700">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Navigation */}
          <div className="flex items-center gap-8">
            <Link href="/" className="text-xl font-bold text-white">
              TokenHub.dev
            </Link>
            <nav className="hidden md:flex items-center gap-4">
              <Link href="/" className="text-sm text-gray-300 hover:text-white">
                Home
              </Link>
              <Link href="/admin" className="text-sm text-gray-300 hover:text-white">
                Admin
              </Link>
              <Link href="/presale" className="text-sm text-gray-300 hover:text-white">
                Presale
              </Link>
            </nav>
          </div>

          {/* Network Selection and Connect Button */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <button
                onClick={() => setShowNetworkMenu(!showNetworkMenu)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-300 hover:text-white rounded-md bg-gray-700 hover:bg-gray-600"
              >
                <NetworkIndicator chainId={chainId || 1} />
                <span className="hidden sm:inline">
                  {currentNetwork ? currentNetwork.name : 'Select Network'}
                </span>
              </button>

              {showNetworkMenu && (
                <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-gray-800 border border-gray-700 z-10">
                  <div className="py-1">
                    {Object.entries(SUPPORTED_NETWORKS).map(([id, network]) => (
                      <button
                        key={id}
                        onClick={() => handleNetworkSwitch(Number(id))}
                        className="w-full px-4 py-2 text-sm text-left text-gray-300 hover:bg-gray-700 hover:text-white"
                      >
                        {network.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <ConnectButton />
          </div>
        </div>
      </div>
    </header>
  );
}