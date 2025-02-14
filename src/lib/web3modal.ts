import { createWeb3Modal, defaultWagmiConfig } from '@web3modal/wagmi'
import { type Chain } from 'viem'
import { mainnet, sepolia, optimism, optimismSepolia, bsc, bscTestnet } from 'viem/chains'

// 1. Get projectId at https://cloud.walletconnect.com
export const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || ''

// 2. Create wagmiConfig
const metadata = {
  name: 'Token Factory',
  description: 'Create and instantly list your token on DEX with advanced trading controls.',
  url: 'https://tokenfactory.xyz', 
  icons: ['https://avatars.githubusercontent.com/u/37784886']
}

const chains = [mainnet, bsc, bscTestnet, sepolia, optimism, optimismSepolia] as const

export const wagmiConfig = defaultWagmiConfig({ 
  chains, 
  projectId, 
  metadata,
  ssr: true
})

// 3. Create modal
if (typeof window !== 'undefined') {
  createWeb3Modal({
    wagmiConfig,
    projectId,
    defaultChain: bsc
  })
} 