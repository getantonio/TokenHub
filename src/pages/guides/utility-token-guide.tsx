import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Footer } from '@/components/layouts/Footer';

export default function UtilityTokenGuidePage() {
  const sections = [
    {
      title: "Understanding Utility Tokens",
      content: [
        {
          subtitle: "What is a Utility Token?",
          items: [
            "Digital assets that provide access to a product or service",
            "Represent future access to a company's product or service",
            "Can be used as in-platform currency",
            "Enable specific actions within an ecosystem"
          ]
        },
        {
          subtitle: "Key Characteristics",
          items: [
            "Designed for specific use cases",
            "Value tied to platform utility",
            "Not primarily for investment",
            "Supports platform functionality"
          ]
        }
      ]
    },
    {
      title: "Designing Utility",
      content: [
        {
          subtitle: "Use Cases",
          items: [
            "Platform access and permissions",
            "Payment for services",
            "Governance rights",
            "Staking and rewards"
          ]
        },
        {
          subtitle: "Token Economics",
          items: [
            "Supply and demand mechanics",
            "Incentive structures",
            "Value capture mechanisms",
            "Distribution strategy"
          ]
        }
      ]
    },
    {
      title: "Implementation",
      content: [
        {
          subtitle: "Technical Features",
          items: [
            "Access control mechanisms",
            "Payment integration",
            "Staking contracts",
            "Reward distribution systems"
          ]
        },
        {
          subtitle: "Platform Integration",
          items: [
            "API integration",
            "User interface implementation",
            "Transaction handling",
            "Error management"
          ]
        }
      ]
    },
    {
      title: "Legal Considerations",
      content: [
        {
          subtitle: "Compliance",
          items: [
            "Regulatory requirements",
            "Securities laws",
            "KYC/AML considerations",
            "Terms of service"
          ]
        },
        {
          subtitle: "Documentation",
          items: [
            "Technical documentation",
            "Legal disclaimers",
            "User agreements",
            "Privacy policy"
          ]
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-900">
      <Head>
        <title>Utility Token Guide - TokenHub.dev</title>
        <meta name="description" content="Learn how to create and implement utility tokens effectively" />
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
            <h1 className="text-4xl font-bold text-white mb-4">Utility Token Guide</h1>
            <p className="text-xl text-gray-400">
              A comprehensive guide to creating and implementing utility tokens.
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
            <h2 className="text-2xl font-bold text-white mb-4">Ready to Create Your Utility Token?</h2>
            <p className="text-gray-300 mb-4">
              Use our token factory to create your utility token with built-in features for access control and platform integration.
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