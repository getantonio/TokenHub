import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi'; // Import wagmi hook
import { useDisconnect } from 'wagmi'; // Import wagmi hook for EVM disconnect
import { ConnectButton } from '@rainbow-me/rainbowkit'; // Import RainbowKit button
import { useStacksWallet } from '@/contexts/StacksWalletContext'; // Import Stacks context
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/button'; // Import your Button component
import { WalletChoiceModal } from '@/components/wallet/WalletChoiceModal'; // Import the new modal
import { STACKS_MAINNET_CONFIG, STACKS_TESTNET_CONFIG } from '@/config/stacks-networks'; // Import Stacks configs

// Remove unused imports like useNetwork, NetworkSwitcher, Dialog, WalletSelector, etc.
// Remove network color/name mappings if no longer used directly here

interface HeaderProps {
  className?: string;
}

export function Header({ className }: HeaderProps) {
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false); // <-- Add mounted state
  
  // EVM Wallet State
  const { address: evmAddress, isConnected: isEvmConnected } = useAccount();
  const { disconnect: disconnectEvm } = useDisconnect();

  // Stacks Wallet State
  const { 
    address: stacksAddress, 
    isConnected: isStacksConnected, 
    disconnectWallet: disconnectStacks,
    switchNetwork: switchStacksNetwork, // Get switch function
    networkConfig: currentStacksNetwork // Get current network config
  } = useStacksWallet();

  // Set mounted state after initial render
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const openConnectModal = () => setIsConnectModalOpen(true);
  const closeConnectModal = () => setIsConnectModalOpen(false);

  const handleStacksNetworkSwitch = (network: typeof STACKS_MAINNET_CONFIG | typeof STACKS_TESTNET_CONFIG) => {
    if (currentStacksNetwork?.chainId !== network.chainId) {
      switchStacksNetwork(network);
    }
  };

  // Determine overall connection state (only if mounted)
  const isAnyWalletConnected = isMounted && (isEvmConnected || isStacksConnected);
  
  // Add console log for debugging
  if (isMounted) {
    console.log('[Header Debug] Mounted:', isMounted, '| EVM Connected:', isEvmConnected, '| Stacks Connected:', isStacksConnected);
  }

  return (
    <header className={cn("sticky top-0 z-50 w-full border-b border-gray-800 bg-gray-900/95 backdrop-blur supports-[backdrop-filter]:bg-gray-900/75", className)}>
      <nav className="container mx-auto flex items-center justify-between px-4 py-2 h-16"> {/* Reduced py-3 to py-2, h-20 to h-16 */} 
        {/* Left side: Logo */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <Link href="/" className="text-4xl font-bold text-white flex items-baseline"> {/* Reduced from text-5xl to text-4xl */}
            TokenHub<span className="text-4xl font-bold text-blue-500">.dev</span> {/* Reduced from text-5xl to text-4xl */} 
          </Link>
        </div>

        {/* Right side: Wallet Connection */}
        <div className="flex items-center gap-2 min-h-[40px] flex-shrink-0">
          {/* Placeholder while loading */}
          {!isMounted && (
            <div className="h-8 w-28 rounded-md bg-gray-800 animate-pulse"></div> 
          )}

          {/* Render actual UI only when mounted */}
          {isMounted && (
            <>
              {/* Case 1: No wallet connected - Stricter Check */}
              {!evmAddress && !stacksAddress && (
                <Button 
                  onClick={openConnectModal}
                  className="px-4 py-2 rounded-md font-medium bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors duration-200"
                >
                  Connect Wallet
                </Button>
              )}

              {/* Case 2: EVM wallet connected - Check address */}
              {evmAddress && (
                <ConnectButton.Custom>
                  {({
                    account,
                    chain,
                    openAccountModal,
                    openChainModal,
                    mounted,
                  }) => {
                    // Use address from hook now, account from Render Prop might be slightly delayed
                    const ready = mounted;
                    const connected = ready && evmAddress && chain;
                    if (!connected) return null;
                    return (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={openChainModal}
                          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-md transition-colors duration-200"
                        >
                          {chain.hasIcon && chain.iconUrl && (
                            <img alt={chain.name ?? 'Chain icon'} src={chain.iconUrl} className="w-4 h-4" />
                          )}
                          {chain.name}
                        </button>
                        <button
                          onClick={openAccountModal}
                          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-md transition-colors duration-200"
                        >
                          {account?.displayName}
                          {account?.displayBalance ? ` (${account.displayBalance})` : ''}
                        </button>
                      </div>
                    );
                  }}
                </ConnectButton.Custom>
              )}
              
              {/* Case 3: Stacks wallet connected - Check address */}
              {stacksAddress && currentStacksNetwork && (
                <>
                  {/* Stacks Network Switcher */}
                  <div className="flex items-center border border-gray-700 rounded-md overflow-hidden">
                    <Button
                      variant="secondary"
                      onClick={() => handleStacksNetworkSwitch(STACKS_MAINNET_CONFIG)}
                      className={cn(
                        "text-xs px-3 py-1 h-8 rounded-none transition-colors duration-150", // Slightly larger button
                        !currentStacksNetwork.isTestnet 
                          ? "bg-gray-600 text-white font-semibold cursor-default" 
                          : "bg-transparent text-gray-400 hover:bg-gray-700/50 border-r border-gray-700"
                      )}
                      disabled={!currentStacksNetwork.isTestnet}
                      title={!currentStacksNetwork.isTestnet ? "Stacks Mainnet Active" : "Switch to Stacks Mainnet"}
                    >
                      Mainnet
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => handleStacksNetworkSwitch(STACKS_TESTNET_CONFIG)}
                      className={cn(
                        "text-xs px-3 py-1 h-8 rounded-none transition-colors duration-150", // Slightly larger button
                        currentStacksNetwork.isTestnet 
                          ? "bg-gray-600 text-white font-semibold cursor-default" 
                          : "bg-transparent text-gray-400 hover:bg-gray-700/50"
                      )}
                      disabled={currentStacksNetwork.isTestnet}
                      title={currentStacksNetwork.isTestnet ? "Stacks Testnet Active" : "Switch to Stacks Testnet"}
                    >
                      Testnet
                    </Button>
                  </div>
                  
                  {/* Stacks Address Display */}
                  <span className="px-3 py-1.5 text-sm font-medium bg-purple-500/20 text-purple-400 rounded-md hidden sm:inline-block">
                    {stacksAddress.slice(0, 5)}...{stacksAddress.slice(-4)}
                  </span>
                  
                  {/* Stacks Disconnect Button */}
                  <Button 
                    variant="secondary" 
                    onClick={disconnectStacks}
                    className="bg-gray-800/50 border border-gray-700/50 text-gray-300 hover:bg-red-800/60 hover:border-red-700/60 hover:text-white h-8 text-xs px-3 py-1 transition-colors duration-150" // Changed hover state
                    title="Disconnect Stacks Wallet"
                  >
                    Disconnect
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      </nav>

      {/* Wallet Choice Modal - Render conditionally based on isMounted to avoid hydration issues? Maybe not necessary for Dialog? Test first. */}
      <WalletChoiceModal isOpen={isConnectModalOpen} onClose={closeConnectModal} />
    </header>
  );
}