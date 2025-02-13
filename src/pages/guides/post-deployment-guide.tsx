import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Footer } from '@/components/layouts/Footer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface NetworkVerification {
  name: string;
  steps: string[];
}

interface SecurityStep {
  name: string;
  instructions: string[];
}

interface SectionDetails {
  title: string;
  networks?: NetworkVerification[];
  steps?: SecurityStep[];
}

interface Subsection {
  subtitle: string;
  items: string[];
  details?: SectionDetails;
}

interface Section {
  title: string;
  content: Subsection[];
}

export default function PostDeploymentGuidePage() {
  const sections: Section[] = [
    {
      title: "Finding Your Contract",
      content: [
        {
          subtitle: "Through TokenHub Interface",
          items: [
            "Navigate to the version page where you created your token (v1, v2, or v3)",
            "Look for the 'Your Tokens' or 'Token List' section below the creation form",
            "Find your token in the list - it will show the token name, symbol, and contract address",
            "Click the contract address to copy it or view it on the blockchain explorer"
          ]
        },
        {
          subtitle: "Through Transaction History",
          items: [
            "Open your wallet (e.g., MetaMask)",
            "Go to Activity/History",
            "Find the token creation transaction",
            "Click on the transaction to view details",
            "The contract address will be listed in the transaction details"
          ]
        }
      ]
    },
    {
      title: "Contract Verification",
      content: [
        {
          subtitle: "Verifying Your Token Contract",
          items: [
            "Go to your token address on the blockchain explorer (e.g., Etherscan)",
            "Click on the 'Contract' tab",
            "Click on 'Verify Proxy Contract'",
            "The explorer will automatically detect and verify your proxy contract"
          ]
        }
      ]
    },
    {
      title: "Security and Management",
      content: [
        {
          subtitle: "Security Checks",
          items: [
            "Test all contract functions",
            "Verify ownership transfer",
            "Check token parameters",
            "Confirm token supply and distribution"
          ],
          details: {
            title: "Essential Security Checks",
            steps: [
              {
                name: "Ownership Verification",
                instructions: [
                  "Check current owner: Call owner() function",
                  "Verify it matches your wallet address",
                  "Test ownership transfer to a backup wallet",
                  "Transfer back to main wallet"
                ]
              },
              {
                name: "Token Parameters",
                instructions: [
                  "Verify token name and symbol",
                  "Check decimals (usually 18)",
                  "Confirm total supply matches intended amount",
                  "Verify transfer restrictions if any"
                ]
              },
              {
                name: "Function Testing",
                instructions: [
                  "Test basic transfers with small amounts",
                  "Verify tax collection if enabled",
                  "Test blacklist functions if implemented",
                  "Check timelock functionality"
                ]
              },
              {
                name: "Distribution Verification",
                instructions: [
                  "Confirm initial token allocation",
                  "Verify vesting schedules if used",
                  "Check presale distribution if applicable",
                  "Validate liquidity pool setup"
                ]
              }
            ]
          }
        }
      ]
    },
    {
      title: "Liquidity Management",
      content: [
        {
          subtitle: "Initial Liquidity",
          items: [
            "Add initial liquidity pool",
            "Lock liquidity for security",
            "Set up price feeds and oracles",
            "Monitor trading activity"
          ]
        },
        {
          subtitle: "Market Making",
          items: [
            "Implement market making strategy",
            "Set up trading pairs",
            "Monitor price stability",
            "Adjust liquidity as needed"
          ]
        }
      ]
    },
    {
      title: "Community and Marketing",
      content: [
        {
          subtitle: "Community Launch",
          items: [
            "Announce token deployment",
            "Share contract address and details",
            "Provide trading instructions",
            "Start community engagement"
          ]
        },
        {
          subtitle: "Marketing Activities",
          items: [
            "Launch marketing campaigns",
            "Engage with influencers",
            "Create educational content",
            "Build partnerships"
          ]
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-900">
      <Head>
        <title>Post-Deployment Guide - TokenHub.dev</title>
        <meta name="description" content="Learn what to do after deploying your token with our comprehensive guide" />
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
            <h1 className="text-4xl font-bold text-white mb-4">Post-Deployment Guide</h1>
            <p className="text-xl text-gray-400">
              Essential steps and best practices after deploying your token.
            </p>
          </div>

          <div className="space-y-8">
            {sections.map((section, index) => (
              <div key={index} className="space-y-4">
                <h2 className="text-2xl font-bold text-white">{section.title}</h2>
                {section.content.map((subsection, subIndex) => (
                  <Card key={subIndex} className="p-6 bg-gray-800 border-gray-700">
                    <h3 className="text-xl font-semibold text-white mb-4">{subsection.subtitle}</h3>
                    <ul className="space-y-2 mb-6">
                      {subsection.items.map((item, itemIndex) => (
                        <li key={itemIndex} className="flex items-start text-gray-300">
                          <span className="text-blue-400 mr-2">•</span>
                          {item}
                        </li>
                      ))}
                    </ul>

                    {subsection.details && (
                      <div className="mt-6 border-t border-gray-700 pt-6">
                        <h4 className="text-lg font-semibold text-white mb-4">{subsection.details.title}</h4>
                        {subsection.details.steps && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {subsection.details.steps.map((step, stepIndex) => (
                              <div key={stepIndex} className="bg-gray-800/50 p-4 rounded-lg">
                                <h5 className="text-white font-semibold mb-2">{step.name}</h5>
                                <ul className="space-y-2">
                                  {step.instructions.map((instruction, instIndex) => (
                                    <li key={instIndex} className="text-gray-300 text-sm">
                                      • {instruction}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            ))}
          </div>

          <div className="mt-12 p-6 bg-blue-900/20 rounded-lg border border-blue-500/20">
            <h2 className="text-2xl font-bold text-white mb-4">Need Support?</h2>
            <p className="text-gray-300 mb-4">
              Join our community for expert advice and support with your token project.
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