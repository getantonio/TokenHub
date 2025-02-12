import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Footer } from '@/components/layouts/Footer';

export default function ExchangeListingGuidePage() {
  const steps = [
    {
      title: "1. Token Preparation",
      content: [
        "Ensure your token contract is fully audited",
        "Have detailed tokenomics documentation ready",
        "Prepare comprehensive project documentation",
        "Set up a professional website and whitepaper"
      ]
    },
    {
      title: "2. Liquidity Requirements",
      content: [
        "Lock initial liquidity for a minimum period",
        "Maintain sufficient trading volume",
        "Implement anti-bot measures",
        "Set up multiple liquidity pools if needed"
      ]
    },
    {
      title: "3. Legal Compliance",
      content: [
        "Obtain necessary legal opinions",
        "Register your business entity",
        "Prepare KYC/AML documentation",
        "Ensure regulatory compliance"
      ]
    },
    {
      title: "4. Exchange Application",
      content: [
        "Research suitable exchanges",
        "Prepare listing application materials",
        "Budget for listing fees",
        "Plan market making strategy"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-900">
      <Head>
        <title>Exchange Listing Guide - TokenHub.dev</title>
        <meta name="description" content="Learn how to list your token on exchanges with our comprehensive guide" />
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
            <h1 className="text-4xl font-bold text-white mb-4">Exchange Listing Guide</h1>
            <p className="text-xl text-gray-400">
              A comprehensive guide to getting your token listed on cryptocurrency exchanges.
            </p>
          </div>

          <div className="space-y-6">
            {steps.map((step, index) => (
              <Card key={index} className="p-6 bg-gray-800 border-gray-700">
                <h2 className="text-2xl font-bold text-white mb-4">{step.title}</h2>
                <ul className="space-y-2">
                  {step.content.map((item, itemIndex) => (
                    <li key={itemIndex} className="flex items-start text-gray-300">
                      <span className="text-blue-400 mr-2">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>

          <div className="mt-12 p-6 bg-blue-900/20 rounded-lg border border-blue-500/20">
            <h2 className="text-2xl font-bold text-white mb-4">Need Help?</h2>
            <p className="text-gray-300 mb-4">
              Getting listed on exchanges can be complex. Join our community for support and guidance.
            </p>
            <div className="flex gap-4">
              <a
                href="https://discord.gg/VEGTRNhmKa"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Join Discord Community
              </a>
              <Link
                href="/docs"
                className="inline-flex items-center px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                View Documentation
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
} 