import { useEffect, useState } from 'react';
import { useNetwork } from '@contexts/NetworkContext';
import Link from 'next/link';
import { cn } from '@utils/cn';
import { ConnectButton } from '@rainbow-me/rainbowkit';

interface HeaderProps {
  className?: string;
}

export function Header({ className }: HeaderProps) {
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
                            onClick={openChainModal}
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