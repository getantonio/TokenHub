"use client";

import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown, ChevronUp, Terminal, Network, Wallet, Copy, ExternalLink } from 'lucide-react';

const TEST_ACCOUNT = {
  privateKey: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  balance: "10,000 ETH"
};

const NETWORK_CONFIG = {
  name: "Localhost 8545",
  rpcUrl: "http://127.0.0.1:8545",
  chainId: "31337"
};

export function NetworkRequirements() {
  const [isExpanded, setIsExpanded] = useState(true);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <Card className="bg-gray-800 border-gray-700">
      <div 
        className="flex items-center justify-between p-2 cursor-pointer border-b border-gray-700"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          <h3 className="text-sm font-medium">Test Network Setup</h3>
        </div>
        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </div>
      
      {isExpanded && (
        <CardContent className="p-3 space-y-3 text-sm">
          {/* Network Configuration */}
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <Network className="h-4 w-4 mt-0.5 text-gray-400" />
              <div>
                <h4 className="font-medium text-xs mb-1">Network Configuration</h4>
                <div className="space-y-1 text-xs text-gray-400">
                  <p>• Network Name: {NETWORK_CONFIG.name}</p>
                  <div className="flex items-center gap-1">
                    <p>• RPC URL: {NETWORK_CONFIG.rpcUrl}</p>
                    <Copy 
                      className="h-3 w-3 cursor-pointer hover:text-white" 
                      onClick={() => copyToClipboard(NETWORK_CONFIG.rpcUrl)}
                    />
                  </div>
                  <p>• Chain ID: {NETWORK_CONFIG.chainId}</p>
                </div>
              </div>
            </div>

            {/* Test Account */}
            <div className="flex items-start gap-2">
              <Wallet className="h-4 w-4 mt-0.5 text-gray-400" />
              <div>
                <h4 className="font-medium text-xs mb-1">Test Account</h4>
                <div className="space-y-1 text-xs text-gray-400">
                  <div className="flex items-center gap-1">
                    <p>• Private Key: {TEST_ACCOUNT.privateKey.slice(0, 20)}...</p>
                    <Copy 
                      className="h-3 w-3 cursor-pointer hover:text-white" 
                      onClick={() => copyToClipboard(TEST_ACCOUNT.privateKey)}
                    />
                  </div>
                  <p>• Balance: {TEST_ACCOUNT.balance}</p>
                </div>
              </div>
            </div>

            {/* Setup Instructions */}
            <div className="flex items-start gap-2">
              <Terminal className="h-4 w-4 mt-0.5 text-gray-400" />
              <div>
                <h4 className="font-medium text-xs mb-1">Setup Instructions</h4>
                <div className="space-y-1 text-xs text-gray-400">
                  <p>1. Add network to MetaMask using the configuration above</p>
                  <p>2. Import test account using the private key</p>
                  <p>3. Run local node: <code className="bg-gray-700 px-1 rounded">npm run node</code></p>
                  <p>4. Deploy contracts: <code className="bg-gray-700 px-1 rounded">npm run deploy:local</code></p>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-700 pt-2 mt-2">
            <p className="text-xs text-yellow-400">⚠️ Never use test accounts or private keys on mainnet!</p>
          </div>
        </CardContent>
      )}
    </Card>
  );
} 