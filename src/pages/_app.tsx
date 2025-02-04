import '../styles/globals.css'
import type { AppProps } from 'next/app'
import { NetworkProvider } from '../contexts/NetworkContext'
import { WalletProvider } from '../contexts/WalletContext'
import { Header } from '@components/layouts/Header'
import { Navigation } from '@components/layouts/Navigation'
import '../styles/shared.css'
import { Web3Provider } from '@components/common/Web3Provider'
import { ToastProvider } from '@/components/ui/toast/use-toast'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ToastProvider>
      <NetworkProvider>
        <WalletProvider>
          <Web3Provider>
            <div className="min-h-screen bg-background-primary">
              <Header />
              <Navigation />
              <Component {...pageProps} />
            </div>
          </Web3Provider>
        </WalletProvider>
      </NetworkProvider>
    </ToastProvider>
  )
} 