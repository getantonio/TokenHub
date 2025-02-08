import '@rainbow-me/rainbowkit/styles.css';
import {
  getDefaultConfig,
  RainbowKitProvider,
} from '@rainbow-me/rainbowkit';
import { mainnet, sepolia } from 'viem/chains';
import { http } from 'viem';
import { polygonAmoy } from '@/config/chains';

const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || 'YOUR_PROJECT_ID';

export const config = getDefaultConfig({
  appName: 'Token Factory',
  projectId: projectId,
  chains: [mainnet, sepolia, polygonAmoy],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [polygonAmoy.id]: http(polygonAmoy.rpcUrls.default.http[0]),
  },
});

export const chains = [mainnet, sepolia, polygonAmoy]; 