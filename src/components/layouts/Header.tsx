import { useEffect, useState } from 'react';
import { useNetwork } from '@contexts/NetworkContext';
import Link from 'next/link';
import { cn } from '@utils/cn';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { NetworkSwitcher } from '@/components/common/NetworkSwitcher';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';

// Define an interface for the network data
interface Network {
  id: number;
  name: string;
  color: string;
}

// Network color mapping
const networkColors: Record<number | string, string> = {
  1: 'bg-blue-500',       // Ethereum Mainnet
  5: 'bg-yellow-500',     // Goerli
  11155111: 'bg-purple-500', // Sepolia
  80001: 'bg-green-500',  // Polygon Mumbai
  80002: 'bg-green-600',  // Polygon Amoy
  137: 'bg-purple-600',   // Polygon Mainnet
  97: 'bg-yellow-600',    // BSC Testnet
  56: 'bg-yellow-400',    // BSC Mainnet
  'default': 'bg-gray-500'  // Unknown networks
};

// Network name mapping
const networkNames: Record<number, string> = {
  1: 'Ethereum Mainnet',
  5: 'Goerli Testnet',
  11155111: 'Sepolia Testnet',
  80001: 'Polygon Mumbai',
  80002: 'Polygon Amoy',
  137: 'Polygon Mainnet',
  97: 'BSC Testnet',
  56: 'BSC Mainnet',
};

interface HeaderProps {
  className?: string;
}

export function Header({ className }: HeaderProps) {
  const [networkSwitchFailed, setNetworkSwitchFailed] = useState(false);
  const { chainId } = useNetwork();
  
  // Store the active wallet network data for display
  const [activeWalletNetwork, setActiveWalletNetwork] = useState<Network | null>(null);

  // When the chainId changes, update the active wallet network
  useEffect(() => {
    if (chainId) {
      setActiveWalletNetwork({
        id: chainId,
        name: networkNames[chainId] || `Network ${chainId}`,
        color: networkColors[chainId] || networkColors['default']
      });
    } else {
      setActiveWalletNetwork(null);
    }
  }, [chainId]);

  // Add event listener for network switch failures
  useEffect(() => {
    const checkWalletErrors = () => {
      if (window.ethereum) {
        const originalRequest = window.ethereum.request;
        
        // Override the request method to catch network switching errors
        window.ethereum.request = async function(...args: any[]) {
          try {
            const result = await originalRequest.apply(this, args);
            
            // If this was a network switch attempt, reset the failure state
            if (args[0]?.method === 'wallet_switchEthereumChain') {
              setNetworkSwitchFailed(false);
            }
            
            return result;
          } catch (error: any) {
            // Track network switching failures
            if (args[0]?.method === 'wallet_switchEthereumChain' || 
                args[0]?.method === 'wallet_addEthereumChain') {
              console.error('Network switch error:', error);
              setNetworkSwitchFailed(true);
            }
            throw error;
          }
        };
      }
    };
    
    checkWalletErrors();
  }, []);

  return (
    <header className={cn('relative z-50 bg-background-secondary border-b border-border py-1', className)}>
      <nav className="container mx-auto px-4">
        <div className="flex items-center justify-between h-12">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <span className="text-3xl font-medium text-white">TokenHub</span>
              <span className="text-3xl font-bold text-blue-500">.dev</span>
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            {/* Network troubleshooter dialog */}
            {networkSwitchFailed && (
              <Dialog>
                <DialogTrigger asChild>
                  <button className="px-3 py-1.5 text-sm font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-md transition-colors duration-200">
                    Network Issues?
                  </button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] bg-gray-900 text-white border-gray-700" aria-describedby="network-selection-description">
                  <DialogHeader>
                    <DialogTitle>Select Network</DialogTitle>
                  </DialogHeader>
                  <DialogDescription id="network-selection-description" className="text-gray-400">
                    Choose the blockchain network you want to connect to.
                  </DialogDescription>
                  
                  {/* Wallet network indicator - shown only when a network is connected */}
                  {activeWalletNetwork && (
                    <div className="mb-4 p-3 border border-gray-700 rounded-md bg-gray-800">
                      <h3 className="text-sm font-medium text-gray-300 mb-1">Current Wallet Network</h3>
                      <div className="flex items-center">
                        <div className={`w-2 h-2 rounded-full ${activeWalletNetwork.color} mr-2`}></div>
                        <span className="text-sm text-white">{activeWalletNetwork.name}</span>
                      </div>
                    </div>
                  )}
                  
                  <div className="py-4">
                    <p className="mb-4 text-sm text-gray-300">
                      If you're having trouble switching networks with your wallet, you can try using
                      this alternative network selector.
                    </p>
                    <NetworkSwitcher />
                  </div>
                </DialogContent>
              </Dialog>
            )}

            <ConnectButton.Custom>
              {({
                account,
                chain,
                openAccountModal,
                openChainModal,
                openConnectModal,
                mounted,
              }) => {
                const ready = mounted;
                const connected = ready && account && chain;

                return (
                  <div
                    {...(!ready && {
                      'aria-hidden': true,
                      style: {
                        opacity: 0,
                        pointerEvents: 'none',
                        userSelect: 'none',
                      },
                    })}
                  >
                    {(() => {
                      if (!connected) {
                        return (
                          <button 
                            onClick={openConnectModal} 
                            className="px-4 py-2 rounded-md font-medium bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors duration-200"
                          >
                            Connect Wallet
                          </button>
                        );
                      }

                      return (
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => {
                              console.log('Opening chain modal, current chain:', chain);
                              openChainModal();
                            }}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-md transition-colors duration-200"
                          >
                            {chain.hasIcon && chain.iconUrl && (
                              <img
                                alt={chain.name ?? 'Chain icon'}
                                src={chain.iconUrl}
                                className="w-4 h-4"
                              />
                            )}
                            {chain.name}
                          </button>

                          <button
                            onClick={openAccountModal}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-md transition-colors duration-200"
                          >
                            {account.displayName}
                            {account.displayBalance ? ` (${account.displayBalance})` : ''}
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                );
              }}
            </ConnectButton.Custom>
          </div>
        </div>
      </nav>
    </header>
  );
}