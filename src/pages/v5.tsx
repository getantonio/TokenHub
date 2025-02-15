import { useAccount } from 'wagmi';
import Head from 'next/head';
import { Footer } from '@/components/layouts/Footer';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

const features = [
  {
    title: 'Price Oracle System',
    description: 'Reliable price tracking using Chainlink and other oracle networks',
    details: [
      'Multi-oracle price aggregation',
      'Automated price updates',
      'Fallback mechanisms'
    ]
  },
  {
    title: 'Elastic Supply Mechanism',
    description: 'Advanced supply control to maintain price stability',
    details: [
      'Automated rebasing',
      'Supply adjustment algorithm',
      'Price target tracking'
    ]
  },
  {
    title: 'Safety Controls',
    description: 'Comprehensive safety features to protect users and assets',
    details: [
      'Circuit breakers',
      'Anti-manipulation measures',
      'Emergency controls'
    ]
  }
];

export default function V5Page() {
  const { isConnected } = useAccount();

  return (
    <div className="min-h-screen bg-gray-900">
      <Head>
        <title>TokenHub.dev - Token Factory v5</title>
        <meta name="description" content="Create price-pegged synthetic tokens with advanced tracking and stability features" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Token Factory v5</h1>
              <p className="text-gray-400">
                Create synthetic tokens pegged to real-world assets with advanced price tracking
              </p>
            </div>
            <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/50">
              Coming June 2025
            </Badge>
          </div>

          {/* Coming Soon Banner */}
          <Card className="mb-8 p-6 bg-blue-900/20 border border-blue-500/20">
            <h2 className="text-xl font-bold text-white mb-4">Price-Pegged Token Factory</h2>
            <p className="text-gray-300 mb-4">
              Create tokens that automatically track and maintain parity with real-world assets through advanced oracle integration and supply management.
            </p>
            <div className="flex gap-4">
              <Link
                href="/docs/v5"
                className="inline-flex items-center px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Learn More
              </Link>
            </div>
          </Card>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="p-6 bg-gray-800/50 border border-gray-700/50">
                <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-gray-400 mb-4">{feature.description}</p>
                <ul className="space-y-2">
                  {feature.details.map((detail, detailIndex) => (
                    <li key={detailIndex} className="flex items-start text-sm text-gray-300">
                      <span className="mr-2 text-blue-400">•</span>
                      {detail}
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
} 