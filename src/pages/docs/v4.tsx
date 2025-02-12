import Head from 'next/head';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Footer } from '@/components/layouts/Footer';

export default function V4DocsPage() {
  const features = [
    {
      title: 'Dynamic Tax System',
      description: 'A flexible and adaptive tax mechanism that responds to market conditions.',
      details: [
        'Dynamic tax rates that adjust based on market activity and volume',
        'Automated fee distribution to designated wallets and purposes',
        'Auto-liquidity generation to maintain price stability',
        'Configurable tax brackets and thresholds'
      ]
    },
    {
      title: 'Advanced Tokenomics Engine',
      description: 'Comprehensive token economics system for sustainable growth.',
      details: [
        'Smart buyback mechanism that triggers based on price and volume conditions',
        'Automated burn system with configurable parameters',
        'Reward distribution system for token holders',
        'Anti-dump mechanisms and trading limits'
      ]
    },
    {
      title: 'Supply Control Mechanism',
      description: 'Sophisticated supply management with elastic capabilities.',
      details: [
        'Elastic supply adjustments based on market conditions',
        'Configurable mint and burn limits',
        'Supply scheduling for controlled token release',
        'Emergency supply controls for risk management'
      ]
    },
    {
      title: 'Distribution System',
      description: 'Efficient and fair token distribution mechanisms.',
      details: [
        'Gas-optimized airdrop mechanism for large-scale distributions',
        'Batch transfer functionality for efficient token movement',
        'Merkle-based distribution system for scalable airdrops',
        'Whitelist and vesting capabilities'
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-900">
      <Head>
        <title>TokenHub.dev - V4 Documentation</title>
        <meta name="description" content="Learn about TokenHub.dev V4 features and capabilities" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <Link href="/" className="text-blue-400 hover:text-blue-300">
              ← Back to Home
            </Link>
          </div>

          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-4">Token Factory V4</h1>
            <p className="text-xl text-gray-400">
              Next generation token creation platform with advanced economics and distribution features.
            </p>
          </div>

          <div className="space-y-8">
            {features.map((feature, index) => (
              <Card key={index} className="p-6 bg-gray-800 border-gray-700">
                <h2 className="text-2xl font-bold text-white mb-2">{feature.title}</h2>
                <p className="text-gray-400 mb-4">{feature.description}</p>
                <ul className="space-y-2">
                  {feature.details.map((detail, detailIndex) => (
                    <li key={detailIndex} className="flex items-start">
                      <span className="text-blue-400 mr-2">•</span>
                      <span className="text-gray-300">{detail}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>

          <div className="mt-12 p-6 bg-blue-900/20 rounded-lg border border-blue-500/20">
            <h2 className="text-2xl font-bold text-white mb-4">Coming Soon</h2>
            <p className="text-gray-300">
              Token Factory V4 is currently in development. Join our Discord community to stay updated on the release and participate in the beta testing program.
            </p>
            <div className="mt-4">
              <a
                href="https://discord.gg/tokenhub"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Join Discord Community
              </a>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
} 