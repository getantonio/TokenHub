import { useState } from 'react';
import { Card } from './ui/Card';
import Link from 'next/link';

interface FactoryFeatureCardProps {
  version: string;
  status: 'ACTIVE' | 'PLANNED' | 'FUTURE';
  title: string;
  description: string;
  features: string[];
  details: string;
  link?: string;
  action: string;
}

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
    ACTIVE: 'bg-blue-500/20 text-blue-500',
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

        {/* Features */}
        <div className={`space-y-4 transition-all duration-300 ${isExpanded ? 'block' : 'hidden'}`}>
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-300">Key Features:</h4>
            <ul className="text-sm text-gray-400 space-y-2">
              {features.map((feature, index) => (
                <li key={index} className="flex items-start">
                  <span className="mr-2 text-blue-400">•</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-300">Details:</h4>
            <div className="text-sm leading-relaxed text-gray-400 bg-gray-800/50 p-4 rounded-lg">
              {details}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end pt-2">
          {link ? (
            <Link
              href={link}
              className="btn-blue w-1/3 text-center"
            >
              {action}
            </Link>
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