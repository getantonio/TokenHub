import { useEffect, useState } from 'react';
import { useNetwork } from '../contexts/NetworkContext';
import { NetworkIndicator } from './NetworkIndicator';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ChainId, SUPPORTED_NETWORKS } from '../config/networks';

export function Header() {
  const { chainId, setChainId } = useNetwork();
  const [mounted, setMounted] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [showNetworkMenu, setShowNetworkMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    checkConnection();
  }, []);

  const checkConnection = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request<string[]>({ 
          method: 'eth_accounts' 
        });
        setIsConnected(Array.isArray(accounts) && accounts.length > 0);

        window.ethereum.on('accountsChanged', handleAccountsChanged as (...args: unknown[]) => void);
        window.ethereum.on('chainChanged', handleChainChanged as (...args: unknown[]) => void);
        
        return () => {
          window.ethereum?.removeListener('accountsChanged', handleAccountsChanged as (...args: unknown[]) => void);
          window.ethereum?.removeListener('chainChanged', handleChainChanged as (...args: unknown[]) => void);
        };
      } catch (error) {
        console.error('Error checking wallet connection:', error);
      }
    }
  };

  const handleAccountsChanged = (accounts: string[]) => {
    setIsConnected(Array.isArray(accounts) && accounts.length > 0);
  };

  const handleChainChanged = (chainId: string) => {
    setChainId(parseInt(chainId, 16));
  };

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        await window.ethereum.request({
          method: 'eth_requestAccounts'
        });
        setIsConnected(true);
      } catch (error) {
        console.error('Error connecting wallet:', error);
      }
    } else {
      alert('Please install MetaMask to use this feature');
    }
  };

  const switchNetwork = async (chainId: ChainId) => {
    if (!window.ethereum) return;

    const network = SUPPORTED_NETWORKS[chainId];
    if (!network) return;

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: `0x${chainId.toString(16)}`,
                chainName: network.name,
                nativeCurrency: {
                  name: network.currency,
                  symbol: network.currency,
                  decimals: 18,
                },
                rpcUrls: [network.rpcUrl],
                blockExplorerUrls: [network.explorerUrl],
              },
            ],
          });
        } catch (addError) {
          console.error('Error adding network:', addError);
        }
      }
    }
  };

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/v1', label: 'V1' },
    { href: '/v2', label: 'V2' },
    { href: '/presale', label: 'Presale' },
    { href: '/admin', label: 'Admin' }
  ];

  return (
    <header className="bg-gray-800 border-b border-gray-700">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center">
              <h1 className="text-2xl font-bold text-white">
                TokenHub<span className="text-blue-500">.dev</span>
              </h1>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center">
              <div className="relative">
                <button
                  onClick={() => setShowMobileMenu(!showMobileMenu)}
                  className="px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white flex items-center"
                >
                  <span>Token Factory</span>
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showMobileMenu && (
                  <div className="absolute left-0 mt-2 w-48 rounded-md shadow-lg bg-gray-700 ring-1 ring-black ring-opacity-5">
                    <div className="py-1" role="menu">
                      {navLinks.map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          onClick={() => setShowMobileMenu(false)}
                          className={`block px-4 py-2 text-sm ${
                            router.pathname === link.href
                              ? 'bg-gray-600 text-white'
                              : 'text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          {link.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Network Switcher */}
            <div className="relative z-50">
              <button
                onClick={() => setShowNetworkMenu(!showNetworkMenu)}
                className="flex items-center space-x-2 px-3 py-2 rounded-md bg-gray-700 hover:bg-gray-600 text-white"
              >
                {mounted && chainId && (
                  <NetworkIndicator chainId={chainId} />
                )}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showNetworkMenu && (
                <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-gray-700 ring-1 ring-black ring-opacity-5">
                  <div className="py-1" role="menu">
                    {Object.entries(SUPPORTED_NETWORKS).map(([id, network]) => (
                      <button
                        key={id}
                        onClick={() => {
                          switchNetwork(Number(id) as ChainId);
                          setShowNetworkMenu(false);
                        }}
                        className={`block w-full text-left px-4 py-2 text-sm ${
                          Number(id) === chainId
                            ? 'bg-gray-600 text-white'
                            : 'text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        {network.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Connect Wallet Button */}
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

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="text-gray-300 hover:text-white"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {showMobileMenu ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}