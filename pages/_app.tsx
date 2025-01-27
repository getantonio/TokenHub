import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import { NetworkProvider } from '../contexts/NetworkContext'
import { WalletProvider } from '../contexts/WalletContext'
import '../styles/shared.css'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <NetworkProvider>
      <WalletProvider>
        <div className="min-h-screen bg-background-primary">
          <Component {...pageProps} />
        </div>
      </WalletProvider>
    </NetworkProvider>
  )
} 