import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mainnet, sepolia } from 'viem/chains';

export const config = getDefaultConfig({
  appName: 'Token Factory',
  projectId: 'YOUR_PROJECT_ID',
  chains: [mainnet, sepolia],
}); 