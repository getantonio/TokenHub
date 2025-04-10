import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { showConnect, UserSession, AppConfig } from '@stacks/connect';
import { STACKS_MAINNET as STACKS_MAINNET_CONFIG, STACKS_TESTNET as STACKS_TESTNET_CONFIG, StacksNetworkConfig } from '@/config/stacks-networks';

interface StacksWalletContextType {
  isConnected: boolean;
  address: string | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  networkConfig: StacksNetworkConfig;
  userSession: UserSession | null;
  switchNetwork: (networkConfig: StacksNetworkConfig) => Promise<void>;
}

const StacksWalletContext = createContext<StacksWalletContextType | undefined>(undefined);

const appConfig = new AppConfig(['store_write', 'publish_data']);
const userSession = new UserSession({ appConfig });

export function StacksWalletProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [currentNetworkConfig, setCurrentNetworkConfig] = useState<StacksNetworkConfig>(STACKS_TESTNET_CONFIG);
  const [session, setSession] = useState<UserSession | null>(null);

  // Check connection on mount
  useEffect(() => {
    if (userSession.isUserSignedIn()) {
      const userData = userSession.loadUserData();
      setSession(userSession);
      setAddress(userData.profile.stxAddress[currentNetworkConfig.isTestnet ? 'testnet' : 'mainnet']);
      setIsConnected(true);
      console.log("Stacks wallet already connected", userData);
    } else {
      console.log("No active Stacks session found.");
    }
  }, [currentNetworkConfig.isTestnet]);

  const connectWallet = useCallback(async () => {
    console.log('[Stacks Connect] Attempting connection...');
    showConnect({
      appDetails: {
        name: 'TokenHub',
        icon: typeof window !== 'undefined' ? `${window.location.origin}/logo.png` : '/logo.png',
      },
      userSession,
      onFinish: (payload) => {
        console.log('[Stacks Connect] onFinish called. Payload:', payload);
        try {
          const userData = payload.userSession.loadUserData();
          setSession(payload.userSession);
          const networkKey = currentNetworkConfig.isTestnet ? 'testnet' : 'mainnet';
          console.log(`[Stacks Connect] Attempting to get address for network: ${networkKey}`);
          const userAddress = userData.profile.stxAddress[networkKey];
          if (!userAddress) {
            console.error(`[Stacks Connect] No address found for network ${networkKey} in user data:`, userData.profile.stxAddress);
            throw new Error(`Could not find address for ${networkKey}`);
          }
          setAddress(userAddress);
          setIsConnected(true);
          console.log('[Stacks Connect] Connection successful. State updated.');
        } catch (error) {
          console.error('[Stacks Connect] Error processing onFinish payload:', error, payload);
          setIsConnected(false); // Ensure disconnected state if error occurs
          setAddress(null);
          setSession(null);
        }
      },
      onCancel: () => {
        console.log('[Stacks Connect] onCancel called.');
        // Optional: Reset state if needed, though usually not necessary on cancel
        // setIsConnected(false);
        // setAddress(null);
      },
    });
  }, [currentNetworkConfig]);

  const disconnectWallet = useCallback(() => {
    if (userSession.isUserSignedIn()) {
      userSession.signUserOut(window.location.origin);
      setSession(null);
      setAddress(null);
      setIsConnected(false);
      console.log("Stacks wallet disconnected.");
    }
  }, []);

  const switchNetwork = useCallback(async (newNetworkConfig: StacksNetworkConfig) => {
    console.log("Attempting to switch Stacks network to:", newNetworkConfig.name);
    setCurrentNetworkConfig(newNetworkConfig);
    
    if (isConnected) {
      console.log("Disconnecting current session to switch network...");
      disconnectWallet();
      setTimeout(() => {
        console.log("Reconnecting with new network preference...");
        connectWallet(); 
      }, 500);
    } else {
      console.log("Network config set for next connection attempt.");
    }
  }, [isConnected, connectWallet, disconnectWallet]);

  return (
    <StacksWalletContext.Provider
      value={{
        isConnected,
        address,
        connectWallet,
        disconnectWallet,
        networkConfig: currentNetworkConfig,
        userSession: session,
        switchNetwork,
      }}
    >
      {children}
    </StacksWalletContext.Provider>
  );
}

export function useStacksWallet() {
  const context = useContext(StacksWalletContext);
  if (context === undefined) {
    throw new Error('useStacksWallet must be used within a StacksWalletProvider');
  }
  return context;
} 