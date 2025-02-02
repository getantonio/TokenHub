import Head from 'next/head';
import Link from 'next/link';

export default function V2TokenCreationGuide() {
  return (
    <div className="min-h-screen bg-gray-900">
      <Head>
        <title>TokenHub.dev - V2 Token Creation Guide</title>
        <meta name="description" content="Learn how to create V2 tokens with presale functionality" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <Link href="/guides" className="text-blue-400 hover:text-blue-300">
              ← Back to Guides
            </Link>
          </div>

          <h1 className="text-3xl font-bold text-white mb-4">V2 Token Creation Guide</h1>
          <p className="text-gray-400 mb-8">Learn how to create V2 tokens with presale functionality.</p>

          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Getting Started</h2>
              <div className="prose prose-invert max-w-none">
                <p>Follow these steps to create your V2 token:</p>
                <ol>
                  <li>Connect your wallet</li>
                  <li>Navigate to Token Factory V2</li>
                  <li>Fill in token details</li>
                  <li>Configure presale settings</li>
                  <li>Deploy your token</li>
                </ol>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Token Configuration</h2>
              <div className="prose prose-invert max-w-none">
                <p>Key parameters to configure:</p>
                <ul>
                  <li>Token name and symbol</li>
                  <li>Initial and maximum supply</li>
                  <li>Blacklist and timelock features</li>
                  <li>Custom owner address (optional)</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Presale Settings</h2>
              <div className="prose prose-invert max-w-none">
                <p>Configure your presale with these parameters:</p>
                <ul>
                  <li>Presale rate (tokens per ETH)</li>
                  <li>Soft and hard caps</li>
                  <li>Minimum and maximum contributions</li>
                  <li>Start and end times</li>
                  <li>Whitelist settings</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">Post-Deployment</h2>
              <div className="prose prose-invert max-w-none">
                <p>After deployment, you can:</p>
                <ul>
                  <li>Monitor presale progress</li>
                  <li>Manage whitelisted addresses</li>
                  <li>Finalize presale when complete</li>
                  <li>Configure token features</li>
                  <li>Start trading and liquidity</li>
                </ul>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
} 