import { useState } from 'react';
import { Card } from './ui/card';

interface FactoryFeatureCardProps {
  version: string;
  status: 'ACTIVE' | 'PLANNED' | 'FUTURE';
  title: string;
  description: string;
  features: string[];
  details: {
    deploymentFee: string;
    networks: string[];
    audited: boolean;
    upgradeable: boolean;
  };
  link: string;
  action: string;
}

const NetworkIcon = ({ network }: { network: string }) => {
  const icons = {
    ETH: '⟠',
    Polygon: '⬡',
    Arbitrum: '◊',
    Optimism: '○'
  };
  return <span className="text-xs opacity-70">{icons[network as keyof typeof icons]}</span>;
};

const InfoGraphic = () => (
  <div className="flex items-center justify-start h-[34px] px-3 rounded bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20">
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-blue-400">One Click Deployment</span>
      <div className="flex items-center gap-1 ml-2">
        <NetworkIcon network="ETH" />
        <NetworkIcon network="Polygon" />
        <NetworkIcon network="Arbitrum" />
        <NetworkIcon network="Optimism" />
      </div>
    </div>
  </div>
);

export function FactoryFeatureCard({
  version,
  status,
  title,
  description,
  features,
  details,
  link,
  action
}: FactoryFeatureCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const statusColors = {
    ACTIVE: 'bg-green-500/20 text-green-500',
    PLANNED: 'bg-yellow-500/20 text-yellow-500',
    FUTURE: 'bg-blue-500/20 text-blue-500'
  };

  return (
    <Card className="bg-gray-800 border-gray-700 hover:border-gray-600 transition-colors">
      <div className="p-2 space-y-2">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white">{title}</h3>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${statusColors[status]}`}>
                {status}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">{description}</p>
          </div>
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-blue-400 hover:text-blue-300"
          >
            {isExpanded ? 'Show Less' : 'Show More'}
          </button>
        </div>

        {/* Quick Info */}
        <div className="flex justify-between text-xs text-gray-400">
          <div>Fee: {details.deploymentFee}</div>
          <div>Networks: {details.networks.join(', ')}</div>
        </div>

        {/* Expandable Content */}
        {isExpanded && (
          <>
            {/* Features */}
            <div className="pt-3 border-t border-gray-700">
              <h4 className="text-sm font-medium text-white mb-2">Features</h4>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                {features.map((feature, index) => (
                  <div key={index} className="text-sm text-gray-300">• {feature}</div>
                ))}
              </div>
            </div>

            {/* Details */}
            <div className="pt-3 border-t border-gray-700">
              <div className="flex justify-between text-sm">
                <div className="text-gray-300">
                  Audited: <span className={details.audited ? 'text-green-500' : 'text-yellow-500'}>
                    {details.audited ? 'Yes' : 'Pending'}
                  </span>
                </div>
                <div className="text-gray-300">
                  Upgradeable: <span className={details.upgradeable ? 'text-green-500' : 'text-red-500'}>
                    {details.upgradeable ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Action Button */}
        <div className="flex justify-end items-center gap-3 pt-2">
          <InfoGraphic />
          {link ? (
            <a
              href={link}
              className="w-1/3 text-center py-1.5 px-3 text-sm font-medium rounded-md bg-[#1B4D3E] text-white hover:bg-[#2C614F] transition-colors"
            >
              {action}
            </a>
          ) : (
            <button
              disabled
              className="w-1/3 py-1.5 px-3 text-sm font-medium rounded-md bg-gray-700 text-gray-400 cursor-not-allowed"
            >
              {action}
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}