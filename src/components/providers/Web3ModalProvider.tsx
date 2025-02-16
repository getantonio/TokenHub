import { getDefaultWallets, RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { createConfig, WagmiConfig } from 'wagmi';
import { bsc, bscTestnet, mainnet, sepolia } from 'viem/chains';
import { http } from 'viem';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@rainbow-me/rainbowkit/styles.css';

const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '';
const chains = [bsc, bscTestnet, mainnet, sepolia] as const;

const { wallets } = getDefaultWallets({
  appName: 'Token Factory',
  projectId
});

const config = createConfig({
  chains,
  transports: {
    [bsc.id]: http(),
    [bscTestnet.id]: http(),
    [mainnet.id]: http(),
    [sepolia.id]: http()
  }
});

const queryClient = new QueryClient();

export function Web3ModalProvider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiConfig config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: '#3b82f6',
            borderRadius: 'medium'
          })}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiConfig>
  );
} 