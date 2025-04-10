import '@rainbow-me/rainbowkit/styles.css';
import { mainnet, sepolia, arbitrumSepolia, optimismSepolia } from 'viem/chains';
import { http } from 'viem';
import { polygonAmoy, bscMainnet, bscTestnet } from '@/config/chains';
import { createConfig } from 'wagmi';
import { getDefaultWallets } from '@rainbow-me/rainbowkit';

const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID;
if (!projectId) {
  throw new Error(
    'NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID environment variable is not set. ' +
    'Get your project ID from https://cloud.walletconnect.com/'
  );
}

// Debug: Log available networks
console.log('Available networks:', {
  mainnet: mainnet?.id,
  sepolia: sepolia?.id,
  arbitrumSepolia: arbitrumSepolia?.id,
  optimismSepolia: optimismSepolia?.id,
  polygonAmoy: polygonAmoy?.id,
  bscMainnet: bscMainnet?.id,
  bscTestnet: bscTestnet?.id,
  projectId: projectId.slice(0, 6) + '...' // Only log part of the project ID for security
});

// Add wallet detection helper
const detectWallet = () => {
  if (typeof window !== 'undefined') {
    if (window.ethereum) {
      console.log('Detected wallet provider:', {
        isMetaMask: window.ethereum.isMetaMask,
        isCoinbaseWallet: window.ethereum.isCoinbaseWallet,
      });
    } else {
      console.log('No wallet provider detected in window.ethereum');
    }
  }
};

// Call detection on load
setTimeout(detectWallet, 1000);

// Customize Arbitrum Sepolia settings
const customArbitrumSepolia = {
  ...arbitrumSepolia,
  fees: {
    defaultPriorityFee: BigInt(100000000), // 0.1 gwei
  },
  contracts: {
    ...arbitrumSepolia.contracts,
    multicall3: {
      address: '0xca11bde05977b3631167028862be2a173976ca11' as `0x${string}`,
      blockCreated: 81930,
    },
  },
};

// Define supported chains array
const supportedChains = [
  sepolia,
  bscTestnet,
  arbitrumSepolia,
  optimismSepolia,
  polygonAmoy,
  bscMainnet
] as const;

// Configure wallets - NOTE: Wallet connectors are set up in the Web3Provider component
const { wallets } = getDefaultWallets({
  appName: 'Token Factory',
  projectId
});

// Determine the RPC URL for Amoy
const amoyTransportUrl = polygonAmoy.rpcUrls.default.http[0];
console.log(`[lib/wagmi.ts] Configuring transport for Polygon Amoy (${polygonAmoy.id}) with URL: ${amoyTransportUrl}`);

// Determine the RPC URL for Arbitrum Sepolia from env var
const arbitrumSepoliaRpcUrlFromEnv = process.env.NEXT_PUBLIC_ARBITRUMSEPOLIA_RPC_URL;

// **Critical Check:** Ensure the environment variable is loaded
if (!arbitrumSepoliaRpcUrlFromEnv) {
  console.error("CRITICAL ERROR: NEXT_PUBLIC_ARBITRUMSEPOLIA_RPC_URL environment variable is not set or not loaded! Check .env.local and ensure the server was restarted.");
  throw new Error("Missing NEXT_PUBLIC_ARBITRUMSEPOLIA_RPC_URL");
}

console.log(`[lib/wagmi.ts] Attempting to configure transport for Arbitrum Sepolia (${arbitrumSepolia.id}) with URL: ${arbitrumSepoliaRpcUrlFromEnv}`);

// Create wagmi config
export const config = createConfig({
  chains: supportedChains,
  transports: {
    [sepolia.id]: http('https://eth-sepolia.g.alchemy.com/v2/MGnqEI_g1f7R-ozYpSAUpnsivv0lp86t'),
    [bscTestnet.id]: http(bscTestnet.rpcUrls.default.http[0]),
    [arbitrumSepolia.id]: http(
      arbitrumSepoliaRpcUrlFromEnv,
      {
        batch: true,
        timeout: 60_000,
        retryCount: 5,
        retryDelay: 5000,
        fetchOptions: {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      }
    ),
    [optimismSepolia.id]: http(),
    [polygonAmoy.id]: http(amoyTransportUrl),
    [bscMainnet.id]: http(bscMainnet.rpcUrls.default.http[0])
  }
});

export const chains = supportedChains; 