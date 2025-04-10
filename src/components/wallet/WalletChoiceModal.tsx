import React from 'react';
import { useConnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { useStacksWallet } from '@/contexts/StacksWalletContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { FaEthereum } from 'react-icons/fa';
// Using a generic icon for Stacks, replace if a specific one is available/preferred
import { FiGrid } from 'react-icons/fi'; 
import { cn } from '@/utils/cn'; // Import cn for conditional classes if needed

interface WalletChoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WalletChoiceModal({ isOpen, onClose }: WalletChoiceModalProps) {
  const { connect: connectEvm } = useConnect();
  const { connectWallet: connectStacks } = useStacksWallet();

  const handleConnectEvm = () => {
    connectEvm({ connector: injected() });
    onClose(); // Close modal after initiating connection
  };

  const handleConnectStacks = () => {
    connectStacks();
    onClose(); // Close modal after initiating connection
  };

  const buttonBaseClasses = "w-full h-28 flex flex-col items-center justify-center gap-1 text-lg border-2 rounded-lg p-4 transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900";
  const evmClasses = "border-blue-600/50 hover:border-blue-500 hover:bg-blue-900/40 hover:shadow-lg hover:shadow-blue-500/20 focus:ring-blue-500 text-blue-300 hover:text-white";
  const stacksClasses = "border-purple-600/50 hover:border-purple-500 hover:bg-purple-900/40 hover:shadow-lg hover:shadow-purple-500/20 focus:ring-purple-500 text-purple-300 hover:text-white";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-gradient-to-br from-gray-900 via-gray-900 to-background-primary text-white border-gray-700 rounded-lg shadow-xl">
        <DialogHeader className="text-center">
          <DialogTitle className="text-2xl font-bold">Choose Wallet Type</DialogTitle>
          <DialogDescription className="text-gray-400 pt-1">
            Select the network ecosystem for your wallet.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-5 py-6 px-4">
          {/* EVM Button */}
          <Button 
            variant="secondary" // Keep variant simple, styling is custom
            className={cn(buttonBaseClasses, evmClasses)}
            onClick={handleConnectEvm}
          >
            <FaEthereum className="w-9 h-9 mb-2 text-blue-400" />
            <span className="font-semibold">EVM Networks</span>
            <span className="text-sm text-gray-400 text-center px-2 mt-1">
              ERC-20 tokens on Ethereum, Polygon, BSC, etc. (e.g., MetaMask)
            </span>
          </Button>
          
          {/* Stacks Button */}
          <Button 
            variant="secondary" // Keep variant simple, styling is custom
            className={cn(buttonBaseClasses, stacksClasses)}
            onClick={handleConnectStacks}
          >
            <FiGrid className="w-9 h-9 mb-2 text-purple-400" />
            <span className="font-semibold">Stacks</span>
            <span className="text-sm text-gray-400 text-center px-2 mt-1">
              Bitcoin layer for smart contracts & apps (e.g., Leather)
            </span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 