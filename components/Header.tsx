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
  const [address, setAddress] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setMounted(true);
      // Check for mobile device
      setIsMobile(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
      
      // Check connection status on page load and after returning from MetaMask
      const checkInitialConnection = async () => {
        if (window.ethereum) {
          try {
            const accounts = await window.ethereum.request<string[]>({
              method: 'eth_accounts'
            });
            handleAccountsChanged(accounts as string[]);
            
            // Also check chain ID
            const chainId = await window.ethereum.request({
              method: 'eth_chainId'
            });
            handleChainChanged(chainId as string);
          } catch (error) {
            console.error('Error checking initial connection:', error);
          }
        }
      };
      
      checkInitialConnection();
    }
  }, []);

  const handleAccountsChanged = (accounts: string[]) => {
    setIsConnected(Array.isArray(accounts) && accounts.length > 0);
    setAddress(accounts && accounts.length > 0 ? accounts[0] : null);
  };

  const handleChainChanged = (chainId: string) => {
    setChainId(parseInt(chainId, 16));
  };

  const connectWallet = async () => {
    if (typeof window === 'undefined') return;
    
    try {
      if (window.ethereum) {
        try {
          // First try to enable the ethereum provider
          const accounts = await window.ethereum.request<string[]>({
            method: 'eth_requestAccounts'
          });
          
          if (accounts && accounts.length > 0) {
            handleAccountsChanged(accounts as string[]);
            return; // Successfully connected
          }
        } catch (error: any) {
          console.error('Error requesting accounts:', error);
          // If user rejected or there was an error, try deep linking on mobile
          if (isMobile) {
            const currentUrl = encodeURIComponent(window.location.href);
            // Use WalletConnect format for better mobile handling
            const metamaskAppDeepLink = `https://metamask.app.link/wc?url=${currentUrl}`;
            window.location.href = metamaskAppDeepLink;
          }
        }
      } else if (isMobile) {
        // Mobile device without MetaMask
        const currentUrl = encodeURIComponent(window.location.href);
        const metamaskAppDeepLink = `https://metamask.app.link/wc?url=${currentUrl}`;
        window.location.href = metamaskAppDeepLink;
      } else {
        // Desktop without MetaMask
        window.open('https://metamask.io/download/', '_blank');
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
    }
  };

  const disconnect = async () => {
    if (window.ethereum) {
      try {
        await window.ethereum.request({
          method: 'eth_logout'
        });
        setIsConnected(false);
        setAddress(null);
      } catch (error) {
        console.error('Error disconnecting wallet:', error);
      }
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

  // Check connection status whenever the component mounts or window.ethereum changes
  useEffect(() => {
    if (mounted && typeof window !== 'undefined') {
      const checkConnection = async () => {
        if (window.ethereum) {
          try {
            const accounts = await window.ethereum.request<string[]>({
              method: 'eth_accounts'
            });
            handleAccountsChanged(accounts as string[]);

            // Also check chain ID after connection
            const chainId = await window.ethereum.request({
              method: 'eth_chainId'
            });
            handleChainChanged(chainId as string);
          } catch (error) {
            console.error('Error checking connection:', error);
          }
        }
      };
      
      checkConnection();
      
      // Set up event listeners
      if (window.ethereum) {
        const handleAccountsChangedCallback = (...args: unknown[]) => {
          const accounts = args[0] as string[];
          handleAccountsChanged(accounts);
        };
        const handleChainChangedCallback = (...args: unknown[]) => {
          const chainId = args[0] as string;
          handleChainChanged(chainId);
        };
        
        window.ethereum.on('accountsChanged', handleAccountsChangedCallback);
        window.ethereum.on('chainChanged', handleChainChangedCallback);
        
        return () => {
          window.ethereum?.removeListener('accountsChanged', handleAccountsChangedCallback);
          window.ethereum?.removeListener('chainChanged', handleChainChangedCallback);
        };
      }
    }
  }, [mounted]);

  // Don't render anything until mounted
  if (!mounted) return null;

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
            <div className="flex items-center gap-4">
              {isConnected ? (
                <button
                  onClick={disconnect}
                  className="btn-blue-outline"
                >
                  Disconnect {address?.slice(0, 6)}...{address?.slice(-4)}
                </button>
              ) : (
                <button
                  onClick={connectWallet}
                  className="btn-blue"
                >
                  <span className="flex items-center gap-2">
                    <span>Connect Wallet</span>
                    {isMobile && !window.ethereum && (
                      <span className="text-xs opacity-75">(Open in MetaMask)</span>
                    )}
                  </span>
                </button>
              )}
            </div>

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