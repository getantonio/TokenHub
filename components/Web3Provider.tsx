import { getDefaultWallets, RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { createConfig, WagmiConfig } from 'wagmi';
import { mainnet, sepolia, arbitrumSepolia, optimismSepolia, Chain } from 'viem/chains';
import { http } from 'viem';
import '@rainbow-me/rainbowkit/styles.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChainId } from '../config/networks';

// Define Polygon Amoy testnet
const polygonAmoy = {
  id: ChainId.POLYGON_AMOY,
  name: 'Polygon Amoy',
  nativeCurrency: {
    decimals: 18,
    name: 'MATIC',
    symbol: 'MATIC',
  },
  rpcUrls: {
    default: { http: ['https://rpc-amoy.polygon.technology'] },
    public: { http: ['https://rpc-amoy.polygon.technology'] },
  },
  blockExplorers: {
    default: { name: 'PolygonScan', url: 'https://www.oklink.com/amoy' },
  },
  testnet: true,
} as const satisfies Chain;

const projectId = 'YOUR_PROJECT_ID'; // Get this from WalletConnect Cloud

const { wallets } = getDefaultWallets({
  appName: 'TokenHub.dev',
  projectId,
});

const chains = [mainnet, sepolia, arbitrumSepolia, optimismSepolia, polygonAmoy] as const;

console.log('Web3Provider chains:', chains.map(chain => ({
  id: chain.id,
  name: chain.name
})));

const config = createConfig({
  chains,
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [arbitrumSepolia.id]: http(),
    [optimismSepolia.id]: http(),
    [polygonAmoy.id]: http(),
  },
});

const queryClient = new QueryClient();

export function Web3Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiConfig config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: '#3b82f6',
            accentColorForeground: 'white',
            borderRadius: 'medium',
            overlayBlur: 'small'
          })}
          modalSize="compact"
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiConfig>
  );
} 