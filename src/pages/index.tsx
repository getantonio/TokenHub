import React from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@components/ui/card';
import Head from 'next/head';
import { TokenFeatureCard_V4 } from '@/components/features/token/TokenFeatureCard_V4';
import { Footer } from '@/components/layouts/Footer';
import { useRouter } from 'next/router';

export default function HomePage() {
  const router = useRouter();
  const currentVersions = [
    {
      version: 'v3',
      title: 'Factory v3',
      description: 'Complete token solution with vesting schedules and multi-wallet distribution',
      features: ['Vesting schedules', 'Multi-wallet distribution', 'Presale allocation', 'Liquidity management'],
      icon: '🔒'
    },
    {
      version: 'v2_DirectDEX',
      title: 'Factory v2 DirectDEX',
      description: 'Create and instantly list your token on DEX with advanced trading controls',
      features: ['Instant DEX listing', 'Multi-DEX support', 'Marketing & Dev fees', 'Anti-bot protection'],
      icon: '🚀'
    },
    {
      version: 'v2',
      title: 'Factory v2',
      description: 'Advanced token with built-in presale functionality',
      features: ['Presale system', 'Contribution limits', 'Timeline management', 'Basic vesting'],
      icon: '💎'
    },
    {
      version: 'v1',
      title: 'Factory v1',
      description: 'Basic ERC20 token with essential features',
      features: ['Blacklist system', 'Time locks', 'Basic transfers', 'Owner controls'],
      icon: '🔑'
    },
    {
      version: 'v4',
      title: 'Factory v4',
      description: 'Create tokens with a Dynamic Fee System that adapts to market conditions',
      features: [
        'Dynamic fee rates',
        'Auto-liquidity generation',
        'Holder rewards',
        'Anti-bot protection'
      ],
      icon: '⚡'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-900">
      <Head>
        <title>TokenHub.dev - Create Your Token</title>
        <meta name="description" content="Create your own token with TokenHub.dev" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-2">Welcome to TokenHub.dev</h1>
          <p className="text-gray-400 mb-8">Choose your token factory version to get started.</p>

          {/* V4 Feature Card */}
          <div className="mb-8">
            <TokenFeatureCard_V4 onLearnMore={() => router.push('/v4')} />
          </div>

          {/* Current Versions */}
          <h2 className="text-xl font-semibold text-white mb-4">Current Versions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {currentVersions.map((version) => (
              <Link 
                key={version.version} 
                href={version.version === 'v2_DirectDEX' ? '/v2-direct-dex' : `/${version.version.toLowerCase()}`}
                className="block"
              >
                <Card className="h-full bg-gray-800 hover:bg-gray-750 transition-colors border border-gray-700/50 hover:border-gray-600/50">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <span className="text-2xl" role="img" aria-label={version.title}>
                        {version.icon}
                      </span>
                      <div>
                        <h2 className="text-lg font-semibold text-white">{version.title}</h2>
                        <p className="text-sm text-gray-400">{version.description}</p>
                      </div>
                    </div>
                    <ul className="space-y-1">
                      {version.features.map((feature, index) => (
                        <li key={index} className="text-xs text-gray-300 flex items-center">
                          <span className="mr-2 text-blue-400">•</span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}