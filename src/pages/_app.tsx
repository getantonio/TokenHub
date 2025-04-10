import '../styles/globals.css'
import type { AppProps } from 'next/app'
import { NetworkProvider } from '../contexts/NetworkContext'
import { Header } from '@components/layouts/Header'
import { Navigation } from '@components/layouts/Navigation'
import '../styles/shared.css'
import { Web3Provider } from '@components/common/Web3Provider'
import { ToastProvider } from '@/components/ui/toast/use-toast'
import { Toaster } from '@/components/ui/toast/toast'
import { StacksWalletProvider } from '@/contexts/StacksWalletContext'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ToastProvider>
      <NetworkProvider>
        <Web3Provider>
          <StacksWalletProvider>
            <div className="min-h-screen bg-background-primary">
              <Header />
              <Navigation />
              <Component {...pageProps} />
              <Toaster />
            </div>
          </StacksWalletProvider>
        </Web3Provider>
      </NetworkProvider>
    </ToastProvider>
  )
} 