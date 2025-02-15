import { createWeb3Modal, defaultWagmiConfig } from '@web3modal/wagmi/react'
import { WagmiConfig } from 'wagmi'
import { bsc, bscTestnet, mainnet, sepolia } from 'viem/chains'
import type { Chain } from 'viem'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect } from 'react'

// Get projectId at https://cloud.walletconnect.com
const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID as string
if (!projectId) {
  throw new Error('NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID environment variable is not set')
}
const validProjectId: string = projectId

const metadata = {
  name: 'Token Factory',
  description: 'Create and instantly list your token on DEX with advanced trading controls.',
  url: 'https://tokenfactory.xyz',
  icons: ['https://tokenfactory.xyz/logo.png']
}

const chains = [bsc, mainnet, bscTestnet, sepolia] as const

const wagmiConfig = defaultWagmiConfig({
  chains,
  projectId,
  metadata,
  enableWalletConnect: true,
  enableInjected: true,
  enableEIP6963: true
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
        '--w3m-accent': '#3b82f6',
        '--w3m-border-radius-master': '0.5rem'
      },
      featuredWalletIds: [
        'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // MetaMask
        '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0', // Trust Wallet
        'fd20dc426fb37566d803205b19bbc1d4096b248ac04548e3cfb6b3a38bd033aa', // Coinbase Wallet
        'ef333840daf915aafdc4a004525502d6d49d77bd9c65e0642dbaefb3c2893bef', // Brave Wallet
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