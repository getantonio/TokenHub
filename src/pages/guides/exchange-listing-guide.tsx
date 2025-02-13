import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Footer } from '@/components/layouts/Footer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';

interface ResourceLink {
  title: string;
  url: string;
  description: string;
}

interface WorkshopSection {
  title: string;
  description: string;
  aiPrompt: string;
}

interface DetailSection {
  title: string;
  content: string;
  links?: ResourceLink[];
  workshop?: WorkshopSection;
}

interface ListingSection {
  title: string;
  description: string;
  details: DetailSection[];
}

export default function ExchangeListingGuidePage() {
  const sections: ListingSection[] = [
    {
      title: "Token Preparation",
      description: "Essential steps to prepare your token for exchange listing",
      details: [
        {
          title: "Smart Contract Audit",
          content: "A comprehensive security audit of your smart contract is crucial for exchange listings. Most major exchanges require audits from recognized firms.",
          links: [
            {
              title: "CertiK Audit Services",
              url: "https://certik.com",
              description: "Leading blockchain security firm offering smart contract audits"
            },
            {
              title: "Hacken Audit Solutions",
              url: "https://hacken.io",
              description: "Comprehensive smart contract and protocol auditing services"
            },
            {
              title: "Quantstamp Security Services",
              url: "https://quantstamp.com",
              description: "Blockchain security and smart contract audit provider"
            }
          ],
          workshop: {
            title: "Audit Preparation Workshop",
            description: "Use our AI assistant to prepare your contract for audit",
            aiPrompt: "Analyze my smart contract for common security vulnerabilities and prepare an audit readiness report"
          }
        },
        {
          title: "Tokenomics Documentation",
          content: "Detailed tokenomics documentation is essential for exchange listings. This should include token distribution, vesting schedules, and utility.",
          workshop: {
            title: "Tokenomics Builder",
            description: "Create professional tokenomics documentation with AI assistance",
            aiPrompt: "Help me create comprehensive tokenomics documentation based on my token parameters"
          }
        },
        {
          title: "Project Documentation",
          content: "Comprehensive project documentation including technical specifications, use cases, and roadmap.",
          workshop: {
            title: "Documentation Generator",
            description: "Generate professional project documentation with AI",
            aiPrompt: "Create detailed project documentation based on my token's features and goals"
          }
        }
      ]
    },
    {
      title: "Liquidity Management",
      description: "Essential liquidity requirements and management strategies",
      details: [
        {
          title: "Liquidity Locking",
          content: "Lock your initial liquidity for a minimum of 6-12 months using trusted platforms.",
          links: [
            {
              title: "PinkLock",
              url: "https://www.pinksale.finance/",
              description: "Popular liquidity locking platform"
            },
            {
              title: "UniCrypt",
              url: "https://unicrypt.network/",
              description: "Secure liquidity locking and vesting platform"
            }
          ]
        },
        {
          title: "Trading Volume Strategy",
          content: "Implement strategies to maintain healthy trading volume through market making and community engagement.",
          workshop: {
            title: "Volume Strategy Builder",
            description: "Create a customized trading volume strategy",
            aiPrompt: "Help me develop a sustainable trading volume strategy for my token"
          }
        },
        {
          title: "Anti-Bot Protection",
          content: "Implement anti-bot measures to prevent manipulation and ensure fair trading.",
          links: [
            {
              title: "Anti-Bot Guide",
              url: "/guides/anti-bot-measures",
              description: "Comprehensive guide to implementing anti-bot protections"
            }
          ],
          workshop: {
            title: "Anti-Bot Setup",
            description: "Configure anti-bot measures for your token",
            aiPrompt: "Guide me through setting up effective anti-bot measures for my token"
          }
        }
      ]
    },
    {
      title: "Legal Compliance",
      description: "Essential legal requirements for exchange listing",
      details: [
        {
          title: "Legal Opinion",
          content: "Obtain a legal opinion letter from a qualified blockchain law firm.",
          links: [
            {
              title: "Legal Opinion Services",
              url: "/services/legal-opinion",
              description: "Connect with qualified blockchain legal firms"
            }
          ]
        },
        {
          title: "Business Registration",
          content: "Register your business in a crypto-friendly jurisdiction. Popular options include Singapore, Switzerland, and Dubai.",
          links: [
            {
              title: "Singapore Registration Guide",
              url: "/guides/singapore-registration",
              description: "Step-by-step guide to registering in Singapore"
            },
            {
              title: "Dubai DMCC Guide",
              url: "/guides/dubai-registration",
              description: "Guide to registering with Dubai's DMCC"
            }
          ],
          workshop: {
            title: "Registration Assistant",
            description: "Get guidance on business registration",
            aiPrompt: "Help me choose and plan business registration in a suitable jurisdiction"
          }
        }
      ]
    },
    {
      title: "Exchange Application",
      description: "Guide to applying for exchange listings",
      details: [
        {
          title: "Exchange Research",
          content: "Research and compare different exchanges based on your requirements.",
          links: [
            {
              title: "Binance Listing Guide",
              url: "https://www.binance.com/en/support/faq/115000822512",
              description: "Official Binance listing requirements"
            },
            {
              title: "KuCoin Listing Process",
              url: "https://www.kucoin.com/listing",
              description: "KuCoin's token listing process"
            },
            {
              title: "Gate.io Listing Info",
              url: "https://www.gate.io/listing",
              description: "Gate.io listing requirements"
            }
          ]
        },
        {
          title: "Listing Materials",
          content: "Prepare comprehensive listing application materials including technical documentation, market analysis, and team information.",
          workshop: {
            title: "Application Builder",
            description: "Create professional exchange listing applications",
            aiPrompt: "Help me prepare a comprehensive exchange listing application"
          }
        },
        {
          title: "Listing Costs",
          content: "Budget for listing fees which can range from $10,000 to $500,000+ depending on the exchange tier and requirements.",
          links: [
            {
              title: "Exchange Fee Comparison",
              url: "/resources/exchange-fees",
              description: "Detailed comparison of exchange listing fees"
            }
          ]
        },
        {
          title: "Market Making",
          content: "Develop a market making strategy to maintain liquidity and price stability.",
          workshop: {
            title: "Market Making Strategy",
            description: "Create a customized market making plan",
            aiPrompt: "Help me develop an effective market making strategy for my token"
          }
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-900">
      <Head>
        <title>Exchange Listing Guide - TokenHub.dev</title>
        <meta name="description" content="Comprehensive guide to listing your token on cryptocurrency exchanges" />
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
            <h1 className="text-4xl font-bold text-white mb-4">Exchange Listing Guide</h1>
            <p className="text-xl text-gray-400">
              Complete guide to preparing and listing your token on cryptocurrency exchanges.
            </p>
          </div>

          <div className="space-y-12">
            {sections.map((section, index) => (
              <div key={index} className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">{section.title}</h2>
                  <p className="text-gray-400">{section.description}</p>
                </div>

                <div className="grid gap-6">
                  {section.details.map((detail, detailIndex) => (
                    <Card key={detailIndex} className="p-6 bg-gray-800 border-gray-700">
                      <h3 className="text-xl font-semibold text-white mb-4">{detail.title}</h3>
                      <p className="text-gray-300 mb-6">{detail.content}</p>

                      {detail.links && (
                        <div className="mb-6">
                          <h4 className="text-lg font-semibold text-white mb-4">Useful Resources</h4>
                          <div className="grid gap-4">
                            {detail.links.map((link, linkIndex) => (
                              <a
                                key={linkIndex}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block p-4 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors"
                              >
                                <h5 className="text-white font-medium mb-1">{link.title}</h5>
                                <p className="text-gray-400 text-sm">{link.description}</p>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {detail.workshop && (
                        <div className="mt-6 p-6 bg-blue-900/20 rounded-lg border border-blue-500/20">
                          <h4 className="text-lg font-semibold text-white mb-2">{detail.workshop.title}</h4>
                          <p className="text-gray-300 mb-4">{detail.workshop.description}</p>
                          <Button 
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                            onClick={() => {
                              // TODO: Implement AI workshop integration
                              console.log('Opening workshop with prompt:', detail.workshop?.aiPrompt);
                            }}
                          >
                            Start Workshop
                          </Button>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 p-6 bg-blue-900/20 rounded-lg border border-blue-500/20">
            <h2 className="text-2xl font-bold text-white mb-4">Need Expert Guidance?</h2>
            <p className="text-gray-300 mb-4">
              Get personalized assistance with your exchange listing journey from our community of experts.
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
                href="/consultation"
                className="inline-flex items-center px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Book Consultation
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
} 