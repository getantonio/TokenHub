import { useEffect, useState } from 'react';
import { useNetwork } from '@contexts/NetworkContext';
import { NetworkIndicator } from '@components/common/NetworkIndicator';
import Link from 'next/link';
import { cn } from '@utils/cn';
import { ConnectButton } from '@rainbow-me/rainbowkit';

interface HeaderProps {
  className?: string;
}

export function Header({ className }: HeaderProps) {
  return (
    <header className={cn('bg-background-secondary border-b border-border py-2', className)}>
      <nav className="container mx-auto px-4">
        <div className="flex items-center justify-between h-12">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <span className="text-2xl font-bold text-white">TokenHub</span>
              <span className="text-2xl font-light text-blue-500">.dev</span>
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            <NetworkIndicator />
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
                          <button onClick={openConnectModal} className="btn-blue">
                            <span className="text-lg">⚡</span>
                          </button>
                        );
                      }

                      return (
                        <div className="flex items-center gap-4">
                          <button
                            onClick={openChainModal}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-500/20 rounded-md hover:bg-blue-500/30"
                          >
                            {chain.hasIcon && (
                              <div className="w-5 h-5">
                                {chain.iconUrl && (
                                  <img
                                    alt={chain.name ?? 'Chain icon'}
                                    src={chain.iconUrl}
                                    className="w-5 h-5"
                                  />
                                )}
                              </div>
                            )}
                            <span>{chain.name}</span>
                          </button>

                          <button
                            onClick={openAccountModal}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-500/20 rounded-md hover:bg-blue-500/30"
                          >
                            <span>
                              {account.displayName}
                            </span>
                            <span>⚙️</span>
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