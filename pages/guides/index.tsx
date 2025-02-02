import { Header } from '../../components/Header';
import Head from 'next/head';
import Link from 'next/link';

const guides = [
  {
    category: 'Token Creation',
    guides: [
      { title: 'V1 Token Creation Guide', href: '/guides/v1-token-creation', description: 'Step-by-step guide for creating V1 tokens' },
      { title: 'V2 Token Creation Guide', href: '/guides/v2-token-creation', description: 'Step-by-step guide for creating V2 tokens with presale functionality' },
      { title: 'Utility Token Guide', href: '/guides/utility-token', description: 'How to create and manage utility tokens' }
    ]
  },
  {
    category: 'Launch Strategy',
    guides: [
      { title: 'Presale Strategy', href: '/guides/presale-strategy', description: 'Best practices for running a successful presale' },
      { title: 'Marketing Strategy', href: '/guides/marketing-strategy', description: 'Marketing and communications strategy for token launches' },
      { title: 'Community Building', href: '/guides/community-building', description: 'Building and managing a strong community' }
    ]
  },
  {
    category: 'Token Economics',
    guides: [
      { title: 'Vesting Strategy', href: '/guides/vesting-strategy', description: 'Token vesting and distribution strategies' },
      { title: 'Liquidity Management', href: '/guides/liquidity-management', description: 'Managing token liquidity and market making' },
      { title: 'Token Economics Guide', href: '/guides/token-economics', description: 'Designing sustainable token economics' }
    ]
  },
  {
    category: 'Security & Compliance',
    guides: [
      { title: 'Security Framework', href: '/guides/security-framework', description: 'Security best practices for token projects' },
      { title: 'Legal Framework', href: '/guides/legal-framework', description: 'Legal considerations and compliance' },
      { title: 'Risk Management', href: '/guides/risk-management', description: 'Managing risks in token projects' }
    ]
  }
];

export default function GuidesPage() {
  return (
    <div className="min-h-screen bg-background-primary">
      <Head>
        <title>TokenHub.dev - Strategy Guides</title>
        <meta name="description" content="Comprehensive guides for token creation and management" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Header className="relative z-50" />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Strategy Guides</h1>
            <p className="text-gray-400">Comprehensive guides for token creation, launch strategies, and management</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {guides.map((category) => (
              <div key={category.category} className="bg-background-secondary rounded-lg p-6 border border-border">
                <h2 className="text-xl font-bold text-white mb-4">{category.category}</h2>
                <div className="space-y-4">
                  {category.guides.map((guide) => (
                    <Link
                      key={guide.href}
                      href={guide.href}
                      className="block p-4 bg-background-primary rounded-lg border border-border hover:border-text-accent transition-colors"
                    >
                      <h3 className="text-lg font-medium text-white mb-1">{guide.title}</h3>
                      <p className="text-sm text-gray-400">{guide.description}</p>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
} 