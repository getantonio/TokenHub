"use client";

import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown, ChevronUp, Terminal, Network, Wallet, Copy, ExternalLink } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function NetworkRequirements() {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <Card className="bg-gray-800 border-gray-700">
      <div 
        className="flex items-center justify-between p-2 cursor-pointer border-b border-gray-700"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium">Network Requirements</h3>
        </div>
        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </div>
      
      {isExpanded && (
        <CardContent className="p-3 space-y-3 text-sm">
          <Alert variant="default" className="bg-blue-900/20 border-blue-800">
            <AlertTitle className="text-sm flex items-center gap-2">
              <Network className="h-4 w-4" />
              Sepolia Testnet Required
            </AlertTitle>
            <AlertDescription className="text-xs mt-2 space-y-2">
              <p>To test your token before mainnet deployment:</p>
              <ol className="list-decimal list-inside space-y-1 pl-2">
                <li>Switch to Sepolia testnet in MetaMask</li>
                <li>Get free test ETH from a Sepolia faucet:
                  <div className="flex items-center gap-2 mt-1 ml-4">
                    <a 
                      href="https://sepoliafaucet.com" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                      sepoliafaucet.com
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </li>
                <li>Create and test your token with no gas costs</li>
              </ol>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Network className="h-4 w-4" />
              Network Details
            </h4>
            <div className="pl-6 space-y-2 text-xs text-gray-300">
              <ul className="list-disc list-inside pl-2 space-y-1">
                <li>Network Name: Sepolia</li>
                <li>RPC URL: https://rpc.sepolia.org</li>
                <li>Chain ID: 11155111</li>
                <li>Currency Symbol: ETH</li>
                <li>Block Explorer: <a 
                    href="https://sepolia.etherscan.io" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300"
                  >
                    sepolia.etherscan.io
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-700 pt-2 mt-2">
            <p className="text-xs text-yellow-400">⚠️ Test thoroughly on Sepolia before deploying to mainnet!</p>
          </div>
        </CardContent>
      )}
    </Card>
  );
} 