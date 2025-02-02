import { Header } from '../../components/Header';
import Head from 'next/head';

export default function V1TokenCreationGuide() {
  return (
    <div className="min-h-screen bg-background-primary">
      <Head>
        <title>TokenHub.dev - V1 Token Creation Guide</title>
        <meta name="description" content="Learn how to create V1 tokens" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-6">V1 Token Creation Guide</h1>
          
          <div className="prose prose-invert">
            <h2>Getting Started</h2>
            <p>This guide will walk you through the process of creating a V1 token using TokenHub.dev.</p>
            
            <h2>Prerequisites</h2>
            <ul>
              <li>MetaMask or compatible Web3 wallet</li>
              <li>Sufficient ETH for deployment fees and gas</li>
            </ul>
            
            <h2>Step-by-Step Guide</h2>
            <ol>
              <li>
                <h3>Connect Your Wallet</h3>
                <p>Click the "Connect Wallet" button in the top right corner</p>
              </li>
              <li>
                <h3>Select Network</h3>
                <p>Choose your desired network from the network selector</p>
              </li>
              <li>
                <h3>Navigate to Token Creation</h3>
                <p>Go to the Token Creation page and select V1</p>
              </li>
              <li>
                <h3>Configure Token</h3>
                <p>Fill in the required token parameters:</p>
                <ul>
                  <li>Token Name</li>
                  <li>Token Symbol</li>
                  <li>Total Supply</li>
                  <li>Decimals</li>
                </ul>
              </li>
              <li>
                <h3>Deploy Token</h3>
                <p>Review the settings and click "Deploy Token"</p>
              </li>
            </ol>
            
            <h2>Advanced Features</h2>
            <ul>
              <li>Blacklist functionality</li>
              <li>Time lock capabilities</li>
              <li>Owner controls</li>
            </ul>
            
            <h2>Best Practices</h2>
            <ul>
              <li>Always test on testnet first</li>
              <li>Keep your private keys secure</li>
              <li>Document your deployment parameters</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
} 