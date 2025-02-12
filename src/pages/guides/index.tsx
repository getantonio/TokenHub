import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Footer } from '@/components/layouts/Footer';

export default function GuidesIndexPage() {
  const guides = [
    {
      title: "Faucet Guide",
      description: "How to get test tokens for different networks",
      href: "/guides/faucet-guide",
      icon: "🚰"
    },
    {
      title: "Token Creation Guide",
      description: "Step-by-step guide to creating your own token with TokenHub.dev",
      href: "/guides/token-creation-guide",
      icon: "🏗️"
    },
    {
      title: "Post Deployment Guide",
      description: "Essential steps to take after deploying your token",
      href: "/guides/post-deployment-guide",
      icon: "🚀"
    },
    {
      title: "Exchange Listing Guide",
      description: "How to prepare your token for exchange listings",
      href: "/guides/exchange-listing-guide",
      icon: "📈"
    },
    {
      title: "Utility Token Guide",
      description: "Learn how to create and implement utility tokens effectively",
      href: "/guides/utility-token-guide",
      icon: "⚙️"
    },
    {
      title: "Marketing Strategy",
      description: "Marketing strategies for token projects",
      href: "/guides/marketing-strategy",
      icon: "📢"
    },
    {
      title: "Growth Hacking Strategies",
      description: "Advanced growth strategies for token projects",
      href: "/guides/growth-hacking-strategies",
      icon: "📊"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-900">
      <Head>
        <title>Guides - TokenHub.dev</title>
        <meta name="description" content="Comprehensive guides for token creation and management" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-4">TokenHub.dev Guides</h1>
            <p className="text-xl text-gray-400">
              Comprehensive guides to help you create, launch, and manage your token project
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {guides.map((guide, index) => (
              <Link key={index} href={guide.href}>
                <Card className="p-6 bg-gray-800 border-gray-700 hover:border-blue-500 transition-colors cursor-pointer h-full">
                  <div className="flex items-start space-x-4">
                    <span className="text-3xl">{guide.icon}</span>
                    <div>
                      <h2 className="text-xl font-semibold text-white mb-2">{guide.title}</h2>
                      <p className="text-gray-400">{guide.description}</p>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>

          <div className="mt-12 p-6 bg-blue-900/20 rounded-lg border border-blue-500/20">
            <h2 className="text-2xl font-bold text-white mb-4">Need Help?</h2>
            <p className="text-gray-300 mb-4">
              Join our Discord community for support and discussions about token creation and management.
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