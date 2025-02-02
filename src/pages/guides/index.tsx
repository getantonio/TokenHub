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
    <div className="min-h-screen bg-gray-900">
      <Head>
        <title>TokenHub.dev - Guides</title>
        <meta name="description" content="Learn how to create and manage your token with our comprehensive guides" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-2">Guides</h1>
          <p className="text-gray-400 mb-8">Learn how to create and manage your token with our comprehensive guides.</p>

          <div className="space-y-8">
            {guides.map((section) => (
              <div key={section.category} className="space-y-4">
                <h2 className="text-2xl font-bold text-white">{section.category}</h2>
                <div className="grid gap-4">
                  {section.guides.map((guide) => (
                    <Link
                      key={guide.href}
                      href={guide.href}
                      className="block p-6 bg-gray-800 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors"
                    >
                      <h3 className="text-xl font-bold text-white mb-2">{guide.title}</h3>
                      <p className="text-gray-400">{guide.description}</p>
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