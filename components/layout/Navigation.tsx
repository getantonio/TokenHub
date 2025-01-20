"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { BrowserProvider, Contract } from 'ethers';
import TokenFactoryABI from '@/contracts/abis/TokenFactory.json';

export function Navigation() {
  const [isAdmin, setIsAdmin] = useState(false);
  const { address } = useAccount();

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!address || !window.ethereum) return;
      try {
        const provider = new BrowserProvider(window.ethereum as any);
        const factory = new Contract(
          process.env.NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS as string,
          TokenFactoryABI,
          provider
        );
        const owner = await factory.owner();
        setIsAdmin(owner.toLowerCase() === address.toLowerCase());
      } catch (err) {
        console.error('Error checking admin status:', err);
      }
    };
    checkAdminStatus();
  }, [address]);

  return (
    <nav className="bg-gray-800 border-b border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="text-white font-bold text-xl">
              TokenHub
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <Link 
              href="/docs/fee-structure" 
              className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm"
            >
              Docs
            </Link>
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