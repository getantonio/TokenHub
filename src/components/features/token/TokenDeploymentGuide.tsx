import { InfoIcon } from '@/components/ui/InfoIcon';
import { Alert } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';

export default function TokenDeploymentGuide() {
  return (
    <div className="space-y-4">
      <Card className="p-4 bg-gray-900/50">
        <h2 className="text-2xl font-bold text-white mb-4">Token Deployment Guide</h2>
        
        {/* Naming Best Practices */}
        <section className="mb-6">
          <h3 className="text-xl font-semibold text-white flex items-center gap-2 mb-2">
            Naming Best Practices
            <InfoIcon content="Follow these guidelines to ensure your token name and symbol are professional and compliant" />
          </h3>
          <div className="space-y-2 text-base">
            <Alert variant="info">
              <h4 className="text-lg font-semibold">Token Name Guidelines:</h4>
              <ul className="list-disc ml-4 mt-1 text-gray-300">
                <li>Use a unique, memorable name (3-32 characters)</li>
                <li>Avoid copyrighted names or trademarks</li>
                <li>Don't use misleading terms (e.g., "Official", "Real")</li>
                <li>Avoid special characters (use letters, numbers, and spaces only)</li>
              </ul>
            </Alert>
            
            <Alert variant="info">
              <h4 className="text-lg font-semibold">Token Symbol Guidelines:</h4>
              <ul className="list-disc ml-4 mt-1 text-gray-300">
                <li>Use 2-6 uppercase letters</li>
                <li>Avoid numbers unless necessary</li>
                <li>Check for symbol conflicts on major exchanges</li>
                <li>Make it easy to remember and type</li>
              </ul>
            </Alert>
          </div>
        </section>

        {/* Vesting Best Practices */}
        <section className="mb-6">
          <h3 className="text-xl font-semibold text-white flex items-center gap-2 mb-2">
            Vesting Best Practices
            <InfoIcon content="Recommended vesting configurations for different token allocations" />
          </h3>
          <div className="space-y-2 text-base">
            <Alert variant="info">
              <h4 className="text-lg font-semibold">Recommended Vesting Periods:</h4>
              <div className="mt-2 space-y-2">
                <div className="bg-gray-800/50 p-2 rounded">
                  <span className="text-lg font-semibold">Team Tokens:</span>
                  <ul className="ml-4 text-gray-300">
                    <li>• 12-24 months vesting</li>
                    <li>• 3-6 months cliff</li>
                    <li>• Linear release schedule</li>
                  </ul>
                </div>
                
                <div className="bg-gray-800/50 p-2 rounded">
                  <span className="text-lg font-semibold">Advisor Tokens:</span>
                  <ul className="ml-4 text-gray-300">
                    <li>• 12-18 months vesting</li>
                    <li>• 1-3 months cliff</li>
                    <li>• Quarterly or monthly release</li>
                  </ul>
                </div>
                
                <div className="bg-gray-800/50 p-2 rounded">
                  <span className="text-lg font-semibold">Marketing Tokens:</span>
                  <ul className="ml-4 text-gray-300">
                    <li>• 6-12 months vesting</li>
                    <li>• 1 month cliff</li>
                    <li>• Monthly release schedule</li>
                  </ul>
                </div>
              </div>
            </Alert>
          </div>
        </section>

        {/* Pre-Deployment Checklist */}
        <section className="mb-6">
          <h3 className="text-xl font-semibold text-white flex items-center gap-2 mb-2">
            Pre-Deployment Checklist
            <InfoIcon content="Essential checks before deploying your token" />
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-base">
            <div className="space-y-2">
              <Alert variant="warning">
                <h4 className="text-lg font-semibold">Token Configuration:</h4>
                <ul className="list-disc ml-4 mt-1 text-gray-300">
                  <li>Verify token supply numbers</li>
                  <li>Check all vesting parameters</li>
                  <li>Confirm allocation percentages total 100%</li>
                  <li>Verify wallet addresses are correct</li>
                </ul>
              </Alert>
            </div>
            
            <div className="space-y-2">
              <Alert variant="warning">
                <h4 className="text-lg font-semibold">Presale Settings:</h4>
                <ul className="list-disc ml-4 mt-1 text-gray-300">
                  <li>Verify soft/hard caps</li>
                  <li>Check contribution limits</li>
                  <li>Confirm presale duration</li>
                  <li>Review liquidity lock period</li>
                </ul>
              </Alert>
            </div>
          </div>
        </section>

        {/* Security Recommendations */}
        <section>
          <h3 className="text-xl font-semibold text-white flex items-center gap-2 mb-2">
            Security Recommendations
            <InfoIcon content="Important security features to consider" />
          </h3>
          <div className="space-y-2 text-base">
            <Alert variant="error">
              <h4 className="text-lg font-semibold">Recommended Security Features:</h4>
              <ul className="list-disc ml-4 mt-1 text-gray-300">
                <li>Enable blacklist for protection against malicious actors</li>
                <li>Set appropriate time locks for large holders</li>
                <li>Lock liquidity for at least 180 days</li>
                <li>Implement gradual vesting for team tokens</li>
                <li>Use multi-sig for critical operations</li>
              </ul>
            </Alert>
          </div>
        </section>
      </Card>
    </div>
  );
} 