import { Header } from '../../components/Header';
import Head from 'next/head';
import Link from 'next/link';

const sections = [
  {
    title: 'Overview',
    content: `
      A successful token launch requires a comprehensive marketing and communications strategy. This guide outlines key components and best practices for marketing your token project effectively.
    `
  },
  {
    title: 'Pre-Launch Strategy',
    subsections: [
      {
        title: 'Brand Development',
        items: [
          'Create a compelling brand story',
          'Design a professional visual identity',
          'Establish brand voice and guidelines',
          'Define unique value proposition',
          'Analyze competition and market positioning'
        ]
      },
      {
        title: 'Content Creation',
        items: [
          'Write a comprehensive whitepaper',
          'Prepare technical documentation',
          'Create educational content and guides',
          'Develop marketing materials',
          'Record tutorial videos'
        ]
      }
    ]
  },
  {
    title: 'Community Building',
    subsections: [
      {
        title: 'Social Media Presence',
        items: [
          'Twitter/X - Daily updates and engagement',
          'Discord - Community management and support',
          'Telegram - Official announcements and chat',
          'Medium - Technical articles and updates',
          'YouTube - Tutorials and AMAs'
        ]
      },
      {
        title: 'Engagement Programs',
        items: [
          'Ambassador program',
          'Bug bounty program',
          'Content creation rewards',
          'Referral system',
          'Community events and competitions'
        ]
      }
    ]
  },
  {
    title: 'Launch Phase',
    subsections: [
      {
        title: 'Timeline',
        items: [
          'Pre-Launch (3 months) - Community building and preparation',
          'Launch Event - Token generation and distribution',
          'Post-Launch (6 months) - Growth and expansion'
        ]
      },
      {
        title: 'Key Activities',
        items: [
          'Coordinate launch announcements',
          'Execute marketing campaigns',
          'Monitor community feedback',
          'Track performance metrics',
          'Adjust strategy as needed'
        ]
      }
    ]
  },
  {
    title: 'Growth Strategy',
    subsections: [
      {
        title: 'Incentive Programs',
        items: [
          'Liquidity mining rewards',
          'Staking incentives',
          'Governance participation rewards',
          'Trading competitions',
          'Community rewards'
        ]
      },
      {
        title: 'Partnership Development',
        items: [
          'Integration partnerships',
          'Marketing collaborations',
          'Strategic alliances',
          'Industry associations',
          'Influencer relationships'
        ]
      }
    ]
  },
  {
    title: 'Marketing Operations',
    subsections: [
      {
        title: 'Resource Allocation',
        items: [
          'Content creation (25%)',
          'Community building (30%)',
          'Paid advertising (20%)',
          'Events (15%)',
          'PR and communications (10%)'
        ]
      },
      {
        title: 'Performance Tracking',
        items: [
          'Community growth metrics',
          'Engagement rates',
          'Conversion tracking',
          'ROI measurements',
          'User acquisition data'
        ]
      }
    ]
  },
  {
    title: 'Compliance and Risk Management',
    items: [
      'Follow regulatory requirements',
      'Maintain clear disclosure policies',
      'Implement crisis management protocols',
      'Protect brand reputation',
      'Monitor community guidelines',
      'Regular compliance reviews'
    ]
  }
];

export default function MarketingStrategyGuide() {
  return (
    <div className="min-h-screen bg-background-primary">
      <Head>
        <title>TokenHub.dev - Marketing Strategy Guide</title>
        <meta name="description" content="Comprehensive guide for marketing your token project" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Header className="relative z-50" />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <Link href="/guides" className="text-text-accent hover:text-blue-400 transition-colors">
              ← Back to Guides
            </Link>
            <h1 className="text-3xl font-bold text-white mt-4 mb-2">Marketing Strategy Guide</h1>
            <p className="text-gray-400">Comprehensive guide for marketing your token project</p>
          </div>

          <div className="space-y-8">
            {sections.map((section) => (
              <div key={section.title} className="bg-background-secondary rounded-lg p-6 border border-border">
                <h2 className="text-xl font-bold text-white mb-4">{section.title}</h2>
                
                {section.content && (
                  <p className="text-gray-400 mb-4">{section.content}</p>
                )}

                {section.items && (
                  <ul className="list-disc list-inside space-y-2">
                    {section.items.map((item, index) => (
                      <li key={index} className="text-gray-400">{item}</li>
                    ))}
                  </ul>
                )}

                {section.subsections && (
                  <div className="space-y-6">
                    {section.subsections.map((subsection) => (
                      <div key={subsection.title}>
                        <h3 className="text-lg font-medium text-white mb-2">{subsection.title}</h3>
                        <ul className="list-disc list-inside space-y-2">
                          {subsection.items.map((item, index) => (
                            <li key={index} className="text-gray-400">{item}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            <div className="bg-background-secondary rounded-lg p-6 border border-border">
              <h2 className="text-xl font-bold text-white mb-4">Need Help?</h2>
              <p className="text-gray-400 mb-4">
                Our community is here to help you succeed. Join our Discord for marketing support and discussions.
              </p>
              <div className="flex space-x-4">
                <Link
                  href="/discord"
                  className="inline-block px-6 py-3 text-sm font-medium rounded-md bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                >
                  Join Discord
                </Link>
                <Link
                  href="/guides"
                  className="inline-block px-6 py-3 text-sm font-medium rounded-md bg-gray-700 text-white hover:bg-gray-600 transition-colors"
                >
                  View More Guides
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 