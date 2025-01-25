import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import { NetworkProvider } from '../contexts/NetworkContext'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <NetworkProvider>
      <div className="min-h-screen bg-background-primary">
        <Component {...pageProps} />
      </div>
    </NetworkProvider>
  )
} 