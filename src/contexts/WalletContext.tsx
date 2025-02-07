import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import type { MetaMaskInpageProvider } from '@metamask/providers';

interface WalletContextType {
  isConnected: boolean;
  address: string | undefined;
  connectWallet: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string>();

  useEffect(() => {
    const checkConnection = async () => {
      if (typeof window.ethereum !== 'undefined') {
        try {
          const accounts = await window.ethereum.request({ 
            method: 'eth_accounts' 
          }) as string[];
          if (accounts && accounts[0]) {
            setAddress(accounts[0]);
            setIsConnected(true);
          }
        } catch (error) {
          console.error('Error checking connection:', error);
        }
      }
    };

    checkConnection();

    // Listen for account changes
    if (window.ethereum) {
      const handleAccountsChanged = (accounts: unknown) => {
        if (Array.isArray(accounts)) {
          if (accounts.length === 0) {
            setIsConnected(false);
            setAddress(undefined);
          } else {
            setAddress(accounts[0] as string);
            setIsConnected(true);
          }
        }
      };

      const handleChainChanged = () => {
        // Reload the page on chain change
        window.location.reload();
      };

      const handleDisconnect = () => {
        setIsConnected(false);
        setAddress(undefined);
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
      window.ethereum.on('disconnect', handleDisconnect);

      return () => {
        if (window.ethereum) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
          window.ethereum.removeListener('chainChanged', handleChainChanged);
          window.ethereum.removeListener('disconnect', handleDisconnect);
        }
      };
    }
  }, []);

  const connectWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      alert('Please install MetaMask to use this app');
      return;
    }

    try {
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      }) as string[];
      if (accounts && accounts[0]) {
        setAddress(accounts[0]);
        setIsConnected(true);
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
    }
  };

  return (
    <WalletContext.Provider value={{ isConnected, address, connectWallet }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}