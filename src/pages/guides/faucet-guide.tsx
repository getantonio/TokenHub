import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Footer } from '@/components/layouts/Footer';

export default function FaucetGuidePage() {
  const networks = [
    {
      name: "Sepolia",
      description: "Ethereum testnet with wide tool support and reliable faucets",
      icon: "🔷",
      faucets: [
        {
          name: "Alchemy Sepolia Faucet",
          url: "https://sepoliafaucet.com/",
          description: "Get 0.5 Sepolia ETH daily. Requires Alchemy account.",
          steps: [
            "Connect with your Alchemy account",
            "Enter your wallet address",
            "Complete verification if required",
            "Receive test ETH within minutes"
          ]
        },
        {
          name: "Infura Sepolia Faucet",
          url: "https://www.infura.io/faucet/sepolia",
          description: "Reliable faucet with daily claims. Requires Infura account.",
          steps: [
            "Sign in to your Infura account",
            "Navigate to the faucet page",
            "Enter your wallet address",
            "Claim your test ETH"
          ]
        }
      ]
    },
    {
      name: "Arbitrum Sepolia",
      description: "Arbitrum's testnet for scaling solutions testing",
      icon: "🔵",
      faucets: [
        {
          name: "Arbitrum Sepolia Bridge",
          url: "https://bridge.arbitrum.io/",
          description: "Bridge Sepolia ETH to Arbitrum Sepolia",
          steps: [
            "Get Sepolia ETH first",
            "Visit the Arbitrum Bridge",
            "Connect your wallet",
            "Bridge ETH to Arbitrum Sepolia"
          ]
        }
      ]
    },
    {
      name: "Optimism Sepolia",
      description: "Optimism's testnet for L2 development",
      icon: "🔴",
      faucets: [
        {
          name: "Optimism Sepolia Bridge",
          url: "https://app.optimism.io/bridge",
          description: "Bridge Sepolia ETH to Optimism Sepolia",
          steps: [
            "Get Sepolia ETH first",
            "Visit the Optimism Bridge",
            "Connect your wallet",
            "Bridge ETH to Optimism Sepolia"
          ]
        },
        {
          name: "Optimism Faucet",
          url: "https://www.optimism.io/faucet",
          description: "Direct faucet for Optimism Sepolia",
          steps: [
            "Visit the Optimism Faucet",
            "Connect your wallet",
            "Complete verification",
            "Receive test ETH"
          ]
        }
      ]
    },
    {
      name: "Polygon Amoy",
      description: "Polygon's latest testnet for development",
      icon: "💜",
      faucets: [
        {
          name: "Polygon Faucet",
          url: "https://www.oklink.com/amoy",
          description: "Official Polygon Amoy testnet faucet",
          steps: [
            "Visit the Polygon Faucet",
            "Connect your wallet",
            "Request test AMOY tokens",
            "Wait for confirmation"
          ]
        }
      ]
    },
    {
      name: "BSC Testnet",
      description: "Binance Smart Chain's testnet environment",
      icon: "🟡",
      faucets: [
        {
          name: "BSC Testnet Faucet",
          url: "https://testnet.bnbchain.org/faucet-smart",
          description: "Official BSC testnet faucet",
          steps: [
            "Visit the BSC Faucet",
            "Enter your wallet address",
            "Complete verification",
            "Receive test BNB"
          ]
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-900">
      <Head>
        <title>Faucet Guide - TokenHub.dev</title>
        <meta name="description" content="Learn how to get test tokens for different networks" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <Link href="/guides" className="text-blue-400 hover:text-blue-300">
              ← Back to Guides
            </Link>
          </div>

          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-4">Test Token Faucet Guide</h1>
            <p className="text-xl text-gray-400">
              How to get test tokens for different networks to use with TokenHub.dev
            </p>
          </div>

          {/* Quick Start Guide */}
          <Card className="p-6 bg-blue-900/20 border-blue-500/20 mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">Quick Start Guide</h2>
            <ol className="space-y-2 text-gray-300">
              <li className="flex items-start">
                <span className="font-bold text-blue-400 mr-2">1.</span>
                Install and set up MetaMask or another Web3 wallet
              </li>
              <li className="flex items-start">
                <span className="font-bold text-blue-400 mr-2">2.</span>
                Add the testnet network to your wallet (most can be added automatically via chainlist.org)
              </li>
              <li className="flex items-start">
                <span className="font-bold text-blue-400 mr-2">3.</span>
                Visit the appropriate faucet for your chosen network
              </li>
              <li className="flex items-start">
                <span className="font-bold text-blue-400 mr-2">4.</span>
                Request test tokens and wait for confirmation
              </li>
            </ol>
          </Card>

          {/* Network Specific Guides */}
          <div className="space-y-8">
            {networks.map((network, index) => (
              <div key={index} className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{network.icon}</span>
                  <h2 className="text-2xl font-bold text-white">{network.name}</h2>
                </div>
                <p className="text-gray-400">{network.description}</p>
                
                <div className="grid gap-4">
                  {network.faucets.map((faucet, faucetIndex) => (
                    <Card key={faucetIndex} className="p-6 bg-gray-800 border-gray-700">
                      <h3 className="text-xl font-semibold text-white mb-2">{faucet.name}</h3>
                      <p className="text-gray-400 mb-4">{faucet.description}</p>
                      <div className="space-y-4">
                        <a
                          href={faucet.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Visit Faucet
                        </a>
                        <div>
                          <h4 className="text-white font-medium mb-2">Steps:</h4>
                          <ul className="space-y-1">
                            {faucet.steps.map((step, stepIndex) => (
                              <li key={stepIndex} className="flex items-start text-gray-300">
                                <span className="text-blue-400 mr-2">•</span>
                                {step}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 p-6 bg-blue-900/20 rounded-lg border border-blue-500/20">
            <h2 className="text-2xl font-bold text-white mb-4">Need Help?</h2>
            <p className="text-gray-300 mb-4">
              Having trouble getting test tokens? Join our Discord community for support.
            </p>
            <a
              href="https://discord.gg/VEGTRNhmKa"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Join Discord Community
            </a>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
} 