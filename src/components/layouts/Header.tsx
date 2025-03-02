import { useEffect, useState } from 'react';
import { useNetwork } from '@contexts/NetworkContext';
import Link from 'next/link';
import { cn } from '@utils/cn';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { NetworkSwitcher } from '@/components/common/NetworkSwitcher';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface HeaderProps {
  className?: string;
}

export function Header({ className }: HeaderProps) {
  const [networkSwitchFailed, setNetworkSwitchFailed] = useState(false);
  const { chainId } = useNetwork();

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
                <DialogContent className="sm:max-w-[425px] bg-gray-900 text-white border-gray-700">
                  <DialogHeader>
                    <DialogTitle className="text-white">Switch Network</DialogTitle>
                  </DialogHeader>
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