import React from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@components/ui/card';
import Head from 'next/head';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-900">
      <Head>
        <title>TokenHub.dev - Create Your Token</title>
        <meta name="description" content="Create your own token with TokenHub.dev" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-2">Welcome to TokenHub.dev</h1>
          <p className="text-gray-400 mb-8">Choose your token factory version to get started.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/v1" className="block">
              <Card className="h-full bg-gray-800 hover:bg-gray-750 transition-colors border-gray-700">
                <CardContent className="p-4">
                  <h2 className="text-xl font-semibold text-white mb-2">Factory v1</h2>
                  <p className="text-sm text-gray-400">
                    Basic ERC20 token with blacklist and time lock features. Perfect for simple token creation.
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/v2" className="block">
              <Card className="h-full bg-gray-800 hover:bg-gray-750 transition-colors border-gray-700">
                <CardContent className="p-4">
                  <h2 className="text-xl font-semibold text-white mb-2">Factory v2</h2>
                  <p className="text-sm text-gray-400">
                    Advanced token with built-in presale functionality, contribution limits, and timeline management.
                  </p>
                </CardContent>
              </Card>
            </Link>

            {/* V3 card temporarily disabled
            <Link href="/v3" className="block">
              <Card className="h-full bg-gray-800 hover:bg-gray-750 transition-colors border-gray-700">
                <CardContent className="p-4">
                  <h2 className="text-xl font-semibold text-white mb-2">Factory v3</h2>
                  <p className="text-sm text-gray-400">
                    Complete token solution with vesting schedules, multi-wallet distribution, presale allocation, and liquidity management.
                  </p>
                </CardContent>
              </Card>
            </Link>
            */}
          </div>

          <div className="mt-8 text-center">
            <p className="text-gray-400 text-sm">
              Need help? Check out our <Link href="/docs" className="text-blue-400 hover:underline">documentation</Link> or 
              join our <a href="https://discord.gg/tokenhub" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Discord community</a>.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}