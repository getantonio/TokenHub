import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface TokenFeatureCardV4Props {
  onLearnMore?: () => void;
}

export function TokenFeatureCard_V4({ onLearnMore }: TokenFeatureCardV4Props) {
  const [expandedFeature, setExpandedFeature] = useState<number | null>(null);

  const features = [
    {
      title: 'Dynamic Tax System',
      description: 'Flexible tax rates with automated distribution',
      icon: '⚡',
      details: [
        'Dynamic rates based on volume',
        'Automated fee distribution',
        'Auto-liquidity generation',
        'Configurable tax brackets'
      ]
    },
    {
      title: 'Advanced Tokenomics',
      description: 'Built-in buyback and reward mechanisms',
      icon: '📈',
      details: [
        'Smart buyback triggers',
        'Automated burn system',
        'Holder reward distribution',
        'Anti-dump protection'
      ]
    },
    {
      title: 'Supply Control',
      description: 'Elastic supply with scheduling capabilities',
      icon: '⚖️',
      details: [
        'Elastic supply adjustments',
        'Mint/burn limits',
        'Supply scheduling',
        'Emergency controls'
      ]
    },
    {
      title: 'Distribution System',
      description: 'Efficient token distribution and airdrops',
      icon: '🔄',
      details: [
        'Gas-optimized airdrops',
        'Batch transfer system',
        'Merkle distribution',
        'Vesting capabilities'
      ]
    }
  ];

  return (
    <Card className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-blue-500/20 hover:border-blue-500/40 transition-all duration-300">
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl font-bold text-white mb-1">Token Factory V4</h2>
            <p className="text-sm text-gray-400">Next generation token platform with advanced economics and distribution</p>
          </div>
          <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/50">
            Coming Soon
          </Badge>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {features.map((feature, index) => (
            <div 
              key={index}
              className={`relative p-4 rounded-lg bg-gray-800/50 border border-gray-700/50 hover:border-gray-600/50 transition-all duration-200 cursor-pointer ${
                expandedFeature === index ? 'border-blue-500/50' : ''
              }`}
              onClick={() => setExpandedFeature(expandedFeature === index ? null : index)}
            >
              <span 
                className="absolute top-3 right-3 text-xl opacity-50" 
                role="img" 
                aria-label={feature.title}
              >
                {feature.icon}
              </span>
              <div className="pr-8">
                <h3 className="text-sm font-semibold text-white">{feature.title}</h3>
                <p className="text-xs text-gray-400 mb-2">{feature.description}</p>
                <div className={`grid grid-cols-1 gap-1.5 transition-all duration-200 ${
                  expandedFeature === index ? 'opacity-100 max-h-40' : 'opacity-0 max-h-0 overflow-hidden'
                }`}>
                  {feature.details.map((detail, detailIndex) => (
                    <div key={detailIndex} className="flex items-center text-xs text-gray-300">
                      <span className="mr-1.5 text-blue-400">•</span>
                      {detail}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Call to Action */}
        <Button
          onClick={onLearnMore}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-all duration-200"
        >
          Learn More About V4
        </Button>
      </div>
    </Card>
  );
} 
