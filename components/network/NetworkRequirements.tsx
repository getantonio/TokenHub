"use client";

import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown, ChevronUp, Terminal, Network, Wallet, Copy, ExternalLink } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useChainId } from 'wagmi';

export function NetworkRequirements() {
  const [isExpanded, setIsExpanded] = useState(true);
  const chainId = useChainId();

  const handleSwitchToSepolia = async () => {
    try {
      if (!window.ethereum) {
        throw new Error('Please install MetaMask');
      }

      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0xaa36a7' }], // 11155111 in hex
      });
    } catch (error: any) {
      console.error('Failed to switch to Sepolia:', error);
    }
  };

  return (
    <Card className="bg-gray-800 border-gray-700">
      <div 
        className="flex items-center justify-between p-2 cursor-pointer border-b border-gray-700"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${chainId === 11155111 ? 'bg-green-500' : 'bg-yellow-500'}`} />
          <h3 className="text-sm font-medium">Network Status</h3>
        </div>
        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </div>
      
      {isExpanded && (
        <CardContent className="p-3 space-y-3 text-sm">
          <Alert variant="default" className="bg-blue-900/20 border-blue-800">
            <AlertTitle className="text-sm flex items-center gap-2">
              <Network className="h-4 w-4" />
              {chainId === 11155111 ? 'Connected to Sepolia Testnet' : 'Mainnet Detected'}
            </AlertTitle>
            <AlertDescription className="text-xs mt-2 space-y-2">
              {chainId === 11155111 ? (
                <>
                  <p>Perfect for testing! You'll need some test ETH:</p>
                  <div className="flex items-center gap-2 mt-1">
                    <a 
                      href="https://sepoliafaucet.com" 
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                      Get Test ETH
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </>
              ) : (
                <>
                  <p>You're on mainnet. For testing:</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSwitchToSepolia}
                    className="text-xs h-7"
                  >
                    Switch to Sepolia Testnet
                  </Button>
                </>
              )}
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Network className="h-4 w-4" />
              Current Network
            </h4>
            <div className="pl-6 space-y-2 text-xs text-gray-300">
              <ul className="list-disc list-inside pl-2 space-y-1">
                {chainId === 11155111 ? (
                  <>
                    <li>Network: Sepolia Testnet</li>
                    <li>RPC URL: https://rpc.sepolia.org</li>
                    <li>Chain ID: 11155111</li>
                    <li>Currency: SepoliaETH (test tokens)</li>
                    <li>Explorer: <a 
                      href="https://sepolia.etherscan.io" 
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300"
                    >
                      sepolia.etherscan.io
                    </a></li>
                  </>
                ) : (
                  <>
                    <li>Network: Ethereum Mainnet</li>
                    <li>Chain ID: 1</li>
                    <li>Currency: ETH</li>
                    <li>Explorer: <a 
                      href="https://etherscan.io" 
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300"
                    >
                      etherscan.io
                    </a></li>
                  </>
                )}
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-700 pt-2 mt-2">
            <p className="text-xs text-yellow-400">
              {chainId === 11155111 
                ? "⚠️ Test thoroughly on Sepolia before deploying to mainnet!" 
                : "⚠️ This is mainnet! Real ETH will be used for transactions."}
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  );
} 