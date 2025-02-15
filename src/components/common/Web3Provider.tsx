import '@rainbow-me/rainbowkit/styles.css';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { WagmiConfig } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from '@/lib/wagmi';
import { useEffect, useRef } from 'react';

const queryClient = new QueryClient();

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    function handleClickOutside(event: MouseEvent) {
      // Find any open RainbowKit modal
      const modal = document.querySelector('[data-rk]');
      const target = event.target as Node;
      
      // If there's an open modal and the click is outside of it
      if (modal && !modal.contains(target) && !navRef.current?.contains(target)) {
        // Clear any existing timeout
        if (timeoutId) clearTimeout(timeoutId);
        
        // Set a small delay to ensure the click event is fully processed
        timeoutId = setTimeout(() => {
          // Find and click the close button if it exists
          const closeButton = modal.querySelector('button[aria-label="Close"]');
          if (closeButton instanceof HTMLElement) {
            closeButton.click();
          }
        }, 50);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  return (
    <WagmiConfig config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider 
          theme={darkTheme({
            accentColor: '#3b82f6',
            accentColorForeground: 'white',
            borderRadius: 'medium'
          })}
          modalSize="compact"
          appInfo={{
            appName: 'Token Factory',
            learnMoreUrl: 'https://tokenfactory.xyz/docs',
          }}
        >
          <div ref={navRef}>
            {children}
          </div>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiConfig>
  );
} 