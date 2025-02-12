import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Footer } from '@/components/layouts/Footer';

export default function TokenCreationGuidePage() {
  const sections = [
    {
      title: "Planning Your Token",
      content: [
        {
          subtitle: "Define Your Purpose",
          items: [
            "Determine the primary use case for your token",
            "Identify your target audience",
            "Research market demand and competition",
            "Plan token utility and features"
          ]
        },
        {
          subtitle: "Tokenomics Design",
          items: [
            "Set initial and maximum supply",
            "Plan token distribution",
            "Design fee structure and mechanisms",
            "Consider vesting and locking periods"
          ]
        }
      ]
    },
    {
      title: "Technical Preparation",
      content: [
        {
          subtitle: "Choose Your Platform",
          items: [
            "Select appropriate blockchain network",
            "Determine token standard (ERC-20, etc.)",
            "Consider cross-chain compatibility",
            "Evaluate gas fees and network costs"
          ]
        },
        {
          subtitle: "Security Measures",
          items: [
            "Implement ownership controls",
            "Add blacklist functionality if needed",
            "Set up time locks and vesting",
            "Plan for contract upgrades"
          ]
        }
      ]
    },
    {
      title: "Launch Preparation",
      content: [
        {
          subtitle: "Documentation",
          items: [
            "Create comprehensive whitepaper",
            "Prepare technical documentation",
            "Design tokenomics infographics",
            "Draft marketing materials"
          ]
        },
        {
          subtitle: "Community Building",
          items: [
            "Set up social media channels",
            "Create community guidelines",
            "Plan engagement strategy",
            "Prepare launch announcements"
          ]
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-900">
      <Head>
        <title>Token Creation Guide - TokenHub.dev</title>
        <meta name="description" content="Learn how to create your own token with our comprehensive guide" />
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
            <h1 className="text-4xl font-bold text-white mb-4">Token Creation Guide</h1>
            <p className="text-xl text-gray-400">
              A comprehensive guide to planning, creating, and launching your token.
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
            <h2 className="text-2xl font-bold text-white mb-4">Ready to Create Your Token?</h2>
            <p className="text-gray-300 mb-4">
              Use our token factory to create your token with just a few clicks, or join our community for support.
            </p>
            <div className="flex gap-4">
              <Link
                href="/v3"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Token
              </Link>
              <a
                href="https://discord.gg/VEGTRNhmKa"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Join Discord
              </a>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
} 