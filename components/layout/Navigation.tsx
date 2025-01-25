"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { isAddress, Contract, BrowserProvider } from 'ethers';
import { NetworkSelector } from '@/components/network-selector';
import { WalletConnect } from '@/components/wallet-connect';
import TokenFactoryABI from '@/contracts/abis/TokenFactory.json';

export function Navigation() {
  const [isAdmin, setIsAdmin] = useState(false);
  const { address } = useAccount();

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!address || !window.ethereum) return;
      try {
        const contractAddress = process.env.NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS;
        
        if (!contractAddress || !isAddress(contractAddress)) {
          console.error('Invalid contract address:', contractAddress);
          return;
        }

        const provider = new BrowserProvider(window.ethereum);
        const contract = new Contract(contractAddress, TokenFactoryABI, provider);
        const owner = await contract.owner();
        
        setIsAdmin(owner.toLowerCase() === address.toLowerCase());
      } catch (err) {
        console.error('Error checking admin status:', err);
      }
    };
    checkAdminStatus();
  }, [address]);

  return (
    <nav className="bg-gray-800 border-b border-gray-700">
      <div className="max-w-7xl mx-auto px-8 sm:px-8 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="text-white font-extrabold text-3xl">
              TokenHub<span className="text-blue-400">.dev</span>
            </Link>
            <div className="hidden md:flex space-x-4">
              <Link 
                href="/docs" 
                className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm"
              >
                Documentation
              </Link>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <NetworkSelector />
            <WalletConnect />
            {isAdmin && (
              <Link 
                href="/admin" 
                className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm bg-blue-600 hover:bg-blue-700"
              >
                Admin
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
} 