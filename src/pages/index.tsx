import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@components/ui/card';
import Head from 'next/head';
import { TokenFeatureCard_V4 } from '@/components/features/token/TokenFeatureCard_V4';
import { Footer } from '@/components/layouts/Footer';
import { useRouter } from 'next/router';
import { Badge } from '@/components/ui/badge';
import { QRCodeSVG } from 'qrcode.react';

export default function HomePage() {
  const router = useRouter();
  const [showQRPopup, setShowQRPopup] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const walletAddress = "0x37DB73EaeA41B2546549e102520c559919DB30Da";
  const currentVersions = [
    {
      version: 'defi-loan',
      title: 'DeFi Loan Factory',
      description: 'Create and manage customizable lending pools with advanced DeFi features',
      features: [
        'Customizable lending pools',
        'Dynamic interest rates',
        'Multi-asset collateral',
        'Liquidation engine'
      ],
      icon: '🏦',
      disabled: false
    },
    {
      version: 'v5',
      title: 'Factory v5',
      description: 'Create synthetic tokens pegged to real-world assets with advanced price tracking',
      features: [
        'Price oracle integration',
        'Elastic supply mechanism',
        'Automated rebase system',
        'Collateral management'
      ],
      icon: '📈',
      disabled: false
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
      icon: '⚡',
      disabled: false
    },
    {
      version: 'v3',
      title: 'Factory v3',
      description: 'Complete token solution with vesting schedules and multi-wallet distribution',
      features: ['Vesting schedules', 'Multi-wallet distribution', 'Presale allocation', 'Liquidity management'],
      icon: '🔒',
      disabled: false
    },
    {
      version: 'v2',
      title: 'Factory v2',
      description: 'Advanced token with built-in presale functionality',
      features: ['Presale system', 'Contribution limits', 'Timeline management', 'Basic vesting'],
      icon: '💎',
      disabled: false
    },
    {
      version: 'v1',
      title: 'Factory v1',
      description: 'Basic ERC20 token with essential features',
      features: ['Blacklist system', 'Time locks', 'Basic transfers', 'Owner controls'],
      icon: '🔑',
      disabled: false
    }
  ];

  const copyToClipboard = () => {
    navigator.clipboard.writeText(walletAddress);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <Head>
        <title>TokenHub.dev - Create Your Token</title>
        <meta name="description" content="Create your own token with TokenHub.dev" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Updated Welcome Text - Reduced Sizes */}
          <div className="text-center mb-10">
            <span className="block text-6xl font-bold text-white mb-2"> {/* Reduced size */} 
              Welcome!
            </span>
            <span className="block text-2xl text-gray-300"> {/* Reduced size */} 
              Choose your Token or DeFi creation tool to start your journey.
            </span>
          </div>
          
          {/* Warning Banner */}
          <div className="mx-auto bg-red-600 text-white px-3 py-2 rounded-md font-medium w-full h-[75px] flex items-center shadow-lg border-2 border-red-400 mb-8">
            <div className="flex flex-col flex-grow">
              <div className="flex items-center justify-center">
                <p className="font-bold text-sm flex items-center">
                  <span className="mr-1">⚠️</span> WARNING: getantonio.eth wallet compromised <span className="ml-1">⚠️</span>
                </p>
              </div>
              <div className="flex items-center justify-center mt-0.5">
                <p className="text-sm">DO NOT contribute to Gitcoin OSS. Donate directly instead:</p>
                <button 
                  className="text-xs font-semibold flex items-center hover:text-gray-200 transition-colors ml-1 cursor-pointer"
                  onClick={copyToClipboard}
                  aria-label="Copy wallet address to clipboard"
                >
                  <span className="mr-1">{copySuccess ? "Copied!" : "Copy Address"}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex items-center justify-center ml-2">
              <div 
                className="cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => setShowQRPopup(true)}
              >
                <QRCodeSVG 
                  value={walletAddress}
                  size={45} 
                  bgColor="transparent" 
                  fgColor="#FFFFFF" 
                  level="M"
                  includeMargin={false}
                />
              </div>
            </div>
          </div>

          {/* QR Code Popup */}
          {showQRPopup && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={() => setShowQRPopup(false)}>
              <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Direct Donation QR Code</h3>
                  <button 
                    className="text-gray-500 hover:text-gray-700" 
                    onClick={() => setShowQRPopup(false)}
                  >
                    ✕
                  </button>
                </div>
                <div className="flex flex-col items-center">
                  <QRCodeSVG 
                    value={walletAddress}
                    size={200} 
                    bgColor="#FFFFFF" 
                    fgColor="#000000" 
                    level="H"
                    includeMargin={true}
                  />
                  <p className="mt-4 text-center text-sm text-gray-700 font-medium">
                    Direct donation address:
                  </p>
                  <p className="text-xs break-all text-center text-gray-900 font-bold mt-1">
                    {walletAddress}
                  </p>
                </div>
              </div>
            </div>
          )}

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
                <Card className={`h-full bg-gray-800 hover:bg-gray-750 transition-colors border border-gray-700/50 hover:border-gray-600/50 ${version.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-3 mb-3">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl flex-shrink-0" role="img" aria-label={version.title}>
                          {version.icon}
                        </span>
                        <div className="flex-grow">
                          <div className="flex items-center gap-2">
                            <h2 className="text-lg font-semibold text-white">{version.title}</h2>
                            {(version.version === 'v5' || version.version === 'v2_DirectDEX') && (
                              <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/50 whitespace-nowrap text-xs">
                                Coming Soon
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-400">{version.description}</p>
                        </div>
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