import { NextPage } from 'next';
import Head from 'next/head';
import StacksWalletTest from '@/components/features/token/StacksWalletTest';

const WalletTestPage: NextPage = () => {
  return (
    <div className="min-h-screen bg-gray-900">
      <Head>
        <title>Wallet Integration Test | TokenHub</title>
        <meta name="description" content="Test wallet integration" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-xl mx-auto">
          <h1 className="text-2xl font-bold text-white text-center mb-8">
            Stacks Wallet Test
          </h1>
          <StacksWalletTest />
          
          <div className="mt-8 p-4 bg-gray-800 rounded-md border border-gray-700">
            <h2 className="text-lg font-semibold text-white mb-2">About This Test</h2>
            <p className="text-sm text-gray-300 mb-3">
              This page tests the most basic interaction with Stacks wallets without using advanced features.
            </p>
            
            <div className="mb-4">
              <h3 className="text-md font-medium text-blue-400 mb-1">Connect</h3>
              <p className="text-sm text-gray-300 mb-2">
                Tests the modern @stacks/connect API using the latest standards. This should work with any compliant Stacks wallet.
              </p>
            </div>
            
            <div className="mt-4">
              <h3 className="text-md font-medium text-green-400 mb-1">Advanced Tests</h3>
              <p className="text-sm text-gray-300 mb-2">
                Simpler tests that focus on basic wallet functionality:
              </p>
              <ul className="text-sm text-gray-300 list-disc pl-5 space-y-1">
                <li>Get Addresses - Retrieves addresses from the connected wallet</li>
                <li>Sign Message - Tests the wallet's ability to sign a simple message</li>
              </ul>
            </div>
            
            <div className="mt-4">
              <h3 className="text-md font-medium text-green-400 mb-1">Contract Deployment</h3>
              <p className="text-sm text-gray-300 mb-2">
                Tests a simplified contract deployment workflow that avoids extension issues.
              </p>
              <ul className="text-sm text-gray-300 list-disc pl-5 space-y-1">
                <li>Opens the wallet in a new tab</li>
                <li>Copies contract code to clipboard for manual pasting</li>
                <li>Bypasses extension communication entirely for maximum compatibility</li>
              </ul>
            </div>
            
            <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-md">
              <h3 className="text-yellow-400 font-medium text-sm mb-2">Wallet Issues</h3>
              <p className="text-xs text-yellow-300 mb-2">
                If you're experiencing issues with wallet integration:
              </p>
              <ul className="text-xs text-yellow-300 list-disc pl-4 space-y-1">
                <li>Make sure your wallet extension is up to date - older versions may not support the modern API</li>
                <li>Try restarting your browser if the wallet fails to respond</li>
                <li>Xverse and Leather wallets should both work with the latest @stacks/connect library</li>
                <li>Check the console logs for detailed error messages</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default WalletTestPage; 