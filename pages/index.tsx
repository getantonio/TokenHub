import { useState } from 'react';
import TokenForm from '../components/TokenForm';
import DeploymentPanel from '../components/DeploymentPanel';
import AdminPanel from '../components/AdminPanel';
import { ethers } from 'ethers';
import { useWallet } from '../hooks/useWallet';

export default function Home() {
  const { isConnected, account, connectWallet } = useWallet();

  return (
    <div className="min-h-screen bg-background-primary">
      <nav className="bg-background-secondary border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-text-primary">Token Factory</h1>
          <button
            onClick={connectWallet}
            className="button-primary"
          >
            {isConnected ? `Connected: ${account.slice(0,6)}...${account.slice(-4)}` : 'Connect Wallet'}
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="card">
            <TokenForm isConnected={isConnected} />
          </div>
          <div className="card">
            <DeploymentPanel isConnected={isConnected} />
          </div>
        </div>
        {isConnected && (
          <div className="mt-8 card">
            <AdminPanel account={account} />
          </div>
        )}
      </main>
    </div>
  );
} 