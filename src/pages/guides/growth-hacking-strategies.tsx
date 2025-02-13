import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Footer } from '@/components/layouts/Footer';

export default function GrowthHackingStrategiesPage() {
  const sections = [
    {
      title: "Community Building Strategies",
      content: [
        {
          subtitle: "Social Media Optimization",
          items: [
            "Create engaging Twitter threads about your token's features",
            "Build a strong Telegram community with active moderation",
            "Leverage Discord for technical support and updates",
            "Use Reddit for detailed discussions and AMAs",
            "Maintain consistent branding across all platforms"
          ]
        },
        {
          subtitle: "Content Marketing",
          items: [
            "Create educational content about your token's utility",
            "Develop video tutorials for token features",
            "Write detailed Medium articles about your technology",
            "Start a weekly newsletter for updates",
            "Create infographics for easy sharing"
          ]
        }
      ]
    },
    {
      title: "Viral Growth Techniques",
      content: [
        {
          subtitle: "Referral Programs",
          items: [
            "Implement token-based referral rewards",
            "Create tiered referral systems",
            "Offer special NFTs for top referrers",
            "Run referral competitions",
            "Track and showcase referral leaderboards"
          ]
        },
        {
          subtitle: "Engagement Incentives",
          items: [
            "Reward active community members with tokens",
            "Create daily/weekly engagement tasks",
            "Implement social media challenges",
            "Organize community contests",
            "Offer exclusive access to features"
          ]
        }
      ]
    },
    {
      title: "Technical Growth Hacks",
      content: [
        {
          subtitle: "Smart Contract Integration",
          items: [
            "Integrate with popular DeFi protocols",
            "Build cross-chain bridges",
            "Implement automated buyback mechanisms",
            "Create innovative staking solutions",
            "Develop unique token utilities"
          ]
        },
        {
          subtitle: "Platform Development",
          items: [
            "Build user-friendly dApps",
            "Create mobile-first interfaces",
            "Implement analytics dashboards",
            "Develop API integrations",
            "Build developer tools"
          ]
        }
      ]
    },
    {
      title: "Marketing Automation",
      content: [
        {
          subtitle: "Tools and Platforms",
          items: [
            "Set up automated social media posting",
            "Implement chatbots for support",
            "Use email automation for updates",
            "Create automated market making",
            "Deploy price alert bots"
          ]
        },
        {
          subtitle: "Analytics and Optimization",
          items: [
            "Track key performance metrics",
            "Monitor wallet growth patterns",
            "Analyze trading behavior",
            "Measure community engagement",
            "Optimize based on data insights"
          ]
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-900">
      <Head>
        <title>Growth Hacking Strategies - TokenHub.dev</title>
        <meta name="description" content="Advanced growth strategies for token projects" />
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
            <h1 className="text-4xl font-bold text-white mb-4">Growth Hacking Strategies</h1>
            <p className="text-xl text-gray-400">
              Advanced strategies to grow your token project and community.
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
            <h2 className="text-2xl font-bold text-white mb-4">Ready to Grow Your Project?</h2>
            <p className="text-gray-300 mb-4">
              Join our community to discuss growth strategies and get support from experienced token creators.
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
                href="/docs"
                className="inline-flex items-center px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                View Documentation
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
} 