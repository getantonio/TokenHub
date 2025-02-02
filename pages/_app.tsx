import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import { NetworkProvider } from '../contexts/NetworkContext'
import { WalletProvider } from '../contexts/WalletContext'
import '../styles/shared.css'
import { WagmiProvider, createConfig } from 'wagmi'
import { mainnet, sepolia } from 'wagmi/chains'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import '@rainbow-me/rainbowkit/styles.css'

const config = getDefaultConfig({
  appName: 'TokenHub',
  projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
  chains: [mainnet, sepolia],
  ssr: true,
})

const queryClient = new QueryClient()

export default function App({ Component, pageProps }: AppProps) {
  return (
    <NetworkProvider>
      <WalletProvider>
        <WagmiProvider config={config}>
          <QueryClientProvider client={queryClient}>
            <div className="min-h-screen bg-background-primary">
              <Component {...pageProps} />
            </div>
          </QueryClientProvider>
        </WagmiProvider>
      </WalletProvider>
    </NetworkProvider>
  )
} 