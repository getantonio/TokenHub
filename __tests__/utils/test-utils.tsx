import { render } from '@testing-library/react';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { mainnet, sepolia } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Create a test configuration
const testConfig = createConfig({
  chains: [mainnet, sepolia],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
});

const queryClient = new QueryClient();

export function renderWithProviders(ui: React.ReactElement) {
  return render(
    <WagmiProvider config={testConfig}>
      <QueryClientProvider client={queryClient}>
        {ui}
      </QueryClientProvider>
    </WagmiProvider>
  );
} 