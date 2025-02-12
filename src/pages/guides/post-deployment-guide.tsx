import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Footer } from '@/components/layouts/Footer';

export default function PostDeploymentGuidePage() {
  const sections = [
    {
      title: "Immediate Post-Deployment Steps",
      content: [
        {
          subtitle: "Contract Verification",
          items: [
            "Verify contract on blockchain explorer",
            "Submit source code and ABI",
            "Add contract description and documentation",
            "Ensure all functions are properly documented"
          ]
        },
        {
          subtitle: "Security Checks",
          items: [
            "Test all contract functions",
            "Verify ownership transfer",
            "Check token parameters",
            "Confirm token supply and distribution"
          ]
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
    },
    {
      title: "Ongoing Management",
      content: [
        {
          subtitle: "Monitoring",
          items: [
            "Track token metrics",
            "Monitor holder growth",
            "Analyze trading patterns",
            "Watch for unusual activity"
          ]
        },
        {
          subtitle: "Development",
          items: [
            "Plan feature updates",
            "Consider contract upgrades",
            "Implement community feedback",
            "Expand token utility"
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
                    <ul className="space-y-2">
                      {subsection.items.map((item, itemIndex) => (
                        <li key={itemIndex} className="flex items-start text-gray-300">
                          <span className="text-blue-400 mr-2">•</span>
                          {item}
                        </li>
                      ))}
                    </ul>
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