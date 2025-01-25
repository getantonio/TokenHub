"use client";

import React, { useState, useEffect } from 'react';
import Web3 from 'web3';
import { 
  Wallet,
  ExternalLink,
  ChevronDown,
  Clock,
  Shield,
  AlertCircle,
  CheckCircle,
  Send,
  Download,
  FileText,
  History
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  Progress
} from "@/components/ui/progress";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { JsonRpcPayload, JsonRpcResponse } from 'web3-core-helpers';
import { provider } from 'web3-core';

interface Coin {
  id: number;
  name: string;
  symbol: string;
  status: string;
  phase: string;
  price: number;
  nextPhasePrice: number;
  raised: string;
  hardCap: string;
  progress: number;
  minBuy: string;
  maxBuy: string;
  saleEnds: string;
  contractAddress: string;
  audit: string;
  kyc: boolean;
  abi: any; // Replace 'any' with your actual ABI type
}

interface Transaction {
  id: string;
  type: 'send' | 'receive' | 'request';
  amount: string;
  token: string;
  address: string;
  status: 'pending' | 'completed' | 'failed';
  timestamp: string;
}

const CryptoHub: React.FC = () => {
  const [isWalletConnected, setIsWalletConnected] = useState<boolean>(false);
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [selectedCoin, setSelectedCoin] = useState<Coin | null>(null);
  const [purchaseAmount, setPurchaseAmount] = useState<string>('');
  const [web3, setWeb3] = useState<Web3 | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: '1',
      type: 'send',
      amount: '0.5',
      token: 'ETH',
      address: '0x1234...5678',
      status: 'completed',
      timestamp: '2024-01-18T10:30:00'
    },
    // Add more sample transactions as needed
  ]);

  useEffect(() => {
    if (typeof window.ethereum !== 'undefined') {
      const web3Instance = new Web3(window.ethereum);
      setWeb3(web3Instance);
    } else {
      console.error('No web3 provider detected. Please install MetaMask!');
    }
  }, []);

  // Sample data - would come from your backend
  const coins: Coin[] = [
    {
      id: 1,
      name: 'ExampleCoin',
      symbol: 'EXC',
      status: 'presale',
      phase: 'phase1',
      price: 0.012,
      nextPhasePrice: 0.015,
      raised: '1850',
      hardCap: '5000',
      progress: 37,
      minBuy: '0.1',
      maxBuy: '5',
      saleEnds: '2025-02-28T00:00:00',
      contractAddress: '0x1234...5678',
      audit: 'https://audit.com/report',
      kyc: true,
      abi: [] // Add your actual ABI here
    },
    // Add more coins as needed
  ];

  const connectMetaMask = async (): Promise<void> => {
    if (!web3 || !window.ethereum) {
      window.open('https://metamask.io/download/', '_blank');
      return;
    }

    try {
      await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      const accounts = await web3.eth.getAccounts();
      setWalletAddress(accounts[0]);
      setIsWalletConnected(true);
    } catch (error) {
      console.error('Error connecting to MetaMask:', error);
    }
  };

  const connectWalletConnect = async (): Promise<void> => {
    // WalletConnect implementation would go here
    console.log('Connecting WalletConnect...');
  };

  const handlePurchase = async (coinId: number, amount: string): Promise<void> => {
    if (!isWalletConnected || !web3) {
      alert('Please connect your wallet first');
      return;
    }
    try {
      const coin = coins.find(c => c.id === coinId);
      if (!coin) {
        throw new Error('Coin not found');
      }
      const contract = new web3.eth.Contract(coin.abi, coin.contractAddress);
      const value = web3.utils.toWei(amount, 'ether');
      await contract.methods.purchaseTokens().send({
        from: walletAddress,
        value: value
      });
      console.log(`Purchased ${amount} of coin ${coinId}`);
    } catch (error) {
      console.error('Error during purchase:', error);
    }
  };

  const getTimeRemaining = (endTime: string): string => {
    const total = Date.parse(endTime) - Date.parse(new Date().toString());
    const days = Math.floor(total / (1000 * 60 * 60 * 24));
    const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((total / 1000 / 60) % 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const handleSend = async (amount: string, address: string) => {
    if (!web3 || !isWalletConnected) return;
    // Implement send logic
  };

  const handleReceive = () => {
    // Show receive address or QR code
  };

  const handleRequest = (amount: string, description: string) => {
    // Implement request logic
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-white">Token Hub</h1>
          <div className="flex items-center gap-4">
            {!isWalletConnected ? (
              <div className="relative inline-block">
                <button
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                  onClick={() => document.getElementById('wallet-menu')?.classList.toggle('hidden')}
                >
                  <Wallet className="h-5 w-5" />
                  Connect Wallet
                  <ChevronDown className="h-4 w-4" />
                </button>
                <div
                  id="wallet-menu"
                  className="hidden absolute right-0 mt-2 w-48 rounded-lg shadow-lg bg-gray-800 ring-1 ring-black ring-opacity-5"
                >
                  <div className="py-1">
                    <button
                      onClick={connectMetaMask}
                      className="flex items-center gap-2 px-4 py-2 w-full text-left hover:bg-gray-700 text-white"
                    >
                      <img src="/metamask.svg" alt="MetaMask" className="h-5 w-5" />
                      MetaMask
                    </button>
                    <button
                      onClick={connectWalletConnect}
                      className="flex items-center gap-2 px-4 py-2 w-full text-left hover:bg-gray-700 text-white"
                    >
                      <img src="/walletconnect.svg" alt="WalletConnect" className="h-5 w-5" />
                      WalletConnect
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-500" />
                {`${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`}
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {coins.map(coin => (
            <Card key={coin.id} className="bg-gray-800 text-white border-none">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl font-bold">{coin.name}</CardTitle>
                    <p className="text-gray-400">{coin.symbol}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {coin.kyc && (
                      <div className="flex items-center text-green-400">
                        <Shield className="h-4 w-4 mr-1" />
                        KYC
                      </div>
                    )}
                    <a 
                      href={coin.audit}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-blue-400 hover:text-blue-300"
                    >
                      Audit
                      <ExternalLink className="h-4 w-4 ml-1" />
                    </a>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Progress */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <span>Progress</span>
                      <span>{coin.progress}%</span>
                    </div>
                    <Progress value={coin.progress} className="bg-gray-700" />
                    <div className="flex justify-between mt-2 text-sm text-gray-400">
                      <span>{coin.raised} ETH raised</span>
                      <span>{coin.hardCap} ETH hard cap</span>
                    </div>
                  </div>

                  {/* Purchase Interface */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-400">Current Price</p>
                        <p className="font-medium">{coin.price} ETH</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Next Phase</p>
                        <p className="font-medium">{coin.nextPhasePrice} ETH</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Min Buy</p>
                        <p className="font-medium">{coin.minBuy} ETH</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Max Buy</p>
                        <p className="font-medium">{coin.maxBuy} ETH</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span>{getTimeRemaining(coin.saleEnds)} remaining</span>
                    </div>

                    <input
                      type="number"
                      placeholder="Amount in ETH"
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={purchaseAmount}
                      onChange={(e) => setPurchaseAmount(e.target.value)}
                    />

                    <button
                      onClick={() => handlePurchase(coin.id, purchaseAmount)}
                      disabled={!isWalletConnected}
                      className={`w-full py-3 rounded-lg font-semibold ${
                        isWalletConnected 
                          ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                          : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {isWalletConnected ? 'Buy Tokens' : 'Connect Wallet to Buy'}
                    </button>
                  </div>

                  {/* Contract Info */}
                  <div className="pt-4 border-t border-gray-700">
                    <p className="text-sm text-gray-400">Contract Address</p>
                    <div className="flex items-center gap-2">
                      <code className="text-sm">{coin.contractAddress}</code>
                      <a
                        href={`https://etherscan.io/address/${coin.contractAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* New Transaction Card */}
          <Card className="bg-gray-800 text-white border-none">
            <CardHeader>
              <CardTitle>Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="send" className="w-full">
                <TabsList className="grid grid-cols-3 gap-4 bg-gray-700 p-1">
                  <TabsTrigger value="send" className="flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    Send
                  </TabsTrigger>
                  <TabsTrigger value="receive" className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Receive
                  </TabsTrigger>
                  <TabsTrigger value="request" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Request
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="send" className="mt-4">
                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="Recipient Address"
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg"
                    />
                    <input
                      type="number"
                      placeholder="Amount"
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg"
                    />
                    <button
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
                      onClick={() => handleSend('0.1', '0x...')}
                    >
                      Send
                    </button>
                  </div>
                </TabsContent>

                <TabsContent value="receive" className="mt-4">
                  <div className="text-center space-y-4">
                    <div className="bg-white p-4 rounded-lg inline-block">
                      {/* Add QR code here */}
                      <div className="w-48 h-48 bg-gray-200"></div>
                    </div>
                    <p className="text-sm break-all bg-gray-700 p-2 rounded">
                      {walletAddress || 'Connect wallet to see address'}
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="request" className="mt-4">
                  <div className="space-y-4">
                    <input
                      type="number"
                      placeholder="Amount"
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg"
                    />
                    <textarea
                      placeholder="Description"
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg"
                    />
                    <button
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
                      onClick={() => handleRequest('0.1', 'Payment for services')}
                    >
                      Create Request
                    </button>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Transaction History */}
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-4">Recent Transactions</h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell>{tx.type}</TableCell>
                          <TableCell>{tx.amount} {tx.token}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              tx.status === 'completed' ? 'bg-green-500/20 text-green-500' :
                              tx.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' :
                              'bg-red-500/20 text-red-500'
                            }`}>
                              {tx.status}
                            </span>
                          </TableCell>
                          <TableCell>{new Date(tx.timestamp).toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CryptoHub;