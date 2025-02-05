import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { WagmiConfig } from 'wagmi';
import { mainnet, sepolia, arbitrumSepolia, optimismSepolia, Chain } from 'viem/chains';
import { http } from 'viem';
import '@rainbow-me/rainbowkit/styles.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChainId } from '@config/networks';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';

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
    default: { http: ['https://rpc.amoy.polymernodes.com'] },
    public: { http: ['https://rpc.amoy.polymernodes.com'] },
  },
  blockExplorers: {
    default: { name: 'OKLink', url: 'https://www.oklink.com/amoy' },
  },
  testnet: true,
} as const satisfies Chain;

const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID;
if (!projectId) {
  throw new Error('Missing NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID environment variable');
}

const chains = [mainnet, sepolia, arbitrumSepolia, optimismSepolia, polygonAmoy] as const;

const config = getDefaultConfig({
  appName: 'TokenHub.dev',
  projectId,
  chains,
  transports: Object.fromEntries(
    chains.map(chain => [
      chain.id,
      http(chain.rpcUrls.default.http[0])
    ])
  ),
});

const queryClient = new QueryClient();

export function Web3Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiConfig config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          modalSize="compact"
          showRecentTransactions={true}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiConfig>
  );
} 