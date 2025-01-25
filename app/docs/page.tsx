import React from 'react';
import Link from 'next/link';
import { Rocket, Book, DollarSign, Scale, LineChart, ArrowRight } from 'lucide-react';

interface DocCardProps {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

function DocCard({ href, title, description, icon }: DocCardProps) {
  return (
    <Link 
      href={href} 
      className="group relative p-6 bg-gray-800/50 hover:bg-gray-800 border border-gray-700 rounded-xl transition-all duration-200 hover:shadow-lg"
    >
      <div className="flex items-start gap-4">
        <div className="p-3 bg-blue-600/10 text-blue-500 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
          {icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg text-white group-hover:text-blue-400">{title}</h3>
            <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-blue-400 transform group-hover:translate-x-1 transition-transform" />
          </div>
          <p className="mt-2 text-gray-400 text-sm">{description}</p>
        </div>
      </div>
    </Link>
  );
}

export default function DocsPage() {
  return (
    <div className="space-y-12">
      <div className="max-w-3xl">
        <h1 className="text-4xl font-bold text-white mb-4">Documentation</h1>
        <p className="text-xl text-gray-400">
          Everything you need to know about creating and managing your tokens on TokenHub.
        </p>
      </div>
      
      {/* Getting Started Section */}
      <div>
        <h2 className="text-2xl font-semibold text-white mb-6">Getting Started</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <DocCard
            href="/docs/getting-started"
            title="Getting Started Guide"
            description="Learn the basics of creating and managing tokens on our platform. Perfect for beginners."
            icon={<Rocket className="h-6 w-6" />}
          />
          <DocCard
            href="/docs/token-management"
            title="Token Management"
            description="Comprehensive guide for token creation and management. Master all the features."
            icon={<Book className="h-6 w-6" />}
          />
        </div>
      </div>

      {/* Token Creation & Management */}
      <div>
        <h2 className="text-2xl font-semibold text-white mb-6">Token Creation & Management</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <DocCard
            href="/docs/utility-token-guide"
            title="Utility Token Guide"
            description="Deep dive into creating and managing utility tokens. Learn about tokenomics and use cases."
            icon={<Book className="h-6 w-6" />}
          />
          <DocCard
            href="/docs/fee-structure"
            title="Fee Structure"
            description="Detailed breakdown of our platform fees and pricing model. Plan your token launch."
            icon={<DollarSign className="h-6 w-6" />}
          />
        </div>
      </div>

      {/* Launch & Exchange */}
      <div>
        <h2 className="text-2xl font-semibold text-white mb-6">Launch & Exchange</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <DocCard
            href="/docs/coin-launch-strategy"
            title="Launch Strategy"
            description="Best practices and proven strategies for a successful token launch. Maximize your impact."
            icon={<Rocket className="h-6 w-6" />}
          />
          <DocCard
            href="/docs/exchange-listing-guide"
            title="Exchange Listing"
            description="Step-by-step guide to listing your token on exchanges. Increase visibility and liquidity."
            icon={<LineChart className="h-6 w-6" />}
          />
        </div>
      </div>

      {/* Legal & Compliance */}
      <div>
        <h2 className="text-2xl font-semibold text-white mb-6">Legal & Compliance</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <DocCard
            href="/docs/legal/compliance"
            title="Legal Guidelines"
            description="Essential legal considerations and compliance requirements. Stay compliant and secure."
            icon={<Scale className="h-6 w-6" />}
          />
        </div>
      </div>
    </div>
  );
} 