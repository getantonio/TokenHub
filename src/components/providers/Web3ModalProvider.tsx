import { createWeb3Modal, defaultWagmiConfig } from '@web3modal/wagmi'
import { WagmiConfig } from 'wagmi'
import { arbitrum, mainnet, polygon, bsc, bscTestnet } from 'viem/chains'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect } from 'react'

// Get projectId at https://cloud.walletconnect.com
export const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || ''

const metadata = {
  name: 'Token Factory',
  description: 'Create and instantly list your token on DEX with advanced trading controls.',
  url: 'https://tokenfactory.xyz',
  icons: ['https://avatars.githubusercontent.com/u/37784886']
}

const chains = [mainnet, bsc, bscTestnet, polygon, arbitrum] as const

const wagmiConfig = defaultWagmiConfig({
  chains,
  projectId,
  metadata,
  enableWalletConnect: true,
  enableInjected: true,
  enableEIP6963: true,
  enableCoinbase: true
})

const queryClient = new QueryClient()

export function Web3ModalProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize modal
    createWeb3Modal({
      wagmiConfig,
      projectId,
      defaultChain: bsc,
      themeMode: 'dark',
      themeVariables: {
        '--w3m-accent': '#3b82f6'
      },
      featuredWalletIds: [
        'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // MetaMask
        'fd20dc426fb37566d803205b19bbc1d4096b248ac04548e3cfb6b3a38bd033aa', // Coinbase
        '38f5d18bd8522c244bdd70cb4a68e0e718865155811c043f052fb9f1c51de662', // Trust
        '19177a98252e07ddfc9af2083ba8e07ef627cb6103467ffebb3f8f4205fd7927'  // Brave
      ]
    })
  }, [])

  return (
    <WagmiConfig config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiConfig>
  )
} 