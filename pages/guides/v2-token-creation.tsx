import { Header } from '../../components/Header';
import Head from 'next/head';
import Link from 'next/link';

const sections = [
  {
    title: 'Overview',
    content: `
      The V2 token factory allows you to create advanced tokens with presale functionality. This guide will walk you through the token creation process and explain all available features.
    `
  },
  {
    title: 'Key Features',
    items: [
      'Built-in presale functionality',
      'Configurable soft cap and hard cap',
      'Whitelist support for presales',
      'Customizable contribution limits',
      'Automatic token distribution after presale',
      'Optional blacklist functionality',
      'Optional time lock functionality'
    ]
  },
  {
    title: 'Token Configuration',
    subsections: [
      {
        title: 'Basic Token Information',
        items: [
          'Token Name - Choose a unique and memorable name',
          'Token Symbol - 3-4 characters, all caps recommended',
          'Initial Supply - Amount to mint at creation',
          'Maximum Supply - Total possible supply',
          'Owner Address - Optional custom owner address'
        ]
      },
      {
        title: 'Presale Configuration',
        items: [
          'Soft Cap - Minimum amount to raise',
          'Hard Cap - Maximum amount to raise',
          'Presale Rate - Tokens per ETH',
          'Minimum Contribution - In ETH',
          'Maximum Contribution - In ETH',
          'Start Time - When presale begins',
          'End Time - When presale ends',
          'Whitelist Mode - Enable/disable whitelist'
        ]
      },
      {
        title: 'Security Features',
        items: [
          'Blacklist - Enable/disable address blacklisting',
          'Time Lock - Enable/disable transfer time locks',
          'Owner Controls - Configurable owner privileges'
        ]
      }
    ]
  },
  {
    title: 'Creation Process',
    steps: [
      'Connect your wallet and ensure you have enough ETH for deployment',
      'Navigate to the token creation page',
      'Fill in all required token information',
      'Configure presale parameters carefully',
      'Enable desired security features',
      'Review all settings before deployment',
      'Confirm the transaction and pay the deployment fee',
      'Wait for deployment confirmation'
    ]
  },
  {
    title: 'Post-Creation Steps',
    steps: [
      'Verify the token contract on the block explorer',
      'Set up presale whitelist if enabled',
      'Configure any additional security settings',
      'Monitor presale progress',
      'Finalize presale after completion',
      'Manage token distribution'
    ]
  },
  {
    title: 'Important Notes',
    items: [
      'All fees must be paid in ETH',
      'Presale parameters cannot be changed after deployment',
      'Test all features on testnet first',
      'Keep owner wallet secure',
      'Document all configuration decisions',
      'Consider legal implications'
    ]
  }
];

export default function V2TokenCreationGuide() {
  return (
    <div className="min-h-screen bg-background-primary">
      <Head>
        <title>TokenHub.dev - V2 Token Creation Guide</title>
        <meta name="description" content="Step-by-step guide for creating V2 tokens with presale functionality" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Header className="relative z-50" />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <Link href="/guides" className="text-text-accent hover:text-blue-400 transition-colors">
              ← Back to Guides
            </Link>
            <h1 className="text-3xl font-bold text-white mt-4 mb-2">V2 Token Creation Guide</h1>
            <p className="text-gray-400">Step-by-step guide for creating V2 tokens with presale functionality</p>
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

                {section.steps && (
                  <ol className="list-decimal list-inside space-y-2">
                    {section.steps.map((step, index) => (
                      <li key={index} className="text-gray-400">{step}</li>
                    ))}
                  </ol>
                )}

                {section.subsections && (
                  <div className="space-y-4">
                    {section.subsections.map((subsection) => (
                      <div key={subsection.title} className="mt-4">
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
              <h2 className="text-xl font-bold text-white mb-4">Ready to Create?</h2>
              <p className="text-gray-400 mb-4">
                Now that you understand the V2 token creation process, you're ready to create your own token.
              </p>
              <Link
                href="/create"
                className="inline-block px-6 py-3 text-sm font-medium rounded-md bg-blue-500 text-white hover:bg-blue-600 transition-colors"
              >
                Create Token
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 